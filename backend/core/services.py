"""
Service layer — core
Logique métier : requêtes client, émissions, dashboard stats, notifications.
Les vues délèguent ici ; elles ne font que parser HTTP et retourner la réponse.
"""
from django.utils import timezone
from django.db.models import Sum

from .models import Emission, Paiement, ClientRequest, Document


# ── Helpers async/sync ───────────────────────────────────────────────────────


def _dispatch(task_func, sync_func, *args):
    """
    Envoie une tâche via Celery si un broker est configuré,
    sinon exécute en synchrone (mode dégradé / dev sans Redis).
    """
    from django.conf import settings
    broker = getattr(settings, "CELERY_BROKER_URL", "")
    if broker:
        try:
            task_func.delay(*args)
            return
        except Exception:
            pass
    try:
        sync_func(*args)
    except Exception:
        pass


# ── Notifications ────────────────────────────────────────────────────────────


def notify_new_request(request_obj: ClientRequest) -> None:
    """Envoie les emails et notifications WS après création d'une requête."""
    from notifications.tasks import send_request_acknowledgment_async, send_new_request_alert_async
    from notifications.emails import send_request_acknowledgment, send_new_request_alert_to_agents
    _dispatch(send_request_acknowledgment_async, send_request_acknowledgment, request_obj.id)
    _dispatch(send_new_request_alert_async, send_new_request_alert_to_agents, request_obj.id)
    try:
        from notifications.ws import notify_agents_new_request
        notify_agents_new_request(request_obj)
    except Exception:
        pass


def notify_request_treated(request_obj: ClientRequest) -> None:
    """Envoie les notifications WS + email après traitement d'une requête."""
    from notifications.tasks import send_request_treated_async
    from notifications.emails import send_request_treated
    _dispatch(send_request_treated_async, send_request_treated, request_obj.id)
    try:
        from notifications.ws import notify_client_request_treated
        notify_client_request_treated(request_obj)
    except Exception:
        pass


def notify_livrable_added(request_obj: ClientRequest) -> None:
    """Notifie le client qu'un livrable a été ajouté à sa requête."""
    from notifications.tasks import send_livrable_notification_async
    from notifications.emails import send_livrable_notification
    _dispatch(send_livrable_notification_async, send_livrable_notification, request_obj.id)
    try:
        from notifications.ws import notify_client_livrable_added
        notify_client_livrable_added(request_obj)
    except Exception:
        pass


# ── Requêtes client ──────────────────────────────────────────────────────────


def claim_request(request_obj: ClientRequest, agent) -> None:
    """
    Un agent prend en charge une requête disponible.
    Lève ValueError si la requête est déjà prise par quelqu'un d'autre.
    """
    if request_obj.status not in (ClientRequest.Status.PENDING, ClientRequest.Status.EN_COURS):
        raise ValueError("Cette requête n'est plus disponible.")
    if request_obj.agent and request_obj.agent != agent:
        raise ValueError("Cette requête est déjà prise en charge par un autre agent.")
    request_obj.agent = agent
    request_obj.status = ClientRequest.Status.EN_COURS
    request_obj.save(update_fields=["agent", "status"])


def release_request(request_obj: ClientRequest, agent) -> None:
    """
    Un agent libère une requête qu'il avait prise.
    Lève ValueError si l'agent n'est pas celui assigné.
    """
    if request_obj.agent != agent:
        raise ValueError("Vous ne pouvez libérer que vos propres requêtes.")
    request_obj.agent = None
    request_obj.status = ClientRequest.Status.PENDING
    request_obj.save(update_fields=["agent", "status"])


def treat_request(request_obj: ClientRequest, agent) -> None:
    """
    Marque une requête comme traitée.
    Lève ValueError si la requête n'est pas en cours.
    """
    request_obj.status = ClientRequest.Status.TRAITE
    request_obj.agent = agent
    request_obj.treated_at = timezone.now()
    request_obj.save(update_fields=["status", "agent", "treated_at"])
    notify_request_treated(request_obj)


# ── Dashboard stats ──────────────────────────────────────────────────────────


def get_dashboard_stats(user) -> dict:
    """
    Calcule les statistiques du dashboard pour un utilisateur donné.
    Résultat mis en cache 60 secondes par l'appelant (vue).
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()

    if user.role in ("agent", "admin"):
        emissions = Emission.objects.all()
        total_clients = User.objects.filter(role="client").count()
        total_prospects = User.objects.filter(role="prospect").count()
        total_agents = User.objects.filter(role="agent").count()
    else:
        emissions = Emission.objects.filter(client=user)
        total_clients = total_prospects = total_agents = 0

    now = timezone.now().date()
    actifs = emissions.filter(echeance__gt=now)
    expires = emissions.filter(echeance__lte=now)
    total_primes = emissions.aggregate(t=Sum("prime_ttc"))["t"] or 0
    primes_payees = (
        Paiement.objects.filter(emission__in=emissions)
        .aggregate(t=Sum("montant_regle"))["t"] or 0
    )

    return {
        "total_contrats": emissions.count(),
        "contrats_actifs": actifs.count(),
        "contrats_expires": expires.count(),
        "total_primes": total_primes,
        "primes_payees": primes_payees,
        "primes_impayees": total_primes - primes_payees,
        "total_clients": total_clients,
        "total_prospects": total_prospects,
        "total_agents": total_agents,
    }

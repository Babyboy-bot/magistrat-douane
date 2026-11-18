"""
Tâches Celery — emails et notifications asynchrones.
Si Celery n'est pas configuré (pas de broker), les fonctions se dégradent gracieusement
en mode synchrone (fallback direct).

Usage depuis un service :
    from notifications.tasks import send_request_acknowledgment_async
    send_request_acknowledgment_async.delay(request_id)
"""
from config.celery import app


@app.task(bind=True, max_retries=3, default_retry_delay=30, name="notifications.send_request_acknowledgment")
def send_request_acknowledgment_async(self, request_id: int):
    """Envoie l'email de confirmation de requête au client (async)."""
    try:
        from core.models import ClientRequest
        from notifications.emails import send_request_acknowledgment
        req = ClientRequest.objects.select_related("client").get(pk=request_id)
        send_request_acknowledgment(req, strict=True)
    except Exception as exc:
        raise self.retry(exc=exc)


@app.task(bind=True, max_retries=3, default_retry_delay=30, name="notifications.send_new_request_alert")
def send_new_request_alert_async(self, request_id: int):
    """Alerte les agents d'une nouvelle requête (async)."""
    try:
        from core.models import ClientRequest
        from notifications.emails import send_new_request_alert_to_agents
        req = ClientRequest.objects.select_related("client").get(pk=request_id)
        send_new_request_alert_to_agents(req, strict=True)
    except Exception as exc:
        raise self.retry(exc=exc)


@app.task(bind=True, max_retries=3, default_retry_delay=30, name="notifications.send_request_treated")
def send_request_treated_async(self, request_id: int):
    """Notifie le client que sa requête est traitée (async)."""
    try:
        from core.models import ClientRequest
        from notifications.emails import send_request_treated
        req = ClientRequest.objects.select_related("client", "agent").get(pk=request_id)
        send_request_treated(req, strict=True)
    except Exception as exc:
        raise self.retry(exc=exc)


@app.task(bind=True, max_retries=3, default_retry_delay=30, name="notifications.send_pending_verification_alert")
def send_pending_verification_alert_async(self, user_id: int):
    """Alerte les agents qu'un compte attend leur vérification (async)."""
    try:
        from django.contrib.auth import get_user_model
        from notifications.emails import send_pending_verification_alert_to_agents
        user = get_user_model().objects.get(pk=user_id)
        send_pending_verification_alert_to_agents(user, strict=True)
    except Exception as exc:
        raise self.retry(exc=exc)


@app.task(bind=True, max_retries=3, default_retry_delay=30, name="notifications.send_new_dossier_alert")
def send_new_dossier_alert_async(self, contrat_id: int, contrat_type: str = "epargne"):
    """Alerte les agents d'un nouveau dossier Magist-Assur (async)."""
    try:
        from magistassur.models import ContratEpargne, ContratPrevoyance
        from notifications.emails import send_new_dossier_alert_to_agents
        model = ContratEpargne if contrat_type == "epargne" else ContratPrevoyance
        contrat = model.objects.select_related("client").get(pk=contrat_id)
        send_new_dossier_alert_to_agents(contrat, contrat_type, strict=True)
    except Exception as exc:
        raise self.retry(exc=exc)


@app.task(name="notifications.send_echeance_reminders")
def send_echeance_reminders():
    """
    Tâche planifiée (quotidienne) — envoie des rappels d'échéance aux clients
    pour les contrats arrivant à terme dans 30, 15 et 7 jours.
    """
    from django.utils import timezone
    from datetime import timedelta
    from core.models import Emission
    from notifications.service import notification_service

    today = timezone.now().date()
    deltas = [
        (30, "dans 30 jours", "medium"),
        (15, "dans 15 jours", "high"),
        (7,  "dans 7 jours",  "urgent"),
    ]

    for days, label, priority in deltas:
        target_date = today + timedelta(days=days)
        emissions = (
            Emission.objects
            .filter(echeance=target_date)
            .select_related("client")
            .exclude(client__isnull=True)
        )
        for emission in emissions:
            police = emission.num_police or f"#{emission.id}"
            compagnie = emission.compagnie or ""
            notification_service.send_notification_to_user(
                user_id=emission.client_id,
                title=f"Contrat à renouveler {label}",
                message=(
                    f"Votre contrat {police}"
                    + (f" ({compagnie})" if compagnie else "")
                    + f" arrive à échéance le {emission.echeance.strftime('%d/%m/%Y')}."
                    + " Contactez votre agent pour le renouvellement."
                ),
                type="warning",
                priority=priority,
                data={
                    "emission_id": emission.id,
                    "num_police": police,
                    "echeance": str(emission.echeance),
                    "event": "echeance_reminder",
                    "days_remaining": days,
                },
            )


@app.task(bind=True, max_retries=3, default_retry_delay=30, name="notifications.send_livrable_notification")
def send_livrable_notification_async(self, request_id: int, document_id: int = None):
    """Notifie le client qu'un livrable est disponible (async)."""
    try:
        from core.models import ClientRequest, Document
        from notifications.emails import send_livrable_notification
        req = ClientRequest.objects.select_related("client").get(pk=request_id)
        doc = Document.objects.get(pk=document_id) if document_id else None
        if doc:
            send_livrable_notification(req, doc, strict=True)
    except Exception as exc:
        raise self.retry(exc=exc)


# ── Emails du cycle de vie du compte (auth) ──────────────────────────────────

@app.task(bind=True, max_retries=3, default_retry_delay=30, name="notifications.send_welcome_email")
def send_welcome_email_async(self, user_id: int):
    """Email de bienvenue après inscription (async)."""
    try:
        from django.contrib.auth import get_user_model
        from notifications.emails import send_welcome_email
        user = get_user_model().objects.get(pk=user_id)
        send_welcome_email(user, strict=True)
    except Exception as exc:
        raise self.retry(exc=exc)


@app.task(bind=True, max_retries=3, default_retry_delay=30, name="notifications.send_verification_email")
def send_verification_email_async(self, user_id: int, verify_url: str):
    """Lien signé de vérification d'adresse email (async)."""
    try:
        from django.contrib.auth import get_user_model
        from notifications.emails import send_verification_email
        user = get_user_model().objects.get(pk=user_id)
        send_verification_email(user, verify_url, strict=True)
    except Exception as exc:
        raise self.retry(exc=exc)


@app.task(bind=True, max_retries=3, default_retry_delay=30, name="notifications.send_password_reset_email")
def send_password_reset_email_async(self, user_id: int, reset_url: str):
    """Lien signé de réinitialisation de mot de passe (async)."""
    try:
        from django.contrib.auth import get_user_model
        from notifications.emails import send_password_reset_email
        user = get_user_model().objects.get(pk=user_id)
        send_password_reset_email(user, reset_url, strict=True)
    except Exception as exc:
        raise self.retry(exc=exc)


@app.task(bind=True, max_retries=3, default_retry_delay=30, name="notifications.send_critical_notification_email")
def send_critical_notification_email_async(self, user_id: int, title: str, message: str):
    """Double par email une notification in-app critique (async)."""
    try:
        from django.contrib.auth import get_user_model
        from notifications.emails import send_critical_notification_email
        user = get_user_model().objects.get(pk=user_id)
        send_critical_notification_email(user, title, message, strict=True)
    except Exception as exc:
        raise self.retry(exc=exc)

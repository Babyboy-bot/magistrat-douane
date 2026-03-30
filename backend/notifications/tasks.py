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
        send_request_acknowledgment(req)
    except Exception as exc:
        raise self.retry(exc=exc)


@app.task(bind=True, max_retries=3, default_retry_delay=30, name="notifications.send_new_request_alert")
def send_new_request_alert_async(self, request_id: int):
    """Alerte les agents d'une nouvelle requête (async)."""
    try:
        from core.models import ClientRequest
        from notifications.emails import send_new_request_alert_to_agents
        req = ClientRequest.objects.select_related("client").get(pk=request_id)
        send_new_request_alert_to_agents(req)
    except Exception as exc:
        raise self.retry(exc=exc)


@app.task(bind=True, max_retries=3, default_retry_delay=30, name="notifications.send_request_treated")
def send_request_treated_async(self, request_id: int):
    """Notifie le client que sa requête est traitée (async)."""
    try:
        from core.models import ClientRequest
        from notifications.emails import send_request_treated
        req = ClientRequest.objects.select_related("client", "agent").get(pk=request_id)
        send_request_treated(req)
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
def send_livrable_notification_async(self, request_id: int):
    """Notifie le client qu'un livrable est disponible (async)."""
    try:
        from core.models import ClientRequest
        from notifications.emails import send_livrable_notification
        req = ClientRequest.objects.select_related("client").get(pk=request_id)
        send_livrable_notification(req)
    except Exception as exc:
        raise self.retry(exc=exc)

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

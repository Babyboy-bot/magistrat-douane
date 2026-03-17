"""
Helpers pour envoyer des notifications WebSocket via le channel layer.
Utilisation synchrone (dans des vues DRF standard).
"""
import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


def _send(group: str, payload: dict) -> None:
    """Envoie un message au groupe channel donné (sync wrapper)."""
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        async_to_sync(channel_layer.group_send)(
            group,
            {"type": "notification", "data": payload},
        )
    except Exception as exc:
        logger.warning("WS notification failed (group=%s): %s", group, exc)


# ── Helpers métier ──────────────────────────────────────────────────────────

def notify_agents_new_request(request_obj) -> None:
    """Notifie tous les agents connectés qu'une nouvelle requête a été soumise."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    agents = User.objects.filter(role__in=("agent", "admin"), is_active=True).values_list("id", flat=True)
    payload = {
        "event": "new_request",
        "request_id": request_obj.id,
        "numero": request_obj.numero,
        "type": request_obj.type,
        "client_nom": f"{request_obj.client.nom} {request_obj.client.prenoms}".strip(),
        "created_at": request_obj.created_at.isoformat(),
    }
    for agent_id in agents:
        _send(f"user_{agent_id}_notifications", payload)


def notify_client_request_treated(request_obj) -> None:
    """Notifie le client que sa requête a été traitée."""
    payload = {
        "event": "request_treated",
        "request_id": request_obj.id,
        "numero": request_obj.numero,
        "type": request_obj.type,
        "treated_at": request_obj.treated_at.isoformat() if request_obj.treated_at else None,
    }
    _send(f"user_{request_obj.client_id}_notifications", payload)


def notify_client_livrable_added(request_obj, document_obj) -> None:
    """Notifie le client qu'un nouveau document est disponible pour lui."""
    payload = {
        "event": "livrable_added",
        "request_id": request_obj.id,
        "numero": request_obj.numero,
        "document_nom": document_obj.nom,
    }
    _send(f"user_{request_obj.client_id}_notifications", payload)

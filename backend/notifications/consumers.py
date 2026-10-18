"""
WebSocket consumers for real-time notifications.
"""
import json
import time
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

ONLINE_KEY = "ws_online_users"
ONLINE_TTL = 300  # 5 min : purge auto si le serveur redémarre


@database_sync_to_async
def _mark_online(user_id: int) -> None:
    try:
        from django.core.cache import cache
        members = cache.get(ONLINE_KEY) or {}
        members[str(user_id)] = int(time.time())
        cache.set(ONLINE_KEY, members, ONLINE_TTL)
    except Exception:
        pass


@database_sync_to_async
def _mark_offline(user_id: int) -> None:
    try:
        from django.core.cache import cache
        members = cache.get(ONLINE_KEY) or {}
        members.pop(str(user_id), None)
        cache.set(ONLINE_KEY, members, ONLINE_TTL)
    except Exception:
        pass


def _pending_requests_payload():
    """Retourne les requêtes en attente ou en cours pour notifier l'agent à la connexion."""
    from core.models import ClientRequest
    qs = ClientRequest.objects.filter(
        status__in=("en_attente", "en_cours")
    ).select_related("client").order_by("-created_at")[:20]
    return [
        {
            "event": "new_request",
            # Rejeu au login : le frontend les affiche dans le dropdown
            # mais ne doit pas déclencher de toast ni de son.
            "initial": True,
            "request_id": r.id,
            "numero": r.numero,
            "type": r.type,
            "client_nom": f"{r.client.nom} {r.client.prenoms}".strip(),
            "created_at": r.created_at.isoformat(),
        }
        for r in qs
    ]


get_pending_requests = database_sync_to_async(_pending_requests_payload)


def _origin_allowed(scope) -> bool:
    """Vérifie le header Origin du handshake WebSocket.

    Avec des cookies SameSite=None (HTTPS), un site malveillant pourrait
    ouvrir le WS depuis le navigateur de la victime et recevoir ses
    notifications. On n'accepte que les origines de confiance.
    Les clients sans Origin (non-navigateur) passent."""
    from django.conf import settings
    headers = dict(scope.get("headers", []))
    origin = headers.get(b"origin", b"").decode("latin1").strip().rstrip("/")
    if not origin or settings.DEBUG:
        return True
    allowed = {o.rstrip("/") for o in settings.CSRF_TRUSTED_ORIGINS}
    return origin in allowed


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")
        self.group_name = None

        if not _origin_allowed(self.scope):
            await self.close(code=4403)
            return

        if not self.user or not self.user.is_authenticated or not self.user.is_active:
            await self.close(code=4401)
            return

        self.group_name = f"user_{self.user.id}_notifications"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await _mark_online(self.user.id)
        logger.info("WS connect: user=%s role=%s", self.user.id, self.user.role)
        await self.send(text_data=json.dumps({
            "type": "welcome",
            "user_id": self.user.id,
            "role": self.user.role,
        }))

        # Pour les agents/admins : envoyer les requêtes en attente comme notifications
        if self.user.role in ("agent", "admin"):
            pending = await get_pending_requests()
            for payload in pending:
                await self.send(text_data=json.dumps({
                    "type": "notification",
                    "data": payload,
                }))

    async def disconnect(self, close_code):
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            await _mark_offline(self.user.id)
            logger.info("WS disconnect: user=%s code=%s", self.user.id, close_code)

    async def receive(self, text_data=None, bytes_data=None):
        """Handle messages from the client (ping/pong heartbeat)."""
        if not text_data:
            return
        try:
            data = json.loads(text_data)
            if data.get("type") == "ping":
                await _mark_online(self.user.id)
                await self.send(text_data=json.dumps({"type": "pong"}))
        except (json.JSONDecodeError, KeyError):
            pass

    async def notification(self, event):
        """Handle incoming notification messages"""
        notification_data = event["data"]

        # Send notification to this client
        await self.send(text_data=json.dumps({
            "type": "notification",
            "data": notification_data
        }))

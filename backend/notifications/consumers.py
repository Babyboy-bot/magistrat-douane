"""
WebSocket consumers for real-time notifications.
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


@database_sync_to_async
def get_pending_requests():
    """Retourne les requêtes en attente ou en cours pour notifier l'agent à la connexion."""
    from core.models import ClientRequest
    qs = ClientRequest.objects.filter(
        status__in=("en_attente", "en_cours")
    ).select_related("client").order_by("-created_at")[:20]
    return [
        {
            "event": "new_request",
            "request_id": r.id,
            "numero": r.numero,
            "type": r.type,
            "client_nom": f"{r.client.nom} {r.client.prenoms}".strip(),
            "created_at": r.created_at.isoformat(),
        }
        for r in qs
    ]


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")
        self.group_name = None

        if not self.user or not self.user.is_authenticated or not self.user.is_active:
            await self.close(code=4401)
            return

        self.group_name = f"user_{self.user.id}_notifications"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
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
            logger.info("WS disconnect: user=%s code=%s", self.user.id, close_code)

    async def receive(self, text_data=None, bytes_data=None):
        """Handle messages from the client (ping/pong heartbeat)."""
        if not text_data:
            return
        try:
            data = json.loads(text_data)
            if data.get("type") == "ping":
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

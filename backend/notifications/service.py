"""
Notification service for real-time notifications.
"""
import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone
from .models import Notification

logger = logging.getLogger(__name__)


def _serialize_notification(notification: Notification) -> dict:
    return {
        "id": notification.id,
        "title": notification.title,
        "message": notification.message,
        "type": notification.type,
        "priority": notification.priority,
        "created_at": notification.created_at.isoformat(),
        "read_at": notification.read_at.isoformat() if notification.read_at else None,
        "data": notification.data or {},
    }


def _broadcast_notification(notification: Notification) -> None:
    channel_layer = get_channel_layer()
    if not channel_layer:
        logger.debug("No channel layer configured, skipping broadcast")
        return

    payload = _serialize_notification(notification)
    try:
        async_to_sync(channel_layer.group_send)(
            f"user_{notification.user_id}_notifications",
            {
                "type": "notification",
                "data": payload,
            },
        )
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.error("Failed to broadcast notification %s: %s", notification.id, exc)


class NotificationService:
    """Service for sending real-time notifications."""
    
    @staticmethod
    def send_notification_to_user(user_id, title, message, type='info', priority='medium', data=None):
        """Send notification to specific user via WebSocket."""
        try:
            notification = Notification.objects.create_notification(
                user_id=user_id,
                title=title,
                message=message,
                type=type,
                priority=priority,
                data=data or {}
            )
            
            logger.info(f"Notification created for user {user_id}: {title}")
            _broadcast_notification(notification)
            return notification
            
        except Exception as e:
            logger.error(f"Failed to create notification for user {user_id}: {e}")
            return None
    
    @staticmethod
    def send_notification_to_role(role, title, message, type='info', priority='medium', data=None):
        """Send notification to all users with a specific role."""
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            # Trouver tous les utilisateurs avec ce rôle
            users_with_role = User.objects.filter(role=role)
            
            # Validation : vérifier si le rôle existe
            if not users_with_role.exists():
                logger.warning(f"No users found with role '{role}'. Available roles: {list(User.objects.values_list('role', flat=True).distinct())}")
                return None
            
            # Performance : bulk_create au lieu de N requêtes
            notifications = [
                Notification(
                    user=user,
                    title=title,
                    message=message,
                    type=type,
                    priority=priority,
                    data=data or {}
                )
                for user in users_with_role
            ]
            
            created_notifications = Notification.objects.bulk_create(notifications)
            for notification in created_notifications:
                _broadcast_notification(notification)
            
            logger.info(f"Notification sent to role {role}: {title} ({len(created_notifications)} users)")
            return created_notifications
            
        except Exception as e:
            logger.error(f"Failed to send notification to role {role}: {e}")
            return None

    @staticmethod
    def send_notification_with_permissions(title, message, type='info', priority='medium', data=None, require_verified=True):
        """Send notification with permission filtering."""
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            # Filtrer selon les permissions requises
            if require_verified:
                # Envoyer seulement aux utilisateurs vérifiés (clients et agents)
                users = User.objects.filter(role__in=['client', 'agent'], verified=True)
            else:
                # Envoyer à tout le monde (admins, agents, clients vérifiés)
                users = User.objects.filter(role__in=['admin', 'agent'], verified=True) | \
                         User.objects.filter(role='client', verified=True)
            
            if not users.exists():
                logger.warning(f"No users found for notification: {title}")
                return None
            
            # Créer les notifications
            notifications = [
                Notification(
                    user=user,
                    title=title,
                    message=message,
                    type=type,
                    priority=priority,
                    data=data or {}
                )
                for user in users
            ]
            
            created_notifications = Notification.objects.bulk_create(notifications)
            for notification in created_notifications:
                _broadcast_notification(notification)
            logger.info(f"Notification sent with permissions: {title} ({len(created_notifications)} users)")
            return created_notifications
            
        except Exception as e:
            logger.error(f"Failed to send notification with permissions: {e}")
            return None

# Global notification service instance
notification_service = NotificationService()

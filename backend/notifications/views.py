from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.utils import timezone
from .models import Notification
from .consumers import ONLINE_KEY


class NotificationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        notifs = Notification.objects.filter(user=request.user).order_by("-created_at")[:50]
        return Response([_serialize(n) for n in notifs])


class NotificationMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response({"detail": "Introuvable"}, status=status.HTTP_404_NOT_FOUND)
        if not notif.read_at:
            notif.read_at = timezone.now()
            notif.save(update_fields=["read_at"])
        return Response(_serialize(notif))


class NotificationMarkAllReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(user=request.user, read_at__isnull=True).update(
            read_at=timezone.now()
        )
        return Response({"detail": "Toutes les notifications marquées comme lues."})


class OnlineUsersView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in ("admin", "agent"):
            return Response({"detail": "Permission refusée"}, status=status.HTTP_403_FORBIDDEN)
        from django.core.cache import cache
        from django.contrib.auth import get_user_model
        import time
        User = get_user_model()
        members = cache.get(ONLINE_KEY) or {}
        now = int(time.time())
        stale_cutoff = now - 120  # considéré offline après 2min sans ping
        online_ids = [int(uid) for uid, ts in members.items() if ts >= stale_cutoff]
        users = User.objects.filter(id__in=online_ids).values(
            "id", "nom", "prenoms", "email", "role", "profession_type", "photo"
        )
        return Response([{
            "id": u["id"],
            "nom": u["nom"],
            "prenoms": u["prenoms"],
            "email": u["email"],
            "role": u["role"],
            "profession_type": u["profession_type"],
            "photo": u["photo"],
            "connected_since": members.get(str(u["id"])),
        } for u in users])


def _serialize(n: Notification) -> dict:
    return {
        "id": str(n.id),
        "title": n.title,
        "message": n.message,
        "type": n.type,
        "priority": n.priority,
        "created_at": n.created_at.isoformat(),
        "read_at": n.read_at.isoformat() if n.read_at else None,
        "data": n.data or {},
    }

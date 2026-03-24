"""core/views/audit.py — Endpoint lecture des entrées d'audit métier."""
from rest_framework import generics, permissions, serializers

from core.models import AuditEntry
from core.permissions import IsAdminOnly


class AuditEntrySerializer(serializers.ModelSerializer):
    performed_by = serializers.SerializerMethodField()

    class Meta:
        model = AuditEntry
        fields = [
            "id", "object_type", "object_id", "object_repr",
            "action", "before", "after",
            "performed_by", "ip_address", "timestamp",
        ]

    def get_performed_by(self, obj):
        if obj.performed_by:
            return {"id": obj.performed_by.pk, "email": obj.performed_by.email}
        return None


class AuditEntryListView(generics.ListAPIView):
    serializer_class = AuditEntrySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOnly]

    def get_queryset(self):
        qs = AuditEntry.objects.select_related("performed_by").order_by("-timestamp")
        params = self.request.query_params
        if params.get("object_type"):
            qs = qs.filter(object_type=params["object_type"])
        if params.get("object_id"):
            qs = qs.filter(object_id=params["object_id"])
        if params.get("action"):
            qs = qs.filter(action=params["action"])
        if params.get("user_id"):
            qs = qs.filter(performed_by_id=params["user_id"])
        return qs

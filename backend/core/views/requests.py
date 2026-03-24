from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from core.models import ClientRequest
from core.serializers import ClientRequestSerializer, ClientRequestCreateSerializer
from core.services import notify_new_request, notify_request_treated


class ClientRequestListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ClientRequestCreateSerializer
        return ClientRequestSerializer

    def get_queryset(self):
        user = self.request.user
        qs = ClientRequest.objects.select_related("client", "agent").prefetch_related("documents")
        if user.role in ("agent", "admin"):
            return qs
        if user.account_status in ("active", "verified"):
            return qs.filter(client=user)
        return ClientRequest.objects.none()

    def perform_create(self, serializer):
        instance = serializer.save()
        notify_new_request(instance)


class ClientRequestDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ClientRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ("agent", "admin"):
            return ClientRequest.objects.all()
        if user.account_status in ("active", "verified"):
            return ClientRequest.objects.filter(client=user)
        return ClientRequest.objects.none()


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def treat_request_view(request, pk):
    if request.user.role not in ("agent", "admin"):
        return Response({"detail": "Permission refusée"}, status=status.HTTP_403_FORBIDDEN)
    try:
        req = ClientRequest.objects.get(pk=pk)
    except ClientRequest.DoesNotExist:
        return Response({"detail": "Requête introuvable"}, status=status.HTTP_404_NOT_FOUND)

    if request.user.role == "agent" and req.agent_id and req.agent_id != request.user.id:
        return Response({"detail": "Cette requête est prise en charge par un autre agent."}, status=status.HTTP_403_FORBIDDEN)

    req.status = "traite"
    req.treated_at = timezone.now()
    req.agent = request.user
    req.save()
    notify_request_treated(req)
    return Response(ClientRequestSerializer(req).data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def claim_request_view(request, pk):
    if request.user.role not in ("agent", "admin"):
        return Response({"detail": "Permission refusée"}, status=status.HTTP_403_FORBIDDEN)

    from django.db import transaction
    try:
        with transaction.atomic():
            req = ClientRequest.objects.select_for_update().get(pk=pk)
            if req.status != ClientRequest.Status.EN_ATTENTE:
                return Response(
                    {"detail": "Cette requête est déjà prise en charge ou traitée."},
                    status=status.HTTP_409_CONFLICT,
                )
            req.agent = request.user
            req.status = ClientRequest.Status.EN_COURS
            req.save()
    except ClientRequest.DoesNotExist:
        return Response({"detail": "Requête introuvable"}, status=status.HTTP_404_NOT_FOUND)

    try:
        from notifications.service import notification_service
        notification_service.send_notification_to_user(
            user_id=req.client_id,
            title="Votre requête est en cours de traitement",
            message=(
                f"Votre demande {req.numero} ({req.get_type_display()}) "
                f"a été prise en charge par {request.user.full_name}."
            ),
            type="info",
            priority="medium",
            data={"request_id": req.id, "numero": req.numero},
        )
    except Exception:
        pass

    return Response(ClientRequestSerializer(req).data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def release_request_view(request, pk):
    if request.user.role not in ("agent", "admin"):
        return Response({"detail": "Permission refusée"}, status=status.HTTP_403_FORBIDDEN)
    try:
        req = ClientRequest.objects.get(pk=pk)
    except ClientRequest.DoesNotExist:
        return Response({"detail": "Requête introuvable"}, status=status.HTTP_404_NOT_FOUND)

    if req.status != ClientRequest.Status.EN_COURS:
        return Response({"detail": "Cette requête n'est pas en cours de traitement."}, status=status.HTTP_400_BAD_REQUEST)
    if request.user.role == "agent" and req.agent_id != request.user.id:
        return Response({"detail": "Vous ne pouvez libérer que vos propres requêtes."}, status=status.HTTP_403_FORBIDDEN)

    req.agent = None
    req.status = ClientRequest.Status.EN_ATTENTE
    req.save()
    return Response(ClientRequestSerializer(req).data)

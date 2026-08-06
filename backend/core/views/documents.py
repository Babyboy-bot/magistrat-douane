from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.file_validators import validate_upload
from core.models import ClientRequest, Document
from core.serializers import DocumentSerializer
from core.services import notify_livrable_added


class RequestLivrablesView(APIView):
    """
    GET  : liste les livrables d'une requête (client propriétaire ou agent/admin)
    POST : l'agent upload un livrable sur la requête
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_request_or_403(self, pk, user):
        req = get_object_or_404(ClientRequest, pk=pk)
        if user.role not in ("agent", "admin") and req.client != user:
            return None, Response({"detail": "Permission refusée"}, status=status.HTTP_403_FORBIDDEN)
        return req, None

    def get(self, request, pk):
        req, err = self._get_request_or_403(pk, request.user)
        if err:
            return err
        livrables = req.documents.filter(is_livrable=True)
        return Response(DocumentSerializer(livrables, many=True, context={"request": request}).data)

    def post(self, request, pk):
        if request.user.role not in ("agent", "admin"):
            return Response({"detail": "Permission refusée"}, status=status.HTTP_403_FORBIDDEN)
        req, err = self._get_request_or_403(pk, request.user)
        if err:
            return err
        file = request.FILES.get("file")
        if file:
            try:
                validate_upload(file)
            except ValidationError as e:
                return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        serializer = DocumentSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        doc = serializer.save(request=req, uploaded_by=request.user, is_livrable=True)
        notify_livrable_added(req, doc)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DocumentUploadView(generics.CreateAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # Vérifier que l'utilisateur a accès à la requête liée
        request_obj = serializer.validated_data.get("request")
        if request_obj:
            user = self.request.user
            if user.role not in ("agent", "admin") and request_obj.client_id != user.id:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Vous ne pouvez ajouter des documents qu'à vos propres requêtes.")
        fichier = serializer.validated_data.get("fichier")
        if fichier:
            try:
                validate_upload(fichier)
            except ValidationError as e:
                from rest_framework.exceptions import ValidationError as DRFValidationError
                raise DRFValidationError({"fichier": e.messages})
        serializer.save(uploaded_by=self.request.user)


class ConfirmLivrableView(APIView):
    """Le client confirme la réception d'un livrable."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        from django.utils import timezone
        doc = get_object_or_404(Document, pk=pk, is_livrable=True)
        if request.user.role not in ("agent", "admin") and (
            not doc.request or doc.request.client_id != request.user.id
        ):
            return Response({"detail": "Permission refusée"}, status=status.HTTP_403_FORBIDDEN)
        if doc.confirmed_at:
            return Response({"detail": "Déjà confirmé"}, status=status.HTTP_200_OK)
        doc.confirmed_at = timezone.now()
        doc.save(update_fields=["confirmed_at"])
        # Notifier l'agent
        if doc.request and doc.request.agent_id:
            try:
                from notifications.service import notification_service
                notification_service.send_notification_to_user(
                    user_id=doc.request.agent_id,
                    title="Livrable confirmé reçu",
                    message=(
                        f"{request.user.full_name} a confirmé la réception de «{doc.nom}» "
                        f"(requête {doc.request.numero})."
                    ),
                    type="success",
                    priority="low",
                    data={"document_id": doc.id, "request_id": doc.request_id, "event": "livrable_confirmed"},
                )
            except Exception:
                pass
        return Response(DocumentSerializer(doc, context={"request": request}).data)


class CarteGriseUploadView(generics.CreateAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        try:
            file = request.FILES.get("file")
            if not file:
                return Response({"error": "Aucun fichier fourni"}, status=status.HTTP_400_BAD_REQUEST)
            try:
                validate_upload(file)
            except ValidationError as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
            request_id = request.data.get("request_id")
            linked_request = None
            if request_id:
                from core.models import ClientRequest
                try:
                    linked_request = ClientRequest.objects.get(pk=request_id)
                    if request.user.role not in ("agent", "admin") and linked_request.client_id != request.user.id:
                        return Response({"error": "Vous n'êtes pas autorisé à lier un document à cette requête."}, status=status.HTTP_403_FORBIDDEN)
                except ClientRequest.DoesNotExist:
                    return Response({"error": "Requête introuvable."}, status=status.HTTP_404_NOT_FOUND)
            doc = Document.objects.create(
                nom=f"carte_grise_{file.name}",
                fichier=file,
                type_fichier="carte_grise",
                uploaded_by=request.user,
                is_livrable=False,
                request=linked_request,
            )
            return Response({
                "document_id": doc.id,
                "document_nom": doc.nom,
                "file_size": file.size,
                "file_type": file.content_type,
                "message": "Carte grise uploadée avec succès",
            })
        except Exception:
            import logging
            logging.getLogger("core.documents").exception("CarteGriseUploadView error")
            return Response({"error": "Une erreur est survenue lors de l'upload."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

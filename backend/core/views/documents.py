from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

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
        serializer = DocumentSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(request=req, uploaded_by=request.user, is_livrable=True)
        notify_livrable_added(req)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DocumentUploadView(generics.CreateAPIView):
    serializer_class = DocumentSerializer

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class CarteGriseUploadView(generics.CreateAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        try:
            file = request.FILES.get("file")
            if not file:
                return Response({"error": "Aucun fichier fourni"}, status=status.HTTP_400_BAD_REQUEST)
            if file.content_type not in ["application/pdf", "image/jpeg", "image/jpg", "image/png"]:
                return Response({"error": "Format non supporté (PDF, JPG, PNG)"}, status=status.HTTP_400_BAD_REQUEST)
            doc = Document.objects.create(
                nom=f"carte_grise_{file.name}",
                fichier=file,
                type_fichier="carte_grise",
                uploaded_by=request.user,
                is_livrable=False,
            )
            return Response({
                "document_id": doc.id,
                "document_nom": doc.nom,
                "file_size": file.size,
                "file_type": file.content_type,
                "message": "Carte grise uploadée avec succès",
            })
        except Exception as e:
            return Response({"error": f"Erreur : {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from core.permissions import IsAgentOrAdmin
from .services import (
    assigner_police_epargne, changer_statut_epargne, ajouter_cotisation_epargne,
    assigner_police_prevoyance, changer_statut_prevoyance,
    create_contrat_epargne, create_contrat_prevoyance,
)
from .exports import (
    export_epargne_excel, export_epargne_pdf,
    export_prevoyance_excel, export_prevoyance_pdf,
)


from .models import (
    ContratEpargne, ContratPrevoyance,
    CotisationEpargne, QuestionnaireMedical,
)
from .serializers import (
    ContratEpargneSerializer, ContratEpargneCreateSerializer,
    ContratPrevoyanceSerializer, ContratPrevoyanceCreateSerializer,
    CotisationEpargneSerializer, QuestionnaireMedicalSerializer,
)




class ContratEpargneViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAgentOrAdmin]
    pagination_class = None

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ContratEpargneCreateSerializer
        return ContratEpargneSerializer

    def get_queryset(self):
        user = self.request.user
        qs = ContratEpargne.objects.select_related("client", "agent").prefetch_related(
            "correspondants", "beneficiaires", "cotisations"
        )
        # Admin : portefeuille complet du cabinet
        if user.role == "admin":
            pass
        # Agent : uniquement ses propres contrats (isolation RGPD)
        elif user.role == "agent":
            qs = qs.filter(agent=user)
        else:
            return qs.filter(client=user)
        client_id = self.request.query_params.get("client_id")
        statut = self.request.query_params.get("statut")
        search = self.request.query_params.get("search")
        if client_id:
            qs = qs.filter(client_id=client_id)
        if statut:
            qs = qs.filter(statut=statut)
        if search:
            qs = qs.filter(
                Q(client__nom__icontains=search) |
                Q(client__prenoms__icontains=search) |
                Q(num_police__icontains=search)
            )
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        try:
            contrat = create_contrat_epargne(
                validated_data=data,
                agent=request.user,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ContratEpargneSerializer(contrat).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="assign-police",
            permission_classes=[IsAuthenticated])
    def assign_police(self, request, pk=None):
        """Assigne un numéro de police et active le contrat. Réservé aux agents/admins."""
        if request.user.role not in ("agent", "admin"):
            return Response({"detail": "Action réservée aux agents."}, status=status.HTTP_403_FORBIDDEN)
        num_police = (request.data.get("num_police") or "").strip()
        if not num_police:
            return Response({"detail": "Le numéro de police est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)
        contrat = self.get_object()
        assigner_police_epargne(
            contrat,
            num_police,
            (request.data.get("code_inspection") or "").strip(),
            request.user,
        )
        return Response(ContratEpargneSerializer(contrat).data)

    @action(detail=True, methods=["post"], url_path="change-statut",
            permission_classes=[IsAuthenticated])
    def change_statut(self, request, pk=None):
        """Permet à un agent de changer le statut d'un contrat épargne."""
        if request.user.role not in ("agent", "admin"):
            return Response({"detail": "Action réservée aux agents."}, status=status.HTTP_403_FORBIDDEN)
        nouveau_statut = (request.data.get("statut") or "").strip()
        contrat = self.get_object()
        try:
            changer_statut_epargne(contrat, nouveau_statut)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ContratEpargneSerializer(contrat).data)

    @action(detail=True, methods=["get"], url_path="export-excel",
            permission_classes=[IsAuthenticated])
    def export_excel(self, request, pk=None):
        """Exporte le contrat épargne en Excel (NSIA)."""
        if request.user.role not in ("agent", "admin"):
            return Response({"detail": "Action réservée aux agents."}, status=status.HTTP_403_FORBIDDEN)
        contrat = self.get_object()
        return export_epargne_excel(contrat)

    @action(detail=True, methods=["get"], url_path="export-pdf",
            permission_classes=[IsAuthenticated])
    def export_pdf(self, request, pk=None):
        """Exporte le contrat épargne en PDF (NSIA)."""
        if request.user.role not in ("agent", "admin"):
            return Response({"detail": "Action réservée aux agents."}, status=status.HTTP_403_FORBIDDEN)
        contrat = self.get_object()
        return export_epargne_pdf(contrat)

    @action(detail=True, methods=["post"], url_path="cotisation")
    def ajouter_cotisation(self, request, pk=None):
        contrat = self.get_object()
        try:
            cotisation = ajouter_cotisation_epargne(contrat, request.data)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        from .serializers import CotisationEpargneSerializer
        return Response(CotisationEpargneSerializer(cotisation).data, status=status.HTTP_201_CREATED)


class ContratPrevoyanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAgentOrAdmin]
    pagination_class = None

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ContratPrevoyanceCreateSerializer
        return ContratPrevoyanceSerializer

    def get_queryset(self):
        user = self.request.user
        qs = ContratPrevoyance.objects.select_related("client", "agent").prefetch_related(
            "assures_associes", "beneficiaires"
        )
        # Admin : portefeuille complet du cabinet
        if user.role == "admin":
            pass
        # Agent : uniquement ses propres contrats (isolation RGPD)
        elif user.role == "agent":
            qs = qs.filter(agent=user)
        else:
            return qs.filter(client=user)
        client_id = self.request.query_params.get("client_id")
        statut = self.request.query_params.get("statut")
        search = self.request.query_params.get("search")
        if client_id:
            qs = qs.filter(client_id=client_id)
        if statut:
            qs = qs.filter(statut=statut)
        if search:
            qs = qs.filter(
                Q(client__nom__icontains=search) |
                Q(client__prenoms__icontains=search) |
                Q(num_police__icontains=search)
            )
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        try:
            contrat = create_contrat_prevoyance(
                validated_data=data,
                agent=request.user,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ContratPrevoyanceSerializer(contrat).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="assign-police",
            permission_classes=[IsAuthenticated])
    def assign_police(self, request, pk=None):
        """Assigne un numéro de police et active le contrat. Réservé aux agents/admins."""
        if request.user.role not in ("agent", "admin"):
            return Response({"detail": "Action réservée aux agents."}, status=status.HTTP_403_FORBIDDEN)
        num_police = (request.data.get("num_police") or "").strip()
        if not num_police:
            return Response({"detail": "Le numéro de police est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)
        contrat = self.get_object()
        assigner_police_prevoyance(
            contrat,
            num_police,
            (request.data.get("code_inspection") or "").strip(),
            request.user,
            (request.data.get("date_effet") or "").strip(),
        )
        return Response(ContratPrevoyanceSerializer(contrat).data)

    @action(detail=True, methods=["post"], url_path="change-statut",
            permission_classes=[IsAuthenticated])
    def change_statut(self, request, pk=None):
        """Permet à un agent de changer le statut d'un contrat prévoyance."""
        if request.user.role not in ("agent", "admin"):
            return Response({"detail": "Action réservée aux agents."}, status=status.HTTP_403_FORBIDDEN)
        nouveau_statut = (request.data.get("statut") or "").strip()
        contrat = self.get_object()
        try:
            changer_statut_prevoyance(contrat, nouveau_statut)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ContratPrevoyanceSerializer(contrat).data)

    @action(detail=True, methods=["get"], url_path="export-excel",
            permission_classes=[IsAuthenticated])
    def export_excel(self, request, pk=None):
        """Exporte le contrat prévoyance en Excel (NSIA)."""
        if request.user.role not in ("agent", "admin"):
            return Response({"detail": "Action réservée aux agents."}, status=status.HTTP_403_FORBIDDEN)
        contrat = self.get_object()
        return export_prevoyance_excel(contrat)

    @action(detail=True, methods=["get"], url_path="export-pdf",
            permission_classes=[IsAuthenticated])
    def export_pdf(self, request, pk=None):
        """Exporte le contrat prévoyance en PDF (NSIA)."""
        if request.user.role not in ("agent", "admin"):
            return Response({"detail": "Action réservée aux agents."}, status=status.HTTP_403_FORBIDDEN)
        contrat = self.get_object()
        return export_prevoyance_pdf(contrat)

    @action(detail=True, methods=["post", "put", "patch"], url_path="questionnaire")
    def questionnaire_medical(self, request, pk=None):
        contrat = self.get_object()
        instance = getattr(contrat, "questionnaire_medical", None)
        if instance:
            serializer = QuestionnaireMedicalSerializer(instance, data=request.data, partial=True)
        else:
            serializer = QuestionnaireMedicalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(contrat=contrat)
        return Response(serializer.data)

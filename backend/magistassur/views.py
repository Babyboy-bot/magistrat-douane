from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.response import Response
from django.db import transaction
from django.db.models import F, Q


from .models import (
    ContratEpargne, ContratPrevoyance,
    CotisationEpargne, QuestionnaireMedical,
)
from .serializers import (
    ContratEpargneSerializer, ContratEpargneCreateSerializer, ClientContratEpargneCreateSerializer,
    ContratPrevoyanceSerializer, ContratPrevoyanceCreateSerializer, ClientContratPrevoyanceCreateSerializer,
    CotisationEpargneSerializer, QuestionnaireMedicalSerializer,
)


def _is_staff_role(user):
    return user.role in ("agent", "admin")


class IsAgentOrAdmin(BasePermission):
    """
    Lecture et souscription (create) ouvertes aux clients.
    Toute autre écriture (modification, suppression, cotisations) est réservée aux agents/admins.
    Le questionnaire médical a sa propre règle dans la vue.
    """
    def has_permission(self, request, view):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        if getattr(view, "action", None) in ("create", "questionnaire_medical"):
            return True
        return _is_staff_role(request.user)


class ContratEpargneViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAgentOrAdmin]
    pagination_class = None

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            if not _is_staff_role(self.request.user):
                return ClientContratEpargneCreateSerializer
            return ContratEpargneCreateSerializer
        return ContratEpargneSerializer

    def get_queryset(self):
        user = self.request.user
        qs = ContratEpargne.objects.select_related("client", "agent").prefetch_related(
            "correspondants", "beneficiaires", "cotisations"
        )
        if user.role in ("agent", "admin"):
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
        return qs.filter(client=user)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role in ("agent", "admin"):
            serializer.save(agent=user)
        else:
            # Forcer client=user, ignorer toute valeur client envoyée dans le body
            serializer.save(client=user)

    @action(detail=True, methods=["post"], url_path="cotisation")
    def ajouter_cotisation(self, request, pk=None):
        contrat = self.get_object()
        serializer = CotisationEpargneSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            cotisation = serializer.save(contrat=contrat)
            # Seules les cotisations effectivement payées alimentent le capital
            if cotisation.statut == CotisationEpargne.Statut.PAYEE:
                ContratEpargne.objects.filter(pk=contrat.pk).update(
                    capital_constitue=F("capital_constitue") + cotisation.montant
                )
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ContratPrevoyanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAgentOrAdmin]
    pagination_class = None

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            if not _is_staff_role(self.request.user):
                return ClientContratPrevoyanceCreateSerializer
            return ContratPrevoyanceCreateSerializer
        return ContratPrevoyanceSerializer

    def get_queryset(self):
        user = self.request.user
        qs = ContratPrevoyance.objects.select_related("client", "agent").prefetch_related(
            "assures_associes", "beneficiaires"
        )
        if user.role in ("agent", "admin"):
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
        return qs.filter(client=user)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role in ("agent", "admin"):
            serializer.save(agent=user)
        else:
            # Forcer client=user, ignorer toute valeur client envoyée dans le body
            serializer.save(client=user)

    @action(detail=True, methods=["post", "put", "patch"], url_path="questionnaire")
    def questionnaire_medical(self, request, pk=None):
        contrat = self.get_object()
        instance = getattr(contrat, "questionnaire_medical", None)
        # Un client ne peut soumettre son questionnaire qu'une seule fois (POST initial)
        if not _is_staff_role(request.user) and (instance or request.method != "POST"):
            return Response(
                {"detail": "Le questionnaire médical déjà soumis ne peut être modifié que par un agent."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if instance:
            serializer = QuestionnaireMedicalSerializer(instance, data=request.data, partial=True)
        else:
            serializer = QuestionnaireMedicalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(contrat=contrat)
        return Response(serializer.data)

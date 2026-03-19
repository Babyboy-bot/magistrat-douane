from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone


from .models import (
    ContratEpargne, ContratPrevoyance,
    CotisationEpargne, QuestionnaireMedical,
)
from .serializers import (
    ContratEpargneSerializer, ContratEpargneCreateSerializer,
    ContratPrevoyanceSerializer, ContratPrevoyanceCreateSerializer,
    CotisationEpargneSerializer, QuestionnaireMedicalSerializer,
)


def _traiter_requete_magist(client_id, agent):
    """Marque comme traitée la dernière requête souscription_magist en attente du client."""
    try:
        from core.models import ClientRequest
        req = (
            ClientRequest.objects
            .filter(client_id=client_id, type="souscription_magist")
            .exclude(status=ClientRequest.Status.TRAITE)
            .order_by("-created_at")
            .first()
        )
        if req:
            req.status = ClientRequest.Status.TRAITE
            req.agent = agent
            req.treated_at = timezone.now()
            req.save(update_fields=["status", "agent", "treated_at"])
    except Exception:
        pass


class IsAgentOrAdmin(BasePermission):
    """Seuls les agents et admins peuvent modifier ou supprimer."""
    def has_permission(self, request, view):
        if request.method in ('GET', 'HEAD', 'OPTIONS', 'POST'):
            return True
        return request.user.role in ('agent', 'admin')


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

    @action(detail=True, methods=["post"], url_path="assign-police",
            permission_classes=[IsAuthenticated])
    def assign_police(self, request, pk=None):
        """Assigne un numéro de police et active le contrat. Réserve aux agents/admins."""
        if request.user.role not in ("agent", "admin"):
            return Response({"detail": "Action réservée aux agents."}, status=status.HTTP_403_FORBIDDEN)
        num_police = (request.data.get("num_police") or "").strip()
        if not num_police:
            return Response({"detail": "Le numéro de police est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)
        contrat = self.get_object()
        contrat.num_police = num_police
        contrat.code_inspection = (request.data.get("code_inspection") or "").strip()
        contrat.statut = ContratEpargne.Statut.EN_COURS
        contrat.agent = request.user
        contrat.save(update_fields=["num_police", "code_inspection", "statut", "agent"])
        _traiter_requete_magist(contrat.client_id, request.user)
        return Response(ContratEpargneSerializer(contrat).data)

    @action(detail=True, methods=["post"], url_path="change-statut",
            permission_classes=[IsAuthenticated])
    def change_statut(self, request, pk=None):
        """Permet à un agent de changer le statut d'un contrat épargne."""
        if request.user.role not in ("agent", "admin"):
            return Response({"detail": "Action réservée aux agents."}, status=status.HTTP_403_FORBIDDEN)
        nouveau_statut = (request.data.get("statut") or "").strip()
        statuts_valides = [s.value for s in ContratEpargne.Statut]
        if nouveau_statut not in statuts_valides:
            return Response({"detail": f"Statut invalide. Valeurs acceptées : {statuts_valides}"}, status=status.HTTP_400_BAD_REQUEST)
        contrat = self.get_object()
        contrat.statut = nouveau_statut
        contrat.save(update_fields=["statut"])
        try:
            from notifications.service import notification_service
            notification_service.send_notification_to_user(
                user_id=contrat.client_id,
                title="Statut de votre contrat mis à jour",
                message=f"Votre contrat Épargne MAGIST'ASSUR ({contrat.num_police or 'en attente de police'}) "
                        f"est maintenant : {contrat.get_statut_display()}.",
                type="info",
                priority="medium",
                data={"contrat_id": contrat.id, "type": "epargne", "statut": nouveau_statut},
            )
        except Exception:
            pass
        return Response(ContratEpargneSerializer(contrat).data)

    @action(detail=True, methods=["post"], url_path="cotisation")
    def ajouter_cotisation(self, request, pk=None):
        contrat = self.get_object()
        serializer = CotisationEpargneSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cotisation = serializer.save(contrat=contrat)
        # Mettre à jour capital constitué
        contrat.capital_constitue += cotisation.montant
        contrat.save(update_fields=["capital_constitue"])
        return Response(serializer.data, status=status.HTTP_201_CREATED)


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

    @action(detail=True, methods=["post"], url_path="assign-police",
            permission_classes=[IsAuthenticated])
    def assign_police(self, request, pk=None):
        """Assigne un numéro de police et active le contrat. Réserve aux agents/admins."""
        if request.user.role not in ("agent", "admin"):
            return Response({"detail": "Action réservée aux agents."}, status=status.HTTP_403_FORBIDDEN)
        num_police = (request.data.get("num_police") or "").strip()
        if not num_police:
            return Response({"detail": "Le numéro de police est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)
        contrat = self.get_object()
        contrat.num_police = num_police
        contrat.code_inspection = (request.data.get("code_inspection") or "").strip()
        contrat.statut = ContratPrevoyance.Statut.EN_COURS
        contrat.agent = request.user
        contrat.save(update_fields=["num_police", "code_inspection", "statut", "agent"])
        _traiter_requete_magist(contrat.client_id, request.user)
        return Response(ContratPrevoyanceSerializer(contrat).data)

    @action(detail=True, methods=["post"], url_path="change-statut",
            permission_classes=[IsAuthenticated])
    def change_statut(self, request, pk=None):
        """Permet à un agent de changer le statut d'un contrat prévoyance."""
        if request.user.role not in ("agent", "admin"):
            return Response({"detail": "Action réservée aux agents."}, status=status.HTTP_403_FORBIDDEN)
        nouveau_statut = (request.data.get("statut") or "").strip()
        statuts_valides = [s.value for s in ContratPrevoyance.Statut]
        if nouveau_statut not in statuts_valides:
            return Response({"detail": f"Statut invalide. Valeurs acceptées : {statuts_valides}"}, status=status.HTTP_400_BAD_REQUEST)
        contrat = self.get_object()
        contrat.statut = nouveau_statut
        contrat.save(update_fields=["statut"])
        try:
            from notifications.service import notification_service
            notification_service.send_notification_to_user(
                user_id=contrat.client_id,
                title="Statut de votre contrat mis à jour",
                message=f"Votre contrat Prévoyance MAGIST'ASSUR ({contrat.num_police or 'en attente de police'}) "
                        f"est maintenant : {contrat.get_statut_display()}.",
                type="info",
                priority="medium",
                data={"contrat_id": contrat.id, "type": "prevoyance", "statut": nouveau_statut},
            )
        except Exception:
            pass
        return Response(ContratPrevoyanceSerializer(contrat).data)

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

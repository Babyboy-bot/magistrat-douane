from django.core.exceptions import ValidationError
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from core.file_validators import validate_upload
from core.permissions import IsAgentOrAdmin
from .services import (
    assigner_police_epargne, changer_statut_epargne, ajouter_cotisation_epargne,
    assigner_police_prevoyance, changer_statut_prevoyance,
)
from .exports import (
    export_epargne_excel, export_epargne_pdf,
    export_prevoyance_excel, export_prevoyance_pdf,
)


from .models import (
    ContratEpargne, ContratPrevoyance,
    CotisationEpargne, QuestionnaireMedical,
)


def _notify_client_epargne(contrat, title, message, notif_type="info", contrat_type="epargne"):
    try:
        if contrat.client_id:
            from notifications.models import Notification
            from notifications.ws import send_notification_to_user
            notif = Notification.create_notification(
                user_id=contrat.client_id, title=title, message=message, type=notif_type
            )
            try:
                send_notification_to_user(contrat.client_id, {
                    "event": "magist_assur", "id": str(notif.id),
                    "contrat_id": str(contrat.id), "contrat_type": contrat_type,
                    "title": title, "message": message, "type": notif_type,
                })
            except Exception:
                pass
    except Exception:
        pass


def _notify_agents_epargne(contrat, title, message, contrat_type="epargne"):
    try:
        from accounts.models import User
        from notifications.models import Notification
        from notifications.ws import send_notification_to_user
        agents = User.objects.filter(role__in=("agent", "admin"), is_active=True)
        for agent in agents:
            notif = Notification.create_notification(
                user_id=agent.id, title=title, message=message, type="info"
            )
            try:
                send_notification_to_user(agent.id, {
                    "event": "magist_assur", "id": str(notif.id),
                    "contrat_id": str(contrat.id), "contrat_type": contrat_type,
                    "title": title, "message": message, "type": "info",
                })
            except Exception:
                pass
    except Exception:
        pass

from .serializers import (
    ContratEpargneSerializer, ContratEpargneCreateSerializer,
    ContratPrevoyanceSerializer, ContratPrevoyanceCreateSerializer,
    CotisationEpargneSerializer, QuestionnaireMedicalSerializer,
)




class ContratEpargneViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAgentOrAdmin]
    pagination_class = None

    def get_permissions(self):
        if self.action in ("create", "upload_documents"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAgentOrAdmin()]

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
            contrat = serializer.save(client=user)
            _notify_client_epargne(
                contrat,
                "Dossier Magist-Assur reçu",
                "Votre dossier d'épargne a bien été enregistré. Un agent va l'étudier prochainement.",
                "info",
            )
            _notify_agents_epargne(
                contrat,
                "Nouvelle souscription Magist-Assur",
                f"{contrat.client.full_name} a soumis un dossier épargne Magist-Assur.",
            )

    @action(detail=True, methods=["post"], url_path="prise-en-charge",
            permission_classes=[IsAuthenticated])
    def prise_en_charge(self, request, pk=None):
        """Marque le contrat comme étant traité par cet agent."""
        if request.user.role not in ("agent", "admin"):
            return Response({"detail": "Action réservée aux agents."}, status=status.HTTP_403_FORBIDDEN)
        contrat = self.get_object()
        contrat.pris_en_charge_par = request.user
        contrat.save(update_fields=["pris_en_charge_par"])
        return Response(ContratEpargneSerializer(contrat).data)

    @action(detail=True, methods=["post"], url_path="liberer",
            permission_classes=[IsAuthenticated])
    def liberer(self, request, pk=None):
        """Libère le contrat (supprime la prise en charge)."""
        if request.user.role not in ("agent", "admin"):
            return Response({"detail": "Action réservée aux agents."}, status=status.HTTP_403_FORBIDDEN)
        contrat = self.get_object()
        if contrat.statut == "cloture":
            return Response({"detail": "Un contrat clôturé ne peut pas être libéré."}, status=status.HTTP_400_BAD_REQUEST)
        contrat.pris_en_charge_par = None
        contrat.save(update_fields=["pris_en_charge_par"])
        return Response(ContratEpargneSerializer(contrat).data)

    @action(detail=True, methods=["post"], url_path="upload-documents",
            permission_classes=[IsAuthenticated])
    def upload_documents(self, request, pk=None):
        """Upload pièce d'identité et/ou RIB pour un contrat épargne."""
        for field in ("piece_identite", "piece_identite_verso", "rib_document"):
            if field in request.FILES:
                try:
                    validate_upload(request.FILES[field])
                except ValidationError as e:
                    return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        contrat = self.get_object()
        if "piece_identite" in request.FILES:
            contrat.piece_identite = request.FILES["piece_identite"]
        if "piece_identite_verso" in request.FILES:
            contrat.piece_identite_verso = request.FILES["piece_identite_verso"]
        if "rib_document" in request.FILES:
            contrat.rib_document = request.FILES["rib_document"]
        contrat.save()
        return Response(ContratEpargneSerializer(contrat).data)

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
        _notify_client_epargne(
            contrat,
            "Contrat Magist-Assur activé",
            f"Votre contrat épargne est actif. Police n° {num_police}.",
            "success",
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
        _notify_client_epargne(
            contrat,
            "Statut de votre contrat mis à jour",
            f"Votre contrat épargne Magist-Assur est désormais : {nouveau_statut.replace('_', ' ')}.",
            "info",
        )
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

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAgentOrAdmin()]

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

    @action(detail=True, methods=["post"], url_path="prise-en-charge",
            permission_classes=[IsAuthenticated])
    def prise_en_charge(self, request, pk=None):
        """Marque le contrat comme étant traité par cet agent."""
        if request.user.role not in ("agent", "admin"):
            return Response({"detail": "Action réservée aux agents."}, status=status.HTTP_403_FORBIDDEN)
        contrat = self.get_object()
        contrat.pris_en_charge_par = request.user
        contrat.save(update_fields=["pris_en_charge_par"])
        return Response(ContratPrevoyanceSerializer(contrat).data)

    @action(detail=True, methods=["post"], url_path="liberer",
            permission_classes=[IsAuthenticated])
    def liberer(self, request, pk=None):
        """Libère le contrat (supprime la prise en charge)."""
        if request.user.role not in ("agent", "admin"):
            return Response({"detail": "Action réservée aux agents."}, status=status.HTTP_403_FORBIDDEN)
        contrat = self.get_object()
        if contrat.statut == "cloture":
            return Response({"detail": "Un contrat clôturé ne peut pas être libéré."}, status=status.HTTP_400_BAD_REQUEST)
        contrat.pris_en_charge_par = None
        contrat.save(update_fields=["pris_en_charge_par"])
        return Response(ContratPrevoyanceSerializer(contrat).data)

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

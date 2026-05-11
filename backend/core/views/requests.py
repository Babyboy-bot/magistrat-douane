from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from core.models import ClientRequest
from core.serializers import ClientRequestSerializer, ClientRequestCreateSerializer
from core.services import notify_new_request, notify_request_treated


def _notify_sinistre_cloture(req: ClientRequest) -> None:
    """Notifie le client de la clôture de son dossier sinistre avec la note de l'agent."""
    try:
        from notifications.service import notification_service
        nature = req.details.get("nature", "sinistre") if req.details else "sinistre"
        note = req.sinistre_note
        message = f"Votre dossier sinistre {req.numero} ({nature}) a été clôturé."
        if note:
            message += f"\n\nConclusion de l'agent : {note}"
        notification_service.send_notification_to_user(
            user_id=req.client_id,
            title="Dossier sinistre clôturé",
            message=message,
            type="success",
            priority="high",
            data={"request_id": req.id, "numero": req.numero, "event": "sinistre_cloture"},
        )
    except Exception:
        pass


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
        return qs.filter(client=user)

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
        return ClientRequest.objects.filter(client=user)


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
    note = (request.data.get("note") or "").strip()
    if note:
        req.sinistre_note = note
    req.save()
    if req.type == ClientRequest.RequestType.DECLARATION_SINISTRE:
        _notify_sinistre_cloture(req)
    else:
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
        agent = request.user
        tel = getattr(agent, "telephone", None) or ""
        contact_line = f"\n📞 Contact agent : {tel}" if tel else ""
        notification_service.send_notification_to_user(
            user_id=req.client_id,
            title="Votre requête est en cours de traitement",
            message=(
                f"Votre demande {req.numero} ({req.get_type_display()}) "
                f"a été prise en charge par {agent.full_name}.{contact_line}"
            ),
            type="info",
            priority="medium",
            data={"event": "request_claimed", "request_id": req.id, "numero": req.numero, "agent_telephone": tel},
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


# ── Cotation flow ─────────────────────────────────────────────────────────────

COTATION_TYPES = ("cotation_auto", "cotation_mrh")


def _ws_notify(user_id, title, message, notif_type="info", priority="high", data=None):
    """Crée la notif en DB ET broadcast WS direct (double garantie)."""
    try:
        from notifications.models import Notification
        Notification.create_notification(
            user_id=user_id, title=title, message=message,
            type=notif_type, priority=priority, data=data or {}
        )
    except Exception:
        pass
    try:
        from notifications.ws import send_notification_to_user as ws_send
        ws_send(user_id, {
            "title": title, "message": message,
            "type": notif_type, "priority": priority,
            "created_at": timezone.now().isoformat(),
            "data": data or {},
        })
    except Exception:
        pass


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def envoyer_devis_view(request, pk):
    """Agent : upload du devis (livrable) + passage à devis_envoye."""
    if request.user.role not in ("agent", "admin"):
        return Response({"detail": "Permission refusée"}, status=status.HTTP_403_FORBIDDEN)
    try:
        req = ClientRequest.objects.get(pk=pk)
    except ClientRequest.DoesNotExist:
        return Response({"detail": "Requête introuvable"}, status=status.HTTP_404_NOT_FOUND)
    if req.type not in COTATION_TYPES:
        return Response({"detail": "Action réservée aux demandes de cotation."}, status=status.HTTP_400_BAD_REQUEST)
    if req.status not in (ClientRequest.Status.EN_ATTENTE, ClientRequest.Status.EN_COURS, ClientRequest.Status.EN_REVISION):
        return Response({"detail": "Impossible d'envoyer un devis depuis ce statut."}, status=status.HTTP_400_BAD_REQUEST)

    fichier = request.FILES.get("fichier")
    nom = (request.data.get("nom") or "").strip() or (fichier.name if fichier else "Devis")
    if not fichier:
        return Response({"detail": "Le fichier devis est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)

    from core.models import Document
    Document.objects.create(
        request=req,
        nom=nom,
        fichier=fichier,
        type_fichier=fichier.content_type or "application/octet-stream",
        is_livrable=True,
        uploaded_by=request.user,
    )

    req.agent = request.user
    req.status = ClientRequest.Status.DEVIS_ENVOYE
    req.save()

    _ws_notify(
        req.client_id,
        "Votre devis est disponible",
        f"Votre devis pour la demande {req.numero} ({req.get_type_display()}) a été envoyé. Consultez-le et validez, demandez une révision ou refusez.",
        notif_type="info", data={"request_id": req.id, "numero": req.numero, "event": "devis_envoye"},
    )
    return Response(ClientRequestSerializer(req).data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def valider_cotation_view(request, pk):
    """Client : valide le devis → passage à valide."""
    try:
        req = ClientRequest.objects.filter(client=request.user).get(pk=pk)
    except ClientRequest.DoesNotExist:
        return Response({"detail": "Requête introuvable."}, status=status.HTTP_404_NOT_FOUND)
    if req.type not in COTATION_TYPES:
        return Response({"detail": "Action réservée aux demandes de cotation."}, status=status.HTTP_400_BAD_REQUEST)
    if req.status != ClientRequest.Status.DEVIS_ENVOYE:
        return Response({"detail": "Vous ne pouvez valider qu'un devis envoyé."}, status=status.HTTP_400_BAD_REQUEST)

    req.status = ClientRequest.Status.VALIDE
    req.save()

    if req.agent_id:
        _ws_notify(
            req.agent_id,
            "Devis validé par le client",
            f"Le client a validé le devis pour la demande {req.numero} ({req.get_type_display()}). Vous pouvez maintenant envoyer les attestations.",
            notif_type="success", data={"request_id": req.id, "numero": req.numero, "event": "devis_valide"},
        )
    return Response(ClientRequestSerializer(req).data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def revision_cotation_view(request, pk):
    """Client : demande une révision du devis."""
    try:
        req = ClientRequest.objects.filter(client=request.user).get(pk=pk)
    except ClientRequest.DoesNotExist:
        return Response({"detail": "Requête introuvable."}, status=status.HTTP_404_NOT_FOUND)
    if req.type not in COTATION_TYPES:
        return Response({"detail": "Action réservée aux demandes de cotation."}, status=status.HTTP_400_BAD_REQUEST)
    if req.status != ClientRequest.Status.DEVIS_ENVOYE:
        return Response({"detail": "Vous ne pouvez demander une révision que sur un devis envoyé."}, status=status.HTTP_400_BAD_REQUEST)

    note = (request.data.get("note") or "").strip()
    req.status = ClientRequest.Status.EN_REVISION
    if note:
        req.sinistre_note = note
    req.save()

    if req.agent_id:
        msg = f"Le client demande une révision du devis pour la demande {req.numero} ({req.get_type_display()})."
        if note:
            msg += f" Motif : {note}"
        _ws_notify(
            req.agent_id, "Révision de devis demandée", msg,
            notif_type="warning", data={"request_id": req.id, "numero": req.numero, "event": "devis_revision"},
        )
    return Response(ClientRequestSerializer(req).data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def refuser_cotation_view(request, pk):
    """Client : refuse le devis → passage à refuse."""
    try:
        req = ClientRequest.objects.filter(client=request.user).get(pk=pk)
    except ClientRequest.DoesNotExist:
        return Response({"detail": "Requête introuvable."}, status=status.HTTP_404_NOT_FOUND)
    if req.type not in COTATION_TYPES:
        return Response({"detail": "Action réservée aux demandes de cotation."}, status=status.HTTP_400_BAD_REQUEST)
    if req.status != ClientRequest.Status.DEVIS_ENVOYE:
        return Response({"detail": "Vous ne pouvez refuser qu'un devis envoyé."}, status=status.HTTP_400_BAD_REQUEST)

    note = (request.data.get("note") or "").strip()
    req.status = ClientRequest.Status.REFUSE
    if note:
        req.sinistre_note = note
    req.save()

    if req.agent_id:
        msg = f"Le client a refusé le devis pour la demande {req.numero} ({req.get_type_display()})."
        if note:
            msg += f" Motif : {note}"
        _ws_notify(
            req.agent_id, "Devis refusé par le client", msg,
            notif_type="error", data={"request_id": req.id, "numero": req.numero, "event": "devis_refuse"},
        )
    return Response(ClientRequestSerializer(req).data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def envoyer_attestations_view(request, pk):
    """Agent : upload attestations + clôture de la cotation (traite)."""
    if request.user.role not in ("agent", "admin"):
        return Response({"detail": "Permission refusée"}, status=status.HTTP_403_FORBIDDEN)
    try:
        req = ClientRequest.objects.get(pk=pk)
    except ClientRequest.DoesNotExist:
        return Response({"detail": "Requête introuvable"}, status=status.HTTP_404_NOT_FOUND)
    if req.type not in COTATION_TYPES:
        return Response({"detail": "Action réservée aux demandes de cotation."}, status=status.HTTP_400_BAD_REQUEST)
    if req.status != ClientRequest.Status.VALIDE:
        return Response({"detail": "Impossible d'envoyer les attestations : le devis n'a pas encore été validé."}, status=status.HTTP_400_BAD_REQUEST)

    from core.models import Document
    for f in request.FILES.getlist("fichiers"):
        nom = (request.data.get("nom") or f.name).strip()
        Document.objects.create(
            request=req,
            nom=nom,
            fichier=f,
            type_fichier=f.content_type or "application/octet-stream",
            is_livrable=True,
            uploaded_by=request.user,
        )

    req.status = ClientRequest.Status.TRAITE
    req.treated_at = timezone.now()
    req.save()

    _ws_notify(
        req.client_id,
        "Vos attestations sont disponibles",
        f"Les attestations pour votre demande {req.numero} ({req.get_type_display()}) ont été envoyées. Téléchargez-les depuis votre historique.",
        notif_type="success", data={"request_id": req.id, "numero": req.numero, "event": "attestations_envoyees"},
    )
    return Response(ClientRequestSerializer(req).data)

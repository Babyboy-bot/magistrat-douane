from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from core.file_validators import validate_upload
from core.models import ClientRequest
from core.serializers import (
    ClientRequestSerializer, ClientRequestCreateSerializer, ClientRequestUpdateSerializer,
)
from core.services import notify_new_request, _dispatch


class RequestPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


def _requests_version_key(user_id: int) -> str:
    return f"requests_ver_{user_id}"


def _get_requests_version(user_id: int) -> int:
    v = cache.get(_requests_version_key(user_id))
    if v is None:
        cache.set(_requests_version_key(user_id), 1, timeout=None)
        return 1
    return v


def _invalidate_requests_cache(client_id: int) -> None:
    """Incrémente la version du client + de tous les agents/admins."""
    key = _requests_version_key(client_id)
    try:
        cache.incr(key)
    except ValueError:
        cache.set(key, 2, timeout=None)
    from django.contrib.auth import get_user_model
    User = get_user_model()
    for u in User.objects.filter(role__in=("agent", "admin"), is_active=True):
        try:
            cache.incr(_requests_version_key(u.id))
        except ValueError:
            cache.set(_requests_version_key(u.id), 2, timeout=None)


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
        import logging
        logging.getLogger("core.requests").exception("_notify_sinistre_cloture failed for request %s", req.id)


class ClientRequestListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = RequestPagination

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ClientRequestCreateSerializer
        return ClientRequestSerializer

    def get_queryset(self):
        user = self.request.user
        qs = ClientRequest.objects.select_related("client", "agent").prefetch_related("documents")
        if user.role in ("agent", "admin"):
            status_filter = self.request.query_params.get("status")
            type_filter = self.request.query_params.get("type")
            if status_filter:
                qs = qs.filter(status=status_filter)
            if type_filter:
                qs = qs.filter(type=type_filter)
            return qs
        return qs.filter(client=user)

    def list(self, request, *args, **kwargs):
        ver = _get_requests_version(request.user.id)
        params = request.query_params.urlencode()
        cache_key = f"requests_{request.user.id}_v{ver}_{params}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)
        response = super().list(request, *args, **kwargs)
        cache.set(cache_key, response.data, timeout=60)
        return response

    def perform_create(self, serializer):
        instance = serializer.save()
        _invalidate_requests_cache(instance.client_id)
        notify_new_request(instance)


class ClientRequestDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ClientRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT") and self.request.user.role in ("agent", "admin"):
            return ClientRequestUpdateSerializer
        return ClientRequestSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role in ("agent", "admin"):
            return ClientRequest.objects.all()
        return ClientRequest.objects.filter(client=user)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def treat_request_view(request, pk):
    """Clôturer une requête de type declaration_sinistre. Pour les autres types,
    utiliser les endpoints dédiés (cloturer-souscription, cloturer-changement, envoyer-attestations)."""
    if request.user.role not in ("agent", "admin"):
        return Response({"detail": "Permission refusée"}, status=status.HTTP_403_FORBIDDEN)
    try:
        req = ClientRequest.objects.get(pk=pk)
    except ClientRequest.DoesNotExist:
        return Response({"detail": "Requête introuvable"}, status=status.HTTP_404_NOT_FOUND)

    if req.type != ClientRequest.RequestType.DECLARATION_SINISTRE:
        return Response(
            {"detail": "Cet endpoint est réservé aux déclarations de sinistre. Utilisez les endpoints dédiés pour les autres types."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if req.status not in (ClientRequest.Status.EN_COURS,):
        return Response({"detail": "La requête doit être en cours pour être clôturée."}, status=status.HTTP_400_BAD_REQUEST)
    if request.user.role == "agent" and req.agent_id and req.agent_id != request.user.id:
        return Response({"detail": "Cette requête est prise en charge par un autre agent."}, status=status.HTTP_403_FORBIDDEN)

    req.status = "traite"
    req.treated_at = timezone.now()
    req.agent = request.user
    note = (request.data.get("note") or "").strip()
    if note:
        req.sinistre_note = note
    req.save()
    _notify_sinistre_cloture(req)
    _send_treated_email(req)
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
SOUSCRIPTION_TYPES = ("souscription_auto", "souscription_mrh", "incorporation")


def _ws_notify(user_id, title, message, notif_type="info", priority="high", data=None):
    """Crée la notif en DB ET broadcast WS direct (double garantie)."""
    try:
        from notifications.models import Notification
        Notification.create_notification(
            user_id=user_id, title=title, message=message,
            type=notif_type, priority=priority, data=data or {}
        )
    except Exception:
        import logging
        logging.getLogger("core.requests").exception("_ws_notify DB failed for user %s", user_id)
    try:
        from notifications.ws import send_notification_to_user as ws_send
        ws_send(user_id, {
            "title": title, "message": message,
            "type": notif_type, "priority": priority,
            "created_at": timezone.now().isoformat(),
            "data": data or {},
        })
    except Exception:
        import logging
        logging.getLogger("core.requests").exception("_ws_notify WS failed for user %s", user_id)


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
    if request.user.role == "agent" and req.agent_id and req.agent_id != request.user.id:
        return Response({"detail": "Cette requête est assignée à un autre agent."}, status=status.HTTP_403_FORBIDDEN)

    fichier = request.FILES.get("fichier")
    nom = (request.data.get("nom") or "").strip() or (fichier.name if fichier else "Devis")
    if not fichier:
        return Response({"detail": "Le fichier devis est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        validate_upload(fichier)
    except ValidationError as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    from core.models import Document
    Document.objects.create(
        request=req,
        nom=nom,
        fichier=fichier,
        type_fichier=fichier.content_type or "application/octet-stream",
        is_livrable=True,
        uploaded_by=request.user,
    )

    old_agent_id = req.agent_id
    req.agent = request.user
    req.status = ClientRequest.Status.DEVIS_ENVOYE
    req.save()

    if old_agent_id and old_agent_id != request.user.id:
        _ws_notify(
            old_agent_id,
            "Requête réassignée",
            f"La requête {req.numero} a été traitée par {request.user.full_name}.",
            notif_type="info", data={"request_id": req.id, "numero": req.numero, "event": "reassigned"},
        )

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
    if request.user.role == "agent" and req.agent_id and req.agent_id != request.user.id:
        return Response({"detail": "Cette requête est assignée à un autre agent."}, status=status.HTTP_403_FORBIDDEN)

    fichiers = request.FILES.getlist("fichiers")
    if not fichiers:
        return Response({"detail": "Au moins un fichier attestation est requis."}, status=status.HTTP_400_BAD_REQUEST)
    for f in fichiers:
        try:
            validate_upload(f)
        except ValidationError as e:
            return Response({"detail": f"{f.name} : {e}"}, status=status.HTTP_400_BAD_REQUEST)

    from core.models import Document
    custom_nom = (request.data.get("nom") or "").strip()
    for idx, f in enumerate(fichiers, start=1):
        if custom_nom:
            nom = f"{custom_nom}_{idx}" if len(fichiers) > 1 else custom_nom
        else:
            nom = f.name
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
    _send_treated_email(req)
    return Response(ClientRequestSerializer(req).data)


# ── Helper : email de clôture ────────────────────────────────────────────────

def _send_treated_email(req):
    """Envoie l'email générique 'requête traitée' au client (async ou sync)."""
    try:
        from notifications.tasks import send_request_treated_async
        from notifications.emails import send_request_treated
        _dispatch(send_request_treated_async, lambda: send_request_treated(req), req.id)
    except Exception:
        pass


# ── Changement flow ───────────────────────────────────────────────────────────

CHANGEMENT_TYPES = ("changement_nom", "changement_immatriculation")


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def cloturer_changement_view(request, pk):
    """
    Agent : upload nouvelle attestation corrigée + mise à jour immatriculation (si changement_immatriculation
    et emission_id présent dans details) + clôture en 1 action.
    FormData : fichiers[] (obligatoire), new_immatriculation (optionnel).
    """
    if request.user.role not in ("agent", "admin"):
        return Response({"detail": "Permission refusée"}, status=status.HTTP_403_FORBIDDEN)
    try:
        req = ClientRequest.objects.get(pk=pk)
    except ClientRequest.DoesNotExist:
        return Response({"detail": "Requête introuvable"}, status=status.HTTP_404_NOT_FOUND)
    if req.type not in CHANGEMENT_TYPES:
        return Response({"detail": "Action réservée aux demandes de changement."}, status=status.HTTP_400_BAD_REQUEST)
    if req.status != ClientRequest.Status.EN_COURS:
        return Response({"detail": "La requête doit être en cours."}, status=status.HTTP_400_BAD_REQUEST)
    if request.user.role == "agent" and req.agent_id and req.agent_id != request.user.id:
        return Response({"detail": "Cette requête est assignée à un autre agent."}, status=status.HTTP_403_FORBIDDEN)

    fichiers = request.FILES.getlist("fichiers")
    if not fichiers:
        return Response({"detail": "Au moins un document est requis."}, status=status.HTTP_400_BAD_REQUEST)
    for f in fichiers:
        try:
            validate_upload(f)
        except ValidationError as e:
            return Response({"detail": f"{f.name} : {e}"}, status=status.HTTP_400_BAD_REQUEST)

    from core.models import Document, Emission

    for f in fichiers:
        Document.objects.create(
            request=req,
            nom=f.name,
            fichier=f,
            type_fichier=f.content_type or "application/octet-stream",
            is_livrable=True,
            uploaded_by=request.user,
        )

    updated_emission = False
    if req.type == "changement_immatriculation":
        new_immat = (request.data.get("new_immatriculation") or "").strip()
        emission_id = (req.details or {}).get("emission_id")
        if emission_id and new_immat:
            try:
                emission = Emission.objects.get(pk=emission_id, client=req.client)
                emission.immatriculation = new_immat
                emission.situation = Emission.Situation.MODIFICATION
                emission.save(update_fields=["immatriculation", "situation", "updated_at"])
                updated_emission = True
                from core.views.emissions import invalidate_emissions_cache, invalidate_admin_emissions_cache
                invalidate_emissions_cache(req.client_id)
                invalidate_emissions_cache(request.user.id)
                invalidate_admin_emissions_cache()
            except Emission.DoesNotExist:
                pass

    req.status = ClientRequest.Status.TRAITE
    req.treated_at = timezone.now()
    req.agent = request.user
    req.save()

    msg = (
        f"Votre demande {req.numero} ({req.get_type_display()}) a été traitée. "
        f"Le document mis à jour est disponible dans votre historique."
    )
    if updated_emission:
        msg += " L'immatriculation de votre véhicule a été mise à jour dans votre portefeuille."

    _ws_notify(
        req.client_id,
        "Demande de changement traitée",
        msg,
        notif_type="success",
        data={"request_id": req.id, "numero": req.numero, "event": "changement_traite"},
    )
    _send_treated_email(req)
    return Response(ClientRequestSerializer(req).data)


# ── Souscription flow ──────────────────────────────────────────────────────────

RISQUE_MAP = {
    "souscription_auto": "Automobile",
    "souscription_mrh": "Multirisque Habitation",
    "incorporation": "Automobile",
}


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def cloturer_souscription_view(request, pk):
    """
    Agent : upload attestations + création émission + clôture souscription Auto/MRH en 1 action.
    Champs FormData attendus : fichiers[] (obligatoire), num_police, compagnie, echeance, prime_ttc
    (obligatoires), + num_facture, effet, prime_nette, marque, immatriculation, date, situation (optionnels).
    """
    if request.user.role not in ("agent", "admin"):
        return Response({"detail": "Permission refusée"}, status=status.HTTP_403_FORBIDDEN)
    try:
        req = ClientRequest.objects.get(pk=pk)
    except ClientRequest.DoesNotExist:
        return Response({"detail": "Requête introuvable"}, status=status.HTTP_404_NOT_FOUND)
    if req.type not in SOUSCRIPTION_TYPES:
        return Response({"detail": "Action réservée aux demandes de souscription."}, status=status.HTTP_400_BAD_REQUEST)
    if req.status != ClientRequest.Status.EN_COURS:
        return Response({"detail": "La requête doit être en cours pour être clôturée."}, status=status.HTTP_400_BAD_REQUEST)
    if request.user.role == "agent" and req.agent_id and req.agent_id != request.user.id:
        return Response({"detail": "Cette requête est assignée à un autre agent."}, status=status.HTTP_403_FORBIDDEN)

    fichiers = request.FILES.getlist("fichiers")
    if not fichiers:
        return Response({"detail": "Au moins un fichier attestation est requis."}, status=status.HTTP_400_BAD_REQUEST)
    for f in fichiers:
        try:
            validate_upload(f)
        except ValidationError as e:
            return Response({"detail": f"{f.name} : {e}"}, status=status.HTTP_400_BAD_REQUEST)

    required = ["compagnie", "echeance", "prime_ttc"]
    missing = [f for f in required if not request.data.get(f)]
    if missing:
        return Response({"detail": f"Champs manquants : {', '.join(missing)}"}, status=status.HTTP_400_BAD_REQUEST)

    from core.models import Document
    from core.services import create_emission
    from decimal import Decimal, InvalidOperation
    from django.db import IntegrityError

    for f in fichiers:
        Document.objects.create(
            request=req,
            nom=f.name,
            fichier=f,
            type_fichier=f.content_type or "application/octet-stream",
            is_livrable=True,
            uploaded_by=request.user,
        )

    today = timezone.now().date()
    try:
        prime_ttc = Decimal(str(request.data.get("prime_ttc") or 0))
        prime_nette = Decimal(str(request.data.get("prime_nette") or prime_ttc))
        import uuid
        num_facture = (request.data.get("num_facture") or "").strip()
        if not num_facture:
            num_facture = f"FA-AUTO-{uuid.uuid4().hex[:8].upper()}"
        num_police = (request.data.get("num_police") or "").strip()
        if not num_police:
            num_police = f"PO-AUTO-{uuid.uuid4().hex[:8].upper()}"
        emission_data = {
            "client": req.client,
            "num_police": num_police,
            "num_facture": num_facture,
            "compagnie": (request.data.get("compagnie") or "").strip(),
            "risque": (request.data.get("risque") or "").strip() or RISQUE_MAP.get(req.type, ""),
            "marque": (request.data.get("marque") or "-").strip() or "-",
            "immatriculation": (request.data.get("immatriculation") or "-").strip() or "-",
            "date": request.data.get("date") or today,
            "effet": request.data.get("effet") or today,
            "echeance": request.data.get("echeance") or None,
            "prime_nette": prime_nette,
            "prime_ttc": prime_ttc,
            "situation": (request.data.get("situation") or "Affaire nouvelle").strip(),
        }
        if prime_nette > prime_ttc:
            return Response(
                {"detail": "La prime nette ne peut pas dépasser la prime TTC."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        create_emission(emission_data, request.user)
        from core.views.emissions import invalidate_emissions_cache, invalidate_admin_emissions_cache
        invalidate_emissions_cache(request.user.id)
        invalidate_emissions_cache(req.client_id)
        invalidate_admin_emissions_cache()
    except IntegrityError:
        return Response(
            {"detail": f"Le numéro de police '{num_police}' est déjà attribué à une autre émission."},
            status=status.HTTP_409_CONFLICT,
        )
    except (InvalidOperation, ValueError) as e:
        return Response({"detail": f"Erreur création émission : {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    req.status = ClientRequest.Status.TRAITE
    req.treated_at = timezone.now()
    req.agent = request.user
    req.save()

    _ws_notify(
        req.client_id,
        "Vos attestations sont disponibles",
        f"Vos attestations pour la demande {req.numero} ({req.get_type_display()}) ont été émises. "
        f"Téléchargez-les depuis votre historique.",
        notif_type="success",
        data={"request_id": req.id, "numero": req.numero, "event": "attestations_envoyees"},
    )
    _send_treated_email(req)
    return Response(ClientRequestSerializer(req).data)

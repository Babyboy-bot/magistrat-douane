import os

from django.conf import settings

from django.conf.urls.static import static

from django.contrib import admin

from django.http import JsonResponse, FileResponse, Http404

from django.middleware.csrf import get_token

from django.urls import include, path, re_path

from django.views.decorators.http import require_GET


@require_GET
def csrf_token_view(request):
    """Set csrftoken cookie and return token for frontend double-submit pattern."""
    token = get_token(request)
    return JsonResponse({"csrftoken": token})


def _media_access_allowed(user, path: str) -> bool:
    """Contrôle d'accès par fichier : chaque média doit être rattaché à un objet
    dont l'utilisateur est propriétaire. Sans ça, n'importe quel compte
    authentifié pouvait lire les CNI/RIB des autres magistrats."""
    # Les agents/admins gèrent les dossiers : accès complet
    if user.role in ("agent", "admin"):
        return True

    # Avatars : affichés dans les listes à tous les utilisateurs connectés
    if path.startswith("avatars/"):
        return True

    from django.db.models import Q

    from magistassur.models import ContratEpargne

    contrat = (
        ContratEpargne.objects
        .filter(
            Q(piece_identite=path)
            | Q(piece_identite_verso=path)
            | Q(rib_document=path)
        )
        .only("client_id")
        .first()
    )
    if contrat:
        return contrat.client_id == user.id

    from core.models import Document

    doc = (
        Document.objects
        .filter(fichier=path)
        .select_related("request")
        .only("uploaded_by_id", "request__client_id")
        .first()
    )
    if doc:
        if doc.uploaded_by_id == user.id:
            return True
        return bool(doc.request and doc.request.client_id == user.id)

    from django.contrib.auth import get_user_model

    User = get_user_model()
    if User.objects.filter(pk=user.pk, photo=path).exists():
        return True

    # Fichier non rattaché à un objet connu : refus (évite les orphelins publics)
    return False


@require_GET
def protected_media_view(request, path):
    """Sert les fichiers /media/ aux utilisateurs authentifiés ET autorisés.

    Les media contiennent pièces d'identité, RIB et documents clients :
    ils ne doivent jamais être publics. En production, nginx doit proxifier
    /media/ vers le backend (ne pas utiliser `alias`).
    """
    from accounts.authentication import CookieJWTAuthentication
    from rest_framework.exceptions import AuthenticationFailed

    user = None
    try:
        result = CookieJWTAuthentication().authenticate(request)
        if result:
            user = result[0]
    except (AuthenticationFailed, Exception):
        user = None
    if not user or not user.is_authenticated or not user.is_active:
        return JsonResponse({"detail": "Authentification requise."}, status=401)

    normalized = os.path.normpath(path).replace("\\", "/")
    if normalized.startswith("..") or os.path.isabs(normalized):
        raise Http404
    if not _media_access_allowed(user, normalized):
        raise Http404
    file_path = os.path.join(settings.MEDIA_ROOT, normalized)
    if not os.path.isfile(file_path):
        raise Http404
    # Type déterminé par la signature réelle, jamais par l'extension : un fichier
    # hors PDF/JPEG/PNG n'est jamais rendu par le navigateur (anti-XSS stocké).
    from core.file_validators import ALLOWED_TYPES_DOCUMENT, _detect_magic
    fh = open(file_path, "rb")
    detected = _detect_magic(fh.read(16))
    fh.seek(0)
    if detected in ALLOWED_TYPES_DOCUMENT:
        return FileResponse(fh, content_type=detected)
    return FileResponse(fh, as_attachment=True, content_type="application/octet-stream")


urlpatterns = [
    path("acs-backoffice/", admin.site.urls),
    path("api/csrf/", csrf_token_view, name="csrf_token"),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("core.urls")),
    path("api/", include("magistassur.urls")),
    path("api/", include("notifications.urls")),
]


urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', protected_media_view, name="protected_media"),
]

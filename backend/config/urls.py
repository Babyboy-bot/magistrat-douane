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


@require_GET
def protected_media_view(request, path):
    """Sert les fichiers /media/ uniquement aux utilisateurs authentifiés.

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
    file_path = os.path.join(settings.MEDIA_ROOT, normalized)
    if not os.path.isfile(file_path):
        raise Http404
    return FileResponse(open(file_path, "rb"))


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

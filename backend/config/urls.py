from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.db import connection
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.urls import include, path
from django.views.decorators.http import require_GET
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView


@require_GET
def csrf_token_view(request):
    """Set csrftoken cookie and return token for frontend double-submit pattern."""
    token = get_token(request)
    return JsonResponse({"csrftoken": token})


@require_GET
def health_check_view(request):
    """Health check endpoint pour load balancers et monitoring."""
    try:
        connection.ensure_connection()
        db_ok = True
    except Exception:
        db_ok = False
    payload = {"status": "ok" if db_ok else "degraded", "db": db_ok}
    return JsonResponse(payload, status=200 if db_ok else 503)


_api_patterns = [
    path("auth/", include("accounts.urls")),
    path("", include("core.urls")),
    path("", include("magistassur.urls")),
]

urlpatterns = [
    path("acs-backoffice/", admin.site.urls),
    path("api/health/", health_check_view, name="health_check"),
    path("api/csrf/", csrf_token_view, name="csrf_token"),
    # ── Routes versionnées (recommandé pour les nouveaux clients) ──
    path("api/v1/", include((_api_patterns, "v1"))),
    # ── Routes legacy /api/ (rétrocompatibilité clients existants) ──
    path("api/", include(_api_patterns)),
    # ── Documentation API ──
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/schema/swagger-ui/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/schema/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

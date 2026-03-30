from django.conf import settings

from django.conf.urls.static import static

from django.contrib import admin

from django.http import JsonResponse

from django.middleware.csrf import get_token

from django.urls import include, path, re_path

from django.views.decorators.http import require_GET

from django.views.static import serve





@require_GET

def csrf_token_view(request):

    """Set csrftoken cookie and return token for frontend double-submit pattern."""

    token = get_token(request)

    return JsonResponse({"csrftoken": token})





urlpatterns = [

    path("acs-backoffice/", admin.site.urls),

    path("api/csrf/", csrf_token_view, name="csrf_token"),

    path("api/auth/", include("accounts.urls")),

    path("api/", include("core.urls")),

    path("api/", include("magistassur.urls")),

    path("api/", include("notifications.urls")),

]



urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]


from django.middleware.csrf import CsrfViewMiddleware
from rest_framework import exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication


class _CSRFCheck(CsrfViewMiddleware):
    def _reject(self, request, reason):
        # Return the failure reason instead of an HttpResponse
        return reason


class CookieJWTAuthentication(JWTAuthentication):
    """
    Read JWT access token from httpOnly cookie instead of Authorization header.

    Comme le navigateur envoie le cookie automatiquement, les requêtes non sûres
    authentifiées par cookie doivent porter le jeton CSRF (en-tête X-CSRFToken,
    obtenu via /api/csrf/) — même principe que SessionAuthentication de DRF.
    L'authentification par en-tête Authorization n'est pas concernée.
    """

    def authenticate(self, request):
        # Try cookie first
        raw_token = request.COOKIES.get("access_token")
        if raw_token is None:
            # Fallback to Authorization header
            return super().authenticate(request)

        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)
        self.enforce_csrf(request)
        return user, validated_token

    def enforce_csrf(self, request):
        def dummy_get_response(request):  # pragma: no cover
            return None

        check = _CSRFCheck(dummy_get_response)
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            raise exceptions.PermissionDenied(f"CSRF Failed: {reason}")

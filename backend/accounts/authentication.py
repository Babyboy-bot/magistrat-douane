from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """
    Read JWT access token from httpOnly cookie instead of Authorization header.

    CSRF protection is handled by CORS: the API only accepts application/json
    which triggers a preflight OPTIONS request. Only origins listed in
    CORS_ALLOWED_ORIGINS pass the preflight, blocking cross-site POST attacks.
    """

    def authenticate(self, request):
        # Try cookie first
        raw_token = request.COOKIES.get("access_token")
        if raw_token is None:
            # Fallback to Authorization header
            return super().authenticate(request)

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token

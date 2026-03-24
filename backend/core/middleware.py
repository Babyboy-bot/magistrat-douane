"""
core/middleware.py — Injecte user + IP dans le contexte d'audit pour chaque requête.
"""


def _get_client_ip(request):
    x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded:
        return x_forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class AuditContextMiddleware:
    """Positionne l'utilisateur et l'IP courants pour les signaux d'audit."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from core.signals import set_audit_user
        if hasattr(request, "user") and request.user.is_authenticated:
            set_audit_user(request.user, _get_client_ip(request))
        response = self.get_response(request)
        return response

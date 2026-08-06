import threading

_thread_locals = threading.local()


def get_current_request():
    return getattr(_thread_locals, "request", None)


class AuditContextMiddleware:
    """
    Stocke la requête courante dans un thread-local pour permettre
    aux fonctions d'audit d'y accéder sans passage explicite.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.request = request
        from core.signals import set_audit_user
        ip = None
        xff = request.META.get("HTTP_X_FORWARDED_FOR")
        if xff:
            ip = xff.split(",")[0].strip()
        else:
            ip = request.META.get("REMOTE_ADDR")
        user = getattr(request, "user", None)
        if user and getattr(user, "is_authenticated", False):
            set_audit_user(user, ip)
        else:
            set_audit_user(None, ip)
        try:
            response = self.get_response(request)
        finally:
            _thread_locals.request = None
            set_audit_user(None, None)
        return response

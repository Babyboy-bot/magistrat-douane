"""
ASGI config for config project with WebSocket support.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import OriginValidator
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

django_asgi_app = get_asgi_application()

# Import WebSocket patterns after Django setup
from django.conf import settings
import notifications.routing
from notifications.middleware import JWTCookieMiddleware

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    # OriginValidator : le WebSocket s'authentifie par cookie, il faut donc refuser
    # les connexions ouvertes depuis un site tiers (Cross-Site WebSocket Hijacking).
    "websocket": OriginValidator(
        JWTCookieMiddleware(
            URLRouter(
                notifications.routing.websocket_urlpatterns
            )
        ),
        list(settings.CORS_ALLOWED_ORIGINS),
    ),
})

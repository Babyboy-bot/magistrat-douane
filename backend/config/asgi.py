"""
ASGI config for config project with WebSocket support.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

django_asgi_app = get_asgi_application()

# Import WebSocket patterns after Django setup
import notifications.routing
from notifications.middleware import JWTCookieMiddleware

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTCookieMiddleware(
        URLRouter(
            notifications.routing.websocket_urlpatterns
        )
    ),
})

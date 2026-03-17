"""
ASGI configuration for notifications app.
"""
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_asgi_application()

# Import WebSocket routing
from .routing import application as websocket_application

# Mount WebSocket application
application.mount('/ws/', websocket_application, name='notifications')

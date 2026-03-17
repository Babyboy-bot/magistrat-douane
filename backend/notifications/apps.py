"""
Django Channels configuration for notifications app.
"""
from django.apps import AppConfig

class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notifications'
    
    def ready(self):
        # Import and connect signal handlers
        from . import signals

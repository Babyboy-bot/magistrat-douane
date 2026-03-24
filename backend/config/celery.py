"""
Configuration Celery pour les tâches asynchrones (emails, exports, notifications lourdes).
Nécessite Redis : CELERY_BROKER_URL=redis://localhost:6379/0 dans le .env

Lancer le worker en dev :
    celery -A config worker --loglevel=info
"""
import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("acs")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

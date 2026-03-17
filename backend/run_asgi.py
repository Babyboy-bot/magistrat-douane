#!/usr/bin/env python
"""
Script pour démarrer le serveur ASGI avec Django configuré.
"""
import os
import sys
import django
from django.conf import settings

# Ajouter le répertoire backend au path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configurer Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# Importer l'application ASGI
from config.asgi import application

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(application, host="0.0.0.0", port=8000)

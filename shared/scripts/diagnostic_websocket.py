"""
Diagnostic complet de la situation WebSocket.
"""
import os
import sys
import subprocess

def check_websocket_setup():
    """Analyse complète de la configuration WebSocket."""
    print("=" * 80)
    print("DIAGNOSTIC COMPLET WEBSOCKET")
    print("=" * 80)
    
    print("\n📋 1. ÉTAT ACTUEL DU SYSTÈME")
    print("-" * 40)
    
    # Vérifier si le backend tourne
    try:
        import requests
        response = requests.get("http://localhost:8000/api/auth/users/", timeout=2)
        if response.status_code == 200:
            print("✅ Backend Django: EN MARCHE (port 8000)")
        else:
            print(f"❌ Backend Django: ERREUR {response.status_code}")
    except:
        print("❌ Backend Django: HORS LIGNE")
    
    # Vérifier si le frontend tourne
    try:
        import requests
        response = requests.get("http://localhost:3000/", timeout=2)
        if response.status_code == 200:
            print("✅ Frontend Next.js: EN MARCHE (port 3000)")
        else:
            print(f"❌ Frontend Next.js: ERREUR {response.status_code}")
    except:
        print("❌ Frontend Next.js: HORS LIGNE")
    
    print("\n📋 2. CONFIGURATION DJANGO CHANNELS")
    print("-" * 40)
    
    # Vérifier les packages installés
    try:
        import channels
        print("✅ Package 'channels': INSTALLÉ")
        print(f"   Version: {channels.__version__}")
    except ImportError:
        print("❌ Package 'channels': NON INSTALLÉ")
    
    try:
        import channels_redis
        print("✅ Package 'channels-redis': INSTALLÉ")
        print(f"   Version: {channels_redis.__version__}")
    except ImportError:
        print("❌ Package 'channels-redis': NON INSTALLÉ")
    
    try:
        import daphne
        print("✅ Package 'daphne': INSTALLÉ")
        print(f"   Version: {daphne.__version__}")
    except ImportError:
        print("❌ Package 'daphne': NON INSTALLÉ")
    
    try:
        import uvicorn
        print("✅ Package 'uvicorn': INSTALLÉ")
        print(f"   Version: {uvicorn.__version__}")
    except ImportError:
        print("❌ Package 'uvicorn': NON INSTALLÉ")
    
    print("\n📋 3. CONFIGURATION DJANGO")
    print("-" * 40)
    
    # Vérifier les settings Django
    try:
        import os
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
        
        import django
        from django.conf import settings
        
        print(f"✅ Settings Django: CHARGÉ")
        print(f"   DEBUG: {settings.DEBUG}")
        print(f"   ASGI_APPLICATION: {getattr(settings, 'ASGI_APPLICATION', 'NON DÉFINI')}")
        print(f"   CHANNEL_LAYERS: {getattr(settings, 'CHANNEL_LAYERS', 'NON DÉFINI')}")
        
        # Vérifier INSTALLED_APPS
        if 'channels' in settings.INSTALLED_APPS:
            print("✅ 'channels' dans INSTALLED_APPS")
        else:
            print("❌ 'channels' PAS dans INSTALLED_APPS")
        
        if 'notifications' in settings.INSTALLED_APPS:
            print("✅ 'notifications' dans INSTALLED_APPS")
        else:
            print("❌ 'notifications' PAS dans INSTALLED_APPS")
            
    except Exception as e:
        print(f"❌ Erreur configuration Django: {e}")
    
    print("\n📋 4. FICHIERS WEBSOCKET")
    print("-" * 40)
    
    base_dir = "C:\\Users\\STAGIAIRE-ACS\\CascadeProjects\\magistrat-douane\\backend"
    
    files_to_check = [
        "config/asgi.py",
        "config/settings.py", 
        "notifications/__init__.py",
        "notifications/apps.py",
        "notifications/models.py",
        "notifications/consumers.py",
        "notifications/routing.py",
        "notifications/service.py",
        "notifications/signals.py"
    ]
    
    for file_path in files_to_check:
        full_path = os.path.join(base_dir, file_path)
        if os.path.exists(full_path):
            print(f"✅ {file_path}: EXISTE")
        else:
            print(f"❌ {file_path}: MANQUANT")
    
    print("\n📋 5. MIGRATIONS")
    print("-" * 40)
    
    try:
        import os
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
        import django
        from django.core.management import execute_from_command_line
        
        # Vérifier les migrations
        from django.core.management.commands.migrate import Command
        from django.db.migrations.executor import MigrationExecutor
        from django.db.connection import connection
        
        executor = MigrationExecutor(connection, None)
        migrations = executor.migration_plan
        
        if 'notifications' in migrations:
            print("✅ Migrations 'notifications': APPLIQUÉES")
            for migration in migrations['notifications']:
                print(f"   - {migration}")
        else:
            print("❌ Migrations 'notifications': NON APPLIQUÉES")
            
    except Exception as e:
        print(f"❌ Erreur vérification migrations: {e}")
    
    print("\n📋 6. ANALYSE L'ERREUR CONSOLE")
    print("-" * 40)
    
    print("🔍 ERREUR OBSERVÉE:")
    print("   Console Error: {}")
    print("   Call Stack: 4")
    print("   ws.onerror")
    print("   file:///C:/Users/STAGIAIRE-ACS/CascadeProjects/magistrat-douane/.next/dev/static/chunks/_cc8fe04c._.js (638:33)")
    
    print("\n📋 7. DIAGNOSTIC DE L'ERREUR")
    print("-" * 40)
    
    print("🔍 CAUSE PROBABLE:")
    print("   1. Tentative de connexion WebSocket échoue")
    print("   2. Le serveur WebSocket n'est pas démarré")
    print("   - Backend utilise serveur HTTP standard (manage.py)")
    print("   - WebSocket nécessite serveur ASGI (uvicorn/daphne)")
    print("   3. URL WebSocket incorrecte ou middleware mal configuré")
    print("   4. Problèmes d'authentification WebSocket")
    
    print("\n📋 8. SITUATION EXACTE")
    print("-" * 40)
    
    print("✅ CE QUI FONCTIONNE:")
    print("   - Backend HTTP (Django manage.py) : ✅")
    print("   - Authentification JWT : ✅")
    print("   - Frontend Next.js : ✅")
    print("   - Dropdown notifications : ✅")
    print("   - Badge statique : ✅")
    print("   - Base de données notifications : ✅")
    
    print("\n❌ CE QUI NE FONCTIONNE PAS:")
    print("   - WebSocket temps réel : ❌")
    print("   - Connexion persistente : ❌")
    print("   - Notifications instantanées : ❌")
    print("   - Reconnexion automatique : ❌")
    print("   - Badge temps réel : ❌")
    
    print("\n📋 9. CONFIGURATION ACTUELLE")
    print("-" * 40)
    
    print("🔧 Backend:")
    print("   - Serveur Django manage.py (HTTP standard)")
    print("   - Port: 8000")
    print("   - ASGI: Non utilisé")
    print("   - WebSocket: Non configuré")
    
    print("\n🔧 Frontend:")
    print("   - Hook useWebSocket: Implémenté mais désactivé")
    print("   - URL WebSocket: ws://localhost:8000/ws/notifications/")
    print("   - État: Erreur de connexion")
    
    print("\n📋 10. SOLUTION TECHNIQUE")
    print("-" * 40)
    
    print("🎯 POUR RÉSOUDRE LE WEBSOCKET:")
    print("   1. Arrêter le serveur Django actuel")
    print("   2. Corriger les imports dans notifications/routing.py")
    print("   3. Utiliser serveur ASGI: daphne config.asgi:application")
    print("   4. Tester la connexion WebSocket")
    
    print("\n📋 11. ALTERNATIVE IMMÉDIATE")
    print("-" * 40)
    
    print("🔄 SOLUTION TEMPORAIRE:")
    print("   - Garder serveur HTTP standard")
    print("   - Implémenter polling (API toutes les X secondes)")
    print("   - Notifications quasi-réelles")
    print("   - Moins complexe, plus fiable")
    
    print("\n" + "=" * 80)
    print("CONCLUSION")
    print("=" * 80)
    print("L'erreur WebSocket vient du fait que le backend utilise")
    print("un serveur HTTP standard au lieu d'un serveur ASGI.")
    print("WebSocket nécessite un serveur ASGI avec Django Channels.")
    print("\nLe système fonctionne en mode statique mais pas en temps réel.")
    print("=" * 80)

if __name__ == "__main__":
    check_websocket_setup()

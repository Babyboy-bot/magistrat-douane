"""
Debug détaillé du démarrage ASGI pour trouver le problème exact.
"""
import os
import sys
import traceback
import django
from pathlib import Path

def debug_asgi_startup():
    """Debug complet du démarrage ASGI."""
    print("=" * 80)
    print("DEBUG DÉMARRAGE ASGI")
    print("=" * 80)
    
    # 1. Vérifier l'environnement
    print("\n1️⃣ Environnement Python:")
    print(f"  Python: {sys.version}")
    print(f"  Répertoire: {os.getcwd()}")
    print(f"  Path: {sys.path[:3]}...")
    
    # 2. Vérifier les packages
    print("\n2️⃣ Packages installés:")
    try:
        import channels
        print(f"  ✅ channels: {channels.__version__}")
    except ImportError as e:
        print(f"  ❌ channels: {e}")
    
    try:
        import daphne
        print(f"  ✅ daphne: {daphne.__version__}")
    except ImportError as e:
        print(f"  ❌ daphne: {e}")
    
    try:
        import uvicorn
        print(f"  ✅ uvicorn: {uvicorn.__version__}")
    except ImportError as e:
        print(f"  ❌ uvicorn: {e}")
    
    # 3. Configuration Django
    print("\n3️⃣ Configuration Django:")
    try:
        backend_dir = Path(__file__).parent.parent.parent / "backend"
        sys.path.insert(0, str(backend_dir))
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
        
        print(f"  ✅ Backend dir: {backend_dir}")
        print(f"  ✅ Settings: {os.environ['DJANGO_SETTINGS_MODULE']}")
        
        # Setup Django
        django.setup()
        print("  ✅ Django setup: OK")
        
        from django.conf import settings
        
        print(f"  ✅ DEBUG: {settings.DEBUG}")
        print(f"  ✅ ASGI_APPLICATION: {getattr(settings, 'ASGI_APPLICATION', 'Non défini')}")
        print(f"  ✅ CHANNEL_LAYERS: {getattr(settings, 'CHANNEL_LAYERS', 'Non défini')}")
        
    except Exception as e:
        print(f"  ❌ Erreur Django: {e}")
        print(f"  Traceback: {traceback.format_exc()}")
        return
    
    # 4. Import ASGI application
    print("\n4️⃣ Import ASGI application:")
    try:
        from config.asgi import application
        print("  ✅ Import ASGI: OK")
        print(f"  ✅ Application type: {type(application)}")
    except Exception as e:
        print(f"  ❌ Erreur import ASGI: {e}")
        print(f"  Traceback: {traceback.format_exc()}")
        return
    
    # 5. Test routing WebSocket
    print("\n5️⃣ Test routing WebSocket:")
    try:
        import notifications.routing
        patterns = notifications.routing.websocket_urlpatterns
        print(f"  ✅ Patterns: {len(patterns)} routes")
        for pattern in patterns:
            print(f"    - {pattern.pattern.pattern}")
    except Exception as e:
        print(f"  ❌ Erreur routing: {e}")
        print(f"  Traceback: {traceback.format_exc()}")
    
    # 6. Test consumer
    print("\n6️⃣ Test NotificationConsumer:")
    try:
        from notifications.consumers import NotificationConsumer
        print(f"  ✅ Consumer: {NotificationConsumer}")
        print(f"  ✅ Methods: {[m for m in dir(NotificationConsumer) if not m.startswith('_')]}")
    except Exception as e:
        print(f"  ❌ Erreur consumer: {e}")
        print(f"  Traceback: {traceback.format_exc()}")
    
    # 7. Test Daphne manuellement
    print("\n7️⃣ Test Daphne manuel:")
    try:
        import daphne.server
        print("  ✅ Daphne server import: OK")
        
        # Créer une application de test
        from daphne.endpoints import build_endpoint_description_strings
        endpoints = build_endpoint_description_strings(application)
        print(f"  ✅ Endpoints: {endpoints}")
        
    except Exception as e:
        print(f"  ❌ Erreur Daphne: {e}")
        print(f"  Traceback: {traceback.format_exc()}")
    
    # 8. Test Uvicorn manuellement
    print("\n8️⃣ Test Uvicorn manuel:")
    try:
        import uvicorn.config
        import uvicorn.server
        
        # Configurer uvicorn
        config = uvicorn.config.Config(
            "config.asgi:application",
            host="0.0.0.0",
            port=8000,
            log_level="info"
        )
        print(f"  ✅ Config Uvicorn: {config}")
        
        # Ne pas démarrer le serveur, juste tester la config
        print("  ✅ Uvicorn config: OK")
        
    except Exception as e:
        print(f"  ❌ Erreur Uvicorn: {e}")
        print(f"  Traceback: {traceback.format_exc()}")
    
    print("\n" + "=" * 80)
    print("CONCLUSION DEBUG")
    print("=" * 80)
    print("Si tous les tests sont ✅ alors le problème est:")
    print("1. Conflit de port (8000 déjà utilisé)")
    print("2. Problème Windows spécifique")
    print("3. Permission réseau")
    print("\nActions recommandées:")
    print("1. Tuer tous les processus sur port 8000")
    print("2. Essayer un port différent (8001)")
    print("3. Lancer en mode verbose pour voir l'erreur")
    print("=" * 80)

if __name__ == "__main__":
    debug_asgi_startup()

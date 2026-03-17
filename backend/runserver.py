#!/usr/bin/env python
"""Script de démarrage ASGI pour le projet magistrat-douane"""
import os
import sys
import subprocess

def main():
    """Démarrer le serveur avec Daphne (ASGI) au lieu de runserver"""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    
    # Vérifier si nous sommes dans le bon dossier
    if not os.path.exists('manage.py'):
        print("Erreur: manage.py non trouvé. Exécutez ce script depuis le dossier backend.")
        sys.exit(1)
    
    # Démarrer Daphne avec la configuration ASGI
    try:
        print("🚀 Démarrage du serveur ASGI avec Daphne...")
        print("📡 WebSocket support activé")
        print("🌐 Serveur: http://localhost:8000")
        print("🔌 WebSocket: ws://localhost:8000/ws/notifications/")
        print("-" * 50)
        
        subprocess.run([
            'daphne', 
            'config.asgi:application',
            '--bind', '0.0.0.0',
            '--port', '8000',
            '--verbosity', '2'
        ])
        
    except KeyboardInterrupt:
        print("\n🛑 Arrêt du serveur ASGI")
    except FileNotFoundError:
        print("❌ Erreur: Daphne n'est pas installé.")
        print("💡 Installez-le avec: pip install daphne")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Erreur lors du démarrage: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()

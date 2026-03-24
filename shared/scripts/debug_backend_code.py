"""
Debug pour vérifier que le backend utilise bien le code modifié.
"""
import os
import sys
import django

# Configuration Django
sys.path.append('C:\\Users\\STAGIAIRE-ACS\\CascadeProjects\\magistrat-douane\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from accounts.views import CookieLoginView
import inspect

def debug_backend_code():
    """Vérifie que le code du backend est bien à jour."""
    print("=" * 60)
    print("DEBUG CODE BACKEND - COOKIELOGINVIEW")
    print("=" * 60)
    
    # Vérifier le code source de la méthode post
    try:
        source = inspect.getsource(CookieLoginView.post)
        print("📋 Code source de CookieLoginView.post():")
        print("-" * 40)
        print(source)
        print("-" * 40)
        
        # Vérifier si les tokens sont inclus
        if "user_data['access']" in source:
            print("✅ Les tokens sont inclus dans le code")
        else:
            print("❌ Les tokens ne sont pas inclus dans le code")
            print("💡 Le code n'est pas à jour ou le serveur utilise une version cachée")
            
    except Exception as e:
        print(f"❌ Erreur lecture code: {e}")
    
    # Vérifier la configuration
    print("\n⚙️  Configuration des cookies:")
    try:
        from django.conf import settings
        
        print(f"  - COOKIE_SAMESITE: {getattr(settings, 'COOKIE_SAMESITE', 'Non défini')}")
        print(f"  - COOKIE_HTTPONLY: {getattr(settings, 'COOKIE_HTTPONLY', 'Non défini')}")
        print(f"  - COOKIE_SECURE: {getattr(settings, 'COOKIE_SECURE', 'Non défini')}")
        print(f"  - DEBUG: {getattr(settings, 'DEBUG', 'Non défini')}")
        
    except Exception as e:
        print(f"❌ Erreur configuration: {e}")
    
    # Test direct de la vue
    print("\n🧪 Test direct de la vue:")
    try:
        from django.test import RequestFactory
        from accounts.views import CookieLoginView
        
        factory = RequestFactory()
        view = CookieLoginView()
        
        # Créer une requête POST
        request = factory.post('/api/auth/login/', {
            'identifier': 'ADMIN Système',
            'password': 'admin123'
        })
        
        # Exécuter la vue
        response = view.post(request)
        
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.data
            print(f"  Données utilisateur: {len(data)} champs")
            print(f"  Access token: {'✅' if 'access' in data else '❌'}")
            print(f"  Refresh token: {'✅' if 'refresh' in data else '❌'}")
            
            if 'access' in data:
                print("  🎉 La vue fonctionne correctement !")
            else:
                print("  ❌ La vue ne retourne pas les tokens")
        else:
            print(f"  ❌ Erreur: {response.data}")
            
    except Exception as e:
        print(f"❌ Erreur test vue: {e}")
    
    print("\n" + "=" * 60)
    print("CONCLUSION")
    print("=" * 60)
    print("🔍 Si les tokens ne sont pas dans la réponse:")
    print("1. Le serveur utilise une version ancienne du code")
    print("2. Il faut redémarrer complètement le serveur")
    print("3. Vérifier qu'il n'y a pas de processus zombie")
    print("\n🚀 Actions:")
    print("1. Tuer tous les processus Python")
    print("2. Redémarrer le backend")
    print("3. Tester à nouveau")
    print("=" * 60)

if __name__ == "__main__":
    debug_backend_code()

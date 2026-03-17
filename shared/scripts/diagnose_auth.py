"""
Diagnostic des problèmes d'authentification et de déconnexion.
"""
import requests
import json
import time

BASE = "http://localhost:8000"

def diagnose_auth():
    """Diagnostic complet des problèmes d'authentification."""
    print("=" * 80)
    print("DIAGNOSTIC AUTHENTIFICATION - DÉCONNEXION AUTOMATIQUE")
    print("=" * 80)
    
    session = requests.Session()
    
    # Test 1: Login
    print("\n1️⃣ Test de connexion...")
    login_data = {"identifier": "ADMIN Système", "password": "admin123"}
    
    try:
        response = session.post(f"{BASE}/api/auth/login/", json=login_data)
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 200:
            user_data = response.json()
            print(f"  ✅ Connexion réussie")
            print(f"  👤 User: {user_data.get('nom', '')} {user_data.get('prenoms', '')}")
            print(f"  🆔 ID: {user_data.get('id', '')}")
            print(f"  🎭 Rôle: {user_data.get('role', '')}")
            
            # Vérifier les cookies
            cookies = session.cookies
            print(f"  🍪 Cookies reçus: {len(cookies)}")
            for cookie in cookies:
                print(f"    - {cookie.name}: {cookie.value[:20]}...")
                
        else:
            print(f"  ❌ Échec connexion: {response.text}")
            return
            
    except Exception as e:
        print(f"  ❌ Erreur connexion: {e}")
        return
    
    # Test 2: Vérifier la session
    print("\n2️⃣ Test de persistance de session...")
    
    try:
        # Attendre un peu pour simuler l'utilisation
        time.sleep(1)
        
        # Vérifier si la session est toujours active
        response = session.get(f"{BASE}/api/auth/users/")
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 200:
            print("  ✅ Session persistante")
            users = response.json()
            print(f"  👥 Utilisateurs récupérés: {len(users)}")
        else:
            print(f"  ❌ Session perdue: {response.text}")
            
    except Exception as e:
        print(f"  ❌ Erreur session: {e}")
    
    # Test 3: Test avec token JWT
    print("\n3️⃣ Test avec token JWT...")
    
    try:
        # Récupérer le token depuis la réponse de login
        login_response = session.post(f"{BASE}/api/auth/login/", json=login_data)
        if login_response.status_code == 200:
            token_data = login_response.json()
            access_token = token_data.get('access')
            refresh_token = token_data.get('refresh')
            
            print(f"  🔑 Access token: {'✅' if access_token else '❌'}")
            print(f"  🔄 Refresh token: {'✅' if refresh_token else '❌'}")
            
            if access_token:
                # Test avec le token
                headers = {'Authorization': f'Bearer {access_token}'}
                response = requests.get(f"{BASE}/api/auth/users/", headers=headers)
                print(f"  Status avec token: {response.status_code}")
                
                if response.status_code == 200:
                    print("  ✅ Token JWT fonctionne")
                else:
                    print(f"  ❌ Token JWT invalide: {response.text}")
            
    except Exception as e:
        print(f"  ❌ Erreur token: {e}")
    
    # Test 4: Vérifier les headers CORS
    print("\n4️⃣ Test des headers CORS...")
    
    try:
        response = session.options(f"{BASE}/api/auth/login/")
        cors_headers = {
            'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials'),
            'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
        }
        
        print("  🌐 Headers CORS:")
        for key, value in cors_headers.items():
            if value:
                print(f"    ✅ {key}: {value}")
            else:
                print(f"    ❌ {key}: Non défini")
                
    except Exception as e:
        print(f"  ❌ Erreur CORS: {e}")
    
    # Test 5: Vérifier la configuration Django
    print("\n5️⃣ Configuration Django...")
    
    try:
        import os
        import sys
        sys.path.append('C:\\Users\\STAGIAIRE-ACS\\CascadeProjects\\magistrat-douane\\backend')
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
        import django
        django.setup()
        
        from django.conf import settings
        
        print("  ⚙️  Settings Django:")
        print(f"    - DEBUG: {settings.DEBUG}")
        print(f"    - SESSION_COOKIE_SECURE: {getattr(settings, 'SESSION_COOKIE_SECURE', False)}")
        print(f"    - CSRF_COOKIE_SECURE: {getattr(settings, 'CSRF_COOKIE_SECURE', False)}")
        print(f"    - SESSION_COOKIE_AGE: {getattr(settings, 'SESSION_COOKIE_AGE', 'Non défini')}")
        print(f"    - CORS_ALLOWED_ORIGINS: {getattr(settings, 'CORS_ALLOWED_ORIGINS', 'Non défini')}")
        print(f"    - CORS_ALLOW_CREDENTIALS: {getattr(settings, 'CORS_ALLOW_CREDENTIALS', 'Non défini')}")
        
        # Vérifier les middlewares
        middlewares = getattr(settings, 'MIDDLEWARE', [])
        cors_middleware = any('cors' in middleware.lower() for middleware in middlewares)
        session_middleware = any('session' in middleware.lower() for middleware in middlewares)
        auth_middleware = any('auth' in middleware.lower() for middleware in middlewares)
        
        print(f"  🔧 Middlewares:")
        print(f"    - CORS: {'✅' if cors_middleware else '❌'}")
        print(f"    - Session: {'✅' if session_middleware else '❌'}")
        print(f"    - Auth: {'✅' if auth_middleware else '❌'}")
        
    except Exception as e:
        print(f"  ❌ Erreur configuration: {e}")
    
    # Test 6: Simulation de navigation
    print("\n6️⃣ Simulation de navigation...")
    
    try:
        # Se connecter
        session.post(f"{BASE}/api/auth/login/", json=login_data)
        
        # Simuler plusieurs requêtes
        endpoints = [
            "/api/auth/users/",
            "/api/auth/agents/",
            "/api/auth/clients/"
        ]
        
        for i, endpoint in enumerate(endpoints):
            time.sleep(0.5)  # Pause entre requêtes
            response = session.get(f"{BASE}{endpoint}")
            print(f"  Requête {i+1} {endpoint}: {response.status_code}")
            
            if response.status_code == 401:
                print(f"    ❌ Déconnexion détectée après {i+1} requêtes")
                break
        else:
            print("  ✅ Session stable pendant la navigation")
            
    except Exception as e:
        print(f"  ❌ Erreur navigation: {e}")
    
    print("\n" + "=" * 80)
    print("DIAGNOSTIC TERMINÉ")
    print("=" * 80)
    print("🔍 Causes possibles de déconnexion:")
    print("1. 🍪 Cookies non persistants (SameSite, Secure)")
    print("2. 🔑 Token JWT expiré ou mal géré")
    print("3. 🌐 Configuration CORS incorrecte")
    print("4. ⚙️  Session Django mal configurée")
    print("5. 🔄 Middleware d'authentification défaillant")
    print("6. 📱 Frontend ne gère pas correctement les tokens")
    print("\n📋 Prochaines étapes:")
    print("1. Vérifier la configuration des cookies")
    print("2. Implémenter le refresh token")
    print("3. Corriger la configuration CORS")
    print("4. Déboguer le frontend (localStorage/cookies)")
    print("=" * 80)

if __name__ == "__main__":
    diagnose_auth()

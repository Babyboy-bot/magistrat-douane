"""
Test pour vérifier que la correction d'authentification fonctionne.
"""
import requests
import json

BASE = "http://localhost:8000"

def test_auth_fix():
    """Test la correction d'authentification."""
    print("=" * 60)
    print("TEST CORRECTION AUTHENTIFICATION")
    print("=" * 60)
    
    login_data = {"identifier": "ADMIN Système", "password": "admin123"}
    
    # Test 1: Login et vérification des tokens
    print("\n1️⃣ Test login avec tokens dans la réponse...")
    
    try:
        response = requests.post(f"{BASE}/api/auth/login/", json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            print("  ✅ Login réussi")
            
            # Vérifier si les tokens sont dans la réponse
            has_access = 'access' in data
            has_refresh = 'refresh' in data
            
            print(f"  🔑 Access token dans réponse: {'✅' if has_access else '❌'}")
            print(f"  🔄 Refresh token dans réponse: {'✅' if has_refresh else '❌'}")
            
            if has_access and has_refresh:
                print("  🎉 Les tokens sont maintenant inclus dans la réponse !")
                
                # Test 2: Utiliser le token pour une requête
                print("\n2️⃣ Test utilisation du token...")
                headers = {'Authorization': f"Bearer {data['access']}"}
                
                user_response = requests.get(f"{BASE}/api/auth/users/", headers=headers)
                print(f"  Status avec token: {user_response.status_code}")
                
                if user_response.status_code == 200:
                    print("  ✅ Token JWT fonctionne correctement")
                    users = user_response.json()
                    print(f"  👥 {len(users)} utilisateurs récupérés")
                else:
                    print(f"  ❌ Token JWT invalide: {user_response.text}")
                
                # Test 3: Vérifier les cookies
                print("\n3️⃣ Vérification des cookies...")
                cookies = response.cookies
                print(f"  🍪 Nombre de cookies: {len(cookies)}")
                
                has_cookie_access = 'access_token' in cookies
                has_cookie_refresh = 'refresh_token' in cookies
                
                print(f"  🔑 Access token cookie: {'✅' if has_cookie_access else '❌'}")
                print(f"  🔄 Refresh token cookie: {'✅' if has_cookie_refresh else '❌'}")
                
                print("\n4️⃣ Recommandations pour le frontend:")
                print("  📱 Utiliser les tokens depuis la réponse JSON:")
                print(f"     - Access: {data.get('access', 'N/A')[:50]}...")
                print(f"     - Refresh: {data.get('refresh', 'N/A')[:50]}...")
                print("  🍪 OU utiliser les cookies HttpOnly")
                print("  🔐 Stocker dans localStorage ou secure storage")
                
            else:
                print("  ❌ Les tokens ne sont pas dans la réponse")
                print("  💡 Le backend doit être redémarré pour appliquer les changements")
                
        else:
            print(f"  ❌ Login échoué: {response.status_code}")
            print(f"  📄 Réponse: {response.text}")
            
    except Exception as e:
        print(f"  ❌ Erreur: {e}")
    
    print("\n" + "=" * 60)
    print("CONCLUSION")
    print("=" * 60)
    print("🔧 Si les tokens ne sont pas dans la réponse:")
    print("1. Redémarrer le backend Django")
    print("2. Vérifier que les changements sont appliqués")
    print("3. Tester à nouveau")
    print("\n🎯 Si les tokens sont dans la réponse:")
    print("1. Le frontend peut maintenant les utiliser")
    print("2. Plus de déconnexion automatique")
    print("3. Authentification stable")
    print("=" * 60)

if __name__ == "__main__":
    test_auth_fix()

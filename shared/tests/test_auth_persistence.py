"""
Test de persistance d'authentification.
"""
import requests
import json

BASE = "http://localhost:8000"

def test_auth_persistence():
    """Test if authentication persists after page reload simulation."""
    print("=" * 60)
    print("TEST DE PERSISTANCE D'AUTHENTIFICATION")
    print("=" * 60)
    
    # Step 1: Login
    print("\n1️⃣ Connexion...")
    login_data = {"identifier": "KOUASSI Jean-Baptiste", "password": "client123"}
    
    session = requests.Session()
    response = session.post(f"{BASE}/api/auth/login/", json=login_data)
    
    if response.status_code == 200:
        user = response.json()
        print(f"  ✅ Connexion réussie!")
        print(f"  👤 Utilisateur: {user.get('nom', '')} {user.get('prenoms', '')}")
        print(f"  🎭 Rôle: {user.get('role', '')}")
        
        # Step 2: Check if cookies are set
        cookies = session.cookies.get_dict()
        print(f"\n2️⃣ Cookies reçus:")
        for name, value in cookies.items():
            print(f"  - {name}: {value[:20]}...")
        
        # Step 3: Try to access protected endpoint with cookies
        print(f"\n3️⃣ Test accès endpoint protégé...")
        me_response = session.get(f"{BASE}/api/auth/me/")
        
        if me_response.status_code == 200:
            me_user = me_response.json()
            print(f"  ✅ Accès autorisé!")
            print(f"  👤 Utilisateur actuel: {me_user.get('nom', '')} {me_user.get('prenoms', '')}")
            print(f"  🎭 Rôle: {me_user.get('role', '')}")
            print(f"  📧 Email: {me_user.get('email', '')}")
        else:
            print(f"  ❌ Accès refusé: {me_response.text}")
        
        # Step 4: Test if we can access user data
        print(f"\n4️⃣ Test données utilisateur...")
        users_response = session.get(f"{BASE}/api/auth/users/")
        
        if users_response.status_code == 200:
            print(f"  ✅ Données accessibles!")
            users = users_response.json()
            if isinstance(users, dict) and 'results' in users:
                print(f"  📊 {len(users['results'])} utilisateurs trouvés")
            else:
                print(f"  📊 {len(users)} utilisateurs trouvés")
        else:
            print(f"  ❌ Données inaccessibles: {users_response.text}")
        
    else:
        print(f"  ❌ Échec connexion: {response.text}")
    
    print("\n" + "=" * 60)
    print("FIN DU TEST")
    print("=" * 60)

if __name__ == "__main__":
    test_auth_persistence()

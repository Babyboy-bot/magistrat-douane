"""
Test complet de persistance de session.
"""
import requests
import json
import time

BASE = "http://localhost:8000"

def test_full_session_persistence():
    """Test complete session persistence flow."""
    print("=" * 60)
    print("TEST COMPLET DE PERSISTANCE DE SESSION")
    print("=" * 60)
    
    # Create session to simulate browser
    session = requests.Session()
    
    # Step 1: Login
    print("\n1️⃣ Connexion initiale...")
    login_data = {"identifier": "KOUASSI Jean-Baptiste", "password": "client123"}
    
    response = session.post(f"{BASE}/api/auth/login/", json=login_data)
    
    if response.status_code != 200:
        print(f"  ❌ Échec connexion: {response.text}")
        return
    
    user = response.json()
    print(f"  ✅ Connexion réussie!")
    print(f"  👤 {user.get('nom', '')} {user.get('prenoms', '')}")
    print(f"  🎭 Rôle: {user.get('role', '')}")
    
    # Step 2: Simulate page reload - check if session persists
    print(f"\n2️⃣ Simulation rechargement page...")
    
    # Wait a bit to simulate real page reload delay
    time.sleep(0.5)
    
    # Check if we can still access protected data
    me_response = session.get(f"{BASE}/api/auth/me/")
    
    if me_response.status_code == 200:
        me_user = me_response.json()
        print(f"  ✅ Session persiste après rechargement!")
        print(f"  👤 Utilisateur: {me_user.get('nom', '')} {me_user.get('prenoms', '')}")
        print(f"  🎭 Rôle: {me_user.get('role', '')}")
    else:
        print(f"  ❌ Session perdue: {me_response.text}")
        return
    
    # Step 3: Test multiple "page reloads"
    print(f"\n3️⃣ Test rechargements multiples...")
    
    for i in range(3):
        time.sleep(0.3)
        me_response = session.get(f"{BASE}/api/auth/me/")
        
        if me_response.status_code == 200:
            print(f"  ✅ Rechargement {i+1}: Session OK")
        else:
            print(f"  ❌ Rechargement {i+1}: Session perdue")
            return
    
    # Step 4: Test logout and new login
    print(f"\n4️⃣ Test déconnexion et reconnexion...")
    
    logout_response = session.post(f"{BASE}/api/auth/logout/")
    if logout_response.status_code == 200:
        print(f"  ✅ Déconnexion réussie")
    else:
        print(f"  ❌ Échec déconnexion: {logout_response.text}")
    
    # Try to access protected endpoint after logout
    me_after_logout = session.get(f"{BASE}/api/auth/me/")
    if me_after_logout.status_code != 200:
        print(f"  ✅ Accès bien refusé après déconnexion")
    else:
        print(f"  ❌ Accès encore autorisé après déconnexion")
    
    # Re-login
    login_response = session.post(f"{BASE}/api/auth/login/", json=login_data)
    if login_response.status_code == 200:
        print(f"  ✅ Reconnexion réussie")
    else:
        print(f"  ❌ Échec reconnexion: {login_response.text}")
    
    print("\n" + "=" * 60)
    print("TEST TERMINÉ")
    print("=" * 60)

if __name__ == "__main__":
    test_full_session_persistence()

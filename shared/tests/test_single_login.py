"""
Test unique de connexion.
"""
import requests
import json
import time

BASE = "http://localhost:8000"

def test_single_login():
    """Test login with name."""
    data = {"identifier": "KOUASSI Jean-Baptiste", "password": "client123"}
    
    try:
        response = requests.post(f"{BASE}/api/auth/login/", json=data)
        print(f"🔑 Test: KOUASSI Jean-Baptiste")
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 200:
            user_data = response.json()
            role = user_data.get("role")
            name = f"{user_data.get('nom', '')} {user_data.get('prenoms', '')}"
            print(f"  ✅ Connexion réussie!")
            print(f"  👤 Nom: {name}")
            print(f"  🎭 Rôle: {role}")
            print(f"  📧 Email: {user_data.get('email', '')}")
        else:
            print(f"  ❌ Échec: {response.text}")
            
    except Exception as e:
        print(f"  ❌ Erreur: {e}")

if __name__ == "__main__":
    test_single_login()

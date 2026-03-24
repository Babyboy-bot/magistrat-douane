"""
Test d'inscription sans email.
"""
import requests
import json

BASE = "http://localhost:8000"

def test_register_no_email():
    """Test registration without email."""
    data = {
        "nom": "TEST",
        "prenoms": "Utilisateur",
        "profession": "Testeur",
        "profession_type": "autre",
        "telephone": "+225 99 88 77 66",
        "password": "test123456"
        # Note: pas de champ email
    }
    
    try:
        response = requests.post(f"{BASE}/api/auth/register/", json=data)
        print(f"\n📝 Test d'inscription sans email:")
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 201:
            user_data = response.json()
            print(f"  ✅ Inscription réussie!")
            print(f"  👤 Nom: {user_data.get('nom', '')} {user_data.get('prenoms', '')}")
            print(f"  📧 Email: {user_data.get('email', 'None')}")
            print(f"  📱 Téléphone: {user_data.get('telephone', '')}")
            print(f"  🎭 Rôle: {user_data.get('role', '')}")
        else:
            print(f"  ❌ Échec: {response.text}")
            
    except Exception as e:
        print(f"  ❌ Erreur: {e}")

def test_register_with_email():
    """Test registration with email."""
    data = {
        "nom": "TEST",
        "prenoms": "Utilisateur2",
        "profession": "Testeur",
        "profession_type": "autre",
        "telephone": "+225 99 88 77 55",
        "email": "test@example.com",
        "password": "test123456"
    }
    
    try:
        response = requests.post(f"{BASE}/api/auth/register/", json=data)
        print(f"\n📝 Test d'inscription avec email:")
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 201:
            user_data = response.json()
            print(f"  ✅ Inscription réussie!")
            print(f"  👤 Nom: {user_data.get('nom', '')} {user_data.get('prenoms', '')}")
            print(f"  📧 Email: {user_data.get('email', '')}")
            print(f"  📱 Téléphone: {user_data.get('telephone', '')}")
            print(f"  🎭 Rôle: {user_data.get('role', '')}")
        else:
            print(f"  ❌ Échec: {response.text}")
            
    except Exception as e:
        print(f"  ❌ Erreur: {e}")

def main():
    print("=" * 60)
    print("TEST D'INSCRIPTION SANS EMAIL")
    print("=" * 60)
    
    test_register_no_email()
    test_register_with_email()
    
    print("\n" + "=" * 60)
    print("FIN DES TESTS")
    print("=" * 60)

if __name__ == "__main__":
    main()

"""
Test de connexion par nom, email ou téléphone.
"""
import requests
import json

BASE = "http://localhost:8000"

def test_login(identifier, password, expected_role):
    """Test login with different identifiers."""
    data = {"identifier": identifier, "password": password}
    
    try:
        response = requests.post(f"{BASE}/api/auth/login/", json=data)
        print(f"\n🔑 Test: {identifier}")
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 200:
            user_data = response.json()
            role = user_data.get("role")
            name = f"{user_data.get('nom', '')} {user_data.get('prenoms', '')}"
            print(f"  ✅ Connexion réussie!")
            print(f"  👤 Nom: {name}")
            print(f"  🎭 Rôle: {role}")
            print(f"  📧 Email: {user_data.get('email', '')}")
            
            if role == expected_role:
                print(f"  ✅ Rôle correct: {role}")
            else:
                print(f"  ❌ Rôle incorrect: attendu {expected_role}, obtenu {role}")
        else:
            print(f"  ❌ Échec: {response.text}")
            
    except Exception as e:
        print(f"  ❌ Erreur: {e}")

def main():
    print("=" * 60)
    print("TEST DE CONNEXION PAR NOM / EMAIL / TÉLÉPHONE")
    print("=" * 60)
    
    # Tests avec les utilisateurs de base
    test_cases = [
        ("ADMIN Système", "admin123", "admin"),
        ("admin@acs.ci", "admin123", "admin"),
        ("+225 07 00 00 00 00", "admin123", "admin"),
        
        ("TRAORE Moussa", "agent123", "agent"),
        ("agent@acs.ci", "agent123", "agent"),
        ("+225 07 99 88 77 66", "agent123", "agent"),
        
        ("KOUASSI Jean-Baptiste", "client123", "client"),
        ("client1@acs.ci", "client123", "client"),
        ("+225 07 08 09 10 11", "client123", "client"),
        
        ("DIALLO Aminata", "client123", "client"),
        ("client2@acs.ci", "client123", "client"),
        ("+225 01 02 03 04 05", "client123", "client"),
        
        # Tests d'erreur
        ("Inconnu", "wrongpass", "error"),
        ("KOUASSI Jean-Baptiste", "wrongpass", "error"),
        ("wrong@email.com", "wrongpass", "error"),
    ]
    
    for identifier, password, expected in test_cases:
        test_login(identifier, password, expected)
    
    print("\n" + "=" * 60)
    print("FIN DES TESTS")
    print("=" * 60)

if __name__ == "__main__":
    main()

"""
Test que le mot de passe n'est pas modifiable pour un agent inactif.
"""
import requests
import json

BASE = "http://localhost:8000"

def login_admin():
    """Login as admin to get auth cookies."""
    login_data = {"identifier": "ADMIN Système", "password": "admin123"}
    response = requests.post(f"{BASE}/api/auth/login/", json=login_data)
    if response.status_code == 200:
        print("✅ Admin login successful")
        return response.cookies
    else:
        print(f"❌ Admin login failed: {response.text}")
        return None

def test_inactive_agent_password(cookies):
    """Test password modification restrictions for inactive agents."""
    print("\n🔐 Test restriction mot de passe agent inactif...")
    
    # Get all users
    response = requests.get(f"{BASE}/api/auth/users/", cookies=cookies)
    if response.status_code != 200:
        print(f"❌ Failed to get users: {response.text}")
        return
    
    try:
        users = response.json()
        if isinstance(users, dict) and 'results' in users:
            users = users['results']
        
        agents = [u for u in users if u.get("role") == "agent"]
        
        # Find an inactive agent or create one
        inactive_agent = None
        for agent in agents:
            if not agent.get("is_active", True):
                inactive_agent = agent
                break
        
        if not inactive_agent:
            print("  💡 Aucun agent inactif trouvé, création d'un test...")
            # Create a test agent and deactivate it
            create_data = {
                "nom": "TEST",
                "prenoms": "INACTIF",
                "email": "test.inactif@acs.ci",
                "telephone": "+225 99 88 77 33",
                "password": "TestPass123"
            }
            
            create_response = requests.post(f"{BASE}/api/auth/agents/create/", json=create_data, cookies=cookies)
            if create_response.status_code != 201:
                print(f"  ❌ Échec création agent test: {create_response.text}")
                return
            
            new_agent = create_response.json()
            
            # Deactivate the agent
            deactivate_response = requests.patch(
                f"{BASE}/api/auth/users/{new_agent['id']}/", 
                json={"is_active": False},
                cookies=cookies
            )
            
            if deactivate_response.status_code == 200:
                inactive_agent = deactivate_response.json()
                print(f"  ✅ Agent test créé et désactivé")
            else:
                print(f"  ❌ Échec désactivation: {deactivate_response.text}")
                return
        
        print(f"\n  📝 Agent inactif: {inactive_agent['nom']} {inactive_agent['prenoms']}")
        print(f"  📊 État: {'✅ Actif' if inactive_agent.get('is_active', True) else '⚠️ Inactif'}")
        
        # Test 1: Try to modify password while inactive
        print(f"\n1️⃣ Test modification mot de passe (agent inactif)...")
        
        update_data = {
            "nom": inactive_agent["nom"],
            "prenoms": inactive_agent["prenoms"],
            "email": inactive_agent["email"],
            "telephone": inactive_agent["telephone"],
            "password": "NewPassword123"  # Should be ignored for inactive agent
        }
        
        update_response = requests.patch(
            f"{BASE}/api/auth/users/{inactive_agent['id']}/", 
            json=update_data,
            cookies=cookies
        )
        
        print(f"  Status: {update_response.status_code}")
        
        if update_response.status_code == 200:
            updated_agent = update_response.json()
            print(f"  ✅ Mise à jour acceptée (autres champs)")
            print(f"  📊 État inchangé: {'✅ Actif' if updated_agent.get('is_active', True) else '⚠️ Inactif'}")
            
            # Test if password was actually changed by trying to login
            print(f"\n2️⃣ Test connexion avec nouveau mot de passe...")
            
            # First reactivate the agent to test password
            reactivate_response = requests.patch(
                f"{BASE}/api/auth/users/{inactive_agent['id']}/", 
                json={"is_active": True},
                cookies=cookies
            )
            
            if reactivate_response.status_code == 200:
                print(f"  ✅ Agent réactivé pour test mot de passe")
                
                # Try login with new password
                login_response = requests.post(f"{BASE}/api/auth/login/", json={
                    "identifier": f"{inactive_agent['nom']} {inactive_agent['prenoms']}",
                    "password": "NewPassword123"
                })
                
                if login_response.status_code == 200:
                    print(f"  ❌ Le mot de passe a été modifié (PROBLÈME DE SÉCURITÉ!)")
                else:
                    print(f"  ✅ Le mot de passe n'a PAS été modifié (sécurité OK)")
                
                # Try login with old password
                login_old_response = requests.post(f"{BASE}/api/auth/login/", json={
                    "identifier": f"{inactive_agent['nom']} {inactive_agent['prenoms']}",
                    "password": "TestPass123"
                })
                
                if login_old_response.status_code == 200:
                    print(f"  ✅ Ancien mot de passe fonctionne toujours")
                else:
                    print(f"  ❌ Ancien mot de passe ne fonctionne plus")
            else:
                print(f"  ❌ Échec réactivation: {reactivate_response.text}")
        else:
            print(f"  ❌ Échec mise à jour: {update_response.text}")
            
    except Exception as e:
        print(f"❌ Erreur: {e}")

def main():
    print("=" * 60)
    print("TEST SÉCURITÉ MOT DE PASSE AGENT INACTIF")
    print("=" * 60)
    
    cookies = login_admin()
    if cookies:
        test_inactive_agent_password(cookies)
    
    print("\n" + "=" * 60)
    print("FIN DU TEST")
    print("=" * 60)

if __name__ == "__main__":
    main()

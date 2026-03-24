"""
Test de création d'agent avec mot de passe personnalisé.
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

def test_create_agent_with_password(cookies):
    """Test creating an agent with custom password."""
    agent_data = {
        "nom": "TEST",
        "prenoms": "AgentPassword",
        "email": "test.password@acs.ci",
        "telephone": "+225 99 88 77 99",
        "password": "CustomPass123"
    }
    
    response = requests.post(
        f"{BASE}/api/auth/agents/create/", 
        json=agent_data,
        cookies=cookies
    )
    
    print(f"\n👤 Création agent avec mot de passe personnalisé:")
    print(f"  Status: {response.status_code}")
    
    if response.status_code == 201:
        agent = response.json()
        print(f"  ✅ Agent créé avec succès!")
        print(f"  👤 Nom: {agent.get('nom', '')} {agent.get('prenoms', '')}")
        print(f"  📧 Email: {agent.get('email', '')}")
        print(f"  📱 Téléphone: {agent.get('telephone', '')}")
        print(f"  🔑 Mot de passe: CustomPass123")
        
        # Test login with the new password
        print(f"\n🔑 Test de connexion avec le nouveau mot de passe:")
        login_response = requests.post(f"{BASE}/api/auth/login/", json={
            "identifier": "TEST AgentPassword",
            "password": "CustomPass123"
        })
        
        if login_response.status_code == 200:
            print(f"  ✅ Connexion réussie avec le mot de passe personnalisé!")
        else:
            print(f"  ❌ Échec connexion: {login_response.text}")
            
    else:
        print(f"  ❌ Échec création: {response.text}")

def test_update_agent_password(cookies):
    """Test updating agent password."""
    # Get existing agent
    response = requests.get(f"{BASE}/api/auth/users/", cookies=cookies)
    if response.status_code != 200:
        print(f"❌ Failed to get users: {response.text}")
        return
    
    users = response.json()
    if isinstance(users, dict) and 'results' in users:
        users = users['results']
    
    agents = [u for u in users if u.get("role") == "agent"]
    if not agents:
        print("❌ No agents found")
        return
    
    agent = agents[0]
    print(f"\n🔄 Test mise à jour mot de passe pour: {agent['nom']} {agent['prenoms']}")
    
    # First reactivate the agent if inactive
    if not agent.get('is_active', True):
        print(f"  ⚠️ Agent inactif, réactivation...")
        reactivate_response = requests.patch(
            f"{BASE}/api/auth/users/{agent['id']}/", 
            json={"is_active": True},
            cookies=cookies
        )
        if reactivate_response.status_code == 200:
            print(f"  ✅ Agent réactivé")
        else:
            print(f"  ❌ Échec réactivation: {reactivate_response.text}")
            return
    
    update_data = {
        "nom": agent["nom"],
        "prenoms": agent["prenoms"],
        "email": agent["email"],
        "telephone": agent["telephone"],
        "password": "NewPassword123"
    }
    
    response = requests.patch(
        f"{BASE}/api/auth/users/{agent['id']}/", 
        json=update_data,
        cookies=cookies
    )
    
    print(f"  Status: {response.status_code}")
    
    if response.status_code == 200:
        print(f"  ✅ Mot de passe mis à jour avec succès!")
        
        # Test login with new password
        login_response = requests.post(f"{BASE}/api/auth/login/", json={
            "identifier": f"{agent['nom']} {agent['prenoms']}",
            "password": "NewPassword123"
        })
        
        if login_response.status_code == 200:
            print(f"  ✅ Connexion réussie avec le nouveau mot de passe!")
        else:
            print(f"  ❌ Échec connexion: {login_response.text}")
    else:
        print(f"  ❌ Échec mise à jour: {response.text}")

def main():
    print("=" * 60)
    print("TEST MOT DE PASSE AGENT")
    print("=" * 60)
    
    cookies = login_admin()
    if cookies:
        test_create_agent_with_password(cookies)
        test_update_agent_password(cookies)
    
    print("\n" + "=" * 60)
    print("FIN DU TEST")
    print("=" * 60)

if __name__ == "__main__":
    main()

"""
Test de mise à jour d'un agent.
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

def test_update_agent(cookies):
    """Test updating an agent."""
    # First get the agent list
    response = requests.get(f"{BASE}/api/auth/users/", cookies=cookies)
    if response.status_code != 200:
        print(f"❌ Failed to get users: {response.text}")
        return
    
    try:
        users = response.json()
        if isinstance(users, dict) and 'results' in users:
            users = users['results']
        agents = [u for u in users if u.get("role") == "agent"]
    except:
        print(f"❌ Failed to parse users response: {response.text}")
        return
    
    if not agents:
        print("❌ No agents found")
        return
    
    agent = agents[0]
    agent_id = agent["id"]
    print(f"📝 Found agent: {agent['nom']} {agent['prenoms']} (ID: {agent_id})")
    
    # Update the agent
    update_data = {
        "nom": "TRAORE",
        "prenoms": "Moussa MODIFIÉ",
        "email": "agent.modifie@acs.ci",
        "telephone": "+225 07 99 88 77 66"
    }
    
    response = requests.patch(
        f"{BASE}/api/auth/users/{agent_id}/", 
        json=update_data,
        cookies=cookies
    )
    
    print(f"\n🔄 Update attempt:")
    print(f"  Status: {response.status_code}")
    
    if response.status_code == 200:
        updated_user = response.json()
        print(f"  ✅ Agent updated successfully!")
        print(f"  👤 New name: {updated_user.get('nom', '')} {updated_user.get('prenoms', '')}")
        print(f"  📧 New email: {updated_user.get('email', '')}")
        print(f"  📱 New phone: {updated_user.get('telephone', '')}")
    else:
        print(f"  ❌ Update failed: {response.text}")

def main():
    print("=" * 60)
    print("TEST DE MISE À JOUR D'AGENT")
    print("=" * 60)
    
    cookies = login_admin()
    if cookies:
        test_update_agent(cookies)
    
    print("\n" + "=" * 60)
    print("FIN DU TEST")
    print("=" * 60)

if __name__ == "__main__":
    main()

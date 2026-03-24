"""
Test de toggle actif/inactif d'un agent.
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

def test_toggle_agent(cookies):
    """Test toggling agent active/inactive status."""
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
    current_status = agent.get("is_active", True)
    print(f"📝 Found agent: {agent['nom']} {agent['prenoms']} (ID: {agent_id})")
    print(f"   Current status: {'✅ Actif' if current_status else '⚠️ Inactif'}")
    
    # Toggle the agent status
    new_status = not current_status
    update_data = {
        "nom": agent["nom"],
        "prenoms": agent["prenoms"],
        "email": agent["email"],
        "telephone": agent["telephone"],
        "is_active": new_status,
    }
    
    response = requests.patch(
        f"{BASE}/api/auth/users/{agent_id}/", 
        json=update_data,
        cookies=cookies
    )
    
    print(f"\n🔄 Toggle attempt:")
    print(f"  Status: {response.status_code}")
    
    if response.status_code == 200:
        updated_user = response.json()
        updated_status = updated_user.get("is_active", True)
        print(f"  ✅ Agent status updated successfully!")
        print(f"  👤 Name: {updated_user.get('nom', '')} {updated_user.get('prenoms', '')}")
        print(f"  📊 New status: {'✅ Actif' if updated_status else '⚠️ Inactif'}")
        
        # Toggle back to original
        print(f"\n🔄 Toggling back to original status...")
        update_data["is_active"] = current_status
        response = requests.patch(
            f"{BASE}/api/auth/users/{agent_id}/", 
            json=update_data,
            cookies=cookies
        )
        
        if response.status_code == 200:
            print(f"  ✅ Restored to original status: {'✅ Actif' if current_status else '⚠️ Inactif'}")
        else:
            print(f"  ❌ Failed to restore: {response.text}")
    else:
        print(f"  ❌ Toggle failed: {response.text}")

def main():
    print("=" * 60)
    print("TEST DE TOGGLE AGENT ACTIF/INACTIF")
    print("=" * 60)
    
    cookies = login_admin()
    if cookies:
        test_toggle_agent(cookies)
    
    print("\n" + "=" * 60)
    print("FIN DU TEST")
    print("=" * 60)

if __name__ == "__main__":
    main()

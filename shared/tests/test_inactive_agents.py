"""
Test si les agents inactifs sont retournés par l'API.
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

def test_inactive_agents_visibility(cookies):
    """Test if inactive agents are returned by API."""
    print("\n📋 Test visibilité des agents inactifs...")
    
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
        
        print(f"  📊 Total agents trouvés: {len(agents)}")
        
        active_agents = [a for a in agents if a.get("is_active", True)]
        inactive_agents = [a for a in agents if not a.get("is_active", True)]
        
        print(f"  ✅ Agents actifs: {len(active_agents)}")
        print(f"  ⚠️  Agents inactifs: {len(inactive_agents)}")
        
        if inactive_agents:
            print(f"\n  📝 Agents inactifs détaillés:")
            for agent in inactive_agents:
                print(f"    - {agent.get('nom', '')} {agent.get('prenoms', '')} ({agent.get('email', '')})")
        
        # Test if we can edit an inactive agent
        if inactive_agents:
            test_agent = inactive_agents[0]
            agent_id = test_agent["id"]
            
            print(f"\n🔧 Test modification agent inactif: {test_agent['nom']} {test_agent['prenoms']}")
            
            # Try to update the agent
            update_data = {
                "nom": test_agent["nom"],
                "prenoms": test_agent["prenoms"] + " (MODIFIÉ)",
                "email": test_agent["email"],
                "telephone": test_agent["telephone"],
                "is_active": True  # Reactivate
            }
            
            update_response = requests.patch(
                f"{BASE}/api/auth/users/{agent_id}/", 
                json=update_data,
                cookies=cookies
            )
            
            print(f"  Status: {update_response.status_code}")
            
            if update_response.status_code == 200:
                updated_agent = update_response.json()
                print(f"  ✅ Agent modifié avec succès!")
                print(f"  👤 Nouveau nom: {updated_agent.get('nom', '')} {updated_agent.get('prenoms', '')}")
                print(f"  📊 Nouvel état: {'✅ Actif' if updated_agent.get('is_active', True) else '⚠️ Inactif'}")
            else:
                print(f"  ❌ Échec modification: {update_response.text}")
        else:
            print(f"\n💡 Aucun agent inactif trouvé pour tester")
            
    except Exception as e:
        print(f"❌ Erreur parsing: {e}")

def main():
    print("=" * 60)
    print("TEST VISIBILITÉ AGENTS INACTIFS")
    print("=" * 60)
    
    cookies = login_admin()
    if cookies:
        test_inactive_agents_visibility(cookies)
    
    print("\n" + "=" * 60)
    print("FIN DU TEST")
    print("=" * 60)

if __name__ == "__main__":
    main()

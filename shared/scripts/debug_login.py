"""
Debug détaillé de la réponse de login.
"""
import requests
import json

BASE = "http://localhost:8000"

def debug_login():
    """Debug détaillé du login."""
    print("=" * 60)
    print("DEBUG DÉTAILLÉ - LOGIN")
    print("=" * 60)
    
    login_data = {"identifier": "ADMIN Système", "password": "admin123"}
    
    try:
        response = requests.post(f"{BASE}/api/auth/login/", json=login_data)
        
        print(f"\n📊 Status Code: {response.status_code}")
        print(f"📋 Headers:")
        for key, value in response.headers.items():
            print(f"  {key}: {value}")
        
        print(f"\n📄 Response Body:")
        try:
            data = response.json()
            print(json.dumps(data, indent=2, ensure_ascii=False))
        except:
            print(response.text)
        
        print(f"\n🍪 Cookies:")
        for cookie in response.cookies:
            print(f"  {cookie.name}: {cookie.value}")
            print(f"    - Domain: {cookie.domain}")
            print(f"    - Path: {cookie.path}")
            print(f"    - Secure: {cookie.secure}")
            print(f"    - HttpOnly: {cookie.http_only}")
            print(f"    - SameSite: {getattr(cookie, 'same_site', 'Non défini')}")
        
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    debug_login()

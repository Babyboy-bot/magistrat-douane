import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.test import Client
from rest_framework.test import APIClient
from django.core.management import call_command

User = get_user_model()

print('=== AUDIT SÉCURITÉ APPROFONDI ===')

# 1. Validation des permissions
print(f'\n🔒 Validation des permissions:')
admin = User.objects.filter(role='admin').first()
agent = User.objects.filter(role='agent').first()
magistrat = User.objects.filter(profession_type='magistrat', role='client').first()

print(f'  - Admin trouvé: {admin.email if admin else "Non"}')
print(f'  - Agent trouvé: {agent.email if agent else "Non"}')
print(f'  - Magistrat trouvé: {magistrat.email if magistrat else "Non"}')

# 2. Vérification des rôles et statuts
print(f'\n👥 Distribution des rôles:')
for role in User.Role.values:
    count = User.objects.filter(role=role).count()
    print(f'  - {role}: {count} utilisateurs')

print(f'\n⚖️ Distribution magistrats:')
magistrats = User.objects.filter(profession_type='magistrat')
verified_magistrats = magistrats.filter(verified=True)
pending_magistrats = magistrats.filter(account_status='pending_verification')

print(f'  - Total magistrats: {magistrats.count()}')
print(f'  - Magistrats vérifiés: {verified_magistrats.count()}')
print(f'  - Magistrats en attente: {pending_magistrats.count()}')

# 3. Validation de la logique métier
print(f'\n🧪 Validation logique métier:')
for user in User.objects.filter(profession_type='magistrat')[:3]:
    expected_role = 'client'
    expected_risk = 'premium'
    expected_status = 'verified'
    
    role_ok = user.role == expected_role
    risk_ok = user.risk_level == expected_risk
    status_ok = user.account_status == expected_status
    
    print(f'  - {user.email}:')
    print(f'    Role {user.role} {"✅" if role_ok else "❌"} (attendu: {expected_role})')
    print(f'    Risk {user.risk_level} {"✅" if risk_ok else "❌"} (attendu: {expected_risk})')
    print(f'    Status {user.account_status} {"✅" if status_ok else "❌"} (attendu: {expected_status})')

# 4. Vérification des accès
print(f'\n🚪 Vérification des accès:')
client = APIClient()

# Test accès non authentifié
response = client.get('/api/auth/users/')
print(f'  - Accès non authentifié: {response.status_code} {"✅" if response.status_code == 401 else "❌"}')

# Simulation d'authentification
if agent:
    client.force_authenticate(user=agent)
    response = client.get('/api/auth/users/')
    print(f'  - Accès agent: {response.status_code} {"✅" if response.status_code == 200 else "❌"}')

# 5. Validation des données sensibles
print(f'\n🔐 Validation des données sensibles:')
sensitive_fields = ['email', 'telephone', 'verified', 'verified_at']
for field in sensitive_fields:
    has_index = any(field in idx[0] for idx in User._meta.indexes)
    print(f'  - Index {field}: {"✅" if has_index else "❌"}')

print(f'\n✅ Audit sécurité terminé')

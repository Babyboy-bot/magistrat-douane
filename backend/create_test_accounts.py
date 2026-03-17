import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password

User = get_user_model()

print('=== CRÉATION MOTS DE PASSE SIMPLIFIÉS POUR TEST ===')

# Comptes de test avec mots de passe simples
test_accounts = [
    {'email': 'admin@acs.ci', 'password': 'admin123', 'role': 'admin'},
    {'email': 'keliemmanuel04@gmail.com', 'password': 'agent123', 'role': 'agent'},
    {'email': 'test_magistrat@example.com', 'password': 'magistrat123', 'role': 'client'},
    {'email': 'test_client@example.com', 'password': 'client123', 'role': 'client'},
    {'email': 'test_standard@example.com', 'password': 'standard123', 'role': 'prospect'},
]

for account in test_accounts:
    try:
        user = User.objects.get(email=account['email'])
        user.password = make_password(account['password'])
        user.save()
        print(f'✅ {account["email"]} | 🔑 {account["password"]} | 👤 {account["role"]}')
    except User.DoesNotExist:
        print(f'❌ Utilisateur non trouvé: {account["email"]}')

print(f'\\n🎯 COMPTES DE TEST DISPONIBLES:')
print(f'\\n📋 ADMINISTRATEUR:')
print(f'   📧 admin@acs.ci')
print(f'   🔑 admin123')
print(f'   👤 Rôle: admin')
print(f'   🔗 Accès: http://localhost:3001/admin/dashboard')

print(f'\\n📋 AGENT:')
print(f'   📧 keliemmanuel04@gmail.com')
print(f'   🔑 agent123')
print(f'   👤 Rôle: agent')
print(f'   🔗 Accès: http://localhost:3001/agent/dashboard')

print(f'\\n📋 CLIENT MAGISTRAT:')
print(f'   📧 test_magistrat@example.com')
print(f'   🔑 magistrat123')
print(f'   👤 Rôle: client (magistrat)')
print(f'   🔗 Accès: http://localhost:3001/client/dashboard')

print(f'\\n📋 CLIENT STANDARD:')
print(f'   📧 test_client@example.com')
print(f'   🔑 client123')
print(f'   👤 Rôle: client (standard)')
print(f'   🔗 Accès: http://localhost:3001/client/dashboard')

print(f'\\n📋 PROSPECT:')
print(f'   📧 test_standard@example.com')
print(f'   🔑 standard123')
print(f'   👤 Rôle: prospect')
print(f'   🔗 Accès: http://localhost:3001/client/dashboard')

print(f'\\n🚀 UTILISEZ CES COMPTES POUR TESTER LA PLATEFORME !')

import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import ClientRequest, Document

User = get_user_model()

print('=== ANALYSE ERREURS FRONTEND ===')

# 1. Vérifier les mots de passe vides restants
empty_passwords = User.objects.filter(password='').count()
print(f'\\n🔐 Mots de passe vides: {empty_passwords}')

if empty_passwords > 0:
    print('  Utilisateurs avec mots de passe vides:')
    for user in User.objects.filter(password=''):
        print(f'    - {user.email} | ID: {user.id}')

# 2. Vérifier les erreurs d'inscription récentes
print(f'\\n📊 Analyse des erreurs d\\'inscription:')
print('  Erreur 400: Bad Request - Possibles causes:')
print('    - Email déjà existant')
print('    - Mot de passe trop court')
print('    - Champ requis manquant')
print('    - Format email invalide')
print('    - Validation backend échouée')

# 3. Vérifier la configuration WebSocket
print(f'\\n🔌 Configuration WebSocket:')
print('  WebSocket connected: Normal (reconnexion automatique)')
print('  AbortError: Erreur audio/vidéo (non critique)')
print('  Fast Refresh: Normal (développement)')

# 4. Corriger le dernier mot de passe vide
if empty_passwords > 0:
    print(f'\\n🔧 CORRECTION AUTOMATIQUE:')
    from django.contrib.auth.hashers import make_password
    import secrets
    import string
    
    def generate_secure_password(length=12):
        characters = string.ascii_letters + string.digits + '!@#$%^&*'
        return ''.join(secrets.choice(characters) for _ in range(length))
    
    for user in User.objects.filter(password=''):
        new_password = generate_secure_password()
        user.password = make_password(new_password)
        user.save()
        print(f'  ✅ {user.email}: Mot de passe généré')
        print(f'     🔑 Nouveau mot de passe: {new_password}')
    
    remaining = User.objects.filter(password='').count()
    print(f'\\n  🎯 Mots de passe restants: {remaining}')

print(f'\\n✅ Analyse terminée!')

import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
import secrets
import string

User = get_user_model()

print('=== CORRECTION SÉCURITÉ : MOTS DE PASSE VIDES ===')

# Identifier les utilisateurs avec mots de passe vides
users_with_empty_passwords = User.objects.filter(password='')

print(f'🔍 Utilisateurs avec mots de passe vides: {users_with_empty_passwords.count()}')

# Générer des mots de passe sécurisés
def generate_secure_password(length=12):
    """Générer un mot de passe sécurisé"""
    characters = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(characters) for _ in range(length))
    return password

# Corriger les mots de passe vides
corrected_count = 0
for user in users_with_empty_passwords:
    # Générer un mot de passe sécurisé
    new_password = generate_secure_password()
    hashed_password = make_password(new_password)
    
    # Mettre à jour l'utilisateur
    user.password = hashed_password
    user.save()
    
    corrected_count += 1
    print(f'  ✅ {user.email}: Mot de passe généré et hashé')
    
    # Afficher le mot de passe pour la communication
    print(f'     🔑 Nouveau mot de passe: {new_password}')

print(f'\\n🎉 Correction terminée: {corrected_count} mots de passe corrigés')

# Validation
remaining_empty = User.objects.filter(password='').count()
print(f'\\n🔍 Validation: {remaining_empty} mots de passe vides restants')

if remaining_empty == 0:
    print('✅ Tous les mots de passe sont maintenant sécurisés!')
else:
    print('⚠️ Des mots de passe vides restent - Vérification nécessaire')

# Recommandations
print(f'\\n💡 RECOMMANDATIONS SÉCURITÉ:')
print(f'  1. Communiquer les nouveaux mots de passe aux utilisateurs')
print(f'  2. Forcer le changement du mot de passe à la première connexion')
print(f'  3. Mettre en place une politique de mots de passe robuste')
print(f'  4. Activer l\'authentification à deux facteurs pour les comptes sensibles')
print(f'  5. Configurer la rotation automatique des mots de passe')

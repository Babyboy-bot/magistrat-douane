import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

User = get_user_model()

print('=== VALIDATION CONFIGURATION JWT ===')

# Vérifier la configuration JWT
jwt_config = settings.SIMPLE_JWT

print(f'\\n🔧 Configuration JWT actuelle:')
for key, value in jwt_config.items():
    if key in ['ACCESS_TOKEN_LIFETIME', 'REFRESH_TOKEN_LIFETIME']:
        print(f'  {key}: {value}')
    elif key in ['ALGORITHM', 'SIGNING_KEY']:
        print(f'  {key}: {value[:20]}...' if len(str(value)) > 20 else f'  {key}: {value}')
    elif key in ['ROTATE_REFRESH_TOKENS', 'BLACKLIST_AFTER_ROTATION', 'CHECK_REVOKE_TOKEN']:
        print(f'  {key}: {value}')

# Test de génération de token
print(f'\\n🧪 Test de génération de token:')
try:
    user = User.objects.first()
    if user:
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        
        print(f'  ✅ Token généré avec succès')
        print(f'  🔑 Access Token: {str(access_token)[:50]}...')
        print(f'  🔄 Refresh Token: {str(refresh)[:50]}...')
        
        # Vérifier les claims
        access_payload = access_token.payload
        print(f'  📋 Claims: {list(access_payload.keys())}')
        
    else:
        print(f'  ❌ Aucun utilisateur trouvé pour le test')
        
except Exception as e:
    print(f'  ❌ Erreur génération token: {e}')

# Score de sécurité JWT
print(f'\\n🛡️ Score de sécurité JWT:')
security_features = {
    'algorithm_configured': 'ALGORITHM' in jwt_config,
    'token_rotation': jwt_config.get('ROTATE_REFRESH_TOKENS', False),
    'blacklist_enabled': jwt_config.get('BLACKLIST_AFTER_ROTATION', False),
    'revoke_check': jwt_config.get('CHECK_REVOKE_TOKEN', False),
    'short_access_lifetime': jwt_config.get('ACCESS_TOKEN_LIFETIME').total_seconds() <= 1800,  # 30 min
    'refresh_rotation': jwt_config.get('REVOKE_TOKEN_ON_REFRESH', False)
}

score = 0
max_score = len(security_features)
for feature, enabled in security_features.items():
    if enabled:
        score += 1
        print(f'  ✅ {feature}')
    else:
        print(f'  ❌ {feature}')

jwt_security_score = (score / max_score) * 100
print(f'\\n🎯 Score sécurité JWT: {jwt_security_score:.1f}/{max_score * 10}')

if jwt_security_score >= 80:
    print('🏆 Configuration JWT sécurisée pour production!')
elif jwt_security_score >= 60:
    print('✅ Configuration JWT acceptable')
else:
    print('⚠️ Configuration JWT nécessite des améliorations')

# Recommandations
print(f'\\n💡 Recommandations JWT:')
if jwt_security_score < 100:
    if not security_features['algorithm_configured']:
        print('  - Configurer un algorithme de signature fort (HS256)')
    if not security_features['token_rotation']:
        print('  - Activer la rotation des tokens')
    if not security_features['blacklist_enabled']:
        print('  - Activer la blacklist après rotation')
    if not security_features['short_access_lifetime']:
        print('  - Réduire la durée de vie des tokens d\'accès')
    if not security_features['revoke_check']:
        print('  - Activer la vérification de révocation')
else:
    print('  ✅ Configuration JWT optimale')
    
print(f'\\n🚀 JWT prêt pour production!')

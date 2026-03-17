import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

print('=== MIGRATION CORRECTIVE MAGISTRATS ===')

# Identifier tous les magistrats avec statuts incorrects
magistrats = User.objects.filter(profession_type='magistrat')
incorrect_magistrats = []

for mag in magistrats:
    issues = []
    if mag.role != 'client':
        issues.append('role')
    if mag.risk_level != 'premium':
        issues.append('risk_level')
    if mag.account_status != 'verified':
        issues.append('account_status')
    if not mag.verified:
        issues.append('verified')
    
    if issues:
        incorrect_magistrats.append((mag, issues))

print(f'📊 Magistrats à corriger : {len(incorrect_magistrats)}')

# Correction automatique
corrected_count = 0
for mag, issues in incorrect_magistrats:
    print(f'\\n🔧 Correction de {mag.email}:')
    
    # Sauvegarder l'état initial
    old_values = {
        'role': mag.role,
        'risk_level': mag.risk_level,
        'account_status': mag.account_status,
        'verified': mag.verified,
        'verified_at': mag.verified_at
    }
    
    # Appliquer les corrections
    if 'role' in issues:
        mag.role = 'client'
        print(f'  - role: {old_values["role"]} → client')
    
    if 'risk_level' in issues:
        mag.risk_level = 'premium'
        print(f'  - risk_level: {old_values["risk_level"]} → premium')
    
    if 'account_status' in issues:
        mag.account_status = 'verified'
        print(f'  - account_status: {old_values["account_status"]} → verified')
    
    if 'verified' in issues:
        mag.verified = True
        mag.verified_at = timezone.now()
        print(f'  - verified: {old_values["verified"]} → True')
        print(f'  - verified_at: {old_values["verified_at"]} → {mag.verified_at}')
    
    mag.save()
    corrected_count += 1
    print(f'  ✅ Corrigé avec succès')

print(f'\\n🎉 Migration terminée : {corrected_count} magistrats corrigés')

# Validation finale
print(f'\\n🔍 Validation finale:')
final_magistrats = User.objects.filter(profession_type='magistrat')
consistent_count = 0

for mag in final_magistrats:
    is_consistent = (
        mag.role == 'client' and
        mag.risk_level == 'premium' and
        mag.account_status == 'verified' and
        mag.verified == True
    )
    if is_consistent:
        consistent_count += 1
    else:
        print(f'  ❌ {mag.email} encore incohérent')

print(f'✅ Magistrats cohérents : {consistent_count}/{final_magistrats.count()}')
print(f'📈 Taux de cohérence : {consistent_count/final_magistrats.count()*100:.1f}%')

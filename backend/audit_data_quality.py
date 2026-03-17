import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import ClientRequest, Document

User = get_user_model()

print('=== AUDIT QUALITÉ DES DONNÉES ===')

# Validation de la cohérence des données
print(f'\n🔍 Cohérence des données magistrats:')
magistrats = User.objects.filter(profession_type='magistrat')
inconsistent = []

for mag in magistrats:
    issues = []
    if mag.role != 'client':
        issues.append(f'role={mag.role} (devrait être client)')
    if mag.risk_level != 'premium':
        issues.append(f'risk_level={mag.risk_level} (devrait être premium)')
    if mag.account_status != 'verified':
        issues.append(f'account_status={mag.account_status} (devrait être verified)')
    if not mag.verified:
        issues.append(f'verified={mag.verified} (devrait être True)')
    
    if issues:
        issue_str = ' | '.join(issues)
        inconsistent.append(f'{mag.email}: {issue_str}')

if inconsistent:
    print(f'❌ Données incohérentes trouvées:')
    for issue in inconsistent:
        print(f'  - {issue}')
else:
    print(f'✅ Toutes les données magistrats sont cohérentes')

# Validation des documents
print(f'\n📄 Validation des documents:')
documents = Document.objects.all()
orphan_docs = documents.filter(request__isnull=True)
print(f'  - Total documents: {documents.count()}')
print(f'  - Documents orphelins: {orphan_docs.count()}')

# Validation des requêtes
print(f'\n📋 Validation des requêtes:')
requests = ClientRequest.objects.all()
orphan_requests = requests.filter(client__isnull=True)
print(f'  - Total requêtes: {requests.count()}')
print(f'  - Requêtes orphelines: {orphan_requests.count()}')

# Métriques de qualité
print(f'\n📊 Métriques de qualité:')
total_users = User.objects.count()
complete_users = User.objects.exclude(
    nom__in=['', None]
).exclude(
    prenoms__in=['', None]
).exclude(
    telephone__in=['', None]
)

quality_score = (complete_users.count() / total_users * 100) if total_users > 0 else 0
print(f'  - Taux de complétude: {quality_score:.1f}%')
print(f'  - Utilisateurs complets: {complete_users.count()}/{total_users}')

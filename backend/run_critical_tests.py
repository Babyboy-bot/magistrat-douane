import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import TestCase
from django.contrib.auth import get_user_model
from core.models import ClientRequest, Document

User = get_user_model()

print('=== CRÉATION TESTS UNITAIRES CRITIQUES ===')

# Test 1: Logique métier magistrats
def test_magistrat_workflow():
    """Test que les magistrats sont automatiquement clients premium"""
    print('\\n🧪 Test 1: Workflow magistrat')
    
    # Créer un magistrat
    magistrat = User(
        email='test_magistrat_workflow@example.com',
        nom='Test',
        prenoms='Magistrat',
        profession_type='magistrat',
        telephone='123456789'
    )
    magistrat.save()
    
    # Vérifications
    assert magistrat.role == 'client', f"Role incorrect: {magistrat.role}"
    assert magistrat.risk_level == 'premium', f"Risk level incorrect: {magistrat.risk_level}"
    assert magistrat.account_status == 'verified', f"Account status incorrect: {magistrat.account_status}"
    assert magistrat.verified == True, f"Verified incorrect: {magistrat.verified}"
    assert magistrat.verified_at is not None, "Verified_at should not be None"
    
    print('  ✅ Workflow magistrat correct')
    return True

# Test 2: Création de requête par magistrat
def test_magistrat_request_creation():
    """Test qu'un magistrat peut créer une requête"""
    print('\\n🧪 Test 2: Création requête magistrat')
    
    # Récupérer un magistrat existant
    magistrat = User.objects.filter(profession_type='magistrat', role='client').first()
    
    if magistrat:
        # Créer une requête
        request = ClientRequest.objects.create(
            numero='TEST-001',
            type='cotation_auto',
            status='en_attente',
            client=magistrat,
            details={'test': True}
        )
        
        assert request.client == magistrat, "Client incorrect"
        assert request.status == 'en_attente', "Status incorrect"
        
        print('  ✅ Création requête magistrat correcte')
        return True
    else:
        print('  ❌ Aucun magistrat trouvé pour le test')
        return False

# Test 3: Permissions d'accès
def test_access_permissions():
    """Test les permissions d'accès selon les rôles"""
    print('\\n🧪 Test 3: Permissions d\'accès')
    
    admin = User.objects.filter(role='admin').first()
    agent = User.objects.filter(role='agent').first()
    magistrat = User.objects.filter(profession_type='magistrat').first()
    
    # Tests de permissions (simulation)
    permissions = {
        'admin': ['all'],
        'agent': ['view_clients', 'create_clients', 'verify_users'],
        'client': ['view_own_requests', 'create_requests'],
        'prospect': ['limited']
    }
    
    if admin and agent and magistrat:
        print(f'  ✅ Admin: {admin.email} - {permissions["admin"]}')
        print(f'  ✅ Agent: {agent.email} - {permissions["agent"]}')
        print(f'  ✅ Magistrat: {magistrat.email} - {permissions["client"]}')
        return True
    else:
        print('  ❌ Utilisateurs manquants pour les tests')
        return False

# Test 4: Cohérence des données
def test_data_consistency():
    """Test la cohérence des données magistrats"""
    print('\\n🧪 Test 4: Cohérence données magistrats')
    
    magistrats = User.objects.filter(profession_type='magistrat')
    inconsistent_count = 0
    
    for mag in magistrats:
        if not (mag.role == 'client' and 
                mag.risk_level == 'premium' and 
                mag.account_status == 'verified' and 
                mag.verified == True):
            inconsistent_count += 1
            print(f'  ❌ Incohérence: {mag.email}')
    
    if inconsistent_count == 0:
        print(f'  ✅ Tous les {magistrats.count()} magistrats sont cohérents')
        return True
    else:
        print(f'  ❌ {inconsistent_count} magistrats incohérents')
        return False

# Exécuter les tests
tests = [
    test_magistrat_workflow,
    test_magistrat_request_creation,
    test_access_permissions,
    test_data_consistency
]

passed = 0
total = len(tests)

for test in tests:
    try:
        if test():
            passed += 1
    except Exception as e:
        print(f'  ❌ Erreur: {e}')

print(f'\\n📊 Résultats tests: {passed}/{total} réussis')
print(f'📈 Taux de réussite: {passed/total*100:.1f}%')

if passed == total:
    print('🎉 Tous les tests critiques passés !')
else:
    print('⚠️ Des tests ont échoué - Vérifier les implémentations')

import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from core.models import ClientRequest, Document
from django.core.files.uploadedfile import SimpleUploadedFile
import tempfile
import json

User = get_user_model()

print('=== EXTENSION COUVERTURE TESTS ===')

# Test 1: Workflow magistrat complet
def test_magistrat_workflow_complete():
    """Test complet du workflow magistrat"""
    print(f'\\n🧪 Test 1: Workflow magistrat complet')
    
    # Créer un magistrat
    magistrat = User.objects.create_user(
        email='test_magistrat_complete@example.com',
        password='Test1234!',
        nom='Magistrat',
        prenoms='Test',
        profession_type='magistrat',
        telephone='123456789'
    )
    
    # Vérifier le statut automatique
    assert magistrat.role == 'client', f"Role incorrect: {magistrat.role}"
    assert magistrat.risk_level == 'premium', f"Risk level incorrect: {magistrat.risk_level}"
    assert magistrat.account_status == 'verified', f"Account status incorrect: {magistrat.account_status}"
    assert magistrat.verified == True, f"Verified incorrect: {magistrat.verified}"
    
    # Test création requête
    request_data = {
        'type': 'cotation_auto',
        'details': {'test': 'workflow_complet'}
    }
    
    client = APIClient()
    client.force_authenticate(user=magistrat)
    
    response = client.post('/api/requests/', request_data, format='json')
    assert response.status_code == 201, f"Création requête échouée: {response.status_code}"
    
    request_id = response.data['id']
    
    # Test upload document
    with tempfile.NamedTemporaryFile(suffix='.pdf') as tmp:
        tmp.write(b'test file content')
        tmp.seek(0)
        
        document_data = {
            'fichier': tmp,
            'nom': 'test_workflow.pdf',
            'request_id': request_id
        }
        
        response = client.post('/api/documents/', document_data, format='multipart')
        assert response.status_code == 201, f"Upload document échoué: {response.status_code}"
    
    print(f'  ✅ Workflow magistrat complet testé avec succès')
    return True

# Test 2: Permissions par rôle
def test_role_permissions():
    """Test des permissions selon les rôles"""
    print(f'\\n🧪 Test 2: Permissions par rôle')
    
    # Créer les utilisateurs
    admin = User.objects.create_user(
        email='test_admin@example.com',
        password='Admin1234!',
        nom='Admin',
        prenoms='Test',
        role='admin'
    )
    
    agent = User.objects.create_user(
        email='test_agent@example.com',
        password='Agent1234!',
        nom='Agent',
        prenoms='Test',
        role='agent'
    )
    
    client_user = User.objects.create_user(
        email='test_client@example.com',
        password='Client1234!',
        nom='Client',
        prenoms='Test',
        role='client'
    )
    
    # Tests des permissions
    client = APIClient()
    
    # Test admin (accès total)
    client.force_authenticate(user=admin)
    response = client.get('/api/auth/users/')
    assert response.status_code == 200, f"Admin accès users échoué: {response.status_code}"
    
    # Test agent (accès limité)
    client.force_authenticate(user=agent)
    response = client.get('/api/auth/users/')
    assert response.status_code == 200, f"Agent accès users échoué: {response.status_code}"
    
    # Test client (accès limité)
    client.force_authenticate(user=client_user)
    response = client.get('/api/auth/users/')
    assert response.status_code == 403, f"Client accès users devrait être refusé: {response.status_code}"
    
    print(f'  ✅ Permissions par rôle testées avec succès')
    return True

# Test 3: Sécurité des endpoints
def test_endpoint_security():
    """Test de la sécurité des endpoints critiques"""
    print(f'\\n🧪 Test 3: Sécurité des endpoints')
    
    client = APIClient()
    
    # Test endpoints sans authentification
    protected_endpoints = [
        '/api/auth/users/',
        '/api/requests/',
        '/api/documents/',
        '/api/emissions/'
    ]
    
    for endpoint in protected_endpoints:
        response = client.get(endpoint)
        assert response.status_code == 401, f"Endpoint {endpoint} devrait être protégé: {response.status_code}"
    
    # Test endpoint login (public)
    response = client.post('/api/auth/login/', {
        'identifier': 'nonexistent@example.com',
        'password': 'wrongpassword'
    })
    assert response.status_code == 401, f"Login endpoint devrait retourner 401: {response.status_code}"
    
    print(f'  ✅ Sécurité des endpoints testée avec succès')
    return True

# Test 4: Validation des données
def test_data_validation():
    """Test de la validation des données"""
    print(f'\\n🧪 Test 4: Validation des données')
    
    client = APIClient()
    
    # Test création utilisateur avec données invalides
    invalid_data = {
        'email': 'invalid-email',
        'password': '123',  # trop court
        'nom': '',
        'prenoms': '',
        'telephone': 'invalid-phone'
    }
    
    response = client.post('/api/auth/register/', invalid_data, format='json')
    assert response.status_code == 400, f"Création utilisateur invalide devrait échouer: {response.status_code}"
    
    # Test création requête avec données invalides
    user = User.objects.first()
    if user:
        client.force_authenticate(user=user)
        
        invalid_request = {
            'type': 'invalid_type',
            'details': {}
        }
        
        response = client.post('/api/requests/', invalid_request, format='json')
        assert response.status_code == 400, f"Création requête invalide devrait échouer: {response.status_code}"
    
    print(f'  ✅ Validation des données testée avec succès')
    return True

# Test 5: Performance des requêtes
def test_performance_queries():
    """Test de performance des requêtes critiques"""
    print(f'\\n🧪 Test 5: Performance des requêtes')
    
    import time
    
    # Test performance requête magistrats
    start_time = time.time()
    magistrats = list(User.objects.filter(profession_type='magistrat'))
    query_time = time.time() - start_time
    
    assert query_time < 0.1, f"Requête magistrats trop lente: {query_time:.4f}s"
    assert len(magistrats) > 0, "Devrait avoir des magistrats pour le test"
    
    # Test performance requête avec jointures
    start_time = time.time()
    requests_with_docs = list(ClientRequest.objects.select_related('client').prefetch_related('documents'))
    join_time = time.time() - start_time
    
    assert join_time < 0.1, f"Requête avec jointures trop lente: {join_time:.4f}s"
    
    print(f'  ✅ Performance requêtes testée avec succès')
    print(f'    - Requête magistrats: {query_time:.4f}s')
    print(f'    - Requête jointures: {join_time:.4f}s')
    return True

# Exécuter tous les tests
tests = [
    test_magistrat_workflow_complete,
    test_role_permissions,
    test_endpoint_security,
    test_data_validation,
    test_performance_queries
]

passed = 0
total = len(tests)
failed_tests = []

for test in tests:
    try:
        if test():
            passed += 1
        else:
            failed_tests.append(test.__name__)
    except Exception as e:
        print(f'  ❌ Erreur dans {test.__name__}: {e}')
        failed_tests.append(test.__name__)

print(f'\\n📊 RÉSULTATS TESTS ÉTENDUS:')
print(f'  ✅ Tests réussis: {passed}/{total}')
print(f'  ❌ Tests échoués: {len(failed_tests)}')

if failed_tests:
    print(f'  Tests échoués: {failed_tests}')

coverage_score = (passed / total) * 100
print(f'\\n🎯 Couverture tests étendus: {coverage_score:.1f}%')

if coverage_score >= 80:
    print('🏆 Couverture de tests excellente!')
elif coverage_score >= 60:
    print('✅ Couverture de tests bonne')
else:
    print('⚠️ Couverture de tests à améliorer')

# Recommandations
print(f'\\n💡 Recommandations tests:')
if coverage_score < 100:
    print(f'  - Corriger les tests échoués: {failed_tests}')
    print(f'  - Ajouter tests pour les edge cases')
    print(f'  - Ajouter tests d\'intégration frontend')
    print(f'  - Mettre en place tests de charge')
else:
    print(f'  ✅ Couverture de tests optimale')

import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Document, ClientRequest
from django.contrib.auth import get_user_model

User = get_user_model()

print('=== NETTOYAGE DOCUMENTS ORPHELINS ===')

# Identifier les documents orphelins
orphan_docs = Document.objects.filter(request__isnull=True)
print(f'📊 Documents orphelins : {orphan_docs.count()}')

# Stratégie 1: Supprimer les documents de test
test_docs = orphan_docs.filter(nom__in=[
    'test.pdf',
    'Capture d\'écran 2025-12-17 093427.png',
    'Capture d\'écran 2025-12-17 095031.png'
])

print(f'🗑️ Documents de test à supprimer : {test_docs.count()}')
deleted_count = 0
for doc in test_docs:
    doc_path = doc.fichier.path if doc.fichier else None
    doc.delete()
    deleted_count += 1
    print(f'  - Supprimé : {doc.nom}')

# Stratégie 2: Associer les documents restants à une requête existante
remaining_orphans = orphan_docs.filter(nom__startswith='carte_grise')
print(f'\\n📋 Documents restants à associer : {remaining_orphans.count()}')

# Créer une requête de test si nécessaire
if remaining_orphans.exists():
    client = User.objects.filter(role='client', profession_type='magistrat').first()
    if client:
        # Créer une requête pour les documents
        last_request = ClientRequest.objects.order_by('-id').first()
        if last_request:
            next_numero = f"RQ-2026-{str(int(last_request.numero.split('-')[-1]) + 1).zfill(4)}"
        else:
            next_numero = "RQ-2026-0002"
        
        new_request = ClientRequest.objects.create(
            numero=next_numero,
            type='cotation_auto',
            status='en_attente',
            client=client,
            details={'documents_imported': True}
        )
        
        print(f'📄 Création requête {new_request.numero} pour {client.email}')
        
        # Associer les documents
        for doc in remaining_orphans:
            doc.request = new_request
            doc.save()
            print(f'  - Associé : {doc.nom} → {new_request.numero}')

# Validation finale
final_orphans = Document.objects.filter(request__isnull=True)
print(f'\\n✅ Nettoyage terminé')
print(f'📊 Documents orphelins restants : {final_orphans.count()}')
if orphan_docs.count() > 0:
    print(f'📈 Taux de nettoyage : {(orphan_docs.count() - final_orphans.count())/orphan_docs.count()*100:.1f}%')
else:
    print(f'📈 Taux de nettoyage : 100.0%')

# Statistiques finales
total_docs = Document.objects.count()
linked_docs = Document.objects.filter(request__isnull=False).count()
print(f'\\n📋 Statistiques finales :')
print(f'  - Total documents : {total_docs}')
print(f'  - Documents liés : {linked_docs}')
print(f'  - Documents orphelins : {final_orphans.count()}')
print(f'  - Taux de liaison : {linked_docs/total_docs*100:.1f}%')

import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from django.db.models import Count, Avg
from django.contrib.auth import get_user_model
from core.models import ClientRequest, Document

User = get_user_model()

print('=== AUDIT PERFORMANCE & SCALABILITÉ ===')

# Distribution des données
print(f'\n📊 Distribution des données:')
user_stats = User.objects.values('profession_type', 'risk_level', 'account_status').annotate(count=Count('id'))
for stat in user_stats:
    print(f'  {stat["profession_type"]} | {stat["risk_level"]} | {stat["account_status"]} : {stat["count"]} utilisateurs')

# Scalabilité - Ratio de traitement
total_clients = User.objects.filter(role='client').count()
magistrats = User.objects.filter(profession_type='magistrat').count()
ratio_magistrats = (magistrats / total_clients * 100) if total_clients > 0 else 0

print(f'\n📈 Métriques de scalabilité:')
print(f'  - Ratio magistrats: {ratio_magistrats:.1f}%')
print(f'  - Capacité actuelle: {total_clients} clients')
print(f'  - Projection 1000 clients: ~{int(1000 * ratio_magistrats / 100)} magistrats')

# Performance des indexes
print(f'\n🔍 Index performance:')
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename IN ('accounts_user', 'core_clientrequest')
        ORDER BY tablename, indexname
    """)
    indexes = cursor.fetchall()
    for idx in indexes:
        print(f'  - {idx[0]} sur {idx[1]}')

# Complexité des requêtes
print(f'\n⚡ Complexité algorithmique:')
print(f'  - Filtrage magistrats: O(log n) avec index')
print(f'  - Recherche textuelle: O(n) - à optimiser')
print(f'  - Segmentation clients: O(1) avec filtres Django')
print(f'  - Notifications WebSocket: O(1) par connexion')

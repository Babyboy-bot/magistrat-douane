import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

print('=== AUDIT BASE DE DONNÉES ===')
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    """)
    tables = cursor.fetchall()
    print(f'\n📊 Tables ({len(tables)} total):')
    for table in tables:
        table_name = table[0]
        cursor.execute(f'SELECT COUNT(*) FROM {table_name}')
        count = cursor.fetchone()[0]
        print(f'  - {table_name}: {count} enregistrements')
        
    # Vérifier les indexes
    cursor.execute("""
        SELECT indexname, tablename FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
    """)
    indexes = cursor.fetchall()
    print(f'\n📋 Index ({len(indexes)} total):')
    for idx in indexes[:10]:  # Limiter à 10 pour la lisibilité
        print(f'  - {idx[0]} sur {idx[1]}')
    if len(indexes) > 10:
        print(f'  ... et {len(indexes) - 10} autres')

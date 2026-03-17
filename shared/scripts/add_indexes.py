"""
Add database indexes for faster login queries.
"""
import os
import sys
import django

# Configuration Django
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def add_indexes():
    """Add indexes for faster login searches."""
    print("🔍 Adding database indexes for faster login...")
    
    # These indexes should be added via migrations, but let's check current state
    from django.db import connection
    
    with connection.cursor() as cursor:
        # Check existing indexes
        cursor.execute("""
            SELECT indexname, tablename 
            FROM pg_indexes 
            WHERE tablename = 'accounts_user'
            ORDER BY indexname;
        """)
        
        indexes = cursor.fetchall()
        print(f"\n📊 Current indexes on accounts_user:")
        for idx, table in indexes:
            print(f"  - {idx}")
        
        # Recommended indexes for login performance
        recommended_indexes = [
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_email_lower ON accounts_user (LOWER(email));",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_telephone_lower ON accounts_user (LOWER(telephone));",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_nom_prenoms_lower ON accounts_user (LOWER(nom), LOWER(prenoms));",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_is_active ON accounts_user (is_active);",
        ]
        
        print(f"\n💡 Recommended indexes for performance:")
        for sql in recommended_indexes:
            print(f"  {sql}")
        
        print(f"\n⚠️  These indexes should be added via Django migrations for production.")
        print(f"   For development, you can run them manually if needed.")

if __name__ == "__main__":
    add_indexes()

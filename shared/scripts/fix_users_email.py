"""
Fix users without email by generating fake emails for Django compatibility.
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

def fix_users_email():
    """Generate fake emails for users without email to satisfy Django's USERNAME_FIELD."""
    users_without_email = User.objects.filter(email__isnull=True) | User.objects.filter(email='')
    
    print(f"Found {users_without_email.count()} users without email")
    
    for user in users_without_email:
        # Generate a fake email based on name and phone
        base_name = f"{user.nom.lower()}_{user.prenoms.lower()}".replace(" ", "_")
        fake_email = f"{base_name}@fake.local"
        
        # Make sure it's unique
        counter = 1
        original_email = fake_email
        while User.objects.filter(email=fake_email).exists():
            fake_email = f"{original_email}_{counter}@fake.local"
            counter += 1
        
        user.email = fake_email
        user.save()
        print(f"  ✅ {user.nom} {user.prenoms} -> {fake_email}")
    
    print(f"\n✅ All users now have emails for Django compatibility")

if __name__ == "__main__":
    fix_users_email()

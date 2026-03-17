"""
Script pour nettoyer complètement la base de données et réinitialiser avec les utilisateurs de base.
"""
import os
import sys
import django

# Configuration Django
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import Emission, Paiement, ClientRequest, Document
from accounts.models import User

User = get_user_model()

def clean_database():
    """Supprime toutes les données de test et réinitialise la base."""
    print("=" * 60)
    print("NETTOYAGE COMPLET DE LA BASE DE DONNÉES")
    print("=" * 60)
    
    # Compter les données avant suppression
    users_count = User.objects.count()
    emissions_count = Emission.objects.count()
    paiements_count = Paiement.objects.count()
    requests_count = ClientRequest.objects.count()
    documents_count = Document.objects.count()
    
    print(f"\n📊 DONNÉES ACTUELLES:")
    print(f"  Utilisateurs: {users_count}")
    print(f"  Émissions: {emissions_count}")
    print(f"  Paiements: {paiements_count}")
    print(f"  Requêtes: {requests_count}")
    print(f"  Documents: {documents_count}")
    
    # Supprimer toutes les données dans le bon ordre (à cause des foreign keys)
    print("\n🗑️  SUPPRESSION DES DONNÉES...")
    
    # Supprimer les documents
    Document.objects.all().delete()
    print("  ✅ Documents supprimés")
    
    # Supprimer les paiements
    Paiement.objects.all().delete()
    print("  ✅ Paiements supprimés")
    
    # Supprimer les requêtes
    ClientRequest.objects.all().delete()
    print("  ✅ Requêtes supprimées")
    
    # Supprimer les émissions
    Emission.objects.all().delete()
    print("  ✅ Émissions supprimées")
    
    # Supprimer tous les utilisateurs sauf les superusers
    regular_users = User.objects.filter(is_superuser=False)
    regular_users.delete()
    print("  ✅ Utilisateurs réguliers supprimés")
    
    # Afficher les superusers restants
    superusers = User.objects.filter(is_superuser=True)
    print(f"  ℹ️  Superusers conservés: {superusers.count()}")
    
    # Vérifier le nettoyage
    print("\n📊 VÉRIFICATION APRÈS NETTOYAGE:")
    print(f"  Utilisateurs: {User.objects.count()}")
    print(f"  Émissions: {Emission.objects.count()}")
    print(f"  Paiements: {Paiement.objects.count()}")
    print(f"  Requêtes: {ClientRequest.objects.count()}")
    print(f"  Documents: {Document.objects.count()}")
    
    # Créer les utilisateurs de base
    print("\n👤 CRÉATION DES UTILISATEURS DE BASE...")
    
    base_users = [
        {
            "email": "admin@acs.ci",
            "password": "admin123",
            "nom": "ADMIN",
            "prenoms": "Système",
            "role": "admin",
            "profession": "Administrateur",
            "profession_type": "autre",
            "telephone": "+225 07 00 00 00 00",
            "verified": True,
        },
        {
            "email": "agent@acs.ci", 
            "password": "agent123",
            "nom": "TRAORE",
            "prenoms": "Moussa",
            "role": "agent",
            "profession": "Agent ACS",
            "profession_type": "autre",
            "telephone": "+225 07 99 88 77 66",
            "verified": True,
        },
        {
            "email": "client1@acs.ci",
            "password": "client123",
            "nom": "KOUASSI",
            "prenoms": "Jean-Baptiste",
            "role": "client",
            "profession": "Magistrat - Juge d'instruction",
            "profession_type": "magistrat",
            "telephone": "+225 07 08 09 10 11",
            "verified": True,
        },
        {
            "email": "client2@acs.ci",
            "password": "client123",
            "nom": "DIALLO",
            "prenoms": "Aminata",
            "role": "client",
            "profession": "Magistrat - Procureur",
            "profession_type": "magistrat",
            "telephone": "+225 01 02 03 04 05",
            "verified": True,
        },
        {
            "email": "client3@acs.ci",
            "password": "client123",
            "nom": "BAMBA",
            "prenoms": "Seydou",
            "role": "client",
            "profession": "Douanier - Inspecteur principal",
            "profession_type": "douanier",
            "telephone": "+225 07 33 44 55 66",
            "verified": True,
        },
    ]
    
    created_users = []
    for user_data in base_users:
        user, created = User.objects.get_or_create(
            email=user_data["email"],
            defaults={
                "nom": user_data["nom"],
                "prenoms": user_data["prenoms"],
                "role": user_data["role"],
                "profession": user_data["profession"],
                "profession_type": user_data["profession_type"],
                "telephone": user_data["telephone"],
                "verified": user_data["verified"],
            }
        )
        if created:
            user.set_password(user_data["password"])
            user.save()
            print(f"  ✅ {user.nom} {user.prenoms} ({user.role}) créé")
        else:
            # Mettre à jour le mot de passe si l'utilisateur existe déjà
            user.set_password(user_data["password"])
            user.verified = user_data["verified"]
            user.save()
            print(f"  🔄 {user.nom} {user.prenoms} ({user.role}) mis à jour")
        created_users.append(user)
    
    print(f"\n📊 RÉSUMÉ FINAL:")
    print(f"  Utilisateurs créés: {len(created_users)}")
    print(f"  Base de données nettoyée et prête!")
    
    print("\n" + "=" * 60)
    print("UTILISATEURS POUR CONNEXION (par nom):")
    print("=" * 60)
    for user in created_users:
        print(f"  Nom: {user.nom} {user.prenoms}")
        print(f"  Email: {user.email}")
        print(f"  Mot de passe: {base_users[created_users.index(user)]['password']}")
        print(f"  Rôle: {user.role}")
        print("-" * 40)

if __name__ == "__main__":
    clean_database()

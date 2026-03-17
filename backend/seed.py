"""
Seed script — run with: python manage.py shell < seed.py
Creates demo users and sample data matching the frontend mock-data.
"""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.utils import timezone
from datetime import date, timedelta
from accounts.models import User
from core.models import Emission, Paiement, ClientRequest

# ── Users ──

admin, _ = User.objects.get_or_create(
    email="admin@acs.ci",
    defaults=dict(
        nom="ADMIN", prenoms="Système", telephone="0700000000",
        role="admin", profession="Administrateur", profession_type="autre",
        verified=True, is_staff=True, is_superuser=True,
    ),
)
admin.set_password("admin123")
admin.save()

agent, _ = User.objects.get_or_create(
    email="agent@acs.ci",
    defaults=dict(
        nom="KOUASSI", prenoms="Amenan Marie", telephone="0708090102",
        role="agent", profession="Agent ACS", profession_type="autre",
        verified=True,
    ),
)
agent.set_password("agent123")
agent.save()

client1, _ = User.objects.get_or_create(
    email="konan.jb@magistrature.ci",
    defaults=dict(
        nom="KONAN", prenoms="Jean-Baptiste", telephone="0701020304",
        role="client", profession="Juge d'instruction",
        profession_type="magistrat", verified=True,
        verified_at=timezone.now() - timedelta(days=30),
    ),
)
client1.set_password("client123")
client1.verified_by = agent
client1.save()

# Client autre profession
client2 = User.objects.create_user(
    email="bamba.seydou@acs.ci",
    password="client123",
    defaults=dict(
        nom="BAMBA", prenoms="Seydou", telephone="0506070809",
        role="client", profession="Consultant",
        profession_type="autre", verified=True,
        verified_at=timezone.now() - timedelta(days=15),
    ),
)
client2.set_password("client123")
client2.verified_by = agent

prospect1, _ = User.objects.get_or_create(
    email="toure.a@magistrature.ci",
    defaults=dict(
        nom="TOURÉ", prenoms="Aminata", telephone="0102030405",
        role="prospect", profession="Substitut du Procureur",
        profession_type="magistrat", verified=False,
    ),
)
prospect1.set_password("client123")
prospect1.save()

prospect2, _ = User.objects.get_or_create(
    email="diallo.m@autre.ci",
    defaults=dict(
        nom="DIALLO", prenoms="Moussa", telephone="0607080910",
        role="prospect", profession="Consultant",
        profession_type="autre", verified=False,
    ),
)
prospect2.set_password("client123")
prospect2.save()

# ── Emissions ──

today = date.today()

em1, _ = Emission.objects.get_or_create(
    num_police="ACI-2025-00142",
    defaults=dict(
        client=client1, agent=agent, date=today - timedelta(days=60),
        risque="Automobile", compagnie="NSIA Assurances",
        num_facture="FA-2025-00142",
        marque="Toyota Land Cruiser", immatriculation="1234 AB 01",
        effet=today - timedelta(days=60), echeance=today + timedelta(days=305),
        prime_nette=185000, prime_ttc=226500, situation="Affaire nouvelle",
    ),
)

em2, _ = Emission.objects.get_or_create(
    num_police="ACI-2025-00089",
    defaults=dict(
        client=client1, agent=agent, date=today - timedelta(days=120),
        risque="Multirisque Habitation", compagnie="AXA Assurances",
        num_facture="FA-2025-00089",
        marque="-", immatriculation="-",
        effet=today - timedelta(days=120), echeance=today + timedelta(days=245),
        prime_nette=120000, prime_ttc=147600, situation="Renouvellement",
    ),
)

em3, _ = Emission.objects.get_or_create(
    num_police="ACI-2025-00201",
    defaults=dict(
        client=client2, agent=agent, date=today - timedelta(days=30),
        risque="Automobile", compagnie="SAHAM Assurances",
        num_facture="FA-2025-00201",
        marque="Peugeot 508", immatriculation="5678 CD 01",
        effet=today - timedelta(days=30), echeance=today + timedelta(days=335),
        prime_nette=210000, prime_ttc=258300, situation="Affaire nouvelle",
    ),
)

# ── Paiements ──

Paiement.objects.get_or_create(
    reference="REG-2025-001",
    defaults=dict(
        emission=em1, date_reglement=today - timedelta(days=55),
        montant_regle=226500, created_by=agent,
    ),
)

Paiement.objects.get_or_create(
    reference="REG-2025-002",
    defaults=dict(
        emission=em2, date_reglement=today - timedelta(days=100),
        montant_regle=100000, created_by=agent,
    ),
)

# ── Requests ──

ClientRequest.objects.get_or_create(
    numero="RQ-2025-0001",
    defaults=dict(
        client=client1, type="cotation_auto", status="traite",
        agent=agent, treated_at=timezone.now() - timedelta(days=50),
        details={"marque": "Toyota Land Cruiser", "puissance": "15 CV"},
    ),
)

ClientRequest.objects.get_or_create(
    numero="RQ-2025-0002",
    defaults=dict(
        client=client2, type="souscription_auto", status="en_cours",
        agent=agent,
        details={"marque": "Peugeot 508", "immatriculation": "5678 CD 01"},
    ),
)

ClientRequest.objects.get_or_create(
    numero="RQ-2025-0003",
    defaults=dict(
        client=prospect1, type="cotation_auto", status="en_attente",
        details={"marque": "Hyundai Tucson", "puissance": "10 CV"},
    ),
)

print("✅ Seed data created successfully!")
print(f"   Users: {User.objects.count()}")
print(f"   Emissions: {Emission.objects.count()}")
print(f"   Paiements: {Paiement.objects.count()}")
print(f"   Requests: {ClientRequest.objects.count()}")

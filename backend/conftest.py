"""
conftest.py — Fixtures partagées entre tous les tests du projet.
Importé automatiquement par pytest dans tous les modules de test.
"""
import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.core.cache import cache

User = get_user_model()


@pytest.fixture(autouse=True)
def clear_cache():
    """Vide le cache avant chaque test pour éviter les fuites LocMemCache."""
    cache.clear()
    yield
    cache.clear()


# ── Clients HTTP ──────────────────────────────────────────────────────────────

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(api_client, agent):
    api_client.force_authenticate(user=agent)
    return api_client


# ── Utilisateurs ──────────────────────────────────────────────────────────────

@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email="admin@acs.ci", password="AdminPass123!",
        nom="Admin", prenoms="ACS", role="admin",
        is_active=True, account_status="active",
    )


@pytest.fixture
def agent(db):
    return User.objects.create_user(
        email="agent@acs.ci", password="TestPass123!",
        nom="Agent", prenoms="Test", role="agent",
        is_active=True, account_status="active",
    )


@pytest.fixture
def agent2(db):
    return User.objects.create_user(
        email="agent2@acs.ci", password="TestPass123!",
        nom="Agent2", prenoms="Bis", role="agent",
        is_active=True, account_status="active",
    )


@pytest.fixture
def client_user(db):
    return User.objects.create_user(
        email="client@test.ci", password="TestPass123!",
        nom="Client", prenoms="Test", role="client",
        is_active=True, account_status="active",
        profession_type="magistrat",
        verified=True,
    )


@pytest.fixture
def client_user_douanier(db):
    return User.objects.create_user(
        email="douanier@test.ci", password="TestPass123!",
        nom="Douanier", prenoms="Test", role="client",
        is_active=True, account_status="active",
        profession_type="douanier",
        verified=True,
    )


@pytest.fixture
def prospect_user(db):
    u = User.objects.create_user(
        email="prospect@test.ci", password="TestPass123!",
        nom="Prospect", prenoms="Test",
        is_active=True,
    )
    User.objects.filter(pk=u.pk).update(
        role="prospect",
        account_status="pending_verification",
        verified=False,
    )
    u.refresh_from_db()
    return u


# ── Emissions ─────────────────────────────────────────────────────────────────

@pytest.fixture
def emission(db, agent, client_user):
    from core.models import Emission
    return Emission.objects.create(
        client=client_user,
        agent=agent,
        date="2025-01-15",
        risque="Automobile",
        compagnie="NSIA",
        num_facture="FAC-TEST-001",
        num_police="POL-TEST-001",
        effet="2025-01-15",
        echeance="2026-01-14",
        prime_nette=150_000,
        prime_ttc=180_000,
        situation="Affaire nouvelle",
    )


# ── Requêtes client ───────────────────────────────────────────────────────────

@pytest.fixture
def client_request(db, client_user):
    from core.models import ClientRequest
    return ClientRequest.objects.create(
        client=client_user,
        type="cotation_auto",
        details={"vehicule": "Toyota"},
    )


@pytest.fixture
def client_request_en_cours(db, client_user, agent):
    from core.models import ClientRequest
    return ClientRequest.objects.create(
        client=client_user,
        type="cotation_auto",
        details={"vehicule": "Honda"},
        agent=agent,
        status=ClientRequest.Status.EN_COURS,
    )

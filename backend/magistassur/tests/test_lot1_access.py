"""Tests des correctifs du lot 1 — accès Magist-Assur (C25).

La souscription Magist-Assur via API doit être refusée à tout client
qui n'est pas un magistrat vérifié par un agent.
"""
import pytest
from django.contrib.auth import get_user_model

from magistassur.models import ContratEpargne, ContratPrevoyance

User = get_user_model()

EPARGNE_PAYLOAD = {
    "duree_annees": 10,
    "periodicite": "mensuelle",
    "montant_cotisation": 25000,
    "date_premiere_cotisation": "2030-01-01",
}

PREVOYANCE_PAYLOAD = {
    "garantie_prevoyance_deces": True,
    "capital_deces": 1_000_000,
}


def force_login(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def magistrat_pending(db):
    return User.objects.create_user(
        email="magi.pending@test.ci", password="TestPass123!",
        nom="Magi", prenoms="Pending", profession_type="magistrat",
        telephone="0755550001", verified=False,
    )


@pytest.fixture
def magistrat_verified(db, agent):
    u = User.objects.create_user(
        email="magi.ok@test.ci", password="TestPass123!",
        nom="Magi", prenoms="Ok", profession_type="magistrat",
        telephone="0755550002", verified=True,
    )
    return u


@pytest.fixture
def autre_verified(db):
    return User.objects.create_user(
        email="autre.ok@test.ci", password="TestPass123!",
        nom="Autre", prenoms="Ok", profession_type="autre",
        telephone="0755550003", verified=True,
    )


@pytest.mark.django_db
class TestEpargneAccess:
    def test_unverified_magistrat_rejected(self, api_client, magistrat_pending):
        force_login(api_client, magistrat_pending)
        resp = api_client.post("/api/magistassur/epargne/", EPARGNE_PAYLOAD, format="json")
        assert resp.status_code == 403
        assert not ContratEpargne.objects.filter(client=magistrat_pending).exists()

    def test_verified_non_magistrat_rejected(self, api_client, autre_verified):
        force_login(api_client, autre_verified)
        resp = api_client.post("/api/magistassur/epargne/", EPARGNE_PAYLOAD, format="json")
        assert resp.status_code == 403

    def test_verified_magistrat_accepted(self, api_client, magistrat_verified):
        force_login(api_client, magistrat_verified)
        resp = api_client.post("/api/magistassur/epargne/", EPARGNE_PAYLOAD, format="json")
        assert resp.status_code == 201
        contrat = ContratEpargne.objects.get(client=magistrat_verified)
        assert contrat.num_police is None
        assert contrat.agent is None

    def test_client_cannot_set_management_fields(self, api_client, magistrat_verified):
        force_login(api_client, magistrat_verified)
        resp = api_client.post("/api/magistassur/epargne/", {
            **EPARGNE_PAYLOAD, "statut": "en_cours", "num_police": "POL-HACK-1",
        }, format="json")
        assert resp.status_code == 201
        contrat = ContratEpargne.objects.get(client=magistrat_verified)
        assert contrat.num_police is None


@pytest.mark.django_db
class TestPrevoyanceAccess:
    def test_unverified_magistrat_rejected(self, api_client, magistrat_pending):
        force_login(api_client, magistrat_pending)
        resp = api_client.post("/api/magistassur/prevoyance/", PREVOYANCE_PAYLOAD, format="json")
        assert resp.status_code == 403

    def test_verified_non_magistrat_rejected(self, api_client, autre_verified):
        force_login(api_client, autre_verified)
        resp = api_client.post("/api/magistassur/prevoyance/", PREVOYANCE_PAYLOAD, format="json")
        assert resp.status_code == 403

    def test_verified_magistrat_accepted(self, api_client, magistrat_verified):
        force_login(api_client, magistrat_verified)
        resp = api_client.post("/api/magistassur/prevoyance/", PREVOYANCE_PAYLOAD, format="json")
        assert resp.status_code == 201
        assert ContratPrevoyance.objects.filter(client=magistrat_verified).exists()

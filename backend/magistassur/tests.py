import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from .models import ContratEpargne, ContratPrevoyance

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def client_user(db):
    return User.objects.create_user(
        email="client@test.ci", password="TestPass123!", nom="Client", prenoms="Test",
    )


@pytest.fixture
def agent(db):
    return User.objects.create_user(
        email="agent@acs.ci", password="TestPass123!", nom="Agent", prenoms="Test", role="agent",
    )


@pytest.fixture
def epargne(db, client_user):
    return ContratEpargne.objects.create(client=client_user, montant_cotisation=25000)


@pytest.fixture
def prevoyance(db, client_user):
    return ContratPrevoyance.objects.create(client=client_user)


@pytest.mark.django_db
class TestEpargneSecurity:
    def test_several_contracts_without_police_number(self, api_client, client_user):
        api_client.force_authenticate(client_user)
        for _ in range(2):
            resp = api_client.post("/api/magistassur/epargne/", {"montant_cotisation": 25000}, format="json")
            assert resp.status_code == 201
        assert ContratEpargne.objects.filter(client=client_user, num_police__isnull=True).count() == 2

    def test_client_cannot_set_management_fields(self, api_client, client_user, agent):
        api_client.force_authenticate(client_user)
        resp = api_client.post("/api/magistassur/epargne/", {
            "montant_cotisation": 25000, "statut": "arrive_terme", "agent": agent.id,
            "num_police": "POL-FAKE", "client": agent.id,
        }, format="json")
        assert resp.status_code == 201
        contrat = ContratEpargne.objects.get(pk=resp.data["id"])
        assert contrat.client_id == client_user.id
        assert contrat.statut == "en_cours"
        assert contrat.agent_id is None
        assert contrat.num_police is None

    def test_client_cannot_add_cotisation(self, api_client, client_user, epargne):
        api_client.force_authenticate(client_user)
        resp = api_client.post(f"/api/magistassur/epargne/{epargne.id}/cotisation/", {
            "date_echeance": "2026-01-01", "montant": 50_000_000, "statut": "payee",
        }, format="json")
        assert resp.status_code == 403
        epargne.refresh_from_db()
        assert epargne.capital_constitue == 0

    def test_pending_cotisation_does_not_increase_capital(self, api_client, agent, epargne):
        api_client.force_authenticate(agent)
        resp = api_client.post(f"/api/magistassur/epargne/{epargne.id}/cotisation/", {
            "date_echeance": "2026-01-01", "montant": 25000, "statut": "en_attente",
        }, format="json")
        assert resp.status_code == 201
        epargne.refresh_from_db()
        assert epargne.capital_constitue == 0

    def test_paid_cotisation_increases_capital(self, api_client, agent, epargne):
        api_client.force_authenticate(agent)
        api_client.post(f"/api/magistassur/epargne/{epargne.id}/cotisation/", {
            "date_echeance": "2026-01-01", "montant": 25000, "statut": "payee",
        }, format="json")
        epargne.refresh_from_db()
        assert epargne.capital_constitue == 25000

    def test_negative_cotisation_rejected(self, api_client, agent, epargne):
        api_client.force_authenticate(agent)
        resp = api_client.post(f"/api/magistassur/epargne/{epargne.id}/cotisation/", {
            "date_echeance": "2026-01-01", "montant": -1000, "statut": "payee",
        }, format="json")
        assert resp.status_code == 400

    def test_client_cannot_update_contract(self, api_client, client_user, epargne):
        api_client.force_authenticate(client_user)
        resp = api_client.patch(f"/api/magistassur/epargne/{epargne.id}/", {"statut": "rachete"}, format="json")
        assert resp.status_code == 403


@pytest.mark.django_db
class TestPrevoyanceSecurity:
    def test_client_cannot_set_indemnity(self, api_client, client_user):
        api_client.force_authenticate(client_user)
        resp = api_client.post("/api/magistassur/prevoyance/", {
            "garantie_frais_funeraires": True,
            "assures_associes": [{"lien_parente": "enfant", "nom": "Enfant", "montant_indemnite": 100_000_000, "prime": 1}],
        }, format="json")
        assert resp.status_code == 201
        assure = ContratPrevoyance.objects.get(pk=resp.data["id"]).assures_associes.get()
        assert assure.montant_indemnite == 500_000
        assert assure.prime == 0

    def test_client_submits_questionnaire_once(self, api_client, client_user, prevoyance):
        api_client.force_authenticate(client_user)
        url = f"/api/magistassur/prevoyance/{prevoyance.id}/questionnaire/"
        assert api_client.post(url, {"fumeur": False}, format="json").status_code == 200
        assert api_client.post(url, {"fumeur": True}, format="json").status_code == 403
        prevoyance.refresh_from_db()
        assert prevoyance.questionnaire_medical.fumeur is False

    def test_agent_can_update_questionnaire(self, api_client, agent, client_user, prevoyance):
        api_client.force_authenticate(client_user)
        url = f"/api/magistassur/prevoyance/{prevoyance.id}/questionnaire/"
        api_client.post(url, {"fumeur": False}, format="json")
        api_client.force_authenticate(agent)
        assert api_client.patch(url, {"fumeur": True}, format="json").status_code == 200

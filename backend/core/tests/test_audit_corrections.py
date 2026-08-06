"""Tests pour les corrections de l'audit — C-1 à C-5, H-1 à H-8, M, B."""
import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from decimal import Decimal

from core.models import ClientRequest, Emission, Document

User = get_user_model()


def force_login(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


# ── C-1: ClientRequestDetailView — read-only fields pour clients ──────────────

@pytest.mark.django_db
class TestC1ClientRequestReadOnly:
    def test_client_cannot_modify_status(self, api_client, client_user, client_request):
        force_login(api_client, client_user)
        resp = api_client.patch(f"/api/requests/{client_request.id}/", {
            "status": "traite",
        }, format="json")
        assert resp.status_code == 200
        client_request.refresh_from_db()
        assert client_request.status != "traite"

    def test_client_cannot_modify_agent(self, api_client, client_user, client_request):
        force_login(api_client, client_user)
        resp = api_client.patch(f"/api/requests/{client_request.id}/", {
            "agent": 999,
        }, format="json")
        assert resp.status_code == 200
        client_request.refresh_from_db()
        assert client_request.agent_id is None

    def test_client_cannot_modify_sinistre_note(self, api_client, client_user, client_request):
        force_login(api_client, client_user)
        resp = api_client.patch(f"/api/requests/{client_request.id}/", {
            "sinistre_note": "hacked",
        }, format="json")
        assert resp.status_code == 200
        client_request.refresh_from_db()
        assert client_request.sinistre_note != "hacked"

    def test_agent_can_modify_status(self, api_client, agent, client_request_en_cours):
        force_login(api_client, agent)
        resp = api_client.patch(f"/api/requests/{client_request_en_cours.id}/", {
            "status": "traite",
        }, format="json")
        assert resp.status_code == 200
        client_request_en_cours.refresh_from_db()
        assert client_request_en_cours.status == "traite"


# ── C-2 + H-1: cloturer_souscription — IntegrityError + prime_nette <= prime_ttc ─

@pytest.mark.django_db
class TestC2H1CloturerSouscription:
    def _setup_request(self, client_user, agent):
        return ClientRequest.objects.create(
            client=client_user,
            type="souscription_auto",
            details={"vehicule": "Toyota"},
            agent=agent,
            status=ClientRequest.Status.EN_COURS,
        )

    def test_duplicate_num_police_returns_409(self, api_client, agent, client_user, emission):
        from django.core.files.uploadedfile import SimpleUploadedFile
        req = self._setup_request(client_user, agent)
        force_login(api_client, agent)
        fake_file = SimpleUploadedFile("attestation.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        resp = api_client.post(f"/api/requests/{req.id}/cloturer-souscription/", {
            "fichiers": fake_file,
            "num_police": emission.num_police,
            "compagnie": "NSIA",
            "echeance": "2027-01-14",
            "prime_nette": "100000",
            "prime_ttc": "120000",
        }, format="multipart")
        assert resp.status_code == 409

    def test_prime_nette_gt_ttc_returns_400(self, api_client, agent, client_user):
        from django.core.files.uploadedfile import SimpleUploadedFile
        req = self._setup_request(client_user, agent)
        force_login(api_client, agent)
        fake_file = SimpleUploadedFile("attestation.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        resp = api_client.post(f"/api/requests/{req.id}/cloturer-souscription/", {
            "fichiers": fake_file,
            "num_police": "POL-NEW-999",
            "compagnie": "NSIA",
            "echeance": "2027-01-14",
            "prime_nette": "200000",
            "prime_ttc": "100000",
        }, format="multipart")
        assert resp.status_code == 400
        assert "prime nette" in resp.data["detail"].lower()


# ── C-3: User.save() — ne pas override le rôle à chaque update ────────────────

@pytest.mark.django_db
class TestC3UserRoleNotOverridden:
    def test_admin_can_change_role_of_magistrat(self, client_user):
        from accounts.models import User
        client_user.role = "agent"
        client_user.save()
        client_user.refresh_from_db()
        assert client_user.role == "agent"

    def test_admin_can_change_role_of_douanier(self, client_user_douanier):
        from accounts.models import User
        client_user_douanier.role = "agent"
        client_user_douanier.save()
        client_user_douanier.refresh_from_db()
        assert client_user_douanier.role == "agent"


# ── C-4: CookieLoginView — pas d'access token dans le JSON ────────────────────

@pytest.mark.django_db
class TestC4NoAccessTokenInBody:
    def test_login_no_access_in_response(self, api_client, client_user):
        client_user.set_password("TestPass123!")
        client_user.save()
        resp = api_client.post("/api/auth/login/", {
            "identifier": client_user.email, "password": "TestPass123!",
        }, format="json")
        assert resp.status_code == 200
        assert "access" not in resp.data


# ── C-5: MeView — is_active exclu des self-updates ────────────────────────────

@pytest.mark.django_db
class TestC5MeViewNoIsActive:
    def test_client_cannot_self_deactivate(self, api_client, client_user):
        force_login(api_client, client_user)
        resp = api_client.patch("/api/auth/me/", {
            "is_active": False,
        }, format="json")
        client_user.refresh_from_db()
        assert client_user.is_active is True


# ── H-4: treat_request_view — seulement DECLARATION_SINISTRE ──────────────────

@pytest.mark.django_db
class TestH4TreatRequestSinistreOnly:
    def test_cotation_auto_rejected(self, api_client, agent, client_request):
        force_login(api_client, agent)
        resp = api_client.post(f"/api/requests/{client_request.id}/treat/")
        assert resp.status_code == 400

    def test_declaration_sinistre_accepted(self, api_client, agent, client_user):
        req = ClientRequest.objects.create(
            client=client_user,
            type="declaration_sinistre",
            details={"nature": "accident"},
            agent=agent,
            status=ClientRequest.Status.EN_COURS,
        )
        force_login(api_client, agent)
        resp = api_client.post(f"/api/requests/{req.id}/treat/", {"note": "OK"}, format="json")
        assert resp.status_code == 200


# ── H-5: ajouter_cotisation_epargne — Decimal au lieu de float ─────────────────

@pytest.mark.django_db
class TestH5CotisationDecimal:
    def test_decimal_montant_accepted(self, agent, client_user):
        from magistassur.models import ContratEpargne
        from magistassur.services import assigner_police_epargne, ajouter_cotisation_epargne
        contrat = ContratEpargne.objects.create(
            client=client_user, agent=agent,
            duree_annees=10, periodicite="mensuelle",
            date_premiere_cotisation="2025-01-01", date_effet="2025-01-01",
            montant_cotisation=25000, capital_constitue=0,
        )
        assigner_police_epargne(contrat, "POL-DEC-001", "", agent)
        cotisation = ajouter_cotisation_epargne(
            contrat, {"montant": "25000.50", "date_echeance": "2025-02-01"}
        )
        assert isinstance(cotisation.montant, Decimal)


# ── H-7: Cache version-based invalidation ─────────────────────────────────────

@pytest.mark.django_db
class TestH7CacheInvalidation:
    def test_cache_invalidated_after_create(self, api_client, client_user):
        force_login(api_client, client_user)
        # First call populates cache
        resp1 = api_client.get("/api/requests/")
        assert resp1.status_code == 200
        count1 = resp1.data["count"]
        # Create a new request
        resp2 = api_client.post("/api/requests/", {
            "type": "cotation_auto", "details": {"vehicule": "Honda"},
        }, format="json")
        assert resp2.status_code == 201
        # Cache should be invalidated
        resp3 = api_client.get("/api/requests/")
        assert resp3.data["count"] == count1 + 1


# ── H-8: CarteGriseUploadView — request_id ────────────────────────────────────

@pytest.mark.django_db
class TestH8CarteGriseRequestId:
    def test_upload_with_request_id_links_document(self, api_client, client_user, client_request):
        from django.core.files.uploadedfile import SimpleUploadedFile
        force_login(api_client, client_user)
        fake_file = SimpleUploadedFile("carte.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        resp = api_client.post("/api/carte-grise/", {
            "file": fake_file,
            "request_id": client_request.id,
        }, format="multipart")
        assert resp.status_code in (200, 201)
        doc = Document.objects.get(nom__startswith="carte_grise_")
        assert doc.request_id == client_request.id

    def test_upload_without_request_id_ok(self, api_client, client_user):
        from django.core.files.uploadedfile import SimpleUploadedFile
        force_login(api_client, client_user)
        fake_file = SimpleUploadedFile("carte.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        resp = api_client.post("/api/carte-grise/", {
            "file": fake_file,
        }, format="multipart")
        assert resp.status_code in (200, 201)


# ── M-8: Dashboard — total_clients scopé pour agents ──────────────────────────

@pytest.mark.django_db
class TestM8DashboardScopedClients:
    def test_agent_total_clients_reflects_own_emissions(self, api_client, agent, agent2, client_user):
        from core.models import Emission
        Emission.objects.create(
            client=client_user, agent=agent,
            date="2025-01-15", risque="Automobile", compagnie="NSIA",
            num_facture="FAC-SC1", num_police="POL-SC1",
            effet="2025-01-15", echeance="2026-01-14",
            prime_nette=100_000, prime_ttc=120_000, situation="Affaire nouvelle",
        )
        force_login(api_client, agent)
        resp = api_client.get("/api/dashboard/stats/")
        assert resp.status_code == 200
        assert resp.data["total_clients"] == 1


# ── B-2: Emission.save() — taux_commission seulement à la création ────────────

@pytest.mark.django_db
class TestB2TauxCommission:
    def test_taux_auto_set_on_create(self, agent, client_user):
        from core.models import Emission
        e = Emission.objects.create(
            client=client_user, agent=agent,
            date="2025-01-15", risque="Automobile", compagnie="NSIA",
            num_facture="FAC-TC1", num_police="POL-TC1",
            effet="2025-01-15", echeance="2026-01-14",
            prime_nette=100_000, prime_ttc=120_000, situation="Affaire nouvelle",
        )
        assert e.taux_commission == 20  # Automobile = 20%

    def test_taux_not_overwritten_on_update(self, agent, client_user):
        from core.models import Emission
        e = Emission.objects.create(
            client=client_user, agent=agent,
            date="2025-01-15", risque="Automobile", compagnie="NSIA",
            num_facture="FAC-TC2", num_police="POL-TC2",
            effet="2025-01-15", echeance="2026-01-14",
            prime_nette=100_000, prime_ttc=120_000, situation="Affaire nouvelle",
        )
        e.taux_commission = 15
        e.save()
        e.refresh_from_db()
        assert e.taux_commission == 15

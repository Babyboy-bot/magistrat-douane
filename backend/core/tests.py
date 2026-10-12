import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from decimal import Decimal
from io import BytesIO, StringIO
import csv

from .models import Emission, ClientRequest, Document

User = get_user_model()


# ── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def agent(db):
    return User.objects.create_user(
        email="agent@acs.ci", password="TestPass123!",
        nom="Agent", prenoms="Test", role="agent",
        is_active=True, account_status="active",
    )


@pytest.fixture
def client_user(db):
    return User.objects.create_user(
        email="client@test.ci", password="TestPass123!",
        nom="Client", prenoms="Test", role="client",
        is_active=True, account_status="active",
    )


@pytest.fixture
def emission(db, agent, client_user):
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


@pytest.fixture
def client_request(db, client_user):
    return ClientRequest.objects.create(
        client=client_user,
        type="cotation_auto",
        details={"vehicule": "Toyota"},
    )


# ── Auth helper ──────────────────────────────────────────────────────────────

def force_login(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


# ── Tests Emissions ──────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestEmissionList:
    def test_agent_can_list_emissions(self, api_client, agent, emission):
        force_login(api_client, agent)
        resp = api_client.get("/api/emissions/")
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_anonymous_cannot_list(self, api_client):
        resp = api_client.get("/api/emissions/")
        assert resp.status_code in (401, 403)

    def test_client_can_list_own_emissions(self, api_client, client_user, emission):
        force_login(api_client, client_user)
        resp = api_client.get("/api/emissions/")
        assert resp.status_code == 200

    def test_commission_fields_present(self, api_client, agent, emission):
        force_login(api_client, agent)
        resp = api_client.get("/api/emissions/")
        first = resp.data["results"][0]
        assert "taux_commission" in first
        assert "montant_commission" in first
        assert int(first["taux_commission"]) == 20  # Automobile = 20%

    def test_montant_commission_computed(self, api_client, agent, emission):
        force_login(api_client, agent)
        resp = api_client.get("/api/emissions/")
        first = resp.data["results"][0]
        expected = Decimal(str(emission.prime_ttc)) - Decimal(str(emission.prime_nette))
        assert Decimal(str(first["montant_commission"])) == expected


@pytest.mark.django_db
class TestEmissionCreate:
    def test_agent_can_create(self, api_client, agent, client_user):
        force_login(api_client, agent)
        payload = {
            "client": client_user.id,
            "date": "2025-03-01",
            "risque": "Automobile",
            "compagnie": "SUNU",
            "num_facture": "FAC-NEW-001",
            "num_police": "POL-NEW-001",
            "effet": "2025-03-01",
            "echeance": "2026-02-28",
            "prime_nette": 100_000,
            "prime_ttc": 120_000,
            "situation": "Affaire nouvelle",
        }
        resp = api_client.post("/api/emissions/", payload, format="json")
        assert resp.status_code == 201
        assert resp.data["taux_commission"] == 20

    def test_duplicate_num_police_rejected(self, api_client, agent, client_user, emission):
        force_login(api_client, agent)
        payload = {
            "client": client_user.id,
            "date": "2025-03-01",
            "risque": "Automobile",
            "compagnie": "SUNU",
            "num_facture": "FAC-DUP-002",
            "num_police": emission.num_police,  # duplicate
            "effet": "2025-03-01",
            "echeance": "2026-02-28",
            "prime_nette": 100_000,
            "prime_ttc": 120_000,
            "situation": "Affaire nouvelle",
        }
        resp = api_client.post("/api/emissions/", payload, format="json")
        assert resp.status_code == 400


# ── Tests ClientRequest ───────────────────────────────────────────────────────

@pytest.mark.django_db
class TestClientRequest:
    def test_client_can_create_request(self, api_client, client_user):
        force_login(api_client, client_user)
        resp = api_client.post("/api/requests/", {
            "type": "cotation_auto",
            "details": {"vehicule": "Honda"},
        }, format="json")
        assert resp.status_code == 201
        assert resp.data["numero"].startswith("RQ-")

    def test_numero_unique_and_sequential(self, api_client, client_user):
        force_login(api_client, client_user)
        r1 = api_client.post("/api/requests/", {"type": "cotation_auto", "details": {}}, format="json")
        r2 = api_client.post("/api/requests/", {"type": "cotation_mrh", "details": {}}, format="json")
        assert r1.data["numero"] != r2.data["numero"]

    def test_agent_can_treat_request(self, api_client, agent, client_request):
        force_login(api_client, agent)
        resp = api_client.post(f"/api/requests/{client_request.id}/treat/")
        assert resp.status_code == 200
        assert resp.data["status"] == "traite"

    def test_client_cannot_treat_request(self, api_client, client_user, client_request):
        force_login(api_client, client_user)
        resp = api_client.post(f"/api/requests/{client_request.id}/treat/")
        assert resp.status_code == 403

    def test_livrables_and_documents_separated(self, api_client, agent, client_user, client_request):
        Document.objects.create(
            request=client_request, nom="doc_client.pdf",
            fichier="documents/doc.pdf", is_livrable=False,
            uploaded_by=client_user,
        )
        Document.objects.create(
            request=client_request, nom="livrable_agent.pdf",
            fichier="documents/liv.pdf", is_livrable=True,
            uploaded_by=agent,
        )
        force_login(api_client, agent)
        resp = api_client.get(f"/api/requests/{client_request.id}/")
        assert resp.status_code == 200
        assert len(resp.data["documents"]) == 1
        assert len(resp.data["livrables"]) == 1


# ── Tests Import portefeuille ─────────────────────────────────────────────────

@pytest.mark.django_db
class TestEmissionImport:
    def _make_csv(self, rows):
        buf = StringIO()
        writer = csv.DictWriter(buf, fieldnames=[
            "num_police", "num_facture", "client_email", "date", "risque",
            "compagnie", "marque", "immatriculation", "effet", "echeance",
            "prime_nette", "prime_ttc", "situation",
        ], delimiter=";")
        writer.writeheader()
        writer.writerows(rows)
        return BytesIO(buf.getvalue().encode("utf-8"))

    def test_import_creates_emissions(self, api_client, agent, client_user):
        force_login(api_client, agent)
        csv_file = self._make_csv([{
            "num_police": "POL-IMP-001", "num_facture": "FAC-IMP-001",
            "client_email": client_user.email, "date": "2025-01-10",
            "risque": "Automobile", "compagnie": "NSIA",
            "marque": "Toyota", "immatriculation": "AA-001-AB",
            "effet": "2025-01-10", "echeance": "2026-01-09",
            "prime_nette": "100000", "prime_ttc": "120000",
            "situation": "Affaire nouvelle",
        }])
        csv_file.name = "import.csv"
        resp = api_client.post("/api/emissions/import/", {"file": csv_file}, format="multipart")
        assert resp.status_code == 200
        assert resp.data["created"] == 1
        assert resp.data["skipped"] == 0
        assert len(resp.data["errors"]) == 0

    def test_import_skips_duplicate_police(self, api_client, agent, client_user, emission):
        force_login(api_client, agent)
        csv_file = self._make_csv([{
            "num_police": emission.num_police,  # already exists
            "num_facture": "FAC-DUP-999",
            "client_email": client_user.email, "date": "2025-01-10",
            "risque": "Automobile", "compagnie": "NSIA",
            "marque": "", "immatriculation": "",
            "effet": "2025-01-10", "echeance": "2026-01-09",
            "prime_nette": "100000", "prime_ttc": "120000",
            "situation": "Affaire nouvelle",
        }])
        csv_file.name = "import.csv"
        resp = api_client.post("/api/emissions/import/", {"file": csv_file}, format="multipart")
        assert resp.status_code == 200
        assert resp.data["skipped"] == 1
        assert resp.data["created"] == 0

    def test_import_error_on_unknown_client(self, api_client, agent):
        force_login(api_client, agent)
        csv_file = self._make_csv([{
            "num_police": "POL-UNK-001", "num_facture": "FAC-UNK-001",
            "client_email": "nobody@nowhere.ci", "date": "2025-01-10",
            "risque": "Automobile", "compagnie": "NSIA",
            "marque": "", "immatriculation": "",
            "effet": "2025-01-10", "echeance": "2026-01-09",
            "prime_nette": "100000", "prime_ttc": "120000",
            "situation": "Affaire nouvelle",
        }])
        csv_file.name = "import.csv"
        resp = api_client.post("/api/emissions/import/", {"file": csv_file}, format="multipart")
        assert resp.status_code == 200
        assert resp.data["created"] == 0
        assert len(resp.data["errors"]) == 1

    def test_import_rejected_for_client_role(self, api_client, client_user):
        force_login(api_client, client_user)
        csv_file = self._make_csv([])
        csv_file.name = "import.csv"
        resp = api_client.post("/api/emissions/import/", {"file": csv_file}, format="multipart")
        assert resp.status_code == 403


# ── Tests sécurité ────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSecurityConstraints:
    def test_protect_prevents_client_deletion_with_emissions(self, db, agent, client_user):
        """CASCADE→PROTECT : supprimer un client avec des émissions doit lever une exception."""
        from django.db import IntegrityError
        from django.db.models import ProtectedError
        Emission.objects.create(
            client=client_user, agent=agent,
            date="2025-01-15", risque="Automobile", compagnie="NSIA",
            num_facture="FAC-DEL-001", num_police="POL-DEL-001",
            effet="2025-01-15", echeance="2026-01-14",
            prime_nette=100_000, prime_ttc=120_000,
            situation="Affaire nouvelle",
        )
        with pytest.raises(ProtectedError):
            client_user.delete()

    def test_protect_prevents_client_deletion_with_requests(self, db, client_user):
        from django.db.models import ProtectedError
        ClientRequest.objects.create(
            client=client_user, type="cotation_auto", details={},
        )
        with pytest.raises(ProtectedError):
            client_user.delete()


# ── Tests contrôle d'accès en écriture (audit sécurité) ───────────────────────

@pytest.fixture
def other_client(db):
    return User.objects.create_user(
        email="other@test.ci", password="TestPass123!",
        nom="Autre", prenoms="Client", telephone="0799999999",
    )


EMISSION_PAYLOAD = {
    "date": "2025-03-01", "risque": "Automobile", "compagnie": "SUNU",
    "num_facture": "FAC-X-001", "num_police": "POL-X-001",
    "effet": "2025-03-01", "echeance": "2026-02-28",
    "prime_nette": 100_000, "prime_ttc": 120_000,
}


def _pdf(name="doc.pdf"):
    f = BytesIO(b"%PDF-1.4 test")
    f.name = name
    return f


@pytest.mark.django_db
class TestEmissionWriteAccess:
    def test_client_cannot_create_emission(self, api_client, client_user, other_client):
        force_login(api_client, client_user)
        resp = api_client.post("/api/emissions/", {**EMISSION_PAYLOAD, "client": other_client.id}, format="json")
        assert resp.status_code == 403
        assert not Emission.objects.filter(num_police="POL-X-001").exists()

    def test_client_cannot_modify_own_emission(self, api_client, client_user, emission):
        force_login(api_client, client_user)
        resp = api_client.patch(f"/api/emissions/{emission.id}/", {"prime_ttc": 0}, format="json")
        assert resp.status_code == 403
        emission.refresh_from_db()
        assert emission.prime_ttc == 180_000

    def test_client_cannot_delete_own_emission(self, api_client, client_user, emission):
        force_login(api_client, client_user)
        assert api_client.delete(f"/api/emissions/{emission.id}/").status_code == 403

    def test_client_can_still_read_own_emission(self, api_client, client_user, emission):
        force_login(api_client, client_user)
        assert api_client.get(f"/api/emissions/{emission.id}/").status_code == 200


@pytest.mark.django_db
class TestRequestWriteAccess:
    def test_client_cannot_change_status_agent_or_owner(self, api_client, client_user, other_client, agent, client_request):
        force_login(api_client, client_user)
        api_client.patch(
            f"/api/requests/{client_request.id}/",
            {"status": "traite", "agent": agent.id, "client": other_client.id},
            format="json",
        )
        client_request.refresh_from_db()
        assert client_request.status == "en_attente"
        assert client_request.agent_id is None
        assert client_request.client_id == client_user.id

    def test_agent_can_claim_request(self, api_client, agent, client_request):
        force_login(api_client, agent)
        resp = api_client.post(f"/api/requests/{client_request.id}/claim/")
        assert resp.status_code == 200
        assert resp.data["status"] == "en_cours"
        assert api_client.post(f"/api/requests/{client_request.id}/claim/").status_code == 409

    def test_agent_can_filter_requests_by_client(self, api_client, agent, client_request, other_client):
        ClientRequest.objects.create(client=other_client, type="cotation_mrh", details={})
        force_login(api_client, agent)
        resp = api_client.get(f"/api/requests/?client_id={client_request.client_id}")
        assert [r["id"] for r in resp.data["results"]] == [client_request.id]


@pytest.mark.django_db
class TestDocumentUploadAccess:
    def test_client_cannot_attach_document_to_other_request(self, api_client, other_client, client_request):
        force_login(api_client, other_client)
        resp = api_client.post("/api/documents/", {
            "request": client_request.id, "nom": "faux", "fichier": _pdf(),
        }, format="multipart")
        assert resp.status_code == 403
        assert not client_request.documents.exists()

    def test_client_cannot_upload_livrable(self, api_client, client_user, client_request):
        force_login(api_client, client_user)
        resp = api_client.post("/api/documents/", {
            "request": client_request.id, "nom": "piece", "fichier": _pdf(), "is_livrable": "true",
        }, format="multipart")
        assert resp.status_code == 201
        assert resp.data["is_livrable"] is False

    def test_agent_can_upload_livrable(self, api_client, agent, client_request):
        force_login(api_client, agent)
        resp = api_client.post("/api/documents/", {
            "request": client_request.id, "nom": "attestation", "fichier": _pdf(), "is_livrable": "true",
        }, format="multipart")
        assert resp.status_code == 201
        assert resp.data["is_livrable"] is True

    def test_carte_grise_rejects_wrong_extension(self, api_client, client_user):
        force_login(api_client, client_user)
        f = BytesIO(b"<html>")
        f.name = "page.html"
        resp = api_client.post("/api/carte-grise/", {"file": f}, format="multipart")
        assert resp.status_code == 400

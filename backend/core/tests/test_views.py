"""Tests vues API — Emissions, ClientRequests, Dashboard."""
import pytest
from decimal import Decimal
from io import BytesIO, StringIO
import csv

from core.models import Emission, ClientRequest, Document


def force_login(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


# ── Emissions ─────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestEmissionListView:
    def test_agent_sees_own_emissions_only(self, api_client, agent, agent2, client_user):
        from core.models import Emission
        e1 = Emission.objects.create(
            client=client_user, agent=agent,
            date="2025-01-15", risque="Automobile", compagnie="NSIA",
            num_facture="FAC-A1", num_police="POL-A1",
            effet="2025-01-15", echeance="2026-01-14",
            prime_nette=100_000, prime_ttc=120_000, situation="Affaire nouvelle",
        )
        Emission.objects.create(
            client=client_user, agent=agent2,
            date="2025-01-15", risque="Automobile", compagnie="SUNU",
            num_facture="FAC-B1", num_police="POL-B1",
            effet="2025-01-15", echeance="2026-01-14",
            prime_nette=200_000, prime_ttc=240_000, situation="Affaire nouvelle",
        )
        force_login(api_client, agent)
        resp = api_client.get("/api/emissions/")
        assert resp.status_code == 200
        ids = [item["id"] for item in resp.data["results"]]
        assert e1.id in ids
        for item in resp.data["results"]:
            assert item["agent"] == agent.id, "Agent ne doit voir que ses propres émissions"

    def test_agent_cannot_access_other_agent_emission(self, api_client, agent, agent2, client_user):
        from core.models import Emission
        emission_b = Emission.objects.create(
            client=client_user, agent=agent2,
            date="2025-01-15", risque="Automobile", compagnie="SUNU",
            num_facture="FAC-B2", num_police="POL-B2",
            effet="2025-01-15", echeance="2026-01-14",
            prime_nette=200_000, prime_ttc=240_000, situation="Affaire nouvelle",
        )
        force_login(api_client, agent)
        resp = api_client.get(f"/api/emissions/{emission_b.id}/")
        assert resp.status_code == 404, "Agent A ne doit pas accéder à l'émission de l'agent B"

    def test_admin_sees_all_emissions(self, api_client, admin_user, agent, agent2, client_user):
        from core.models import Emission
        Emission.objects.create(
            client=client_user, agent=agent,
            date="2025-01-15", risque="Automobile", compagnie="NSIA",
            num_facture="FAC-ADM1", num_police="POL-ADM1",
            effet="2025-01-15", echeance="2026-01-14",
            prime_nette=100_000, prime_ttc=120_000, situation="Affaire nouvelle",
        )
        Emission.objects.create(
            client=client_user, agent=agent2,
            date="2025-01-15", risque="Automobile", compagnie="SUNU",
            num_facture="FAC-ADM2", num_police="POL-ADM2",
            effet="2025-01-15", echeance="2026-01-14",
            prime_nette=200_000, prime_ttc=240_000, situation="Affaire nouvelle",
        )
        force_login(api_client, admin_user)
        resp = api_client.get("/api/emissions/")
        assert resp.status_code == 200
        assert resp.data["count"] == 2, "Admin doit voir toutes les émissions du cabinet"

    def test_client_lists_own_emissions_only(self, api_client, client_user, agent, emission):
        other = __import__("django.contrib.auth", fromlist=["get_user_model"]).get_user_model()
        force_login(api_client, client_user)
        resp = api_client.get("/api/emissions/")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["client"] == client_user.id

    def test_anonymous_blocked(self, api_client):
        resp = api_client.get("/api/emissions/")
        assert resp.status_code in (401, 403)

    def test_commission_fields_present(self, api_client, agent, emission):
        force_login(api_client, agent)
        resp = api_client.get("/api/emissions/")
        first = resp.data["results"][0]
        assert "taux_commission" in first
        assert "montant_commission" in first

    def test_commission_rate_automobile_is_20(self, api_client, agent, emission):
        force_login(api_client, agent)
        resp = api_client.get("/api/emissions/")
        assert int(resp.data["results"][0]["taux_commission"]) == 20


@pytest.mark.django_db
class TestEmissionCreateView:
    def _payload(self, client_user):
        return {
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

    def test_agent_can_create(self, api_client, agent, client_user):
        force_login(api_client, agent)
        resp = api_client.post("/api/emissions/", self._payload(client_user), format="json")
        assert resp.status_code == 201

    def test_client_cannot_create(self, api_client, client_user):
        force_login(api_client, client_user)
        resp = api_client.post("/api/emissions/", self._payload(client_user), format="json")
        assert resp.status_code == 403

    def test_duplicate_num_police_rejected(self, api_client, agent, client_user, emission):
        force_login(api_client, agent)
        payload = self._payload(client_user)
        payload["num_police"] = emission.num_police
        resp = api_client.post("/api/emissions/", payload, format="json")
        assert resp.status_code == 400

    def test_echeance_before_effet_rejected(self, api_client, agent, client_user):
        force_login(api_client, agent)
        payload = self._payload(client_user)
        payload["effet"] = "2025-03-01"
        payload["echeance"] = "2025-01-01"
        resp = api_client.post("/api/emissions/", payload, format="json")
        assert resp.status_code == 400

    def test_prime_nette_gt_ttc_rejected(self, api_client, agent, client_user):
        force_login(api_client, agent)
        payload = self._payload(client_user)
        payload["prime_nette"] = 200_000
        payload["prime_ttc"] = 100_000
        resp = api_client.post("/api/emissions/", payload, format="json")
        assert resp.status_code == 400


@pytest.mark.django_db
class TestEmissionDeleteView:
    def test_client_cannot_delete_emission(self, api_client, client_user, emission):
        force_login(api_client, client_user)
        resp = api_client.delete(f"/api/emissions/{emission.id}/")
        assert resp.status_code == 403

    def test_agent_can_delete_emission(self, api_client, agent, emission):
        force_login(api_client, agent)
        resp = api_client.delete(f"/api/emissions/{emission.id}/")
        assert resp.status_code == 204


# ── ClientRequests ────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestClientRequestView:
    def test_client_creates_request(self, api_client, client_user):
        force_login(api_client, client_user)
        resp = api_client.post("/api/requests/", {
            "type": "cotation_auto", "details": {"vehicule": "Honda"},
        }, format="json")
        assert resp.status_code == 201
        assert resp.data["numero"].startswith("RQ-")

    def test_agent_treats_sinistre_request(self, api_client, agent, client_user):
        from core.models import ClientRequest
        req = ClientRequest.objects.create(
            client=client_user,
            type="declaration_sinistre",
            details={"nature": "accident"},
            agent=agent,
            status=ClientRequest.Status.EN_COURS,
        )
        force_login(api_client, agent)
        resp = api_client.post(f"/api/requests/{req.id}/treat/", {"note": "Clôturé"}, format="json")
        assert resp.status_code == 200
        assert resp.data["status"] == "traite"

    def test_client_cannot_treat_request(self, api_client, client_user, client_request):
        force_login(api_client, client_user)
        resp = api_client.post(f"/api/requests/{client_request.id}/treat/")
        assert resp.status_code == 403

    def test_agent_claims_pending_request(self, api_client, agent, client_request):
        force_login(api_client, agent)
        resp = api_client.post(f"/api/requests/{client_request.id}/claim/")
        assert resp.status_code == 200
        assert resp.data["status"] == "en_cours"

    def test_second_agent_cannot_claim_taken_request(
        self, api_client, agent, agent2, client_request
    ):
        api_client.force_authenticate(user=agent)
        api_client.post(f"/api/requests/{client_request.id}/claim/")
        api_client.force_authenticate(user=agent2)
        resp = api_client.post(f"/api/requests/{client_request.id}/claim/")
        assert resp.status_code == 409

    def test_agent_releases_own_request(self, api_client, agent, client_request_en_cours):
        force_login(api_client, agent)
        resp = api_client.post(f"/api/requests/{client_request_en_cours.id}/release/")
        assert resp.status_code == 200
        assert resp.data["status"] == "en_attente"


# ── Dashboard stats ───────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestDashboardStats:
    def test_agent_gets_stats(self, api_client, agent, emission):
        force_login(api_client, agent)
        resp = api_client.get("/api/dashboard/stats/")
        assert resp.status_code == 200
        assert "total_contrats" in resp.data
        assert "primes_payees" in resp.data
        assert "total_clients" in resp.data

    def test_client_gets_own_stats(self, api_client, client_user, emission):
        force_login(api_client, client_user)
        resp = api_client.get("/api/dashboard/stats/")
        assert resp.status_code == 200
        assert resp.data["total_clients"] == 0

    def test_anonymous_blocked(self, api_client):
        resp = api_client.get("/api/dashboard/stats/")
        assert resp.status_code in (401, 403)


# ── Import CSV ────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestEmissionImport:
    def _csv(self, rows):
        buf = StringIO()
        writer = csv.DictWriter(buf, fieldnames=[
            "num_police", "num_facture", "client_email", "date", "risque",
            "compagnie", "marque", "immatriculation", "effet", "echeance",
            "prime_nette", "prime_ttc", "situation",
        ], delimiter=";")
        writer.writeheader()
        writer.writerows(rows)
        f = BytesIO(buf.getvalue().encode("utf-8"))
        f.name = "import.csv"
        return f

    def _row(self, email, num_police="POL-IMP-001", num_facture="FAC-IMP-001"):
        return {
            "num_police": num_police, "num_facture": num_facture,
            "client_email": email, "date": "2025-01-10",
            "risque": "Automobile", "compagnie": "NSIA",
            "marque": "Toyota", "immatriculation": "AA-001-AB",
            "effet": "2025-01-10", "echeance": "2026-01-09",
            "prime_nette": "100000", "prime_ttc": "120000",
            "situation": "Affaire nouvelle",
        }

    def test_valid_import_creates_emission(self, api_client, agent, client_user):
        force_login(api_client, agent)
        resp = api_client.post("/api/emissions/import/",
                               {"file": self._csv([self._row(client_user.email)])},
                               format="multipart")
        assert resp.status_code == 200
        assert resp.data["created"] == 1
        assert resp.data["skipped"] == 0

    def test_duplicate_police_is_skipped(self, api_client, agent, client_user, emission):
        force_login(api_client, agent)
        resp = api_client.post("/api/emissions/import/",
                               {"file": self._csv([self._row(client_user.email,
                                                             num_police=emission.num_police)])},
                               format="multipart")
        assert resp.status_code == 200
        assert resp.data["skipped"] == 1

    def test_unknown_client_email_is_error(self, api_client, agent):
        force_login(api_client, agent)
        resp = api_client.post("/api/emissions/import/",
                               {"file": self._csv([self._row("nobody@nowhere.ci")])},
                               format="multipart")
        assert resp.status_code == 200
        assert len(resp.data["errors"]) == 1

    def test_client_role_cannot_import(self, api_client, client_user):
        force_login(api_client, client_user)
        resp = api_client.post("/api/emissions/import/",
                               {"file": self._csv([])}, format="multipart")
        assert resp.status_code == 403

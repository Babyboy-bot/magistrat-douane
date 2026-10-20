"""Tests d'intégration — magistassur.views (API endpoints)."""
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from magistassur.models import (
    ContratEpargne, ContratPrevoyance, CotisationEpargne,
    QuestionnaireMedical, AssureAssocie, BeneficiaireEpargne, BeneficiairePrevoyance,
)
from magistassur.services import assigner_police_epargne, assigner_police_prevoyance


def force_login(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


# ── Fixtures spécifiques ──────────────────────────────────────────────────────

@pytest.fixture
def contrat_epargne(db, client_user, agent):
    return ContratEpargne.objects.create(
        client=client_user, agent=agent, pris_en_charge_par=agent,
        duree_annees=10, periodicite="mensuelle",
        date_premiere_cotisation="2025-01-01", date_effet="2025-01-01",
        montant_cotisation=25000, capital_constitue=0,
    )


@pytest.fixture
def contrat_prevoyance(db, client_user, agent):
    return ContratPrevoyance.objects.create(
        client=client_user, agent=agent, pris_en_charge_par=agent,
        garantie_prevoyance_deces=True,
        garantie_frais_funeraires=False,
    )


@pytest.fixture
def contrat_epargne_active(contrat_epargne, agent):
    assigner_police_epargne(contrat_epargne, "POL-EP-VIEW-001", "INSP-01", agent)
    contrat_epargne.refresh_from_db()
    return contrat_epargne


@pytest.fixture
def contrat_prevoyance_active(contrat_prevoyance, agent):
    assigner_police_prevoyance(contrat_prevoyance, "POL-PRV-VIEW-001", "INSP-02", agent, "2025-01-15")
    contrat_prevoyance.refresh_from_db()
    return contrat_prevoyance


# ── ContratEpargneViewSet — LIST ──────────────────────────────────────────────

@pytest.mark.django_db
class TestEpargneListView:
    def test_agent_lists_all_epargne(self, api_client, agent, contrat_epargne):
        force_login(api_client, agent)
        resp = api_client.get("/api/magistassur/epargne/")
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_client_lists_own_epargne_only(self, api_client, client_user, contrat_epargne):
        force_login(api_client, client_user)
        resp = api_client.get("/api/magistassur/epargne/")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["client"] == client_user.id

    def test_anonymous_blocked(self, api_client):
        resp = api_client.get("/api/magistassur/epargne/")
        assert resp.status_code in (401, 403)

    def test_filter_by_statut(self, api_client, agent, contrat_epargne_active):
        force_login(api_client, agent)
        resp = api_client.get("/api/magistassur/epargne/?statut=en_cours")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["statut"] == "en_cours"

    def test_search_by_num_police(self, api_client, agent, contrat_epargne_active):
        force_login(api_client, agent)
        resp = api_client.get(f"/api/magistassur/epargne/?search=POL-EP-VIEW-001")
        assert resp.status_code == 200
        assert resp.data["count"] >= 1


# ── ContratEpargneViewSet — CREATE ────────────────────────────────────────────

@pytest.mark.django_db
class TestEpargneCreateView:
    def test_client_creates_epargne(self, api_client, client_user):
        force_login(api_client, client_user)
        resp = api_client.post("/api/magistassur/epargne/", {
            "duree_annees": 10,
            "periodicite": "mensuelle",
            "date_premiere_cotisation": "2030-01-01",
            "montant_cotisation": 25000,
        }, format="json")
        assert resp.status_code == 201
        assert resp.data["client"] == client_user.id

    def test_agent_creates_epargne_for_client(self, api_client, agent, client_user):
        force_login(api_client, agent)
        resp = api_client.post("/api/magistassur/epargne/", {
            "client": client_user.id,
            "duree_annees": 5,
            "periodicite": "trimestrielle",
            "date_premiere_cotisation": "2030-01-01",
            "montant_cotisation": 50000,
        }, format="json")
        assert resp.status_code == 201

    def test_montant_cotisation_below_minimum_rejected(self, api_client, client_user):
        force_login(api_client, client_user)
        resp = api_client.post("/api/magistassur/epargne/", {
            "duree_annees": 10,
            "periodicite": "mensuelle",
            "montant_cotisation": 1000,
        }, format="json")
        assert resp.status_code == 400

    def test_create_with_beneficiaires(self, api_client, client_user):
        force_login(api_client, client_user)
        resp = api_client.post("/api/magistassur/epargne/", {
            "duree_annees": 10,
            "periodicite": "mensuelle",
            "montant_cotisation": 25000,
            "beneficiaires": [
                {"nom": "Bénéficiaire 1", "taux_repartition": 60},
                {"nom": "Bénéficiaire 2", "taux_repartition": 40},
            ],
        }, format="json")
        assert resp.status_code == 201
        contrat = ContratEpargne.objects.get(id=resp.data["id"])
        assert contrat.beneficiaires.count() == 2


# ── ContratEpargneViewSet — RETRIEVE / UPDATE ─────────────────────────────────

@pytest.mark.django_db
class TestEpargneRetrieveUpdate:
    def test_agent_retrieves_epargne(self, api_client, agent, contrat_epargne):
        force_login(api_client, agent)
        resp = api_client.get(f"/api/magistassur/epargne/{contrat_epargne.id}/")
        assert resp.status_code == 200
        assert resp.data["id"] == contrat_epargne.id

    def test_client_retrieves_own_epargne(self, api_client, client_user, contrat_epargne):
        force_login(api_client, client_user)
        resp = api_client.get(f"/api/magistassur/epargne/{contrat_epargne.id}/")
        assert resp.status_code == 200

    def test_client_cannot_retrieve_other_client_epargne(self, api_client, client_user, agent2):
        other = ContratEpargne.objects.create(
            client=agent2, agent=agent2,
            duree_annees=10, periodicite="mensuelle",
            montant_cotisation=25000,
        )
        force_login(api_client, client_user)
        resp = api_client.get(f"/api/magistassur/epargne/{other.id}/")
        assert resp.status_code == 404


# ── ContratEpargneViewSet — PRISE EN CHARGE ───────────────────────────────────

@pytest.mark.django_db
class TestEpargnePriseEnCharge:
    def test_agent_takes_charge(self, api_client, agent, contrat_epargne):
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/epargne/{contrat_epargne.id}/prise-en-charge/")
        assert resp.status_code == 200
        contrat_epargne.refresh_from_db()
        assert contrat_epargne.pris_en_charge_par == agent

    def test_conflict_if_already_taken(self, api_client, agent, agent2, contrat_epargne):
        contrat_epargne.pris_en_charge_par = agent2
        contrat_epargne.save()
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/epargne/{contrat_epargne.id}/prise-en-charge/")
        assert resp.status_code == 409

    def test_admin_can_take_from_other(self, api_client, admin_user, agent, contrat_epargne):
        contrat_epargne.pris_en_charge_par = agent
        contrat_epargne.save()
        force_login(api_client, admin_user)
        resp = api_client.post(f"/api/magistassur/epargne/{contrat_epargne.id}/prise-en-charge/")
        assert resp.status_code == 200

    def test_client_cannot_take_charge(self, api_client, client_user, contrat_epargne):
        force_login(api_client, client_user)
        resp = api_client.post(f"/api/magistassur/epargne/{contrat_epargne.id}/prise-en-charge/")
        assert resp.status_code == 403


# ── ContratEpargneViewSet — LIBERER ───────────────────────────────────────────

@pytest.mark.django_db
class TestEpargneLiberer:
    def test_agent_releases_own_contrat(self, api_client, agent, contrat_epargne):
        contrat_epargne.pris_en_charge_par = agent
        contrat_epargne.save()
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/epargne/{contrat_epargne.id}/liberer/")
        assert resp.status_code == 200
        contrat_epargne.refresh_from_db()
        assert contrat_epargne.pris_en_charge_par is None

    def test_agent_cannot_release_other_agent_contrat(self, api_client, agent, agent2, contrat_epargne):
        contrat_epargne.pris_en_charge_par = agent2
        contrat_epargne.save()
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/epargne/{contrat_epargne.id}/liberer/")
        assert resp.status_code == 403

    def test_cannot_release_clotured_contrat(self, api_client, agent, contrat_epargne):
        contrat_epargne.pris_en_charge_par = agent
        contrat_epargne.statut = ContratEpargne.Statut.CLOTURE
        contrat_epargne.save()
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/epargne/{contrat_epargne.id}/liberer/")
        assert resp.status_code == 400


# ── ContratEpargneViewSet — ASSIGN POLICE ─────────────────────────────────────

@pytest.mark.django_db
class TestEpargneAssignPolice:
    def test_agent_assigns_police(self, api_client, agent, contrat_epargne):
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/epargne/{contrat_epargne.id}/assign-police/", {
            "num_police": "POL-ASSIGN-001",
            "code_inspection": "INSP-001",
        }, format="json")
        assert resp.status_code == 200
        contrat_epargne.refresh_from_db()
        assert contrat_epargne.num_police == "POL-ASSIGN-001"
        assert contrat_epargne.statut == "en_cours"

    def test_duplicate_police_returns_409(self, api_client, agent, client_user):
        # Créer un premier contrat avec police
        c1 = ContratEpargne.objects.create(
            client=client_user, agent=agent,
            duree_annees=10, periodicite="mensuelle",
            montant_cotisation=25000,
        )
        assigner_police_epargne(c1, "POL-DUP-001", "", agent)
        # Créer un 2e contrat et tenter d'assigner la même police
        c2 = ContratEpargne.objects.create(
            client=client_user, agent=agent, pris_en_charge_par=agent,
            duree_annees=10, periodicite="mensuelle",
            montant_cotisation=25000,
        )
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/epargne/{c2.id}/assign-police/", {
            "num_police": "POL-DUP-001",
        }, format="json")
        assert resp.status_code == 409

    def test_missing_police_returns_400(self, api_client, agent, contrat_epargne):
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/epargne/{contrat_epargne.id}/assign-police/", {}, format="json")
        assert resp.status_code == 400

    def test_client_cannot_assign_police(self, api_client, client_user, contrat_epargne):
        force_login(api_client, client_user)
        resp = api_client.post(f"/api/magistassur/epargne/{contrat_epargne.id}/assign-police/", {
            "num_police": "POL-X",
        }, format="json")
        assert resp.status_code == 403


# ── ContratEpargneViewSet — CHANGE STATUT ─────────────────────────────────────

@pytest.mark.django_db
class TestEpargneChangeStatut:
    def test_agent_changes_statut_to_suspendu(self, api_client, agent, contrat_epargne_active):
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/epargne/{contrat_epargne_active.id}/change-statut/", {
            "statut": "suspendu",
        }, format="json")
        assert resp.status_code == 200
        contrat_epargne_active.refresh_from_db()
        assert contrat_epargne_active.statut == "suspendu"

    def test_cannot_change_clotured_statut(self, api_client, agent, contrat_epargne_active):
        contrat_epargne_active.statut = ContratEpargne.Statut.CLOTURE
        contrat_epargne_active.save()
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/epargne/{contrat_epargne_active.id}/change-statut/", {
            "statut": "en_cours",
        }, format="json")
        assert resp.status_code == 400

    def test_invalid_statut_returns_400(self, api_client, agent, contrat_epargne_active):
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/epargne/{contrat_epargne_active.id}/change-statut/", {
            "statut": "invalide",
        }, format="json")
        assert resp.status_code == 400

    def test_client_cannot_change_statut(self, api_client, client_user, contrat_epargne_active):
        force_login(api_client, client_user)
        resp = api_client.post(f"/api/magistassur/epargne/{contrat_epargne_active.id}/change-statut/", {
            "statut": "suspendu",
        }, format="json")
        assert resp.status_code == 403


# ── ContratEpargneViewSet — UPLOAD DOCUMENTS ──────────────────────────────────

@pytest.mark.django_db
class TestEpargneUploadDocuments:
    def test_upload_piece_identite(self, api_client, client_user, contrat_epargne):
        force_login(api_client, client_user)
        fake_file = SimpleUploadedFile("id.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        resp = api_client.post(f"/api/magistassur/epargne/{contrat_epargne.id}/upload-documents/", {
            "piece_identite": fake_file,
        }, format="multipart")
        assert resp.status_code == 200
        contrat_epargne.refresh_from_db()
        assert contrat_epargne.piece_identite.name != ""

    def test_upload_rib(self, api_client, client_user, contrat_epargne):
        force_login(api_client, client_user)
        fake_file = SimpleUploadedFile("rib.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        resp = api_client.post(f"/api/magistassur/epargne/{contrat_epargne.id}/upload-documents/", {
            "rib_document": fake_file,
        }, format="multipart")
        assert resp.status_code == 200

    def test_upload_blocked_on_clotured(self, api_client, client_user, contrat_epargne):
        contrat_epargne.statut = ContratEpargne.Statut.CLOTURE
        contrat_epargne.save()
        force_login(api_client, client_user)
        fake_file = SimpleUploadedFile("id.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        resp = api_client.post(f"/api/magistassur/epargne/{contrat_epargne.id}/upload-documents/", {
            "piece_identite": fake_file,
        }, format="multipart")
        assert resp.status_code == 400


# ── ContratEpargneViewSet — COTISATION ────────────────────────────────────────

@pytest.mark.django_db
class TestEpargneCotisation:
    def test_add_cotisation(self, api_client, agent, contrat_epargne_active):
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/epargne/{contrat_epargne_active.id}/cotisation/", {
            "montant": 25000,
            "date_echeance": "2025-02-01",
        }, format="json")
        assert resp.status_code == 201
        contrat_epargne_active.refresh_from_db()
        assert contrat_epargne_active.capital_constitue == 25000

    def test_cotisation_negative_returns_400(self, api_client, agent, contrat_epargne_active):
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/epargne/{contrat_epargne_active.id}/cotisation/", {
            "montant": -500,
            "date_echeance": "2025-02-01",
        }, format="json")
        assert resp.status_code == 400

    def test_cotisation_without_date_returns_400(self, api_client, agent, contrat_epargne_active):
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/epargne/{contrat_epargne_active.id}/cotisation/", {
            "montant": 25000,
        }, format="json")
        assert resp.status_code == 400

    def test_cotisation_decimal_montant(self, api_client, agent, contrat_epargne_active):
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/epargne/{contrat_epargne_active.id}/cotisation/", {
            "montant": "25000.50",
            "date_echeance": "2025-02-01",
        }, format="json")
        assert resp.status_code == 201


# ── ContratEpargneViewSet — EXPORT ────────────────────────────────────────────

@pytest.mark.django_db
class TestEpargneExport:
    def test_export_excel(self, api_client, agent, contrat_epargne_active):
        force_login(api_client, agent)
        resp = api_client.get(f"/api/magistassur/epargne/{contrat_epargne_active.id}/export-excel/")
        assert resp.status_code == 200

    def test_export_pdf(self, api_client, agent, contrat_epargne_active):
        force_login(api_client, agent)
        resp = api_client.get(f"/api/magistassur/epargne/{contrat_epargne_active.id}/export-pdf/")
        assert resp.status_code == 200

    def test_client_cannot_export(self, api_client, client_user, contrat_epargne_active):
        force_login(api_client, client_user)
        resp = api_client.get(f"/api/magistassur/epargne/{contrat_epargne_active.id}/export-excel/")
        assert resp.status_code == 403


# ── ContratPrevoyanceViewSet — LIST ───────────────────────────────────────────

@pytest.mark.django_db
class TestPrevoyanceListView:
    def test_agent_lists_all_prevoyance(self, api_client, agent, contrat_prevoyance):
        force_login(api_client, agent)
        resp = api_client.get("/api/magistassur/prevoyance/")
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_client_lists_own_prevoyance_only(self, api_client, client_user, contrat_prevoyance):
        force_login(api_client, client_user)
        resp = api_client.get("/api/magistassur/prevoyance/")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["client"] == client_user.id

    def test_anonymous_blocked(self, api_client):
        resp = api_client.get("/api/magistassur/prevoyance/")
        assert resp.status_code in (401, 403)


# ── ContratPrevoyanceViewSet — CREATE ─────────────────────────────────────────

@pytest.mark.django_db
class TestPrevoyanceCreateView:
    def test_client_creates_prevoyance(self, api_client, client_user):
        force_login(api_client, client_user)
        resp = api_client.post("/api/magistassur/prevoyance/", {
            "garantie_prevoyance_deces": True,
            "garantie_frais_funeraires": False,
        }, format="json")
        assert resp.status_code == 201
        assert resp.data["client"] == client_user.id

    def test_create_without_garantie_rejected(self, api_client, client_user):
        force_login(api_client, client_user)
        resp = api_client.post("/api/magistassur/prevoyance/", {
            "garantie_prevoyance_deces": False,
            "garantie_frais_funeraires": False,
        }, format="json")
        assert resp.status_code == 400

    def test_create_with_both_garanties(self, api_client, client_user):
        force_login(api_client, client_user)
        resp = api_client.post("/api/magistassur/prevoyance/", {
            "garantie_prevoyance_deces": True,
            "garantie_frais_funeraires": True,
        }, format="json")
        assert resp.status_code == 201

    def test_create_with_assures_associes(self, api_client, client_user):
        force_login(api_client, client_user)
        resp = api_client.post("/api/magistassur/prevoyance/", {
            "garantie_prevoyance_deces": True,
            "assures_associes": [
                {"lien_parente": "conjoint", "nom": "Conjoint Test"},
                {"lien_parente": "enfant", "nom": "Enfant Test"},
            ],
        }, format="json")
        assert resp.status_code == 201
        contrat = ContratPrevoyance.objects.get(id=resp.data["id"])
        assert contrat.assures_associes.count() == 2

    def test_create_with_questionnaire_medical(self, api_client, client_user):
        force_login(api_client, client_user)
        resp = api_client.post("/api/magistassur/prevoyance/", {
            "garantie_prevoyance_deces": True,
            "questionnaire_medical": {
                "taille_cm": 175,
                "poids_kg": "70.5",
                "fumeur": True,
                "cigarettes_par_jour": 10,
            },
        }, format="json")
        assert resp.status_code == 201
        contrat = ContratPrevoyance.objects.get(id=resp.data["id"])
        assert contrat.questionnaire_medical is not None
        assert contrat.questionnaire_medical.fumeur is True


# ── ContratPrevoyanceViewSet — PRISE EN CHARGE / LIBERER ─────────────────────

@pytest.mark.django_db
class TestPrevoyancePriseEnCharge:
    def test_agent_takes_charge(self, api_client, agent, contrat_prevoyance):
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/prevoyance/{contrat_prevoyance.id}/prise-en-charge/")
        assert resp.status_code == 200
        contrat_prevoyance.refresh_from_db()
        assert contrat_prevoyance.pris_en_charge_par == agent

    def test_conflict_if_already_taken(self, api_client, agent, agent2, contrat_prevoyance):
        contrat_prevoyance.pris_en_charge_par = agent2
        contrat_prevoyance.save()
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/prevoyance/{contrat_prevoyance.id}/prise-en-charge/")
        assert resp.status_code == 409

    def test_agent_releases_own(self, api_client, agent, contrat_prevoyance):
        contrat_prevoyance.pris_en_charge_par = agent
        contrat_prevoyance.save()
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/prevoyance/{contrat_prevoyance.id}/liberer/")
        assert resp.status_code == 200
        contrat_prevoyance.refresh_from_db()
        assert contrat_prevoyance.pris_en_charge_par is None

    def test_cannot_release_clotured(self, api_client, agent, contrat_prevoyance):
        contrat_prevoyance.pris_en_charge_par = agent
        contrat_prevoyance.statut = ContratPrevoyance.Statut.CLOTURE
        contrat_prevoyance.save()
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/prevoyance/{contrat_prevoyance.id}/liberer/")
        assert resp.status_code == 400


# ── ContratPrevoyanceViewSet — ASSIGN POLICE ─────────────────────────────────

@pytest.mark.django_db
class TestPrevoyanceAssignPolice:
    def test_agent_assigns_police(self, api_client, agent, contrat_prevoyance):
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/prevoyance/{contrat_prevoyance.id}/assign-police/", {
            "num_police": "POL-PRV-ASSIGN-001",
            "code_inspection": "INSP-PRV-001",
            "date_effet": "2025-06-15",
        }, format="json")
        assert resp.status_code == 200
        contrat_prevoyance.refresh_from_db()
        assert contrat_prevoyance.num_police == "POL-PRV-ASSIGN-001"
        assert contrat_prevoyance.statut == "en_cours"
        assert contrat_prevoyance.date_effet is not None
        assert contrat_prevoyance.date_echeance is not None

    def test_duplicate_police_returns_409(self, api_client, agent, client_user):
        # Créer un premier contrat prévoyance avec police
        c1 = ContratPrevoyance.objects.create(
            client=client_user, agent=agent,
            garantie_prevoyance_deces=True,
        )
        assigner_police_prevoyance(c1, "POL-PRV-DUP-001", "", agent, "2025-01-01")
        # Créer un 2e contrat et tenter d'assigner la même police
        c2 = ContratPrevoyance.objects.create(
            client=client_user, agent=agent, pris_en_charge_par=agent,
            garantie_prevoyance_deces=True,
        )
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/prevoyance/{c2.id}/assign-police/", {
            "num_police": "POL-PRV-DUP-001",
        }, format="json")
        assert resp.status_code == 409

    def test_missing_police_returns_400(self, api_client, agent, contrat_prevoyance):
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/prevoyance/{contrat_prevoyance.id}/assign-police/", {}, format="json")
        assert resp.status_code == 400

    def test_leap_year_date_effet(self, api_client, agent, contrat_prevoyance):
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/prevoyance/{contrat_prevoyance.id}/assign-police/", {
            "num_police": "POL-LEAP-001",
            "date_effet": "2024-02-29",
        }, format="json")
        assert resp.status_code == 200
        contrat_prevoyance.refresh_from_db()
        assert contrat_prevoyance.date_echeance.day == 28
        assert contrat_prevoyance.date_echeance.year == 2025


# ── ContratPrevoyanceViewSet — CHANGE STATUT ─────────────────────────────────

@pytest.mark.django_db
class TestPrevoyanceChangeStatut:
    def test_agent_changes_statut_to_sinistre(self, api_client, agent, contrat_prevoyance_active):
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/prevoyance/{contrat_prevoyance_active.id}/change-statut/", {
            "statut": "sinistre",
        }, format="json")
        assert resp.status_code == 200
        contrat_prevoyance_active.refresh_from_db()
        assert contrat_prevoyance_active.statut == "sinistre"

    def test_cannot_change_clotured(self, api_client, agent, contrat_prevoyance_active):
        contrat_prevoyance_active.statut = ContratPrevoyance.Statut.CLOTURE
        contrat_prevoyance_active.save()
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/prevoyance/{contrat_prevoyance_active.id}/change-statut/", {
            "statut": "en_cours",
        }, format="json")
        assert resp.status_code == 400

    def test_invalid_statut_returns_400(self, api_client, agent, contrat_prevoyance_active):
        force_login(api_client, agent)
        resp = api_client.post(f"/api/magistassur/prevoyance/{contrat_prevoyance_active.id}/change-statut/", {
            "statut": "invalide",
        }, format="json")
        assert resp.status_code == 400


# ── ContratPrevoyanceViewSet — QUESTIONNAIRE MEDICAL ─────────────────────────

@pytest.mark.django_db
class TestPrevoyanceQuestionnaire:
    def test_create_questionnaire(self, api_client, client_user, contrat_prevoyance):
        force_login(api_client, client_user)
        resp = api_client.post(f"/api/magistassur/prevoyance/{contrat_prevoyance.id}/questionnaire/", {
            "taille_cm": 180,
            "poids_kg": "75.0",
            "fumeur": False,
        }, format="json")
        assert resp.status_code == 200
        assert QuestionnaireMedical.objects.filter(contrat=contrat_prevoyance).exists()

    def test_update_questionnaire(self, api_client, client_user, contrat_prevoyance):
        from magistassur.models import QuestionnaireMedical
        QuestionnaireMedical.objects.create(contrat=contrat_prevoyance, taille_cm=170, fumeur=False)
        force_login(api_client, client_user)
        resp = api_client.patch(f"/api/magistassur/prevoyance/{contrat_prevoyance.id}/questionnaire/", {
            "fumeur": True,
            "cigarettes_par_jour": 5,
        }, format="json")
        assert resp.status_code == 200
        contrat_prevoyance.refresh_from_db()
        assert contrat_prevoyance.questionnaire_medical.fumeur is True
        assert contrat_prevoyance.questionnaire_medical.cigarettes_par_jour == 5


# ── ContratPrevoyanceViewSet — EXPORT ────────────────────────────────────────

@pytest.mark.django_db
class TestPrevoyanceExport:
    def test_export_excel(self, api_client, agent, contrat_prevoyance_active):
        force_login(api_client, agent)
        resp = api_client.get(f"/api/magistassur/prevoyance/{contrat_prevoyance_active.id}/export-excel/")
        assert resp.status_code == 200

    def test_export_pdf(self, api_client, agent, contrat_prevoyance_active):
        force_login(api_client, agent)
        resp = api_client.get(f"/api/magistassur/prevoyance/{contrat_prevoyance_active.id}/export-pdf/")
        assert resp.status_code == 200

    def test_client_cannot_export(self, api_client, client_user, contrat_prevoyance_active):
        force_login(api_client, client_user)
        resp = api_client.get(f"/api/magistassur/prevoyance/{contrat_prevoyance_active.id}/export-excel/")
        assert resp.status_code == 403

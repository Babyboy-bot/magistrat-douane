"""Audit lot 2 — droits des agents sur les dossiers et émissions de leurs collègues.

- police, statut, cotisation, exports, pièces, questionnaire : agent en charge ou admin
- questionnaire médical masqué aux agents qui n'ont pas le dossier en charge
- consultation et export d'un dossier tracés dans le journal d'audit
- émissions : pas de paiement sur l'émission d'un collègue, client et agent non modifiables
"""
import pytest

from accounts.models import UserAuditLog
from magistassur.models import ContratEpargne, ContratPrevoyance, QuestionnaireMedical
from magistassur.services import assigner_police_epargne, assigner_police_prevoyance

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32


@pytest.fixture
def epargne_actif(db, client_user, agent):
    c = ContratEpargne.objects.create(
        client=client_user, duree_annees=10, periodicite="mensuelle",
        date_premiere_cotisation="2030-01-01", montant_cotisation=25000, capital_constitue=0,
        pris_en_charge_par=agent,
    )
    assigner_police_epargne(c, "POL-DROITS-EP", "", agent)
    return c


@pytest.fixture
def prevoyance(db, client_user, agent):
    c = ContratPrevoyance.objects.create(
        client=client_user, garantie_prevoyance_deces=True, pris_en_charge_par=agent,
    )
    QuestionnaireMedical.objects.create(contrat=c, taille_cm=175, fumeur=True)
    return c


@pytest.mark.django_db
class TestActionsReserveesAuResponsable:
    @pytest.mark.parametrize("url,data", [
        ("change-statut/", {"statut": "suspendu"}),
        ("cotisation/", {"montant": 25000, "date_echeance": "2030-02-01"}),
    ])
    def test_collegue_refuse_epargne(self, api_client, agent2, epargne_actif, url, data):
        api_client.force_authenticate(user=agent2)
        resp = api_client.post(f"/api/magistassur/epargne/{epargne_actif.id}/{url}", data, format="json")
        assert resp.status_code == 403
        epargne_actif.refresh_from_db()
        assert epargne_actif.statut == "en_cours"
        assert epargne_actif.capital_constitue == 0

    def test_collegue_ne_peut_pas_attribuer_la_police(self, api_client, agent2, client_user, agent):
        c = ContratEpargne.objects.create(
            client=client_user, duree_annees=10, periodicite="mensuelle",
            montant_cotisation=25000, pris_en_charge_par=agent,
        )
        api_client.force_authenticate(user=agent2)
        resp = api_client.post(f"/api/magistassur/epargne/{c.id}/assign-police/",
                               {"num_police": "POL-VOL"}, format="json")
        assert resp.status_code == 403
        c.refresh_from_db()
        assert c.num_police in (None, "")

    def test_police_refusee_sans_prise_en_charge(self, api_client, agent, client_user):
        c = ContratPrevoyance.objects.create(client=client_user, garantie_prevoyance_deces=True)
        api_client.force_authenticate(user=agent)
        resp = api_client.post(f"/api/magistassur/prevoyance/{c.id}/assign-police/",
                               {"num_police": "POL-LIBRE"}, format="json")
        assert resp.status_code == 403

    def test_collegue_ne_peut_pas_changer_statut_prevoyance(self, api_client, agent, agent2, prevoyance):
        assigner_police_prevoyance(prevoyance, "POL-DROITS-PR", "", agent, "2030-01-01")
        api_client.force_authenticate(user=agent2)
        resp = api_client.post(f"/api/magistassur/prevoyance/{prevoyance.id}/change-statut/",
                               {"statut": "resilie"}, format="json")
        assert resp.status_code == 403

    def test_collegue_ne_peut_pas_remplacer_les_pieces(self, api_client, agent2, epargne_actif, settings, tmp_path):
        from django.core.files.uploadedfile import SimpleUploadedFile
        settings.MEDIA_ROOT = str(tmp_path)
        api_client.force_authenticate(user=agent2)
        resp = api_client.post(f"/api/magistassur/epargne/{epargne_actif.id}/upload-documents/", {
            "rib_document": SimpleUploadedFile("rib.png", PNG, content_type="image/png"),
        }, format="multipart")
        assert resp.status_code == 403

    def test_collegue_ne_peut_pas_modifier_le_questionnaire(self, api_client, agent2, prevoyance):
        api_client.force_authenticate(user=agent2)
        resp = api_client.patch(f"/api/magistassur/prevoyance/{prevoyance.id}/questionnaire/",
                                {"fumeur": False}, format="json")
        assert resp.status_code == 403
        assert QuestionnaireMedical.objects.get(contrat=prevoyance).fumeur is True

    def test_responsable_et_admin_autorises(self, api_client, agent, admin_user, epargne_actif):
        api_client.force_authenticate(user=agent)
        assert api_client.post(f"/api/magistassur/epargne/{epargne_actif.id}/change-statut/",
                               {"statut": "suspendu"}, format="json").status_code == 200
        api_client.force_authenticate(user=admin_user)
        assert api_client.post(f"/api/magistassur/epargne/{epargne_actif.id}/change-statut/",
                               {"statut": "en_cours"}, format="json").status_code == 200


@pytest.mark.django_db
class TestExports:
    @pytest.mark.parametrize("fmt", ["excel", "pdf"])
    def test_collegue_ne_peut_pas_exporter(self, api_client, agent2, prevoyance, fmt):
        api_client.force_authenticate(user=agent2)
        resp = api_client.get(f"/api/magistassur/prevoyance/{prevoyance.id}/export-{fmt}/")
        assert resp.status_code == 403
        assert not UserAuditLog.objects.filter(action="dossier_export").exists()

    def test_export_journalise(self, api_client, agent, client_user, epargne_actif):
        api_client.force_authenticate(user=agent)
        resp = api_client.get(f"/api/magistassur/epargne/{epargne_actif.id}/export-excel/")
        assert resp.status_code == 200
        log = UserAuditLog.objects.get(action="dossier_export")
        assert log.performed_by == agent
        assert log.target_user == client_user
        assert log.metadata == {"produit": "epargne", "contrat_id": epargne_actif.id, "format": "excel"}


@pytest.mark.django_db
class TestQuestionnaireMedicalMasque:
    def _get(self, api_client, user, contrat):
        api_client.force_authenticate(user=user)
        resp = api_client.get(f"/api/magistassur/prevoyance/{contrat.id}/")
        assert resp.status_code == 200
        return resp.data

    def test_masque_pour_un_collegue(self, api_client, agent2, prevoyance):
        data = self._get(api_client, agent2, prevoyance)
        assert data["questionnaire_medical"] is None
        assert data["questionnaire_masque"] is True
        assert data["questionnaire_medical_rempli"] is True

    def test_masque_dans_la_liste(self, api_client, agent2, prevoyance):
        api_client.force_authenticate(user=agent2)
        item = api_client.get("/api/magistassur/prevoyance/").data["results"][0]
        assert item["questionnaire_medical"] is None
        assert item["questionnaire_medical_rempli"] is True

    def test_masque_si_personne_n_a_le_dossier(self, api_client, agent, prevoyance):
        prevoyance.pris_en_charge_par = None
        prevoyance.save(update_fields=["pris_en_charge_par"])
        assert self._get(api_client, agent, prevoyance)["questionnaire_medical"] is None

    def test_masque_apres_liberation(self, api_client, agent, prevoyance):
        api_client.force_authenticate(user=agent)
        resp = api_client.post(f"/api/magistassur/prevoyance/{prevoyance.id}/liberer/")
        assert resp.status_code == 200
        assert resp.data["questionnaire_medical"] is None

    @pytest.mark.parametrize("who", ["agent", "admin_user", "client_user"])
    def test_visible_responsable_admin_titulaire(self, api_client, request, prevoyance, who):
        data = self._get(api_client, request.getfixturevalue(who), prevoyance)
        assert data["questionnaire_medical"]["taille_cm"] == 175
        assert data["questionnaire_masque"] is False


@pytest.mark.django_db
class TestJournalConsultation:
    def test_consultation_agent_journalisee(self, api_client, agent2, client_user, prevoyance):
        api_client.force_authenticate(user=agent2)
        api_client.get(f"/api/magistassur/prevoyance/{prevoyance.id}/")
        log = UserAuditLog.objects.get(action="dossier_consultation")
        assert log.performed_by == agent2
        assert log.target_user == client_user
        assert log.metadata["produit"] == "prevoyance"

    def test_consultation_client_non_journalisee(self, api_client, client_user, prevoyance):
        api_client.force_authenticate(user=client_user)
        api_client.get(f"/api/magistassur/prevoyance/{prevoyance.id}/")
        assert not UserAuditLog.objects.filter(action="dossier_consultation").exists()


@pytest.mark.django_db
class TestEmissions:
    def _payer(self, api_client, emission):
        return api_client.post("/api/paiements/", {
            "emission": emission.id, "date_reglement": "2025-02-01",
            "reference": "VIR-001", "montant_regle": 10000,
        }, format="json")

    def test_paiement_sur_emission_d_un_collegue_refuse(self, api_client, agent2, emission):
        api_client.force_authenticate(user=agent2)
        assert self._payer(api_client, emission).status_code == 403
        assert not emission.paiements.exists()

    def test_paiement_sur_sa_propre_emission(self, api_client, agent, emission):
        api_client.force_authenticate(user=agent)
        assert self._payer(api_client, emission).status_code == 201

    def test_client_d_une_emission_non_modifiable(self, api_client, agent, emission, client_user_douanier):
        api_client.force_authenticate(user=agent)
        resp = api_client.patch(f"/api/emissions/{emission.id}/",
                                {"client": client_user_douanier.id}, format="json")
        assert resp.status_code == 400
        emission.refresh_from_db()
        assert emission.client_id != client_user_douanier.id

    def test_agent_d_une_emission_non_modifiable(self, api_client, agent, agent2, emission):
        api_client.force_authenticate(user=agent)
        api_client.patch(f"/api/emissions/{emission.id}/", {"agent": agent2.id}, format="json")
        emission.refresh_from_db()
        assert emission.agent_id == agent.id

    def test_emission_rattachee_a_un_agent_refusee(self, api_client, agent, agent2):
        api_client.force_authenticate(user=agent)
        resp = api_client.post("/api/emissions/", {
            "client": agent2.id, "date": "2025-01-15", "risque": "Automobile", "compagnie": "NSIA",
            "num_facture": "FAC-X", "num_police": "POL-X", "effet": "2025-01-15",
            "echeance": "2026-01-14", "prime_nette": 100, "prime_ttc": 120, "situation": "Affaire nouvelle",
        }, format="json")
        assert resp.status_code == 400
        assert "client" in resp.data

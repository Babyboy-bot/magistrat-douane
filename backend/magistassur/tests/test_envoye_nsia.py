"""Étape « dossier envoyé à NSIA » + enregistrement des cotisations."""
import pytest
from magistassur.models import ContratEpargne, ContratPrevoyance
from magistassur.services import assigner_police_epargne


@pytest.fixture
def epargne(db, client_user):
    return ContratEpargne.objects.create(
        client=client_user, duree_annees=10, periodicite="mensuelle",
        date_premiere_cotisation="2030-01-01", montant_cotisation=25000, capital_constitue=0,
    )


@pytest.fixture
def prevoyance(db, client_user):
    return ContratPrevoyance.objects.create(client=client_user, garantie_prevoyance_deces=True)


@pytest.mark.django_db
class TestEnvoyeNsia:
    def test_refuse_sans_prise_en_charge(self, api_client, agent, epargne):
        api_client.force_authenticate(user=agent)
        resp = api_client.post(f"/api/magistassur/epargne/{epargne.id}/envoye-nsia/")
        assert resp.status_code == 403
        epargne.refresh_from_db()
        assert epargne.envoye_nsia_at is None

    def test_refuse_si_pris_par_autre_agent(self, api_client, agent, agent2, epargne):
        epargne.pris_en_charge_par = agent2
        epargne.save()
        api_client.force_authenticate(user=agent)
        resp = api_client.post(f"/api/magistassur/epargne/{epargne.id}/envoye-nsia/")
        assert resp.status_code == 403

    def test_ok_apres_prise_en_charge(self, api_client, agent, epargne):
        epargne.pris_en_charge_par = agent
        epargne.save()
        api_client.force_authenticate(user=agent)
        resp = api_client.post(f"/api/magistassur/epargne/{epargne.id}/envoye-nsia/")
        assert resp.status_code == 200
        assert resp.data["envoye_nsia_at"] is not None

    def test_prevoyance_ok(self, api_client, agent, prevoyance):
        prevoyance.pris_en_charge_par = agent
        prevoyance.save()
        api_client.force_authenticate(user=agent)
        resp = api_client.post(f"/api/magistassur/prevoyance/{prevoyance.id}/envoye-nsia/")
        assert resp.status_code == 200
        prevoyance.refresh_from_db()
        assert prevoyance.envoye_nsia_at is not None

    def test_refuse_si_police_deja_attribuee(self, api_client, agent, epargne):
        epargne.pris_en_charge_par = agent
        epargne.save()
        assigner_police_epargne(epargne, "POL-NSIA-1", "", agent)
        api_client.force_authenticate(user=agent)
        resp = api_client.post(f"/api/magistassur/epargne/{epargne.id}/envoye-nsia/")
        assert resp.status_code == 400


@pytest.mark.django_db
class TestLiberer:
    def test_liberer_ok_avant_envoi(self, api_client, agent, epargne):
        epargne.pris_en_charge_par = agent
        epargne.save()
        api_client.force_authenticate(user=agent)
        resp = api_client.post(f"/api/magistassur/epargne/{epargne.id}/liberer/")
        assert resp.status_code == 200
        epargne.refresh_from_db()
        assert epargne.pris_en_charge_par is None

    def test_liberer_refuse_apres_envoi_nsia(self, api_client, agent, epargne):
        from django.utils import timezone
        epargne.pris_en_charge_par = agent
        epargne.envoye_nsia_at = timezone.now()
        epargne.save()
        api_client.force_authenticate(user=agent)
        resp = api_client.post(f"/api/magistassur/epargne/{epargne.id}/liberer/")
        assert resp.status_code == 400
        epargne.refresh_from_db()
        assert epargne.pris_en_charge_par == agent

    def test_liberer_refuse_si_police(self, api_client, agent, epargne):
        epargne.pris_en_charge_par = agent
        epargne.save()
        assigner_police_epargne(epargne, "POL-NSIA-2", "", agent)
        api_client.force_authenticate(user=agent)
        resp = api_client.post(f"/api/magistassur/epargne/{epargne.id}/liberer/")
        assert resp.status_code == 400
        epargne.refresh_from_db()
        assert epargne.pris_en_charge_par == agent

    def test_liberer_refuse_apres_envoi_prevoyance(self, api_client, agent, prevoyance):
        from django.utils import timezone
        prevoyance.pris_en_charge_par = agent
        prevoyance.envoye_nsia_at = timezone.now()
        prevoyance.save()
        api_client.force_authenticate(user=agent)
        resp = api_client.post(f"/api/magistassur/prevoyance/{prevoyance.id}/liberer/")
        assert resp.status_code == 400
        prevoyance.refresh_from_db()
        assert prevoyance.pris_en_charge_par == agent

    def test_client_ne_peut_pas_marquer(self, api_client, client_user, epargne):
        api_client.force_authenticate(user=client_user)
        resp = api_client.post(f"/api/magistassur/epargne/{epargne.id}/envoye-nsia/")
        assert resp.status_code in (403, 404)

    def test_champ_non_modifiable_a_la_creation(self, api_client, client_user):
        client_user.profession_type = "magistrat"
        client_user.save()
        api_client.force_authenticate(user=client_user)
        resp = api_client.post("/api/magistassur/epargne/", {
            "duree_annees": 10, "periodicite": "mensuelle", "montant_cotisation": 25000,
            "date_premiere_cotisation": "2030-01-01", "envoye_nsia_at": "2026-01-01T00:00:00Z",
        }, format="json")
        assert resp.status_code == 201
        assert ContratEpargne.objects.get(pk=resp.data["id"]).envoye_nsia_at is None


@pytest.mark.django_db
class TestCotisation:
    def test_date_paiement_et_reference_enregistrees(self, api_client, agent, epargne):
        epargne.pris_en_charge_par = agent
        epargne.save(update_fields=["pris_en_charge_par"])
        assigner_police_epargne(epargne, "POL-COT-1", "", agent)
        api_client.force_authenticate(user=agent)
        resp = api_client.post(f"/api/magistassur/epargne/{epargne.id}/cotisation/", {
            "montant": 25000, "date_echeance": "2030-02-01",
            "date_paiement": "2030-01-28", "reference": "VIR-123",
        }, format="json")
        assert resp.status_code == 201
        assert resp.data["date_paiement"] == "2030-01-28"
        assert resp.data["reference"] == "VIR-123"
        assert resp.data["statut"] == "payee"

    def test_date_paiement_par_defaut_aujourdhui(self, api_client, agent, epargne):
        epargne.pris_en_charge_par = agent
        epargne.save(update_fields=["pris_en_charge_par"])
        assigner_police_epargne(epargne, "POL-COT-2", "", agent)
        api_client.force_authenticate(user=agent)
        resp = api_client.post(f"/api/magistassur/epargne/{epargne.id}/cotisation/", {
            "montant": 25000, "date_echeance": "2030-02-01",
        }, format="json")
        assert resp.status_code == 201
        assert resp.data["date_paiement"] is not None


@pytest.mark.django_db
class TestPriseEnChargeNotification:
    def test_client_notifie_avec_nom_et_tel_agent(self, api_client, agent, client_user, epargne):
        from notifications.models import Notification
        agent.telephone = "0707070707"
        agent.save()
        api_client.force_authenticate(user=agent)
        resp = api_client.post(f"/api/magistassur/epargne/{epargne.id}/prise-en-charge/")
        assert resp.status_code == 200
        notif = Notification.objects.filter(user=client_user).latest("created_at")
        assert "en cours de traitement" in notif.title
        assert agent.full_name in notif.message
        assert "0707070707" in notif.message
        assert resp.data["pris_en_charge_telephone"] == "0707070707"

    def test_pas_de_doublon_si_meme_agent(self, api_client, agent, client_user, epargne):
        from notifications.models import Notification
        api_client.force_authenticate(user=agent)
        api_client.post(f"/api/magistassur/epargne/{epargne.id}/prise-en-charge/")
        api_client.post(f"/api/magistassur/epargne/{epargne.id}/prise-en-charge/")
        assert Notification.objects.filter(
            user=client_user, title__icontains="en cours de traitement"
        ).count() == 1

    def test_prevoyance_notifie_aussi(self, api_client, agent, client_user, prevoyance):
        from notifications.models import Notification
        api_client.force_authenticate(user=agent)
        resp = api_client.post(f"/api/magistassur/prevoyance/{prevoyance.id}/prise-en-charge/")
        assert resp.status_code == 200
        assert Notification.objects.filter(
            user=client_user, title__icontains="en cours de traitement"
        ).exists()


@pytest.mark.django_db
class TestExportConcordance:
    """L'export NSIA doit refléter exactement ce que l'agent voit dans l'interface."""

    def test_epargne_sections_contiennent_rib_pieces_et_conseiller(self, agent, epargne):
        from magistassur.exports import _epargne_sections
        epargne.pris_en_charge_par = agent
        epargne.numero_compte = "CI93 0010 2030 4050 6070 8090"
        epargne.save()
        sections = dict(_epargne_sections(epargne))
        garanties = dict(sections["GARANTIES & COTISATIONS"])
        assert garanties["N° compte (RIB)"] == "CI93 0010 2030 4050 6070 8090"
        pieces = dict(sections["PIÈCES JOINTES"])
        assert pieces["RIB (document)"] == "NON FOURNI"
        assert "ASSURÉ" in sections
        conseiller = dict(sections["CONSEILLER / AGENT"])
        assert conseiller["Conseiller"] == agent.full_name

    def test_prevoyance_assures_affichent_indemnite_pas_prime(self, agent, prevoyance):
        from magistassur.exports import _prevoyance_sections
        from magistassur.models import AssureAssocie
        AssureAssocie.objects.create(contrat=prevoyance, lien_parente="enfant", nom="KASSI Elie")
        AssureAssocie.objects.create(contrat=prevoyance, lien_parente="pere", nom="KASSI Aka")
        prevoyance.pris_en_charge_par = agent
        prevoyance.save()
        sections = dict(_prevoyance_sections(prevoyance))
        assures = sections["ASSURÉS ASSOCIÉS"]
        texte = " ".join(v for _, v in assures)
        assert "Prime" not in texte
        assert "Indemnité : 500 000 FCFA" in texte
        assert "Indemnité : 750 000 FCFA" in texte

    def test_excel_et_pdf_prevoyance_identiques(self, prevoyance):
        """Excel et PDF lisent les mêmes sections — vérifié à la source."""
        import inspect
        from magistassur import exports
        src_excel = inspect.getsource(exports.export_prevoyance_excel)
        src_pdf = inspect.getsource(exports.export_prevoyance_pdf)
        assert "_prevoyance_sections" in src_excel
        assert "_prevoyance_sections" in src_pdf

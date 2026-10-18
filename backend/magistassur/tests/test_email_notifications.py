"""Emails doublant les notifications critiques Magist-Assur."""
import pytest
from django.core import mail
from accounts.models import User
from accounts.services import verify_prospect
from magistassur.models import ContratEpargne, ContratPrevoyance
from magistassur.services import assigner_police_epargne

LOCMEM = "django.core.mail.backends.locmem.EmailBackend"


@pytest.fixture
def epargne(db, client_user, agent):
    return ContratEpargne.objects.create(
        client=client_user, duree_annees=10, periodicite="mensuelle",
        date_premiere_cotisation="2030-01-01", montant_cotisation=25000, capital_constitue=0,
        pris_en_charge_par=agent,
    )


@pytest.fixture
def prevoyance(db, client_user, agent):
    return ContratPrevoyance.objects.create(
        client=client_user, garantie_prevoyance_deces=True, pris_en_charge_par=agent,
    )


@pytest.fixture(autouse=True)
def _email_settings(settings):
    settings.EMAIL_BACKEND = LOCMEM
    settings.EMAIL_NOTIFICATIONS = True


@pytest.mark.django_db
class TestEmailsCritiques:
    def test_compte_valide_envoie_email(self, agent):
        prospect = User.objects.create_user(
            email="prospect@test.ci", password="TestPass123!", nom="Kouame", prenoms="Jean",
            role="prospect", profession_type="magistrat",
        )
        mail.outbox.clear()
        verify_prospect(prospect, agent)
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == ["prospect@test.ci"]
        assert "validé" in mail.outbox[0].subject

    def test_police_epargne_envoie_email(self, api_client, agent, epargne, django_capture_on_commit_callbacks):
        api_client.force_authenticate(user=agent)
        mail.outbox.clear()
        with django_capture_on_commit_callbacks(execute=True):
            resp = api_client.post(f"/api/magistassur/epargne/{epargne.id}/assign-police/",
                                   {"num_police": "POL-MAIL-1"})
        assert resp.status_code == 200
        assert len(mail.outbox) == 1
        assert "POL-MAIL-1" in mail.outbox[0].body

    def test_police_prevoyance_envoie_email(self, api_client, agent, prevoyance,
                                            django_capture_on_commit_callbacks):
        api_client.force_authenticate(user=agent)
        mail.outbox.clear()
        with django_capture_on_commit_callbacks(execute=True):
            resp = api_client.post(f"/api/magistassur/prevoyance/{prevoyance.id}/assign-police/",
                                   {"num_police": "POL-MAIL-2"})
        assert resp.status_code == 200
        assert len(mail.outbox) == 1
        assert "POL-MAIL-2" in mail.outbox[0].body

    def test_suspension_envoie_email(self, api_client, agent, epargne, django_capture_on_commit_callbacks):
        assigner_police_epargne(epargne, "POL-MAIL-3", "", agent)
        api_client.force_authenticate(user=agent)
        mail.outbox.clear()
        with django_capture_on_commit_callbacks(execute=True):
            resp = api_client.post(f"/api/magistassur/epargne/{epargne.id}/change-statut/",
                                   {"statut": "suspendu"})
        assert resp.status_code == 200
        assert len(mail.outbox) == 1
        assert "Suspendu" in mail.outbox[0].body

    def test_statut_non_critique_pas_d_email(self, api_client, agent, epargne,
                                              django_capture_on_commit_callbacks):
        assigner_police_epargne(epargne, "POL-MAIL-4", "", agent)
        api_client.force_authenticate(user=agent)
        mail.outbox.clear()
        with django_capture_on_commit_callbacks(execute=True):
            resp = api_client.post(f"/api/magistassur/epargne/{epargne.id}/change-statut/",
                                   {"statut": "arrive_terme"})
        assert resp.status_code == 200
        assert mail.outbox == []

    def test_flag_desactive_bloque_email(self, api_client, agent, epargne, settings,
                                         django_capture_on_commit_callbacks):
        settings.EMAIL_NOTIFICATIONS = False
        api_client.force_authenticate(user=agent)
        mail.outbox.clear()
        with django_capture_on_commit_callbacks(execute=True):
            api_client.post(f"/api/magistassur/epargne/{epargne.id}/assign-police/",
                            {"num_police": "POL-MAIL-5"})
        assert mail.outbox == []

    def test_contenu_echappe(self, agent):
        from notifications.emails import send_critical_notification_email
        agent.nom = "<script>x</script>"
        mail.outbox.clear()
        send_critical_notification_email(agent, "Titre", "Message <b>")
        html = mail.outbox[0].alternatives[0][0]
        assert "<script>" not in html and "&lt;script&gt;" in html

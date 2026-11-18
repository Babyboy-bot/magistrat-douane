"""Inventaire complet des emails transactionnels : destinataires et contenus.

Complète magistassur/tests/test_email_notifications.py (emails critiques) et
tests/test_security_lot3b.py (échappement HTML) : ici on vérifie que CHAQUE
email part bien, au(x) bon(s) destinataire(s), avec le bon contenu minimal.
"""
import pytest
from django.core import mail

from accounts.models import User
from core.models import ClientRequest, Document
from magistassur.models import ContratEpargne, ContratPrevoyance
from notifications.emails import (
    send_critical_notification_email,
    send_livrable_notification,
    send_new_dossier_alert_to_agents,
    send_new_request_alert_to_agents,
    send_password_reset_email,
    send_pending_verification_alert_to_agents,
    send_request_acknowledgment,
    send_request_treated,
    send_signup_attempt_email,
    send_verification_email,
    send_welcome_email,
)

LOCMEM = "django.core.mail.backends.locmem.EmailBackend"


@pytest.fixture(autouse=True)
def _locmem(settings):
    settings.EMAIL_BACKEND = LOCMEM
    settings.EMAIL_NOTIFICATIONS = True
    mail.outbox.clear()


@pytest.fixture
def admin(db):
    return User.objects.create_user(
        email="admin.mail@acs.ci", password="AdminPass123!",
        nom="Admin", prenoms="Mail", role="admin",
        is_active=True, account_status="active",
    )


@pytest.fixture
def requete(db, client_user):
    return ClientRequest.objects.create(client=client_user, type="cotation_auto")


# ── Emails → CLIENT ───────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestEmailsClient:
    def test_bienvenue(self, client_user):
        send_welcome_email(client_user)
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == [client_user.email]
        assert "Bienvenue" in mail.outbox[0].subject

    def test_verification_email_contient_lien(self, client_user):
        url = "https://acs.example/verify/abc123"
        send_verification_email(client_user, url)
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == [client_user.email]
        assert "Confirmez" in mail.outbox[0].subject
        assert url in mail.outbox[0].body

    def test_reset_password_contient_lien(self, client_user):
        url = "https://acs.example/reset/token-xyz"
        send_password_reset_email(client_user, url)
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == [client_user.email]
        assert "Réinitialisation" in mail.outbox[0].subject
        assert url in mail.outbox[0].body

    def test_signup_attempt_alert(self, client_user):
        send_signup_attempt_email(client_user)
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == [client_user.email]
        assert "Tentative" in mail.outbox[0].subject

    def test_accuse_reception_requete(self, requete):
        send_request_acknowledgment(requete)
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == [requete.client.email]
        assert requete.numero in mail.outbox[0].subject

    def test_requete_traitee(self, requete):
        send_request_treated(requete)
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == [requete.client.email]
        assert requete.numero in mail.outbox[0].subject

    def test_livrable_disponible(self, requete):
        doc = Document.objects.create(
            request=requete, nom="Devis final.pdf", is_livrable=True,
            uploaded_by=requete.client,
        )
        send_livrable_notification(requete, doc)
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == [requete.client.email]
        assert "Devis final.pdf" in mail.outbox[0].body

    def test_email_critique(self, client_user):
        send_critical_notification_email(client_user, "Titre test", "Message test")
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == [client_user.email]

    def test_pas_d_email_sans_adresse(self):
        user = User(email="", nom="SansMail", prenoms="Test")
        send_welcome_email(user)
        send_verification_email(user, "https://x")
        send_password_reset_email(user, "https://x")
        assert mail.outbox == []


# ── Emails → AGENTS / ADMINS ──────────────────────────────────────────────────

@pytest.mark.django_db
class TestEmailsAgents:
    def test_nouvelle_requete_agents_seuls(self, agent, admin, requete):
        """L'alerte « nouvelle requête » vise les agents actifs uniquement."""
        send_new_request_alert_to_agents(requete)
        recipients = {to for msg in mail.outbox for to in msg.to}
        assert agent.email in recipients
        assert admin.email not in recipients
        assert all(requete.numero in m.subject for m in mail.outbox)

    def test_compte_a_verifier_agents_et_admins(self, agent, admin):
        prospect = User.objects.create_user(
            email="prospect@test.ci", password="TestPass123!",
            nom="Kouassi", prenoms="Aya", role="prospect",
            profession_type="douanier", telephone="+225 01 02 03 04 05",
        )
        send_pending_verification_alert_to_agents(prospect)
        recipients = {to for msg in mail.outbox for to in msg.to}
        assert recipients == {agent.email, admin.email}
        assert all("vérifier" in m.subject for m in mail.outbox)
        assert "Kouassi Aya" in mail.outbox[0].body

    def test_nouveau_dossier_epargne(self, agent, admin, client_user):
        contrat = ContratEpargne.objects.create(
            client=client_user, duree_annees=10, periodicite="mensuelle",
            date_premiere_cotisation="2030-01-01", montant_cotisation=25000,
        )
        send_new_dossier_alert_to_agents(contrat, "epargne")
        recipients = {to for msg in mail.outbox for to in msg.to}
        assert recipients == {agent.email, admin.email}
        assert all("Épargne" in m.subject for m in mail.outbox)

    def test_nouveau_dossier_prevoyance(self, agent, admin, client_user):
        contrat = ContratPrevoyance.objects.create(
            client=client_user, garantie_prevoyance_deces=True,
        )
        send_new_dossier_alert_to_agents(contrat, "prevoyance")
        recipients = {to for msg in mail.outbox for to in msg.to}
        assert recipients == {agent.email, admin.email}
        assert all("Prévoyance" in m.subject for m in mail.outbox)

    def test_agent_inactif_ou_sans_email_non_appele(self, agent, admin, requete):
        agent.is_active = False
        agent.save()
        send_pending_verification_alert_to_agents(agent)
        recipients = {to for msg in mail.outbox for to in msg.to}
        assert agent.email not in recipients
        assert admin.email in recipients


# ── Câblage : les vues déclenchent bien les emails ───────────────────────────

@pytest.mark.django_db
class TestCablageVues:
    def test_inscription_magistrat_alerte_agents(self, api_client, agent, admin):
        resp = api_client.post("/api/auth/register/", {
            "email": "juge@test.ci", "nom": "N'Guessan", "prenoms": "Marc",
            "profession": "Juge", "profession_type": "magistrat",
            "telephone": "+225 07 00 11 22 33",
            "password": "MotDePasse!2026", "password_confirm": "MotDePasse!2026",
        }, format="json")
        assert resp.status_code in (200, 201)
        agent_msgs = [m for m in mail.outbox if agent.email in m.to or admin.email in m.to]
        assert any("vérifier" in m.subject for m in agent_msgs), \
            "Les agents doivent recevoir l'alerte de vérification"

    def test_inscription_envoie_bienvenue_et_verification(self, api_client, agent):
        resp = api_client.post("/api/auth/register/", {
            "email": "douanier@test.ci", "nom": "Kone", "prenoms": "Fatou",
            "profession": "Douanière", "profession_type": "douanier",
            "telephone": "+225 05 00 11 22 33",
            "password": "MotDePasse!2026", "password_confirm": "MotDePasse!2026",
        }, format="json")
        assert resp.status_code in (200, 201)
        client_msgs = [m for m in mail.outbox if m.to == ["douanier@test.ci"]]
        subjects = [m.subject for m in client_msgs]
        assert any("Bienvenue" in s for s in subjects)
        assert any("Confirmez" in s for s in subjects)

    def test_soumission_epargne_alerte_agents(self, api_client, client_user, agent):
        api_client.force_authenticate(user=client_user)
        mail.outbox.clear()
        resp = api_client.post("/api/magistassur/epargne/", {
            "duree_annees": 10, "periodicite": "mensuelle",
            "date_premiere_cotisation": "2030-01-01", "montant_cotisation": 25000,
        }, format="json")
        assert resp.status_code == 201
        assert any(agent.email in m.to and "Épargne" in m.subject for m in mail.outbox)

    def test_soumission_prevoyance_alerte_agents(self, api_client, client_user, agent):
        api_client.force_authenticate(user=client_user)
        mail.outbox.clear()
        resp = api_client.post("/api/magistassur/prevoyance/", {
            "garantie_prevoyance_deces": True,
        }, format="json")
        assert resp.status_code == 201
        assert any(agent.email in m.to and "Prévoyance" in m.subject for m in mail.outbox)

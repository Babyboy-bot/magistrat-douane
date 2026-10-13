"""Tests des correctifs du lot 1 (audit sécurité) — version develop.

Couvre :
- C4 : reset-password ne doit plus modifier le mot de passe à la demande
- C5 : auto-déclaration magistrat/douanier ne doit pas vérifier le compte
- H1 : PATCH /me ne doit plus accepter le mot de passe
- C15/D06 : email modifiable via /me et PATCH admin (avec unicité)
"""
import re

import pytest
from django.contrib.auth import get_user_model
from django.core import mail

User = get_user_model()

PASSWORD = "TestPass123!"


def force_login(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


def register(api_client, **overrides):
    payload = {
        "nom": "Nouveau", "prenoms": "Compte",
        "telephone": "0700000099", "password": "Zx9!kLmQ2026",
        "profession_type": "autre",
    }
    payload.update(overrides)
    return api_client.post("/api/auth/register/", payload, format="json")


@pytest.mark.django_db
class TestRegistrationStatus:
    """C5 : plus de vérification automatique à l'inscription."""

    def test_magistrat_not_auto_verified(self, api_client):
        resp = register(api_client, profession_type="magistrat")
        assert resp.status_code == 201
        user = User.objects.get(telephone="0700000099")
        assert user.verified is False
        assert user.account_status == "pending_verification"
        assert user.risk_level == "standard"

    def test_douanier_not_auto_verified(self, api_client):
        register(api_client, profession_type="douanier", telephone="0711223344")
        user = User.objects.get(telephone="0711223344")
        assert user.verified is False
        assert user.account_status == "pending_verification"

    def test_agent_verification_grants_premium(self, api_client, agent):
        register(api_client, profession_type="magistrat")
        user = User.objects.get(telephone="0700000099")
        force_login(api_client, agent)
        resp = api_client.post("/api/auth/users/verify/", {"user_id": user.id, "action": "verify"}, format="json")
        assert resp.status_code == 200
        user.refresh_from_db()
        assert user.verified and user.account_status == "verified"
        assert user.risk_level == "premium"


@pytest.mark.django_db
class TestProfilePassword:
    """H1 : /me n'accepte plus le mot de passe."""

    def test_me_password_ignored(self, api_client, client_user):
        force_login(api_client, client_user)
        resp = api_client.patch("/api/auth/me/", {"password": "12345678"}, format="json")
        assert resp.status_code == 200
        client_user.refresh_from_db()
        assert client_user.check_password(PASSWORD)

    def test_change_password_requires_current(self, api_client, client_user):
        force_login(api_client, client_user)
        resp = api_client.post("/api/auth/me/password/", {
            "current_password": "wrong", "new_password": "Zx9!kLmQ2026",
        }, format="json")
        assert resp.status_code == 400


@pytest.mark.django_db
class TestEmailUpdate:
    """C15/D06 : l'email doit réellement être modifié (ou refusé si doublon)."""

    def test_me_can_update_email(self, api_client, client_user):
        force_login(api_client, client_user)
        resp = api_client.patch("/api/auth/me/", {"email": "newmail@test.ci"}, format="json")
        assert resp.status_code == 200
        client_user.refresh_from_db()
        assert client_user.email == "newmail@test.ci"

    def test_me_duplicate_email_rejected(self, api_client, client_user, agent):
        force_login(api_client, client_user)
        resp = api_client.patch("/api/auth/me/", {"email": agent.email}, format="json")
        assert resp.status_code == 400

    def test_admin_can_update_agent_email(self, api_client, admin_user, agent):
        force_login(api_client, admin_user)
        resp = api_client.patch(f"/api/auth/agents/{agent.id}/", {"email": "renomme@test.ci"}, format="json")
        assert resp.status_code == 200
        agent.refresh_from_db()
        assert agent.email == "renomme@test.ci"

    def test_me_duplicate_phone_rejected(self, api_client, client_user, agent):
        agent.telephone = "0707778899"
        agent.save()
        force_login(api_client, client_user)
        resp = api_client.patch("/api/auth/me/", {"telephone": "07 07 77 88 99"}, format="json")
        assert resp.status_code == 400


@pytest.mark.django_db
class TestPasswordReset:
    """C4 : la demande ne change plus le mot de passe ; le lien est requis."""

    def test_request_does_not_change_password_nor_enumerate(self, api_client, client_user):
        known = api_client.post("/api/auth/reset-password/", {"identifier": client_user.email}, format="json")
        unknown = api_client.post("/api/auth/reset-password/", {"identifier": "nobody@test.ci"}, format="json")
        assert known.status_code == unknown.status_code == 200
        assert known.data == unknown.data
        client_user.refresh_from_db()
        assert client_user.check_password(PASSWORD)

    def test_request_sends_signed_link(self, api_client, client_user):
        api_client.post("/api/auth/reset-password/", {"identifier": client_user.email}, format="json")
        assert len(mail.outbox) == 1
        assert "uid=" in mail.outbox[0].body and "token=" in mail.outbox[0].body

    def test_full_flow_with_emailed_link(self, api_client, client_user):
        api_client.post("/api/auth/reset-password/", {"identifier": client_user.email}, format="json")
        uid, token = re.search(r"uid=([^&\s]+)&token=([^\s\"]+)", mail.outbox[0].body).groups()
        resp = api_client.post("/api/auth/reset-password/confirm/", {
            "uid": uid, "token": token, "new_password": "Nouv3au!Secret",
        }, format="json")
        assert resp.status_code == 200
        client_user.refresh_from_db()
        assert client_user.check_password("Nouv3au!Secret")

    def test_token_is_single_use(self, api_client, client_user):
        api_client.post("/api/auth/reset-password/", {"identifier": client_user.email}, format="json")
        uid, token = re.search(r"uid=([^&\s]+)&token=([^\s\"]+)", mail.outbox[0].body).groups()
        api_client.post("/api/auth/reset-password/confirm/", {
            "uid": uid, "token": token, "new_password": "Nouv3au!Secret",
        }, format="json")
        again = api_client.post("/api/auth/reset-password/confirm/", {
            "uid": uid, "token": token, "new_password": "Autr3!Secret9",
        }, format="json")
        assert again.status_code == 400

    def test_invalid_token_rejected(self, api_client, client_user):
        resp = api_client.post("/api/auth/reset-password/confirm/", {
            "uid": "MQ", "token": "bad-token", "new_password": "Nouv3au!Secret",
        }, format="json")
        assert resp.status_code == 400
        client_user.refresh_from_db()
        assert client_user.check_password(PASSWORD)

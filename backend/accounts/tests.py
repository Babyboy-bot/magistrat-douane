import re

import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework.test import APIClient

User = get_user_model()

PASSWORD = "TestPass123!"


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def client_user(db):
    return User.objects.create_user(
        email="client@test.ci", password=PASSWORD, nom="Client", prenoms="Test",
        telephone="0700000001",
    )


@pytest.fixture
def agent(db):
    return User.objects.create_user(
        email="agent@acs.ci", password=PASSWORD, nom="Agent", prenoms="Test", role="agent",
    )


def register(api_client, **overrides):
    payload = {
        "email": "nouveau@test.ci", "password": "Zx9!kLmQ2026", "nom": "Nouveau",
        "prenoms": "Compte", "telephone": "0700000099", "profession_type": "autre",
    }
    payload.update(overrides)
    return api_client.post("/api/auth/register/", payload, format="json")


@pytest.mark.django_db
class TestRegistration:
    def test_self_declared_magistrat_is_not_auto_verified(self, api_client):
        resp = register(api_client, profession_type="magistrat")
        assert resp.status_code == 201
        assert resp.data["role"] == "prospect"
        assert resp.data["verified"] is False
        assert resp.data["risk_level"] == "standard"
        assert resp.data["account_status"] == "pending_verification"

    def test_agent_verification_grants_premium(self, api_client, agent):
        user_id = register(api_client, profession_type="douanier").data["id"]
        api_client.force_authenticate(agent)
        resp = api_client.post("/api/auth/users/verify/", {"user_id": user_id, "action": "verify"}, format="json")
        assert resp.status_code == 200
        user = User.objects.get(pk=user_id)
        assert (user.role, user.verified, user.risk_level) == ("client", True, "premium")

    def test_several_accounts_without_email(self, api_client):
        assert register(api_client, email="", telephone="0711111111").status_code == 201
        assert register(api_client, email="", telephone="0722222222").status_code == 201
        assert User.objects.filter(email__isnull=True).count() == 2

    def test_duplicate_phone_rejected(self, api_client, client_user):
        assert register(api_client, telephone="07 00 00 00 01").status_code == 400


@pytest.mark.django_db
class TestLoginTokens:
    def test_tokens_not_exposed_in_body(self, api_client, client_user):
        resp = api_client.post("/api/auth/login/", {"identifier": "client@test.ci", "password": PASSWORD}, format="json")
        assert resp.status_code == 200
        assert "access" not in resp.data and "refresh" not in resp.data
        assert "access_token" in resp.cookies and "refresh_token" in resp.cookies

    def test_wrong_password_returns_401(self, api_client, client_user):
        resp = api_client.post("/api/auth/login/", {"identifier": "client@test.ci", "password": "bad"}, format="json")
        assert resp.status_code == 401

    def test_expired_access_cookie_does_not_block_login(self, api_client, client_user):
        api_client.cookies["access_token"] = "expired-or-invalid"
        resp = api_client.post("/api/auth/login/", {"identifier": "client@test.ci", "password": PASSWORD}, format="json")
        assert resp.status_code == 200

    def test_refresh_ignores_token_in_body(self, api_client, client_user):
        resp = api_client.post("/api/auth/token/refresh/", {"refresh": "forged"}, format="json")
        assert resp.status_code == 401

    def test_refresh_rejects_inactive_user(self, api_client, client_user):
        api_client.post("/api/auth/login/", {"identifier": "client@test.ci", "password": PASSWORD}, format="json")
        User.objects.filter(pk=client_user.pk).update(is_active=False)
        assert api_client.post("/api/auth/token/refresh/").status_code == 401


@pytest.mark.django_db
class TestCsrfOnCookieAuth:
    def test_unsafe_request_without_csrf_token_rejected(self, client_user):
        api = APIClient(enforce_csrf_checks=True)
        api.post("/api/auth/login/", {"identifier": "client@test.ci", "password": PASSWORD}, format="json")
        assert api.get("/api/auth/me/").status_code == 200
        assert api.patch("/api/auth/me/", {"nom": "Pirate"}, format="json").status_code == 403

    def test_unsafe_request_with_csrf_token_accepted(self, client_user):
        api = APIClient(enforce_csrf_checks=True)
        api.post("/api/auth/login/", {"identifier": "client@test.ci", "password": PASSWORD}, format="json")
        token = api.get("/api/csrf/").json()["csrftoken"]
        resp = api.patch("/api/auth/me/", {"nom": "Nouveau"}, format="json", HTTP_X_CSRFTOKEN=token)
        assert resp.status_code == 200


@pytest.mark.django_db
class TestProfileUpdate:
    def test_me_cannot_change_password(self, api_client, client_user):
        api_client.force_authenticate(client_user)
        api_client.patch("/api/auth/me/", {"password": "12345678"}, format="json")
        client_user.refresh_from_db()
        assert client_user.check_password(PASSWORD)

    def test_me_cannot_deactivate_or_escalate(self, api_client, client_user):
        api_client.force_authenticate(client_user)
        api_client.patch("/api/auth/me/", {"is_active": False, "role": "admin"}, format="json")
        client_user.refresh_from_db()
        assert client_user.is_active and client_user.role == "client"

    def test_change_password_requires_current(self, api_client, client_user):
        api_client.force_authenticate(client_user)
        resp = api_client.post("/api/auth/me/password/", {"current_password": "wrong", "new_password": "Zx9!kLmQ2026"}, format="json")
        assert resp.status_code == 400


@pytest.mark.django_db
class TestPasswordReset:
    def test_request_does_not_change_password_nor_enumerate(self, api_client, client_user):
        known = api_client.post("/api/auth/reset-password/", {"identifier": "client@test.ci"}, format="json")
        unknown = api_client.post("/api/auth/reset-password/", {"identifier": "nobody@test.ci"}, format="json")
        assert known.status_code == unknown.status_code == 200
        assert known.data == unknown.data
        client_user.refresh_from_db()
        assert client_user.check_password(PASSWORD)

    def test_full_reset_flow_with_emailed_link(self, api_client, client_user):
        api_client.post("/api/auth/reset-password/", {"identifier": "client@test.ci"}, format="json")
        assert len(mail.outbox) == 1
        uid, token = re.search(r"uid=([^&\s]+)&token=([^\s\"]+)", mail.outbox[0].body).groups()
        resp = api_client.post("/api/auth/reset-password/confirm/", {"uid": uid, "token": token, "new_password": "Nouv3au!Secret"}, format="json")
        assert resp.status_code == 200
        client_user.refresh_from_db()
        assert client_user.check_password("Nouv3au!Secret")
        # Le lien est à usage unique
        again = api_client.post("/api/auth/reset-password/confirm/", {"uid": uid, "token": token, "new_password": "Autr3!Secret9"}, format="json")
        assert again.status_code == 400

    def test_invalid_token_rejected(self, api_client, client_user):
        resp = api_client.post("/api/auth/reset-password/confirm/", {"uid": "MQ", "token": "bad-token", "new_password": "Nouv3au!Secret"}, format="json")
        assert resp.status_code == 400


@pytest.mark.django_db
class TestAgentCreateClient:
    def test_random_temporary_password_returned_once(self, api_client, agent):
        api_client.force_authenticate(agent)
        payload = {"nom": "A", "prenoms": "B", "email": "a@test.ci", "telephone": "0733333333"}
        resp = api_client.post("/api/auth/users/create/", payload, format="json")
        assert resp.status_code == 201
        temp = resp.data["temporary_password"]
        assert temp and temp != "Temp@1234"
        assert User.objects.get(email="a@test.ci").check_password(temp)

    def test_client_cannot_create_users(self, api_client, client_user):
        api_client.force_authenticate(client_user)
        resp = api_client.post("/api/auth/users/create/", {"nom": "A", "prenoms": "B", "telephone": "0744444444"}, format="json")
        assert resp.status_code == 403


@pytest.mark.django_db
class TestClientIp:
    def test_forwarded_for_ignored_without_trusted_proxy(self, rf, settings):
        from accounts.audit import get_client_ip
        settings.REST_FRAMEWORK = {**settings.REST_FRAMEWORK, "NUM_PROXIES": 0}
        request = rf.get("/", HTTP_X_FORWARDED_FOR="1.2.3.4", REMOTE_ADDR="10.0.0.1")
        assert get_client_ip(request) == "10.0.0.1"

    def test_last_proxy_entry_used_behind_one_proxy(self, rf, settings):
        from accounts.audit import get_client_ip
        settings.REST_FRAMEWORK = {**settings.REST_FRAMEWORK, "NUM_PROXIES": 1}
        request = rf.get("/", HTTP_X_FORWARDED_FOR="6.6.6.6, 203.0.113.7", REMOTE_ADDR="10.0.0.1")
        assert get_client_ip(request) == "203.0.113.7"

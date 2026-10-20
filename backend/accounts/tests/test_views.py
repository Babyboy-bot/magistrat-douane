"""Tests vues API — accounts (auth, register, verify, reset password)."""
import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


def force_login(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.mark.django_db
class TestRegisterView:
    def test_register_creates_client(self, api_client):
        resp = api_client.post("/api/auth/register/", {
            "nom": "Kouassi", "prenoms": "Jean", "profession_type": "magistrat",
            "telephone": "0102030405", "password": "SecurePass123!",
        }, format="json")
        assert resp.status_code == 201
        user = User.objects.get(telephone="0102030405")
        assert user.role == "client"
        assert user.verified is False

    def test_duplicate_telephone_rejected(self, api_client, client_user):
        resp = api_client.post("/api/auth/register/", {
            "nom": "Dup", "prenoms": "Test", "profession_type": "magistrat",
            "telephone": client_user.telephone or "0700000001",
            "password": "SecurePass123!",
        }, format="json")
        # Either 400 (dup tel) or 201 with diff phone
        if client_user.telephone:
            assert resp.status_code == 400

    def test_weak_password_rejected(self, api_client):
        resp = api_client.post("/api/auth/register/", {
            "nom": "Weak", "prenoms": "Pass", "profession_type": "magistrat",
            "telephone": "0701112233", "password": "123",
        }, format="json")
        assert resp.status_code == 400


@pytest.mark.django_db
class TestLoginView:
    def test_login_with_email(self, api_client, client_user):
        client_user.set_password("TestPass123!")
        client_user.save()
        resp = api_client.post("/api/auth/login/", {
            "identifier": client_user.email, "password": "TestPass123!",
        }, format="json")
        assert resp.status_code == 200
        assert "access" in resp.data or resp.cookies.get("access_token")

    def test_wrong_password_rejected(self, api_client, client_user):
        resp = api_client.post("/api/auth/login/", {
            "identifier": client_user.email, "password": "WrongPass!",
        }, format="json")
        assert resp.status_code in (400, 401)

    def test_inactive_user_blocked(self, api_client, db):
        u = User.objects.create_user(
            email="blocked@test.ci", password="TestPass123!",
            nom="Blocked", prenoms="User", is_active=False,
        )
        resp = api_client.post("/api/auth/login/", {
            "identifier": "blocked@test.ci", "password": "TestPass123!",
        }, format="json")
        assert resp.status_code in (400, 401, 403)

    @pytest.mark.parametrize("identifier", [
        "0702030407",
        "+225 07 02 03 04 07",
        "002250702030407",
    ])
    def test_login_with_phone_variants(self, api_client, db, identifier):
        """Le login accepte le numéro local ou avec indicatif +225 / 00225."""
        User.objects.create_user(
            email="phone@test.ci", password="TestPass123!",
            nom="Phone", prenoms="User", role="client",
            is_active=True, telephone="0702030407",
        )
        resp = api_client.post("/api/auth/login/", {
            "identifier": identifier, "password": "TestPass123!",
        }, format="json")
        assert resp.status_code == 200


@pytest.mark.django_db
class TestVerifyUserView:
    def test_agent_verifies_prospect(self, api_client, agent, prospect_user):
        force_login(api_client, agent)
        resp = api_client.post("/api/auth/users/verify/", {
            "user_id": prospect_user.id, "action": "verify",
        }, format="json")
        assert resp.status_code == 200
        prospect_user.refresh_from_db()
        assert prospect_user.role == "client"
        assert prospect_user.verified is True

    def test_agent_rejects_prospect(self, api_client, agent, prospect_user):
        force_login(api_client, agent)
        resp = api_client.post("/api/auth/users/verify/", {
            "user_id": prospect_user.id, "action": "reject",
        }, format="json")
        assert resp.status_code == 200
        prospect_user.refresh_from_db()
        assert prospect_user.is_active is False

    def test_cannot_verify_already_client(self, api_client, agent, client_user):
        force_login(api_client, agent)
        resp = api_client.post("/api/auth/users/verify/", {
            "user_id": client_user.id, "action": "verify",
        }, format="json")
        assert resp.status_code == 400

    def test_client_cannot_verify(self, api_client, client_user, prospect_user):
        force_login(api_client, client_user)
        resp = api_client.post("/api/auth/users/verify/", {
            "user_id": prospect_user.id, "action": "verify",
        }, format="json")
        assert resp.status_code == 403


@pytest.mark.django_db
class TestResetPasswordView:
    def test_reset_returns_generic_message(self, api_client, client_user):
        resp = api_client.post("/api/auth/reset-password/", {
            "identifier": client_user.email,
        }, format="json")
        assert resp.status_code == 200
        assert "detail" in resp.data

    def test_unknown_identifier_returns_200_anti_enumeration(self, api_client):
        resp = api_client.post("/api/auth/reset-password/", {
            "identifier": "nobody@nowhere.ci",
        }, format="json")
        assert resp.status_code == 200


@pytest.mark.django_db
class TestMeView:
    def test_me_returns_user_data(self, api_client, client_user):
        force_login(api_client, client_user)
        resp = api_client.get("/api/auth/me/")
        assert resp.status_code == 200
        assert resp.data["email"] == client_user.email

    def test_anonymous_blocked(self, api_client):
        resp = api_client.get("/api/auth/me/")
        assert resp.status_code in (401, 403)


@pytest.mark.django_db
class TestNoStaffClientCreation:
    """Les clients s'inscrivent eux-mêmes : aucune création de compte client par le staff."""

    @pytest.mark.parametrize("who", ["agent", "admin_user"])
    def test_route_removed(self, api_client, request, who):
        force_login(api_client, request.getfixturevalue(who))
        resp = api_client.post("/api/auth/users/create/", {
            "nom": "X", "prenoms": "Y",
            "telephone": "0700112233", "password": "SecurePass123!",
        }, format="json")
        assert resp.status_code in (404, 405)
        assert not User.objects.filter(telephone="0700112233").exists()

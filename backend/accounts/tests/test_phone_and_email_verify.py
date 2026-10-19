"""Validation du format téléphone CI + vérification d'email par lien signé."""
import pytest
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth import get_user_model
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from accounts.tokens import email_verification_token

User = get_user_model()

REGISTER_PAYLOAD = {
    "password": "TestPass123!",
    "nom": "Test",
    "prenoms": "User",
    "profession_type": "magistrat",
}


@pytest.mark.django_db
class TestPhoneFormat:
    def register(self, api_client, telephone):
        return api_client.post("/api/auth/register/", {
            **REGISTER_PAYLOAD, "telephone": telephone,
        }, format="json")

    def test_valid_mobile_07(self, api_client):
        resp = self.register(api_client, "0702030405")
        assert resp.status_code == 201
        assert User.objects.get(telephone="0702030405")

    def test_valid_mobile_with_spaces(self, api_client):
        resp = self.register(api_client, "07 02 03 04 06")
        assert resp.status_code == 201
        assert User.objects.get(telephone="0702030406")

    def test_valid_with_country_prefix(self, api_client):
        resp = self.register(api_client, "+225 07 02 03 04 07")
        assert resp.status_code == 201
        assert User.objects.get(telephone="0702030407")

    def test_invalid_letters(self, api_client):
        resp = self.register(api_client, "07ab030408")
        assert resp.status_code == 400
        assert not User.objects.filter(nom="Test").exists()

    def test_invalid_too_short(self, api_client):
        resp = self.register(api_client, "070203")
        assert resp.status_code == 400

    def test_invalid_10_digits_bad_prefix(self, api_client):
        resp = self.register(api_client, "9910203040")
        assert resp.status_code == 400

    def test_invalid_fake_digits(self, api_client):
        resp = self.register(api_client, "1234567890")
        assert resp.status_code == 400


@pytest.mark.django_db
class TestEmailVerification:
    def _link(self, user):
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = email_verification_token.make_token(user)
        return {"uid": uid, "token": token}

    def test_old_link_invalid_after_email_change(self, api_client):
        user = User.objects.create_user(
            email="first@test.ci", password="TestPass123!",
            nom="C", prenoms="User", telephone="0702030413",
        )
        old_link = self._link(user)
        user.email = "second@test.ci"
        user.save()
        resp = api_client.post("/api/auth/verify-email/", old_link, format="json")
        assert resp.status_code == 400
        user.refresh_from_db()
        assert user.email_verified is False

    def test_password_reset_token_rejected(self, api_client):
        user = User.objects.create_user(
            email="reset.tok@test.ci", password="TestPass123!",
            nom="R", prenoms="User", telephone="0702030414",
        )
        resp = api_client.post("/api/auth/verify-email/", {
            "uid": urlsafe_base64_encode(force_bytes(user.pk)),
            "token": default_token_generator.make_token(user),
        }, format="json")
        assert resp.status_code == 400

    def test_link_single_use(self, api_client):
        user = User.objects.create_user(
            email="once@test.ci", password="TestPass123!",
            nom="O", prenoms="User", telephone="0702030415",
        )
        link = self._link(user)
        assert api_client.post("/api/auth/verify-email/", link, format="json").status_code == 200
        assert api_client.post("/api/auth/verify-email/", link, format="json").status_code == 400

    def test_resend_requires_auth(self, api_client):
        assert api_client.post("/api/auth/verify-email/resend/").status_code in (401, 403)

    def test_resend_sends_email(self, api_client, client_user, settings):
        from django.core import mail
        from django.core.cache import cache
        cache.clear()
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        api_client.force_authenticate(user=client_user)
        resp = api_client.post("/api/auth/verify-email/resend/")
        assert resp.status_code == 200
        assert len(mail.outbox) == 1
        assert "/verify-email?uid=" in mail.outbox[0].body

    def test_resend_already_verified_no_email(self, api_client, client_user, settings):
        from django.core import mail
        from django.core.cache import cache
        cache.clear()
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        client_user.email_verified = True
        client_user.save()
        api_client.force_authenticate(user=client_user)
        assert api_client.post("/api/auth/verify-email/resend/").status_code == 200
        assert mail.outbox == []

    def test_resend_throttled(self, api_client, client_user):
        from django.core.cache import cache
        cache.clear()
        api_client.force_authenticate(user=client_user)
        codes = [api_client.post("/api/auth/verify-email/resend/").status_code for _ in range(4)]
        assert codes[:3] == [200, 200, 200]
        assert codes[3] == 429

    def test_register_marks_email_unverified(self, api_client):
        resp = api_client.post("/api/auth/register/", {
            **REGISTER_PAYLOAD, "telephone": "0702030410",
            "email": "verify.me@test.ci",
        }, format="json")
        assert resp.status_code == 201
        user = User.objects.get(email="verify.me@test.ci")
        assert user.email_verified is False
        assert resp.json()["email_verified"] is False

    def test_valid_link_verifies(self, api_client):
        user = User.objects.create_user(
            email="to.verify@test.ci", password="TestPass123!",
            nom="V", prenoms="User", telephone="0702030411",
        )
        resp = api_client.post("/api/auth/verify-email/", self._link(user), format="json")
        assert resp.status_code == 200
        user.refresh_from_db()
        assert user.email_verified is True

    def test_bad_token_rejected(self, api_client):
        user = User.objects.create_user(
            email="bad.token@test.ci", password="TestPass123!",
            nom="B", prenoms="User", telephone="0702030412",
        )
        link = self._link(user)
        link["token"] = "invalid-token"
        resp = api_client.post("/api/auth/verify-email/", link, format="json")
        assert resp.status_code == 400
        user.refresh_from_db()
        assert user.email_verified is False

    def test_bad_uid_rejected(self, api_client):
        resp = api_client.post("/api/auth/verify-email/", {
            "uid": urlsafe_base64_encode(force_bytes(999999)),
            "token": "x",
        }, format="json")
        assert resp.status_code == 400

    def test_email_change_resets_verified(self, api_client, client_user):
        client_user.email_verified = True
        client_user.email = "old@test.ci"
        client_user.save()
        api_client.force_authenticate(user=client_user)
        resp = api_client.patch("/api/auth/me/", {"email": "new@test.ci"}, format="json")
        assert resp.status_code == 200
        client_user.refresh_from_db()
        assert client_user.email_verified is False

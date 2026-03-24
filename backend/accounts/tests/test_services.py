"""Tests unitaires — accounts.services (logique métier isolée)."""
import pytest
from django.contrib.auth import get_user_model

from accounts.services import (
    reset_user_password,
    verify_prospect,
    reject_prospect,
    deactivate_user,
)

User = get_user_model()


@pytest.mark.django_db
class TestResetUserPassword:
    def test_returns_temp_password(self, client_user):
        pw = reset_user_password(client_user)
        assert len(pw) >= 10
        assert "A1!" in pw

    def test_password_actually_changed(self, client_user):
        old_hash = client_user.password
        reset_user_password(client_user)
        client_user.refresh_from_db()
        assert client_user.password != old_hash

    def test_temp_password_works_for_login(self, client_user):
        pw = reset_user_password(client_user)
        client_user.refresh_from_db()
        assert client_user.check_password(pw)


@pytest.mark.django_db
class TestVerifyProspect:
    def test_prospect_becomes_client(self, prospect_user, agent):
        verify_prospect(prospect_user, agent)
        prospect_user.refresh_from_db()
        assert prospect_user.role == "client"
        assert prospect_user.verified is True
        assert prospect_user.verified_by == agent
        assert prospect_user.verified_at is not None

    def test_cannot_verify_non_prospect(self, client_user, agent):
        with pytest.raises(ValueError):
            verify_prospect(client_user, agent)

    def test_cannot_verify_agent(self, agent, admin_user):
        with pytest.raises(ValueError):
            verify_prospect(agent, admin_user)


@pytest.mark.django_db
class TestRejectProspect:
    def test_prospect_is_deactivated(self, prospect_user, agent):
        reject_prospect(prospect_user, agent)
        prospect_user.refresh_from_db()
        assert prospect_user.is_active is False

    def test_cannot_reject_non_prospect(self, client_user, agent):
        with pytest.raises(ValueError):
            reject_prospect(client_user, agent)


@pytest.mark.django_db
class TestDeactivateUser:
    def test_deactivates_user(self, client_user, admin_user):
        deactivate_user(client_user, admin_user)
        client_user.refresh_from_db()
        assert client_user.is_active is False

    def test_cannot_deactivate_admin(self, admin_user):
        with pytest.raises(ValueError):
            deactivate_user(admin_user, admin_user)

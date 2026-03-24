"""Tests unitaires — modèle User (accounts)."""
import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
class TestUserModel:
    def test_magistrat_gets_magistrat_risk(self, db):
        u = User.objects.create_user(
            email="mag@test.ci", password="Pass123!",
            nom="Mag", prenoms="Test",
            profession_type="magistrat",
        )
        assert u.risk_level == "magistrat"

    def test_douanier_gets_douanier_risk(self, db):
        u = User.objects.create_user(
            email="doua@test.ci", password="Pass123!",
            nom="Doua", prenoms="Test",
            profession_type="douanier",
        )
        assert u.risk_level == "douanier"

    def test_full_name_property(self, client_user):
        assert client_user.nom in client_user.full_name
        assert client_user.prenoms in client_user.full_name

    def test_inactive_user_cannot_authenticate(self, db):
        u = User.objects.create_user(
            email="inactive@test.ci", password="Pass123!",
            nom="In", prenoms="Active",
            is_active=False,
        )
        assert not u.is_active

    def test_default_role_is_prospect(self, db):
        u = User.objects.create_user(
            email="newuser@test.ci", password="Pass123!",
            nom="New", prenoms="User",
        )
        assert u.role == "prospect"

    def test_prospect_account_status_pending(self, prospect_user):
        assert prospect_user.account_status == "pending_verification"

    def test_agent_creation(self, agent):
        assert agent.role == "agent"
        assert agent.is_active is True

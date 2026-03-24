"""Tests unitaires — core.services (logique métier isolée)."""
import pytest
from unittest.mock import patch

from core.models import ClientRequest
from core.services import claim_request, release_request, treat_request, get_dashboard_stats


@pytest.mark.django_db
class TestClaimRequest:
    def test_agent_claims_pending(self, client_request, agent):
        claim_request(client_request, agent)
        client_request.refresh_from_db()
        assert client_request.agent == agent
        assert client_request.status == ClientRequest.Status.EN_COURS

    def test_cannot_claim_already_taken(self, client_request, agent, agent2):
        claim_request(client_request, agent)
        with pytest.raises(ValueError):
            claim_request(client_request, agent2)

    def test_cannot_claim_treated(self, client_request, agent):
        client_request.status = ClientRequest.Status.TRAITE
        client_request.save()
        with pytest.raises(ValueError):
            claim_request(client_request, agent)


@pytest.mark.django_db
class TestReleaseRequest:
    def test_agent_releases_own_request(self, client_request_en_cours, agent):
        release_request(client_request_en_cours, agent)
        client_request_en_cours.refresh_from_db()
        assert client_request_en_cours.agent is None
        assert client_request_en_cours.status == ClientRequest.Status.EN_ATTENTE

    def test_other_agent_cannot_release(self, client_request_en_cours, agent2):
        with pytest.raises(ValueError):
            release_request(client_request_en_cours, agent2)


@pytest.mark.django_db
class TestTreatRequest:
    def test_treat_sets_status_and_timestamp(self, client_request, agent):
        with patch("core.services.notify_request_treated"):
            treat_request(client_request, agent)
        client_request.refresh_from_db()
        assert client_request.status == ClientRequest.Status.TRAITE
        assert client_request.treated_at is not None
        assert client_request.agent == agent


@pytest.mark.django_db
class TestGetDashboardStats:
    def test_agent_gets_global_stats(self, agent, emission):
        stats = get_dashboard_stats(agent)
        assert stats["total_contrats"] >= 1
        assert "total_clients" in stats
        assert stats["total_clients"] >= 0

    def test_client_stats_scoped_to_self(self, client_user, emission):
        stats = get_dashboard_stats(client_user)
        assert stats["total_contrats"] >= 1
        assert stats["total_clients"] == 0

    def test_primes_impayees_equals_total_minus_payees(self, agent, emission):
        stats = get_dashboard_stats(agent)
        assert stats["primes_impayees"] == stats["total_primes"] - stats["primes_payees"]

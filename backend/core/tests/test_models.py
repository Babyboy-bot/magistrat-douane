"""Tests unitaires — modèles core (Emission, Paiement, ClientRequest)."""
import pytest
from decimal import Decimal
from django.db.models import ProtectedError
from core.models import Emission, Paiement, ClientRequest, Document


@pytest.mark.django_db
class TestEmissionModel:
    def test_str_representation(self, emission):
        assert emission.num_police in str(emission)

    def test_commission_rate_automobile(self, emission):
        assert emission.taux_commission == 20

    def test_montant_commission_computed(self, emission):
        expected = Decimal(str(emission.prime_ttc)) - Decimal(str(emission.prime_nette))
        assert Decimal(str(emission.montant_commission)) == expected

    def test_echeance_after_effet(self, emission):
        assert emission.echeance > emission.effet

    def test_protect_prevents_client_deletion(self, emission, client_user):
        with pytest.raises(ProtectedError):
            client_user.delete()

    def test_agent_deletion_sets_null(self, emission, agent):
        agent.delete()
        emission.refresh_from_db()
        assert emission.agent is None


@pytest.mark.django_db
class TestPaiementModel:
    def test_paiement_linked_to_emission(self, emission):
        p = Paiement.objects.create(
            emission=emission,
            montant_regle=50_000,
            date_reglement="2025-02-01",
            reference="REF-001",
        )
        assert p.emission == emission
        assert emission.paiements.count() == 1

    def test_multiple_paiements_allowed(self, emission):
        Paiement.objects.create(emission=emission, montant_regle=30_000, date_reglement="2025-02-01", reference="REF-002")
        Paiement.objects.create(emission=emission, montant_regle=70_000, date_reglement="2025-03-01", reference="REF-003")
        assert emission.paiements.count() == 2


@pytest.mark.django_db
class TestClientRequestModel:
    def test_numero_starts_with_rq(self, client_request):
        assert client_request.numero.startswith("RQ-")

    def test_default_status_is_pending(self, client_request):
        assert client_request.status == ClientRequest.Status.EN_ATTENTE

    def test_protect_prevents_client_deletion(self, client_request, client_user):
        with pytest.raises(ProtectedError):
            client_user.delete()

    def test_two_requests_have_distinct_numeros(self, db, client_user):
        r1 = ClientRequest.objects.create(client=client_user, type="cotation_auto", details={})
        r2 = ClientRequest.objects.create(client=client_user, type="cotation_mrh", details={})
        assert r1.numero != r2.numero

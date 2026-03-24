"""Tests unitaires — magistassur.services (logique métier contrats)."""
import pytest
from magistassur.models import ContratEpargne, ContratPrevoyance
from magistassur.services import (
    assigner_police_epargne,
    changer_statut_epargne,
    ajouter_cotisation_epargne,
    assigner_police_prevoyance,
    changer_statut_prevoyance,
    traiter_requete_magist,
)


@pytest.fixture
def contrat_epargne(db, client_user, agent):
    return ContratEpargne.objects.create(
        client=client_user,
        agent=agent,
        duree_cotisation=10,
        mode_paiement="mensuel",
        date_premiere_cotisation="2025-01-01",
        date_effet="2025-01-01",
        cotisation_mensuelle=25_000,
        capital_constitue=0,
    )


@pytest.fixture
def contrat_prevoyance(db, client_user, agent):
    return ContratPrevoyance.objects.create(
        client=client_user,
        agent=agent,
        garantie_prevoyance_deces=True,
        garantie_frais_funeraires=False,
        cotisation_mensuelle=15_000,
    )


@pytest.mark.django_db
class TestAssignerPoliceEpargne:
    def test_assigns_police_and_activates(self, contrat_epargne, agent):
        assigner_police_epargne(contrat_epargne, "POL-EP-001", "INSP-01", agent)
        contrat_epargne.refresh_from_db()
        assert contrat_epargne.num_police == "POL-EP-001"
        assert contrat_epargne.statut == ContratEpargne.Statut.EN_COURS
        assert contrat_epargne.agent == agent

    def test_treats_pending_magist_request(self, contrat_epargne, agent, client_user):
        from core.models import ClientRequest
        req = ClientRequest.objects.create(
            client=client_user,
            type="souscription_magist",
            details={},
        )
        assigner_police_epargne(contrat_epargne, "POL-EP-002", "", agent)
        req.refresh_from_db()
        assert req.status == ClientRequest.Status.TRAITE


@pytest.mark.django_db
class TestChangerStatutEpargne:
    def test_valid_status_change(self, contrat_epargne, agent):
        assigner_police_epargne(contrat_epargne, "POL-EP-003", "", agent)
        changer_statut_epargne(contrat_epargne, "resilie")
        contrat_epargne.refresh_from_db()
        assert contrat_epargne.statut == "resilie"

    def test_cannot_set_en_cours_without_police(self, contrat_epargne):
        with pytest.raises(ValueError, match="police"):
            changer_statut_epargne(contrat_epargne, "en_cours")

    def test_invalid_statut_raises(self, contrat_epargne):
        with pytest.raises(ValueError, match="invalide"):
            changer_statut_epargne(contrat_epargne, "statut_inexistant")


@pytest.mark.django_db
class TestAjouterCotisationEpargne:
    def test_cotisation_increases_capital(self, contrat_epargne, agent):
        assigner_police_epargne(contrat_epargne, "POL-EP-004", "", agent)
        cotisation = ajouter_cotisation_epargne(
            contrat_epargne, {"montant": 25_000, "date_paiement": "2025-02-01"}
        )
        contrat_epargne.refresh_from_db()
        assert contrat_epargne.capital_constitue == 25_000

    def test_cotisation_on_inactive_contract_raises(self, contrat_epargne):
        with pytest.raises(ValueError, match="Cotisation impossible"):
            ajouter_cotisation_epargne(
                contrat_epargne, {"montant": 25_000, "date_paiement": "2025-02-01"}
            )

    def test_cotisation_without_police_raises(self, contrat_epargne):
        contrat_epargne.statut = ContratEpargne.Statut.EN_COURS
        contrat_epargne.save()
        with pytest.raises(ValueError, match="police"):
            ajouter_cotisation_epargne(
                contrat_epargne, {"montant": 25_000, "date_paiement": "2025-02-01"}
            )


@pytest.mark.django_db
class TestAssignerPolicePrevoyance:
    def test_assigns_police_and_activates(self, contrat_prevoyance, agent):
        assigner_police_prevoyance(
            contrat_prevoyance, "POL-PRV-001", "INSP-02", agent, "2025-01-01"
        )
        contrat_prevoyance.refresh_from_db()
        assert contrat_prevoyance.num_police == "POL-PRV-001"
        assert contrat_prevoyance.statut == ContratPrevoyance.Statut.EN_COURS

    def test_date_effet_sets_echeance_plus_one_year(self, contrat_prevoyance, agent):
        assigner_police_prevoyance(
            contrat_prevoyance, "POL-PRV-002", "", agent, "2025-06-15"
        )
        contrat_prevoyance.refresh_from_db()
        assert contrat_prevoyance.date_effet.year == 2025
        assert contrat_prevoyance.date_echeance.year == 2026


@pytest.mark.django_db
class TestChangerStatutPrevoyance:
    def test_cannot_set_en_cours_without_police(self, contrat_prevoyance):
        with pytest.raises(ValueError, match="police"):
            changer_statut_prevoyance(contrat_prevoyance, "en_cours")

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
        duree_annees=10,
        periodicite="mensuelle",
        date_premiere_cotisation="2025-01-01",
        date_effet="2025-01-01",
        montant_cotisation=25_000,
        capital_constitue=0,
    )


@pytest.fixture
def contrat_prevoyance(db, client_user, agent):
    return ContratPrevoyance.objects.create(
        client=client_user,
        agent=agent,
        garantie_prevoyance_deces=True,
        garantie_frais_funeraires=False,
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
        changer_statut_epargne(contrat_epargne, "suspendu")
        contrat_epargne.refresh_from_db()
        assert contrat_epargne.statut == "suspendu"

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
            contrat_epargne, {"montant": 25_000, "date_echeance": "2025-02-01"}
        )
        contrat_epargne.refresh_from_db()
        assert contrat_epargne.capital_constitue == 25_000

    def test_cotisation_on_inactive_contract_raises(self, contrat_epargne):
        with pytest.raises(ValueError, match="Cotisation impossible"):
            ajouter_cotisation_epargne(
                contrat_epargne, {"montant": 25_000, "date_echeance": "2025-02-01"}
            )

    def test_cotisation_without_police_raises(self, contrat_epargne):
        contrat_epargne.statut = ContratEpargne.Statut.EN_COURS
        contrat_epargne.save()
        with pytest.raises(ValueError, match="police"):
            ajouter_cotisation_epargne(
                contrat_epargne, {"montant": 25_000, "date_echeance": "2025-02-01"}
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

    def test_valid_status_change(self, contrat_prevoyance, agent):
        assigner_police_prevoyance(contrat_prevoyance, "POL-PRV-ST-001", "", agent, "2025-01-01")
        changer_statut_prevoyance(contrat_prevoyance, "sinistre")
        contrat_prevoyance.refresh_from_db()
        assert contrat_prevoyance.statut == "sinistre"

    def test_cannot_change_clotured(self, contrat_prevoyance, agent):
        assigner_police_prevoyance(contrat_prevoyance, "POL-PRV-ST-002", "", agent, "2025-01-01")
        contrat_prevoyance.statut = ContratPrevoyance.Statut.CLOTURE
        contrat_prevoyance.save()
        with pytest.raises(ValueError, match="clôturé"):
            changer_statut_prevoyance(contrat_prevoyance, "en_cours")

    def test_invalid_statut_raises(self, contrat_prevoyance):
        with pytest.raises(ValueError, match="invalide"):
            changer_statut_prevoyance(contrat_prevoyance, "statut_inexistant")


# ── create_contrat_epargne ────────────────────────────────────────────────────

@pytest.mark.django_db
class TestCreateContratEpargne:
    def test_create_valid(self, client_user, agent):
        from magistassur.services import create_contrat_epargne
        data = {
            "client": client_user,
            "duree_annees": 10,
            "periodicite": "mensuelle",
            "montant_cotisation": 25000,
        }
        contrat = create_contrat_epargne(data, agent)
        assert contrat.id is not None
        assert contrat.agent == agent

    def test_create_with_negative_montant_raises(self, client_user, agent):
        from magistassur.services import create_contrat_epargne
        data = {
            "client": client_user,
            "duree_annees": 10,
            "periodicite": "mensuelle",
            "montant_cotisation": -1000,
        }
        with pytest.raises(ValueError, match="strictement positif"):
            create_contrat_epargne(data, agent)


# ── create_contrat_prevoyance ─────────────────────────────────────────────────

@pytest.mark.django_db
class TestCreateContratPrevoyance:
    def test_create_valid(self, client_user, agent):
        from magistassur.services import create_contrat_prevoyance
        data = {
            "client": client_user,
            "garantie_prevoyance_deces": True,
        }
        contrat = create_contrat_prevoyance(data, agent)
        assert contrat.id is not None
        assert contrat.agent == agent


# ── assigner_police_prevoyance — leap year ────────────────────────────────────

@pytest.mark.django_db
class TestAssignerPolicePrevoyanceLeapYear:
    def test_leap_year_feb_29(self, contrat_prevoyance, agent):
        assigner_police_prevoyance(contrat_prevoyance, "POL-LEAP-001", "", agent, "2024-02-29")
        contrat_prevoyance.refresh_from_db()
        assert contrat_prevoyance.date_effet.isoformat() == "2024-02-29"
        assert contrat_prevoyance.date_echeance.isoformat() == "2025-02-28"

    def test_no_date_effet(self, contrat_prevoyance, agent):
        assigner_police_prevoyance(contrat_prevoyance, "POL-NO-DATE-001", "", agent, "")
        contrat_prevoyance.refresh_from_db()
        assert contrat_prevoyance.date_effet is None
        assert contrat_prevoyance.date_echeance is None

    def test_invalid_date_effet_ignored(self, contrat_prevoyance, agent):
        assigner_police_prevoyance(contrat_prevoyance, "POL-BAD-DATE-001", "", agent, "not-a-date")
        contrat_prevoyance.refresh_from_db()
        assert contrat_prevoyance.date_effet is None


# ── ajouter_cotisation_epargne — edge cases ───────────────────────────────────

@pytest.mark.django_db
class TestAjouterCotisationEdgeCases:
    def test_zero_montant_raises(self, contrat_epargne, agent):
        assigner_police_epargne(contrat_epargne, "POL-COT-001", "", agent)
        with pytest.raises(ValueError, match="strictement positif"):
            ajouter_cotisation_epargne(contrat_epargne, {"montant": 0, "date_echeance": "2025-02-01"})

    def test_negative_montant_raises(self, contrat_epargne, agent):
        assigner_police_epargne(contrat_epargne, "POL-COT-002", "", agent)
        with pytest.raises(ValueError, match="strictement positif"):
            ajouter_cotisation_epargne(contrat_epargne, {"montant": -500, "date_echeance": "2025-02-01"})

    def test_invalid_montant_raises(self, contrat_epargne, agent):
        assigner_police_epargne(contrat_epargne, "POL-COT-003", "", agent)
        with pytest.raises(ValueError, match="nombre valide"):
            ajouter_cotisation_epargne(contrat_epargne, {"montant": "abc", "date_echeance": "2025-02-01"})

    def test_missing_date_echeance_raises(self, contrat_epargne, agent):
        assigner_police_epargne(contrat_epargne, "POL-COT-004", "", agent)
        with pytest.raises(ValueError, match="date d'échéance"):
            ajouter_cotisation_epargne(contrat_epargne, {"montant": 25000})

    def test_decimal_montant_accepted(self, contrat_epargne, agent):
        from decimal import Decimal
        assigner_police_epargne(contrat_epargne, "POL-COT-005", "", agent)
        cotisation = ajouter_cotisation_epargne(
            contrat_epargne, {"montant": "25000.50", "date_echeance": "2025-02-01"}
        )
        assert isinstance(cotisation.montant, Decimal)
        assert cotisation.montant == Decimal("25000.50")

    def test_multiple_cotisations_accumulate(self, contrat_epargne, agent):
        assigner_police_epargne(contrat_epargne, "POL-COT-006", "", agent)
        ajouter_cotisation_epargne(contrat_epargne, {"montant": 25000, "date_echeance": "2025-02-01"})
        ajouter_cotisation_epargne(contrat_epargne, {"montant": 25000, "date_echeance": "2025-03-01"})
        contrat_epargne.refresh_from_db()
        assert contrat_epargne.capital_constitue == 50000


# ── traiter_requete_magist — edge cases ───────────────────────────────────────

@pytest.mark.django_db
class TestTraiterRequeteMagist:
    def test_no_pending_request_does_not_raise(self, client_user, agent):
        from magistassur.services import traiter_requete_magist
        traiter_requete_magist(client_user.id, agent)

    def test_treats_most_recent_only(self, client_user, agent):
        from core.models import ClientRequest
        from magistassur.services import traiter_requete_magist
        req1 = ClientRequest.objects.create(client=client_user, type="souscription_magist", details={})
        req2 = ClientRequest.objects.create(client=client_user, type="souscription_magist", details={})
        traiter_requete_magist(client_user.id, agent)
        req1.refresh_from_db()
        req2.refresh_from_db()
        assert req2.status == ClientRequest.Status.TRAITE
        assert req1.status == ClientRequest.Status.EN_ATTENTE

"""Tests unitaires — magistassur.serializers (validation)."""
import pytest
from magistassur.serializers import (
    ContratEpargneCreateSerializer,
    ContratPrevoyanceCreateSerializer,
    AssureAssocieSerializer,
    BeneficiaireEpargneSerializer,
    BeneficiairePrevoyanceSerializer,
    QuestionnaireMedicalSerializer,
)
from magistassur.models import (
    ContratEpargne, ContratPrevoyance,
    AssureAssocie, BeneficiaireEpargne, BeneficiairePrevoyance,
    QuestionnaireMedical,
)


# ── ContratEpargneCreateSerializer ────────────────────────────────────────────

@pytest.mark.django_db
class TestEpargneCreateSerializer:
    def test_valid_data(self, client_user):
        data = {
            "client": client_user.id,
            "duree_annees": 10,
            "periodicite": "mensuelle",
            "montant_cotisation": 25000,
        }
        serializer = ContratEpargneCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_beneficiaires_sum_100(self, client_user):
        data = {
            "client": client_user.id,
            "duree_annees": 10,
            "periodicite": "mensuelle",
            "montant_cotisation": 25000,
            "beneficiaires": [
                {"nom": "Bénéf 1", "taux_repartition": 60},
                {"nom": "Bénéf 2", "taux_repartition": 40},
            ],
        }
        serializer = ContratEpargneCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_beneficiaires_sum_not_100_fails(self, client_user):
        data = {
            "client": client_user.id,
            "duree_annees": 10,
            "periodicite": "mensuelle",
            "montant_cotisation": 25000,
            "beneficiaires": [
                {"nom": "Bénéf 1", "taux_repartition": 50},
                {"nom": "Bénéf 2", "taux_repartition": 30},
            ],
        }
        serializer = ContratEpargneCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert "beneficiaires" in serializer.errors

    def test_beneficiaires_conjoint_corps_skip_validation(self, client_user):
        data = {
            "client": client_user.id,
            "duree_annees": 10,
            "periodicite": "mensuelle",
            "montant_cotisation": 25000,
            "beneficiaires": [
                {"conjoint_corps": True, "taux_repartition": 0},
            ],
        }
        serializer = ContratEpargneCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_excluded_fields_not_in_serializer(self):
        fields = ContratEpargneCreateSerializer.Meta.exclude
        assert "num_police" in fields
        assert "statut" in fields
        assert "agent" in fields
        assert "pris_en_charge_par" in fields
        assert "code_inspection" in fields

    def test_create_with_nested_correspondants(self, client_user):
        data = {
            "client": client_user.id,
            "duree_annees": 10,
            "periodicite": "mensuelle",
            "montant_cotisation": 25000,
            "correspondants": [
                {"nom": "Corresp 1", "telephone": "0700000000"},
            ],
        }
        serializer = ContratEpargneCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        contrat = serializer.save()
        assert contrat.correspondants.count() == 1


# ── ContratPrevoyanceCreateSerializer ─────────────────────────────────────────

@pytest.mark.django_db
class TestPrevoyanceCreateSerializer:
    def test_valid_with_deces(self, client_user):
        data = {
            "client": client_user.id,
            "garantie_prevoyance_deces": True,
        }
        serializer = ContratPrevoyanceCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_valid_with_funeraires(self, client_user):
        data = {
            "client": client_user.id,
            "garantie_frais_funeraires": True,
        }
        serializer = ContratPrevoyanceCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_no_garantie_fails(self, client_user):
        data = {
            "client": client_user.id,
            "garantie_prevoyance_deces": False,
            "garantie_frais_funeraires": False,
        }
        serializer = ContratPrevoyanceCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert "garanties" in serializer.errors

    def test_beneficiaires_sum_100(self, client_user):
        data = {
            "client": client_user.id,
            "garantie_prevoyance_deces": True,
            "beneficiaires": [
                {"nom": "Bénéf 1", "taux_repartition": 70},
                {"nom": "Bénéf 2", "taux_repartition": 30},
            ],
        }
        serializer = ContratPrevoyanceCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_beneficiaires_sum_not_100_fails(self, client_user):
        data = {
            "client": client_user.id,
            "garantie_prevoyance_deces": True,
            "beneficiaires": [
                {"nom": "Bénéf 1", "taux_repartition": 50},
            ],
        }
        serializer = ContratPrevoyanceCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert "beneficiaires" in serializer.errors

    def test_excluded_fields(self):
        fields = ContratPrevoyanceCreateSerializer.Meta.exclude
        assert "num_police" in fields
        assert "statut" in fields
        assert "agent" in fields
        assert "pris_en_charge_par" in fields
        assert "date_effet" in fields
        assert "date_echeance" in fields

    def test_create_with_assures_and_questionnaire(self, client_user):
        data = {
            "client": client_user.id,
            "garantie_prevoyance_deces": True,
            "assures_associes": [
                {"lien_parente": "conjoint", "nom": "Conjoint"},
                {"lien_parente": "enfant", "nom": "Enfant 1"},
            ],
            "questionnaire_medical": {
                "taille_cm": 165,
                "poids_kg": "60.0",
                "fumeur": False,
            },
        }
        serializer = ContratPrevoyanceCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        contrat = serializer.save()
        assert contrat.assures_associes.count() == 2
        assert contrat.questionnaire_medical is not None


# ── AssureAssocie — auto montant_indemnite ────────────────────────────────────

@pytest.mark.django_db
class TestAssureAssocieAutoIndemnite:
    @pytest.mark.parametrize("lien,expected", [
        ("conjoint", 1_000_000),
        ("enfant", 500_000),
        ("pere", 750_000),
        ("mere", 750_000),
    ])
    def test_auto_montant_indemnite(self, client_user, agent, lien, expected):
        contrat = ContratPrevoyance.objects.create(
            client=client_user, agent=agent,
            garantie_prevoyance_deces=True,
        )
        assure = AssureAssocie.objects.create(
            contrat=contrat, lien_parente=lien, nom="Test",
        )
        assert assure.montant_indemnite == expected

    def test_custom_montant_not_overwritten(self, client_user, agent):
        contrat = ContratPrevoyance.objects.create(
            client=client_user, agent=agent,
            garantie_prevoyance_deces=True,
        )
        assure = AssureAssocie.objects.create(
            contrat=contrat, lien_parente="conjoint", nom="Test",
            montant_indemnite=2_000_000,
        )
        assert assure.montant_indemnite == 2_000_000


# ── Model properties ──────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestEpargneSerializerProperties:
    def test_prime_annuelle_mensuelle(self, client_user, agent):
        from magistassur.serializers import ContratEpargneSerializer
        contrat = ContratEpargne.objects.create(
            client=client_user, agent=agent,
            duree_annees=10, periodicite="mensuelle",
            montant_cotisation=25000,
        )
        serializer = ContratEpargneSerializer(contrat)
        assert serializer.data["prime_annuelle"] == 300000

    def test_prime_annuelle_trimestrielle(self, client_user, agent):
        from magistassur.serializers import ContratEpargneSerializer
        contrat = ContratEpargne.objects.create(
            client=client_user, agent=agent,
            duree_annees=10, periodicite="trimestrielle",
            montant_cotisation=75000,
        )
        serializer = ContratEpargneSerializer(contrat)
        assert serializer.data["prime_annuelle"] == 300000

    def test_prime_annuelle_semestrielle(self, client_user, agent):
        from magistassur.serializers import ContratEpargneSerializer
        contrat = ContratEpargne.objects.create(
            client=client_user, agent=agent,
            duree_annees=10, periodicite="semestrielle",
            montant_cotisation=150000,
        )
        serializer = ContratEpargneSerializer(contrat)
        assert serializer.data["prime_annuelle"] == 300000

    def test_prime_annuelle_annuelle(self, client_user, agent):
        from magistassur.serializers import ContratEpargneSerializer
        contrat = ContratEpargne.objects.create(
            client=client_user, agent=agent,
            duree_annees=10, periodicite="annuelle",
            montant_cotisation=300000,
        )
        serializer = ContratEpargneSerializer(contrat)
        assert serializer.data["prime_annuelle"] == 300000

    def test_epargne_frais_gestion_pct(self, client_user, agent):
        contrat = ContratEpargne.objects.create(
            client=client_user, agent=agent,
            duree_annees=10, periodicite="mensuelle",
            montant_cotisation=25000,
        )
        assert contrat.frais_gestion_pct == 5
        assert contrat.frais_accessoires == 1000
        assert contrat.cout_police == 10000
        assert contrat.taux_interet == 3.5


# ── ContratPrevoyance model properties ────────────────────────────────────────

@pytest.mark.django_db
class TestPrevoyanceModelProperties:
    def test_prime_annuelle_deces_only(self, client_user, agent):
        contrat = ContratPrevoyance.objects.create(
            client=client_user, agent=agent,
            garantie_prevoyance_deces=True,
            garantie_frais_funeraires=False,
        )
        assert contrat.prime_annuelle == 45000

    def test_prime_annuelle_funeraires_only(self, client_user, agent):
        contrat = ContratPrevoyance.objects.create(
            client=client_user, agent=agent,
            garantie_prevoyance_deces=False,
            garantie_frais_funeraires=True,
        )
        assert contrat.prime_annuelle == 58000

    def test_prime_annuelle_both(self, client_user, agent):
        contrat = ContratPrevoyance.objects.create(
            client=client_user, agent=agent,
            garantie_prevoyance_deces=True,
            garantie_frais_funeraires=True,
        )
        assert contrat.prime_annuelle == 103000  # 45000 + 58000

    def test_frais_fixes(self, client_user, agent):
        contrat = ContratPrevoyance.objects.create(
            client=client_user, agent=agent,
            garantie_prevoyance_deces=True,
        )
        assert contrat.frais_fixes == 3500  # 2500 + 1000

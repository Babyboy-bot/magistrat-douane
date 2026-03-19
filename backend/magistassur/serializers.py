from rest_framework import serializers
from .models import (
    ContratEpargne, Correspondant, BeneficiaireEpargne,
    ContratPrevoyance, AssureAssocie, BeneficiairePrevoyance,
    QuestionnaireMedical, CotisationEpargne,
)


class CorrespondantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Correspondant
        exclude = ["contrat_epargne"]


class BeneficiaireEpargneSerializer(serializers.ModelSerializer):
    class Meta:
        model = BeneficiaireEpargne
        exclude = ["contrat"]


class CotisationEpargneSerializer(serializers.ModelSerializer):
    class Meta:
        model = CotisationEpargne
        exclude = ["contrat"]


class ContratEpargneSerializer(serializers.ModelSerializer):
    correspondants = CorrespondantSerializer(many=True, read_only=True)
    beneficiaires = BeneficiaireEpargneSerializer(many=True, read_only=True)
    cotisations = CotisationEpargneSerializer(many=True, read_only=True)
    client_nom = serializers.SerializerMethodField()
    prime_annuelle = serializers.SerializerMethodField()
    frais_gestion_pct = serializers.ReadOnlyField()
    frais_accessoires = serializers.ReadOnlyField()
    cout_police = serializers.ReadOnlyField()
    taux_interet = serializers.ReadOnlyField()

    class Meta:
        model = ContratEpargne
        fields = "__all__"

    def get_client_nom(self, obj):
        return f"{obj.client.nom} {obj.client.prenoms}"

    def get_prime_annuelle(self, obj):
        p = obj.periodicite
        if p == "mensuelle":
            return float(obj.montant_cotisation) * 12
        if p == "trimestrielle":
            return float(obj.montant_cotisation) * 4
        if p == "semestrielle":
            return float(obj.montant_cotisation) * 2
        return float(obj.montant_cotisation)


class ContratEpargneCreateSerializer(serializers.ModelSerializer):
    correspondants = CorrespondantSerializer(many=True, required=False)
    beneficiaires = BeneficiaireEpargneSerializer(many=True, required=False)

    class Meta:
        model = ContratEpargne
        exclude = ["capital_constitue"]

    def create(self, validated_data):
        correspondants_data = validated_data.pop("correspondants", [])
        beneficiaires_data = validated_data.pop("beneficiaires", [])
        contrat = ContratEpargne.objects.create(**validated_data)
        for c in correspondants_data:
            Correspondant.objects.create(contrat_epargne=contrat, **c)
        for b in beneficiaires_data:
            BeneficiaireEpargne.objects.create(contrat=contrat, **b)
        return contrat


# ── Prévoyance ──────────────────────────────────────

class AssureAssocieSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssureAssocie
        exclude = ["contrat"]


class BeneficiairePrevoyanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = BeneficiairePrevoyance
        exclude = ["contrat"]


class QuestionnaireMedicalSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionnaireMedical
        exclude = ["contrat"]


class ContratPrevoyanceSerializer(serializers.ModelSerializer):
    assures_associes = AssureAssocieSerializer(many=True, read_only=True)
    beneficiaires = BeneficiairePrevoyanceSerializer(many=True, read_only=True)
    questionnaire_medical = QuestionnaireMedicalSerializer(read_only=True)
    client_nom = serializers.SerializerMethodField()
    prime_annuelle = serializers.ReadOnlyField()
    frais_fixes = serializers.ReadOnlyField()

    class Meta:
        model = ContratPrevoyance
        fields = "__all__"

    def get_client_nom(self, obj):
        return f"{obj.client.nom} {obj.client.prenoms}"


class ContratPrevoyanceCreateSerializer(serializers.ModelSerializer):
    assures_associes = AssureAssocieSerializer(many=True, required=False)
    beneficiaires = BeneficiairePrevoyanceSerializer(many=True, required=False)
    questionnaire_medical = QuestionnaireMedicalSerializer(required=False)

    class Meta:
        model = ContratPrevoyance
        fields = "__all__"

    def validate(self, attrs):
        deces = attrs.get("garantie_prevoyance_deces", False)
        funeraires = attrs.get("garantie_frais_funeraires", False)
        if not deces and not funeraires:
            raise serializers.ValidationError(
                {"garanties": "Au moins une garantie doit être sélectionnée (Décès ou Frais Funéraires)."}
            )
        return attrs

    def create(self, validated_data):
        assures_data = validated_data.pop("assures_associes", [])
        beneficiaires_data = validated_data.pop("beneficiaires", [])
        questionnaire_data = validated_data.pop("questionnaire_medical", None)
        contrat = ContratPrevoyance.objects.create(**validated_data)
        for a in assures_data:
            AssureAssocie.objects.create(contrat=contrat, **a)
        for b in beneficiaires_data:
            BeneficiairePrevoyance.objects.create(contrat=contrat, **b)
        if questionnaire_data:
            QuestionnaireMedical.objects.create(contrat=contrat, **questionnaire_data)
        return contrat

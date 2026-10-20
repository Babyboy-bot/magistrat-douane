from django.utils import timezone
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
    pris_en_charge_nom = serializers.SerializerMethodField()
    pris_en_charge_telephone = serializers.SerializerMethodField()
    piece_identite_url = serializers.SerializerMethodField()
    piece_identite_verso_url = serializers.SerializerMethodField()
    rib_document_url = serializers.SerializerMethodField()

    class Meta:
        model = ContratEpargne
        fields = "__all__"

    def get_client_nom(self, obj):
        return f"{obj.client.nom} {obj.client.prenoms}"

    def get_pris_en_charge_nom(self, obj):
        if obj.pris_en_charge_par:
            return f"{obj.pris_en_charge_par.nom} {obj.pris_en_charge_par.prenoms}"
        return None

    def get_pris_en_charge_telephone(self, obj):
        if obj.pris_en_charge_par:
            return obj.pris_en_charge_par.telephone or None
        return None

    def get_piece_identite_url(self, obj):
        if obj.piece_identite:
            return obj.piece_identite.url
        return None

    def get_piece_identite_verso_url(self, obj):
        if obj.piece_identite_verso:
            return obj.piece_identite_verso.url
        return None

    def get_rib_document_url(self, obj):
        if obj.rib_document:
            return obj.rib_document.url
        return None

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
        exclude = [
            "capital_constitue",
            "num_police",
            "statut",
            "agent",
            "pris_en_charge_par",
            "code_inspection",
            "envoye_nsia_at",
            # Fichiers : uniquement via l'action upload-documents, qui valide
            # taille + type réel (sinon HTML/SVG servi aux agents = XSS stocké).
            "piece_identite",
            "piece_identite_verso",
            "rib_document",
        ]
        extra_kwargs = {"client": {"required": False}}

    def validate(self, attrs):
        # Un client souscrit pour lui-même (forcé dans perform_create) ;
        # un agent doit désigner le client concerné.
        request = self.context.get("request")
        if (self.instance is None and request and request.user.role != "client"
                and not attrs.get("client")):
            raise serializers.ValidationError({"client": "Ce champ est obligatoire."})
        return super().validate(attrs)

    def validate_beneficiaires(self, value):
        if value:
            named = [b for b in value if not (b.get("conjoint_corps") or b.get("enfants_nes"))]
            if named:
                total = sum(b.get("taux_repartition", 0) for b in named)
                if total != 100:
                    raise serializers.ValidationError(
                        f"La somme des taux de répartition des bénéficiaires nommés doit être égale à 100% (actuellement {total}%)."
                    )
        return value

    def validate_date_premiere_cotisation(self, value):
        if value and value < timezone.localdate():
            raise serializers.ValidationError("La date de 1ère cotisation ne peut pas être dans le passé.")
        return value

    def validate_date_effet(self, value):
        if value and value < timezone.localdate():
            raise serializers.ValidationError("La date d'effet ne peut pas être dans le passé.")
        return value

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
    pris_en_charge_nom = serializers.SerializerMethodField()
    pris_en_charge_telephone = serializers.SerializerMethodField()

    class Meta:
        model = ContratPrevoyance
        fields = "__all__"

    def get_client_nom(self, obj):
        return f"{obj.client.nom} {obj.client.prenoms}"

    def get_pris_en_charge_nom(self, obj):
        if obj.pris_en_charge_par:
            return f"{obj.pris_en_charge_par.nom} {obj.pris_en_charge_par.prenoms}"
        return None

    def get_pris_en_charge_telephone(self, obj):
        if obj.pris_en_charge_par:
            return obj.pris_en_charge_par.telephone or None
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["questionnaire_medical_rempli"] = data.get("questionnaire_medical") is not None
        # Données de santé : visibles par le client titulaire, l'admin et l'agent
        # en charge uniquement. Sans requête (contexte inconnu) → masquées.
        request = self.context.get("request")
        user = getattr(request, "user", None)
        autorise = bool(user and user.is_authenticated) and (
            user.role != "agent" or instance.pris_en_charge_par_id == user.id
        )
        if not autorise:
            data["questionnaire_medical"] = None
        data["questionnaire_masque"] = not autorise
        return data


class ContratPrevoyanceCreateSerializer(serializers.ModelSerializer):
    assures_associes = AssureAssocieSerializer(many=True, required=False)
    beneficiaires = BeneficiairePrevoyanceSerializer(many=True, required=False)
    questionnaire_medical = QuestionnaireMedicalSerializer(required=False)

    class Meta:
        model = ContratPrevoyance
        exclude = [
            "num_police",
            "num_client",
            "statut",
            "agent",
            "pris_en_charge_par",
            "code_inspection",
            "date_effet",
            "date_echeance",
            "envoye_nsia_at",
        ]

    def to_internal_value(self, data):
        # client est assigné par perform_create, pas requis dans le payload
        if 'client' not in data and self.context.get('request'):
            user = self.context['request'].user
            if user.role == 'client':
                data = dict(data)
                data['client'] = user.id
        return super().to_internal_value(data)

    def validate_beneficiaires(self, value):
        if value:
            named = [b for b in value if not (b.get("conjoint_corps") or b.get("enfants_nes"))]
            if named:
                total = sum(b.get("taux_repartition", 0) for b in named)
                if total != 100:
                    raise serializers.ValidationError(
                        f"La somme des taux de répartition des bénéficiaires nommés doit être égale à 100% (actuellement {total}%)."
                    )
        return value

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

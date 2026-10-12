from decimal import Decimal

from django.db.models import Sum
from rest_framework import serializers

from .models import Emission, Paiement, ClientRequest, Document
from accounts.serializers import UserSerializer


class PaiementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Paiement
        fields = [
            "id", "emission", "date_reglement", "reference",
            "montant_regle", "observations", "created_by", "created_at",
        ]
        read_only_fields = ["id", "created_by", "created_at"]

    def validate(self, attrs):
        emission = attrs.get("emission") or getattr(self.instance, "emission", None)
        montant = attrs.get("montant_regle")

        if emission is None or montant is None:
            return attrs

        # Verrou pour éviter que deux paiements simultanés dépassent le solde
        # (effectif lorsque la vue s'exécute dans une transaction)
        emission = Emission.objects.select_for_update().get(pk=emission.pk)
        paiements_qs = emission.paiements.all()
        if self.instance:
            paiements_qs = paiements_qs.exclude(pk=self.instance.pk)

        total_paye = paiements_qs.aggregate(total=Sum("montant_regle"))["total"] or Decimal(0)
        solde = Decimal(emission.prime_ttc) - total_paye

        if Decimal(montant) > solde:
            raise serializers.ValidationError(
                {
                    "montant_regle": (
                        f"Le montant saisi dépasse le solde disponible ({int(solde)} FCFA)."
                    )
                }
            )

        return attrs


class EmissionSerializer(serializers.ModelSerializer):
    paiements = PaiementSerializer(many=True, read_only=True)
    client_nom = serializers.CharField(source="client.full_name", read_only=True)
    total_paye = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)
    solde = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)
    montant_commission = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)

    class Meta:
        model = Emission
        fields = [
            "id", "client", "client_nom", "agent", "date", "risque", "compagnie",
            "num_facture", "num_police", "marque", "immatriculation",
            "effet", "echeance", "prime_nette", "prime_ttc",
            "taux_commission", "montant_commission",
            "situation", "paiements", "total_paye", "solde", "created_at",
        ]
        read_only_fields = ["id", "taux_commission", "montant_commission", "created_at"]


class DocumentSerializer(serializers.ModelSerializer):
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
    ALLOWED_EXTENSIONS = {"pdf", "jpg", "jpeg", "png", "docx", "doc"}

    class Meta:
        model = Document
        fields = [
            "id", "request", "nom", "fichier", "type_fichier",
            "is_livrable", "uploaded_by", "created_at",
        ]
        read_only_fields = ["id", "uploaded_by", "created_at"]

    def validate_fichier(self, value):
        if value.size > self.MAX_FILE_SIZE:
            raise serializers.ValidationError("Le fichier ne doit pas dépasser 5 Mo.")
        ext = value.name.rsplit(".", 1)[-1].lower() if "." in value.name else ""
        if ext not in self.ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(
                f"Type de fichier non autorisé. Extensions acceptées : {', '.join(sorted(self.ALLOWED_EXTENSIONS))}"
            )
        return value


class ClientRequestSerializer(serializers.ModelSerializer):
    documents = serializers.SerializerMethodField()
    livrables = serializers.SerializerMethodField()
    client_nom = serializers.CharField(source="client.full_name", read_only=True)
    agent_nom = serializers.SerializerMethodField()
    type_label = serializers.CharField(source="get_type_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = ClientRequest
        fields = [
            "id", "numero", "client", "client_nom", "agent", "agent_nom",
            "type", "type_label", "status", "status_label",
            "details", "documents", "livrables", "treated_at", "created_at",
        ]
        # Statut / agent / traitement ne changent que via les endpoints claim/release/treat
        read_only_fields = [
            "id", "numero", "client", "agent", "type", "status", "treated_at", "created_at",
        ]

    def get_agent_nom(self, obj):
        return obj.agent.full_name if obj.agent else None

    def get_documents(self, obj):
        return DocumentSerializer(
            obj.documents.filter(is_livrable=False),
            many=True,
            context=self.context,
        ).data

    def get_livrables(self, obj):
        return DocumentSerializer(
            obj.documents.filter(is_livrable=True),
            many=True,
            context=self.context,
        ).data


class ClientRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientRequest
        fields = ["id", "numero", "type", "details", "status", "created_at"]
        read_only_fields = ["id", "numero", "status", "created_at"]

    def create(self, validated_data):
        validated_data["client"] = self.context["request"].user
        return super().create(validated_data)


class DashboardStatsSerializer(serializers.Serializer):
    total_contrats = serializers.IntegerField()
    contrats_actifs = serializers.IntegerField()
    contrats_expires = serializers.IntegerField()
    total_primes = serializers.DecimalField(max_digits=15, decimal_places=0)
    primes_payees = serializers.DecimalField(max_digits=15, decimal_places=0)
    primes_impayees = serializers.DecimalField(max_digits=15, decimal_places=0)

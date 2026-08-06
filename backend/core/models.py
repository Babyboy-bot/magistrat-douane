from django.conf import settings
from django.db import models


COMMISSION_RATES: dict[str, int] = {
    "Automobile": 20,
    "Automobile TPV": 10,
    "Tous risques Sauf": 27,
    "Tous Dommages Sauf": 27,
    "Multirisque Professionnelle": 27,
    "Multirisque Immeuble": 27,
    "Multirisque Habitation": 27,
    "Bris de Machines": 18,
    "Vol et Détournement": 25,
    "Globale de banque": 25,
    "Facultés maritimes": 21,
    "Facultés aériennes": 21,
    "Facultés terrestres": 21,
    "Corps (maritime, fluviaux)": 18,
    "Corps plaisance": 20,
    "Corps aérien": 10,
    "RC armateur": 17,
    "Assurance maladie": 15,
    "Individuelle Accidents": 24,
    "Assistance Voyage": 20,
    "Responsabilité Civile": 23,
    "Tous risques chantiers": 18,
    "RC Décennale": 15,
}


class Emission(models.Model):
    class Situation(models.TextChoices):
        AFFAIRE_NOUVELLE = "Affaire nouvelle", "Affaire nouvelle"
        INCORPORATION = "Incorporation", "Incorporation"
        RETRAIT = "Retrait", "Retrait"
        RENOUVELLEMENT = "Renouvellement", "Renouvellement"
        MODIFICATION = "Modification", "Modification"
        SOLDEE = "Soldée", "Soldée"

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="emissions",
        verbose_name="Client",
    )
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_emissions",
        verbose_name="Agent",
    )
    date = models.DateField("Date d'émission")
    risque = models.CharField("Type de risque", max_length=100)
    compagnie = models.CharField("Compagnie", max_length=100)
    num_facture = models.CharField("N° Facture", max_length=50, unique=True)
    num_police = models.CharField("N° Police", max_length=50, unique=True)
    marque = models.CharField("Marque / Modèle", max_length=200, blank=True, default="-")
    immatriculation = models.CharField("Immatriculation", max_length=50, blank=True, default="-")
    effet = models.DateField("Date d'effet")
    echeance = models.DateField("Date d'échéance")
    prime_nette = models.DecimalField("Prime nette", max_digits=12, decimal_places=0)
    prime_ttc = models.DecimalField("Prime TTC", max_digits=12, decimal_places=0)
    taux_commission = models.PositiveSmallIntegerField(
        "Taux de commission (%)", default=0
    )
    situation = models.CharField(
        "Situation", max_length=30, choices=Situation.choices, default=Situation.AFFAIRE_NOUVELLE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Émission"
        verbose_name_plural = "Émissions"
        ordering = ["-date"]
        indexes = [
            models.Index(fields=["client"], name="idx_emission_client"),
            models.Index(fields=["echeance"], name="idx_emission_echeance"),
            models.Index(fields=["risque"], name="idx_emission_risque"),
            models.Index(fields=["compagnie"], name="idx_emission_compagnie"),
            models.Index(fields=["situation"], name="idx_emission_situation"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(prime_nette__gte=0),
                name="chk_prime_nette_positive",
            ),
            models.CheckConstraint(
                condition=models.Q(prime_ttc__gte=0),
                name="chk_prime_ttc_positive",
            ),
        ]

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        if is_new and self.taux_commission == 0 and self.risque:
            self.taux_commission = COMMISSION_RATES.get(self.risque, 0)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.num_police} - {self.client.full_name} ({self.risque})"

    @property
    def total_paye(self):
        return self.paiements.aggregate(total=models.Sum("montant_regle"))["total"] or 0

    @property
    def solde(self):
        return self.prime_ttc - self.total_paye

    @property
    def montant_commission(self):
        """Commission ACS = prime_nette × taux_commission / 100."""
        if self.taux_commission:
            from decimal import Decimal, ROUND_HALF_UP
            return (Decimal(str(self.prime_nette)) * self.taux_commission / 100).quantize(
                Decimal("1"), rounding=ROUND_HALF_UP
            )
        return 0


class Paiement(models.Model):
    emission = models.ForeignKey(
        Emission, on_delete=models.CASCADE, related_name="paiements", verbose_name="Émission"
    )
    date_reglement = models.DateField("Date de règlement")
    reference = models.CharField("Référence", max_length=50)
    montant_regle = models.DecimalField("Montant réglé", max_digits=12, decimal_places=0)
    observations = models.TextField("Observations", blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name="Enregistré par",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Paiement"
        verbose_name_plural = "Paiements"
        ordering = ["-date_reglement"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(montant_regle__gt=0),
                name="chk_montant_positif",
            ),
        ]

    def __str__(self):
        return f"{self.reference} - {self.montant_regle} FCFA"


class ClientRequest(models.Model):
    class RequestType(models.TextChoices):
        COTATION_AUTO = "cotation_auto", "Cotation Automobile"
        COTATION_MRH = "cotation_mrh", "Cotation MRH"
        SOUSCRIPTION_AUTO = "souscription_auto", "Souscription Automobile"
        SOUSCRIPTION_MRH = "souscription_mrh", "Souscription MRH"
        SOUSCRIPTION_MAGIST = "souscription_magist", "Souscription Magist-Assur"
        INCORPORATION = "incorporation", "Incorporation"
        CHANGEMENT_NOM = "changement_nom", "Changement de Nom"
        CHANGEMENT_IMMAT = "changement_immatriculation", "Changement d'Immatriculation"
        DECLARATION_SINISTRE = "declaration_sinistre", "Déclaration de Sinistre"

    class Status(models.TextChoices):
        EN_ATTENTE = "en_attente", "En attente"
        EN_COURS = "en_cours", "En cours"
        DEVIS_ENVOYE = "devis_envoye", "Devis envoyé"
        EN_REVISION = "en_revision", "En révision"
        VALIDE = "valide", "Validé"
        REFUSE = "refuse", "Refusé"
        TRAITE = "traite", "Traité"

    numero = models.CharField("Numéro", max_length=30, unique=True)
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="requests",
        verbose_name="Client",
    )
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_requests",
        verbose_name="Agent assigné",
    )
    type = models.CharField("Type", max_length=40, choices=RequestType.choices)
    status = models.CharField(
        "Statut", max_length=20, choices=Status.choices, default=Status.EN_ATTENTE
    )
    details = models.JSONField("Détails", default=dict, blank=True)
    sinistre_note = models.TextField("Note de clôture (sinistre)", blank=True, default="")
    treated_at = models.DateTimeField("Date de traitement", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Requête client"
        verbose_name_plural = "Requêtes clients"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["client"], name="idx_request_client"),
            models.Index(fields=["status"], name="idx_request_status"),
            models.Index(fields=["type"], name="idx_request_type"),
            models.Index(fields=["status", "type"], name="idx_request_status_type"),
        ]

    def __str__(self):
        return f"{self.numero} - {self.get_type_display()} ({self.get_status_display()})"

    def save(self, *args, **kwargs):
        if not self.numero:
            from django.utils import timezone
            from django.db import transaction
            year = timezone.now().year
            with transaction.atomic():
                last = (
                    ClientRequest.objects.select_for_update()
                    .filter(numero__startswith=f"RQ-{year}-")
                    .order_by("-numero")
                    .first()
                )
                if last:
                    try:
                        seq = int(last.numero.rsplit("-", 1)[-1]) + 1
                    except ValueError:
                        seq = 1
                else:
                    seq = 1
                self.numero = f"RQ-{year}-{seq:04d}"
                super().save(*args, **kwargs)
            return
        super().save(*args, **kwargs)


class Document(models.Model):
    request = models.ForeignKey(
        ClientRequest,
        on_delete=models.CASCADE,
        related_name="documents",
        verbose_name="Requête",
        null=True,
        blank=True,
    )
    nom = models.CharField("Nom du document", max_length=200)
    fichier = models.FileField("Fichier", upload_to="documents/%Y/%m/")
    type_fichier = models.CharField("Type MIME", max_length=100, blank=True)
    is_livrable = models.BooleanField("Est un livrable", default=False)
    confirmed_at = models.DateTimeField("Confirmé reçu le", null=True, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name="Uploadé par",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Document"
        verbose_name_plural = "Documents"
        ordering = ["-created_at"]

    def __str__(self):
        return self.nom


class AuditEntry(models.Model):
    class Action(models.TextChoices):
        CREATED = "created", "Créé"
        UPDATED = "updated", "Modifié"
        DELETED = "deleted", "Supprimé"

    object_type = models.CharField("Type d'objet", max_length=50)
    object_id   = models.PositiveBigIntegerField("ID objet")
    object_repr = models.CharField("Représentation", max_length=200, blank=True)
    action      = models.CharField("Action", max_length=10, choices=Action.choices)
    before      = models.JSONField("Avant", null=True, blank=True)
    after       = models.JSONField("Après",  null=True, blank=True)
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="audit_entries",
        verbose_name="Effectué par",
    )
    ip_address  = models.GenericIPAddressField("IP", null=True, blank=True)
    timestamp   = models.DateTimeField("Horodatage", auto_now_add=True)

    class Meta:
        verbose_name = "Entrée d'audit"
        verbose_name_plural = "Entrées d'audit"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["object_type", "object_id"]),
            models.Index(fields=["performed_by", "timestamp"]),
        ]

    def __str__(self):
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {self.action} {self.object_type}#{self.object_id}"

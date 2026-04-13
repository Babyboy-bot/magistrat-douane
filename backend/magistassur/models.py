from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator


class ContratEpargne(models.Model):
    class Periodicite(models.TextChoices):
        MENSUELLE = "mensuelle", "Mensuelle"
        TRIMESTRIELLE = "trimestrielle", "Trimestrielle"
        SEMESTRIELLE = "semestrielle", "Semestrielle"
        ANNUELLE = "annuelle", "Annuelle"

    class Statut(models.TextChoices):
        EN_COURS = "en_cours", "En cours"
        RACHETÉ = "rachete", "Racheté"
        ARRIVE_TERME = "arrive_terme", "Arrivé à terme"
        SUSPENDU = "suspendu", "Suspendu"
        CLOTURE = "cloture", "Clôturé"

    class SituationMatrimoniale(models.TextChoices):
        CELIBATAIRE = "celibataire", "Célibataire"
        MARIE = "marie", "Marié(e)"
        DIVORCE = "divorce", "Divorcé(e)"
        VEUF = "veuf", "Veuf(ve)"
        CONCUBIN = "concubin", "Concubin(e)"

    class TypePiece(models.TextChoices):
        CNI = "cni", "CNI"
        PASSEPORT = "passeport", "Passeport"
        AUTRE = "autre", "Autre"

    class StatutProfessionnel(models.TextChoices):
        SALARIE = "salarie", "Salarié"
        NON_SALARIE = "non_salarie", "Non salarié"
        SANS_ACTIVITE = "sans_activite", "Sans activité"
        RETRAITE = "retraite", "Retraité"

    class OrigineRevenu(models.TextChoices):
        SALAIRE = "salaire", "Salaire / Pension / Rente"
        VENTE_ACTIFS = "vente_actifs", "Vente d'actifs"
        ACTIVITE_COMMERCIALE = "activite_commerciale", "Activité commerciale"

    # Identifiants
    num_police = models.CharField("N° Police", max_length=50, unique=True, null=True, blank=True, default=None)
    code_inspection = models.CharField("Code inspection", max_length=50, blank=True, default="")

    # Liens
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="contrats_epargne",
        verbose_name="Souscripteur",
    )
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="epargnes_gerees",
        verbose_name="Conseiller",
    )
    pris_en_charge_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="epargnes_en_traitement",
        verbose_name="En traitement par",
    )

    # Documents
    piece_identite = models.FileField(
        upload_to="magistassur/pieces_identite/",
        null=True, blank=True,
        verbose_name="Pièce d'identité",
    )
    rib_document = models.FileField(
        upload_to="magistassur/ribs/",
        null=True, blank=True,
        verbose_name="RIB",
    )

    # Souscripteur — données supplémentaires
    civilite = models.CharField("Civilité", max_length=20, blank=True, default="")
    nom_epoux = models.CharField("Nom époux/épouse", max_length=100, blank=True, default="")
    date_naissance = models.DateField("Date de naissance", null=True, blank=True)
    pays_naissance = models.CharField("Pays/Ville de naissance", max_length=100, blank=True, default="")
    type_piece = models.CharField("Type de pièce", max_length=20, choices=TypePiece.choices, blank=True, default="")
    validite_piece = models.DateField("Validité de la pièce", null=True, blank=True)
    numero_piece = models.CharField("N° de la pièce", max_length=100, blank=True, default="")
    nni = models.CharField("NNI", max_length=50, blank=True, default="")
    situation_matrimoniale = models.CharField(
        "Situation matrimoniale", max_length=20, choices=SituationMatrimoniale.choices, blank=True, default=""
    )
    adresse_postale = models.CharField("Adresse postale", max_length=200, blank=True, default="")
    email_personnel = models.EmailField("Email personnel", max_length=200, blank=True, default="")
    telephone = models.CharField("Tél. / Cél.", max_length=30, blank=True, default="")
    whatsapp = models.CharField("WhatsApp", max_length=30, blank=True, default="")
    facebook = models.CharField("Facebook", max_length=100, blank=True, default="")
    linkedin = models.CharField("LinkedIn", max_length=100, blank=True, default="")
    autres_reseaux = models.CharField("Autres réseaux sociaux", max_length=200, blank=True, default="")
    statut_professionnel = models.CharField(
        "Statut professionnel", max_length=20, choices=StatutProfessionnel.choices, blank=True, default=""
    )
    revenu_mensuel = models.DecimalField(
        "Estimation revenu mensuel", max_digits=14, decimal_places=0, null=True, blank=True
    )
    origine_revenu = models.CharField(
        "Origine revenu", max_length=30, choices=OrigineRevenu.choices, blank=True, default=""
    )
    profession_detail = models.CharField("Profession", max_length=200, blank=True, default="")
    secteur_activite = models.CharField("Secteur d'activité", max_length=200, blank=True, default="")
    telephone_bureau = models.CharField("Téléphone bureau", max_length=30, blank=True, default="")
    email_professionnel = models.CharField("Email professionnel", max_length=200, blank=True, default="")
    residence_principale = models.CharField("Résidence principale", max_length=300, blank=True, default="")
    autre_residence = models.CharField("Autre(s) résidence(s)", max_length=300, blank=True, default="")

    # Assuré (si différent du souscripteur)
    assure_idem = models.BooleanField("Assuré = Souscripteur", default=True)
    assure_nom = models.CharField("Assuré — Nom", max_length=100, blank=True, default="")
    assure_prenoms = models.CharField("Assuré — Prénoms", max_length=150, blank=True, default="")
    assure_date_naissance = models.DateField("Assuré — Date naissance", null=True, blank=True)
    assure_lieu_naissance = models.CharField("Assuré — Lieu naissance", max_length=100, blank=True, default="")
    assure_type_piece = models.CharField("Assuré — Type pièce", max_length=20, blank=True, default="")
    assure_validite_piece = models.DateField("Assuré — Validité pièce", null=True, blank=True)
    assure_numero_piece = models.CharField("Assuré — N° pièce", max_length=100, blank=True, default="")
    assure_nni = models.CharField("Assuré — NNI", max_length=50, blank=True, default="")
    assure_telephone = models.CharField("Assuré — Téléphone", max_length=30, blank=True, default="")
    assure_lien = models.CharField("Lien avec souscripteur", max_length=100, blank=True, default="")
    assure_email = models.CharField("Assuré — Email", max_length=200, blank=True, default="")
    assure_profession = models.CharField("Assuré — Profession", max_length=200, blank=True, default="")
    assure_employeur = models.CharField("Assuré — Employeur", max_length=200, blank=True, default="")
    assure_adresse_employeur = models.CharField("Assuré — Adresse employeur", max_length=300, blank=True, default="")
    assure_telephone_bureau = models.CharField("Assuré — Tél bureau", max_length=30, blank=True, default="")
    assure_email_pro = models.CharField("Assuré — Email pro", max_length=200, blank=True, default="")
    assure_nsia_anterieur = models.BooleanField("Déjà souscrit NSIA ?", default=False)
    assure_nsia_type_contrat = models.CharField("Type contrat antérieur", max_length=100, blank=True, default="")
    assure_nsia_num_police = models.CharField("N° police antérieur", max_length=50, blank=True, default="")

    # Garanties & cotisations
    duree_annees = models.PositiveSmallIntegerField(
        "Durée (années)", validators=[MinValueValidator(1)], default=10
    )
    periodicite = models.CharField(
        "Périodicité", max_length=20, choices=Periodicite.choices, default=Periodicite.MENSUELLE
    )
    date_premiere_cotisation = models.DateField("Date 1ère cotisation", null=True, blank=True)
    date_effet = models.DateField("Date d'effet", null=True, blank=True)
    montant_cotisation = models.DecimalField(
        "Montant cotisation (FCFA)", max_digits=14, decimal_places=0,
        validators=[MinValueValidator(25000)]
    )
    capital_constitue = models.DecimalField(
        "Capital constitué (FCFA)", max_digits=14, decimal_places=0, default=0
    )
    mode_paiement = models.CharField("Mode de paiement", max_length=100, blank=True, default="")
    numero_compte = models.CharField("N° de compte (RIB)", max_length=100, blank=True, default="")

    # Consentement données personnelles
    consentement_donnees = models.BooleanField("Consentement données personnelles", null=True, blank=True)

    # Statut
    statut = models.CharField(
        "Statut", max_length=20, choices=Statut.choices, default=Statut.EN_COURS
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Contrat MAGIST'ASSUR Épargne"
        verbose_name_plural = "Contrats MAGIST'ASSUR Épargne"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Épargne — {self.client} — {self.num_police or 'En attente'}"

    @property
    def frais_gestion_pct(self):
        return 5

    @property
    def frais_accessoires(self):
        return 1000

    @property
    def cout_police(self):
        return 10000

    @property
    def taux_interet(self):
        return 3.5


class Correspondant(models.Model):
    contrat_epargne = models.ForeignKey(
        ContratEpargne, on_delete=models.CASCADE, related_name="correspondants"
    )
    numero = models.PositiveSmallIntegerField("Correspondant N°", default=1)
    nom = models.CharField("Nom", max_length=100, blank=True, default="")
    prenom = models.CharField("Prénom", max_length=150, blank=True, default="")
    domicile = models.CharField("Domicile", max_length=300, blank=True, default="")
    adresse_postale = models.CharField("Adresse postale", max_length=200, blank=True, default="")
    telephone = models.CharField("Téléphone", max_length=30, blank=True, default="")
    email = models.EmailField("Email", max_length=200, blank=True, default="")
    whatsapp = models.CharField("WhatsApp", max_length=30, blank=True, default="")
    facebook = models.CharField("Facebook", max_length=100, blank=True, default="")
    linkedin = models.CharField("LinkedIn", max_length=100, blank=True, default="")
    autres_reseaux = models.CharField("Autres réseaux", max_length=200, blank=True, default="")

    class Meta:
        verbose_name = "Correspondant"
        ordering = ["numero"]
        unique_together = [("contrat_epargne", "numero")]

    def __str__(self):
        return f"Correspondant {self.numero} — {self.nom} {self.prenom}"


class BeneficiaireEpargne(models.Model):
    contrat = models.ForeignKey(
        ContratEpargne, on_delete=models.CASCADE, related_name="beneficiaires"
    )
    conjoint_corps = models.BooleanField("Conjoint non séparé de corps", default=False)
    enfants_nes = models.BooleanField("Enfants nés ou à naître", default=False)
    nom = models.CharField("Nom & Prénom", max_length=200, blank=True, default="")
    date_naissance = models.DateField("Date de naissance", null=True, blank=True)
    domicile = models.CharField("Domicile", max_length=300, blank=True, default="")
    adresse_postale = models.CharField("Adresse postale", max_length=200, blank=True, default="")
    telephone = models.CharField("Téléphone", max_length=30, blank=True, default="")
    email = models.EmailField("Email", max_length=200, blank=True, default="")
    en_qualite_de = models.CharField("En qualité de", max_length=100, blank=True, default="")
    whatsapp = models.CharField("WhatsApp", max_length=30, blank=True, default="")
    taux_repartition = models.PositiveSmallIntegerField("Taux de répartition (%)", default=100)

    class Meta:
        verbose_name = "Bénéficiaire Épargne"

    def __str__(self):
        return f"{self.nom} ({self.taux_repartition}%)"


# ────────────────────────────────────────────────────
#  PRÉVOYANCE
# ────────────────────────────────────────────────────

class ContratPrevoyance(models.Model):
    class Statut(models.TextChoices):
        EN_COURS = "en_cours", "En cours"
        SINISTRE = "sinistre", "Sinistre déclaré"
        EXPIRE = "expire", "Expiré"
        RESILIE = "resilie", "Résilié"
        CLOTURE = "cloture", "Clôturé"

    class SituationMatrimoniale(models.TextChoices):
        CELIBATAIRE = "celibataire", "Célibataire"
        MARIE = "marie", "Marié(e)"
        DIVORCE = "divorce", "Divorcé(e)"
        VEUF = "veuf", "Veuf(ve)"
        CONCUBIN = "concubin", "Concubin(e)"

    class TypePiece(models.TextChoices):
        CNI = "cni", "CNI"
        PASSEPORT = "passeport", "Passeport"
        AUTRE = "autre", "Autre"

    # Identifiants
    num_police = models.CharField("N° Police", max_length=50, unique=True, null=True, blank=True, default=None)
    num_client = models.CharField("N° Client", max_length=50, blank=True, default="")
    code_inspection = models.CharField("Code inspection", max_length=50, blank=True, default="")

    # Liens
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="contrats_prevoyance",
        verbose_name="Souscripteur",
    )
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="prevoyances_gerees",
        verbose_name="Conseiller",
    )
    pris_en_charge_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="prevoyances_en_traitement",
        verbose_name="En traitement par",
    )

    # Souscripteur — données supplémentaires
    civilite = models.CharField("Civilité", max_length=20, blank=True, default="")
    date_naissance = models.DateField("Date de naissance", null=True, blank=True)
    pays_naissance = models.CharField("Pays/Ville de naissance", max_length=100, blank=True, default="")
    type_piece = models.CharField("Type de pièce", max_length=20, choices=TypePiece.choices, blank=True, default="")
    validite_piece = models.DateField("Validité de la pièce", null=True, blank=True)
    numero_piece = models.CharField("N° de la pièce", max_length=100, blank=True, default="")
    nni = models.CharField("NNI", max_length=50, blank=True, default="")
    situation_matrimoniale = models.CharField(
        "Situation matrimoniale", max_length=20, choices=SituationMatrimoniale.choices, blank=True, default=""
    )
    adresse_postale = models.CharField("Adresse postale", max_length=200, blank=True, default="")
    email_personnel = models.EmailField("Email personnel", max_length=200, blank=True, default="")
    telephone = models.CharField("Tél. / Cél.", max_length=30, blank=True, default="")
    whatsapp = models.CharField("WhatsApp", max_length=30, blank=True, default="")
    facebook = models.CharField("Facebook", max_length=100, blank=True, default="")
    linkedin = models.CharField("LinkedIn", max_length=100, blank=True, default="")
    autres_reseaux = models.CharField("Autres réseaux sociaux", max_length=200, blank=True, default="")
    profession_detail = models.CharField("Profession", max_length=200, blank=True, default="")
    telephone_bureau = models.CharField("Téléphone bureau", max_length=30, blank=True, default="")
    email_professionnel = models.CharField("Email professionnel", max_length=200, blank=True, default="")
    residence_principale = models.CharField("Résidence principale", max_length=300, blank=True, default="")
    autre_residence = models.CharField("Autre(s) résidence(s)", max_length=300, blank=True, default="")

    # Correspondant (1 seul pour Prévoyance)
    corresp_nom = models.CharField("Correspondant — Nom", max_length=100, blank=True, default="")
    corresp_prenom = models.CharField("Correspondant — Prénom", max_length=150, blank=True, default="")
    corresp_domicile = models.CharField("Correspondant — Domicile", max_length=300, blank=True, default="")
    corresp_adresse_postale = models.CharField("Correspondant — Adresse postale", max_length=200, blank=True, default="")
    corresp_telephone = models.CharField("Correspondant — Téléphone", max_length=30, blank=True, default="")
    corresp_email = models.EmailField("Correspondant — Email", max_length=200, blank=True, default="")
    corresp_whatsapp = models.CharField("Correspondant — WhatsApp", max_length=30, blank=True, default="")
    corresp_facebook = models.CharField("Correspondant — Facebook", max_length=100, blank=True, default="")
    corresp_linkedin = models.CharField("Correspondant — LinkedIn", max_length=100, blank=True, default="")
    corresp_autres_reseaux = models.CharField("Correspondant — Autres réseaux", max_length=200, blank=True, default="")

    # Garanties souscrites
    garantie_prevoyance_deces = models.BooleanField("Prévoyance Décès (45 000 FCFA/an)", default=False)
    garantie_frais_funeraires = models.BooleanField("Frais Funéraires (58 000 FCFA/an)", default=False)

    # Dates
    date_effet = models.DateField("Date d'effet", null=True, blank=True)
    date_echeance = models.DateField("Date d'échéance", null=True, blank=True)

    # Statut
    statut = models.CharField(
        "Statut", max_length=20, choices=Statut.choices, default=Statut.EN_COURS
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Contrat MAGIST'ASSUR Prévoyance"
        verbose_name_plural = "Contrats MAGIST'ASSUR Prévoyance"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Prévoyance — {self.client} — {self.num_police or 'En attente'}"

    @property
    def prime_annuelle(self):
        total = 0
        if self.garantie_prevoyance_deces:
            total += 45000
        if self.garantie_frais_funeraires:
            total += 58000
        return total

    @property
    def frais_fixes(self):
        return 2500 + 1000


class AssureAssocie(models.Model):
    class LienParente(models.TextChoices):
        CONJOINT = "conjoint", "Conjoint(e)"
        ENFANT = "enfant", "Enfant"
        PERE = "pere", "Père"
        MERE = "mere", "Mère"

    INDEMNITE_PAR_LIEN = {
        "conjoint": 1_000_000,
        "enfant": 500_000,
        "pere": 750_000,
        "mere": 750_000,
    }

    contrat = models.ForeignKey(
        ContratPrevoyance, on_delete=models.CASCADE, related_name="assures_associes"
    )
    lien_parente = models.CharField(
        "Lien de parenté", max_length=20, choices=LienParente.choices
    )
    nom = models.CharField("Nom & Prénoms", max_length=200)
    date_naissance = models.DateField("Date de naissance", null=True, blank=True)
    contact = models.CharField("Contact", max_length=30, blank=True, default="")
    montant_indemnite = models.DecimalField(
        "Montant indemnité funérailles (FCFA)", max_digits=12, decimal_places=0, default=0
    )
    prime = models.DecimalField("Prime (FCFA)", max_digits=12, decimal_places=0, default=0)

    class Meta:
        verbose_name = "Assuré Associé"
        verbose_name_plural = "Assurés Associés"

    def save(self, *args, **kwargs):
        if not self.montant_indemnite:
            self.montant_indemnite = self.INDEMNITE_PAR_LIEN.get(self.lien_parente, 0)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nom} ({self.lien_parente})"


class BeneficiairePrevoyance(models.Model):
    contrat = models.ForeignKey(
        ContratPrevoyance, on_delete=models.CASCADE, related_name="beneficiaires"
    )
    conjoint_corps = models.BooleanField("Conjoint non séparé de corps", default=False)
    enfants_nes = models.BooleanField("Enfants nés ou à naître", default=False)
    nom = models.CharField("Nom & Prénom", max_length=200, blank=True, default="")
    date_naissance = models.DateField("Date de naissance", null=True, blank=True)
    telephone = models.CharField("Téléphone", max_length=30, blank=True, default="")
    en_qualite_de = models.CharField("En qualité de", max_length=100, blank=True, default="")
    taux_repartition = models.PositiveSmallIntegerField("Taux de répartition (%)", default=100)

    class Meta:
        verbose_name = "Bénéficiaire Prévoyance"

    def __str__(self):
        return f"{self.nom} ({self.taux_repartition}%)"


class QuestionnaireMedical(models.Model):
    contrat = models.OneToOneField(
        ContratPrevoyance, on_delete=models.CASCADE, related_name="questionnaire_medical"
    )

    # Données physiques
    taille_cm = models.PositiveSmallIntegerField("Taille (cm)", null=True, blank=True)
    poids_kg = models.DecimalField("Poids (kg)", max_digits=5, decimal_places=1, null=True, blank=True)
    tension_arterielle = models.CharField("Tension artérielle", max_length=20, blank=True, default="")

    # Habitudes
    fumeur = models.BooleanField("Fumeur ?", default=False)
    cigarettes_par_jour = models.PositiveSmallIntegerField("Nb cigarettes/jour", null=True, blank=True)
    alcool = models.CharField("Consommation alcool", max_length=30, blank=True, default="")
    sport = models.BooleanField("Pratique un sport ?", default=False)
    sport_titre = models.CharField("Sport — Amateur/Professionnel", max_length=30, blank=True, default="")
    invalidite = models.BooleanField("Atteint d'une infirmité ?", default=False)
    invalidite_nature = models.CharField("Nature de l'infirmité", max_length=200, blank=True, default="")
    invalidite_date = models.DateField("Date de survenance", null=True, blank=True)
    distractions = models.CharField("Distractions", max_length=200, blank=True, default="")

    # Antécédents médicaux (JSON : clé = pathologie, valeur = {assure, conjoint, enfants, pere, mere, beau_pere, belle_mere})
    antecedents = models.JSONField("Antécédents médicaux", default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Questionnaire Médical"

    def __str__(self):
        return f"Questionnaire — {self.contrat}"


class CotisationEpargne(models.Model):
    class Statut(models.TextChoices):
        EN_ATTENTE = "en_attente", "En attente"
        PAYEE = "payee", "Payée"
        EN_RETARD = "en_retard", "En retard"
        RACHAT = "rachat", "Rachat"

    contrat = models.ForeignKey(
        ContratEpargne, on_delete=models.CASCADE, related_name="cotisations"
    )
    date_echeance = models.DateField("Date d'échéance")
    date_paiement = models.DateField("Date de paiement", null=True, blank=True)
    montant = models.DecimalField("Montant (FCFA)", max_digits=14, decimal_places=0)
    statut = models.CharField(
        "Statut", max_length=20, choices=Statut.choices, default=Statut.EN_ATTENTE
    )
    reference = models.CharField("Référence paiement", max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Cotisation Épargne"
        verbose_name_plural = "Cotisations Épargne"
        ordering = ["date_echeance"]

    def __str__(self):
        return f"Cotisation {self.date_echeance} — {self.statut}"

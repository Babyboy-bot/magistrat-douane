from django.contrib.auth.models import AbstractUser, BaseUserManager

from django.db import models





class UserManager(BaseUserManager):

    def create_user(self, email=None, password=None, **extra_fields):

        # Email is now optional, but if provided, normalize it

        if email:

            email = self.normalize_email(email)

        

        # S'assurer que les champs optionnels sont présents

        if 'telephone' not in extra_fields:

            extra_fields['telephone'] = ''

        if 'telephone2' not in extra_fields:

            extra_fields['telephone2'] = ''

        

        user = self.model(email=email, **extra_fields)

        user.set_password(password)

        user.save(using=self._db)

        return user



    def create_superuser(self, email, password=None, **extra_fields):

        extra_fields.setdefault("is_staff", True)

        extra_fields.setdefault("is_superuser", True)

        extra_fields.setdefault("role", "admin")

        extra_fields.setdefault("verified", True)

        # Superuser still needs email for admin access

        if not email:

            raise ValueError("L'email est obligatoire pour un superuser")

        return self.create_user(email, password, **extra_fields)





class User(AbstractUser):

    class Role(models.TextChoices):

        CLIENT = "client", "Client"

        PROSPECT = "prospect", "Prospect"

        AGENT = "agent", "Agent ACS"

        ADMIN = "admin", "Administrateur"



    class ProfessionType(models.TextChoices):

        MAGISTRAT = "magistrat", "Magistrat"

        DOUANIER = "douanier", "Douanier"

        AUTRE = "autre", "Autre"



    class AccountStatus(models.TextChoices):

        ACTIVE = "active", "Actif"

        PENDING_VERIFICATION = "pending_verification", "En attente de vérification"

        VERIFIED = "verified", "Vérifié"

        RESTRICTED = "restricted", "Restreint"



    class RiskLevel(models.TextChoices):

        STANDARD = "standard", "Standard"

        PREMIUM = "premium", "Premium"

        SENSITIVE = "sensitive", "Sensible"



    username = None

    email = models.EmailField("Adresse email", unique=True, null=True, blank=True)

    nom = models.CharField("Nom", max_length=100)

    prenoms = models.CharField("Prénoms", max_length=200)

    profession = models.CharField("Fonction", max_length=200, blank=True)

    profession_type = models.CharField(

        "Catégorie professionnelle",

        max_length=20,

        choices=ProfessionType.choices,

        default=ProfessionType.AUTRE,

    )

    telephone = models.CharField("Téléphone principal", max_length=30, blank=True, null=True)

    telephone2 = models.CharField("Téléphone secondaire", max_length=30, blank=True)

    photo = models.ImageField("Photo", upload_to="avatars/", blank=True, null=True)

    role = models.CharField(

        "Rôle", max_length=20, choices=Role.choices, default=Role.PROSPECT

    )

    verified = models.BooleanField("Compte vérifié", default=False)

    verified_at = models.DateTimeField("Date de vérification", null=True, blank=True)

    verified_by = models.ForeignKey(

        "self",

        on_delete=models.SET_NULL,

        null=True,

        blank=True,

        related_name="verified_users",

        verbose_name="Vérifié par",

    )

    account_status = models.CharField(

        "Statut du compte",

        max_length=25,

        choices=AccountStatus.choices,

        default=AccountStatus.ACTIVE,

    )

    risk_level = models.CharField(

        "Niveau de risque",

        max_length=15,

        choices=RiskLevel.choices,

        default=RiskLevel.STANDARD,

    )



    USERNAME_FIELD = "email"

    REQUIRED_FIELDS = ["nom", "prenoms"]



    objects = UserManager()



    class Meta:

        verbose_name = "Utilisateur"

        verbose_name_plural = "Utilisateurs"

        ordering = ["-date_joined"]

        indexes = [

            models.Index(fields=["role"], name="idx_user_role"),

            models.Index(fields=["profession_type"], name="idx_user_profession"),

            models.Index(fields=["verified"], name="idx_user_verified"),

            models.Index(fields=["account_status"], name="idx_user_account_status"),

            models.Index(fields=["risk_level"], name="idx_user_risk_level"),

            models.Index(fields=["account_status", "risk_level"], name="idx_user_status_risk"),

            models.Index(fields=["role", "verified"], name="idx_user_role_verified"),

            models.Index(fields=["telephone"], name="idx_user_telephone"),

        ]



    def __str__(self):

        return f"{self.nom} {self.prenoms} ({self.get_role_display()})"



    @property

    def full_name(self):

        return f"{self.nom} {self.prenoms}"



    def save(self, *args, **kwargs):

        # Logique métier stratégique

        is_new = self.pk is None

        # Ne pas écraser les champs si une mise à jour explicite est en cours via update_fields

        update_fields = kwargs.get("update_fields")

        updating_active = update_fields and "is_active" in update_fields



        if self.profession_type in (self.ProfessionType.MAGISTRAT, self.ProfessionType.DOUANIER):

            # Magistrats & Douaniers = clients premium

            self.risk_level = self.RiskLevel.PREMIUM

            # Ne pas forcer role/account_status si l'admin modifie explicitement is_active

            if not updating_active:

                self.role = self.Role.CLIENT

                self.account_status = self.AccountStatus.VERIFIED

                self.verified = True

                if not self.verified_at:

                    from django.utils import timezone

                    self.verified_at = timezone.now()

        else:

            # Grand public = workflow standard

            self.risk_level = self.RiskLevel.STANDARD

            if is_new and (not self.role or self.role in {self.Role.PROSPECT, self.Role.CLIENT}):

                # Tous les nouveaux inscrits sont des CLIENT non vérifiés.
                # Le tab Prospects a été supprimé — la vérification se fait
                # directement depuis l'onglet catégorie (Autres, etc.)
                self.role = self.Role.CLIENT

                self.account_status = self.AccountStatus.PENDING_VERIFICATION

            elif not is_new and self.verified and self.account_status == self.AccountStatus.PENDING_VERIFICATION:

                # Un compte déjà vérifié ne doit pas rester bloqué en pending_verification

                self.account_status = self.AccountStatus.VERIFIED



        super().save(*args, **kwargs)





class UserAuditLog(models.Model):

    ACTION_CHOICES = (

        ("activation", "Activation"),

        ("deactivation", "Désactivation"),

        ("role_change", "Changement de rôle"),

        ("status_change", "Changement de statut"),

        ("password_reset", "Réinitialisation mot de passe"),

        ("creation", "Création de compte"),

        ("login", "Connexion"),

        ("login_failed", "Tentative de connexion échouée"),

        ("logout", "Déconnexion"),

    )



    performed_by = models.ForeignKey(

        User,

        null=True,

        blank=True,

        related_name="audit_actions",

        on_delete=models.SET_NULL,

    )

    target_user = models.ForeignKey(

        User,

        related_name="audit_logs",

        on_delete=models.CASCADE,

    )

    action = models.CharField(max_length=50, choices=ACTION_CHOICES)

    metadata = models.JSONField(blank=True, default=dict)

    ip_address = models.GenericIPAddressField("Adresse IP", null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)



    class Meta:

        ordering = ["-created_at"]



    def __str__(self):

        return f"[{self.created_at:%Y-%m-%d %H:%M}] {self.action} on {self.target_user_id}"


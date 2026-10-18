import re

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db.models import Q

from .models import UserAuditLog

User = get_user_model()


def normalize_phone(value):
    return re.sub(r'[\s\-\.\(\)\+]', '', value or '')


def validate_photo_file(value):
    """La photo de profil doit être une vraie image (magic bytes).
    Sans validation, un client pouvait uploader du SVG/HTML servi sur
    le même domaine — XSS stocké touchant les agents qui consultent
    les profils."""
    if value:
        from django.core.exceptions import ValidationError as DjangoValidationError
        from core.file_validators import validate_upload, ALLOWED_TYPES_IMAGE
        try:
            validate_upload(value, ALLOWED_TYPES_IMAGE)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages)
    return value


def validate_unique_phone(value, instance=None):
    """Normalise le téléphone et vérifie qu'il n'est pas déjà utilisé (le login se fait aussi par téléphone)."""
    phone = normalize_phone(value)
    if phone:
        qs = User.objects.filter(Q(telephone=phone) | Q(telephone2=phone))
        if instance is not None:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ce numéro de téléphone est déjà utilisé.")
    return phone


def validate_unique_email(value, instance=None):
    if not value:
        return None
    qs = User.objects.filter(email__iexact=value)
    if instance is not None:
        qs = qs.exclude(pk=instance.pk)
    if qs.exists():
        raise serializers.ValidationError("Cet email est déjà utilisé.")
    return value


class UserSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(source="date_joined", read_only=True)
    photo = serializers.SerializerMethodField()

    def get_photo(self, obj):
        if obj.photo:
            return obj.photo.url
        return None

    class Meta:
        model = User
        fields = [
            "id", "email", "nom", "prenoms", "profession", "profession_type",
            "telephone", "telephone2", "photo", "role", "verified",
            "verified_at", "date_joined", "created_at", "is_active", "account_status", "risk_level",
        ]
        read_only_fields = ["id", "role", "verified", "verified_at", "date_joined"]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            "email", "password", "nom", "prenoms", "profession",
            "profession_type", "telephone", "telephone2",
        ]
        extra_kwargs = {
            'email': {'required': False, 'allow_blank': True},
            'telephone': {'required': True},
            'profession': {'required': False, 'allow_blank': True},
            'profession_type': {'required': True},
        }

    def validate_telephone(self, value):
        phone = validate_unique_phone(value)
        if not phone:
            raise serializers.ValidationError("Le numéro de téléphone est obligatoire.")
        return phone

    def validate_telephone2(self, value):
        return validate_unique_phone(value)

    def validate_email(self, value):
        return validate_unique_email(value)

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate_profession_type(self, value):
        if value not in ("magistrat", "douanier"):
            raise serializers.ValidationError(
                "L'inscription est réservée aux magistrats et aux douaniers."
            )
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data.get("email"),
            password=validated_data["password"],
            nom=validated_data["nom"],
            prenoms=validated_data["prenoms"],
            profession=validated_data.get("profession", ""),
            profession_type=validated_data.get("profession_type", "autre"),
            telephone=validated_data.get("telephone", ""),
            telephone2=validated_data.get("telephone2", ""),
            role="client",
            verified=False,
        )
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    photo = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = ["email", "nom", "prenoms", "profession", "telephone", "telephone2", "photo", "is_active", "role", "password"]
        extra_kwargs = {
            'telephone': {'required': False, 'allow_blank': True},
            'role': {'required': False},
            'email': {'required': False},
        }

    def validate_email(self, value):
        return validate_unique_email(value, self.instance)

    def validate_telephone(self, value):
        return validate_unique_phone(value, self.instance)

    def validate_telephone2(self, value):
        return validate_unique_phone(value, self.instance)

    def validate_photo(self, value):
        return validate_photo_file(value)

    def validate(self, attrs):
        # Prevent password changes for inactive users
        password = attrs.get('password')
        if password and not self.instance.is_active:
            raise serializers.ValidationError(
                "Impossible de modifier le mot de passe d'un utilisateur inactif. "
                "Veuillez d'abord réactiver le compte."
            )
        return attrs

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)
        
        return super().update(instance, validated_data)


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer pour les self-updates via MeView.
    Le mot de passe ne passe pas par ici (utiliser /me/password/ qui exige l'ancien),
    is_active et role sont exclus."""
    photo = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = ["email", "nom", "prenoms", "profession", "telephone", "telephone2", "photo"]
        extra_kwargs = {
            'telephone': {'required': False, 'allow_blank': True},
            'email': {'required': False},
        }

    def validate_email(self, value):
        return validate_unique_email(value, self.instance)

    def validate_telephone(self, value):
        return validate_unique_phone(value, self.instance)

    def validate_telephone2(self, value):
        return validate_unique_phone(value, self.instance)

    def validate_photo(self, value):
        return validate_photo_file(value)


class VerifyUserSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    action = serializers.ChoiceField(choices=["verify", "reject"])


class AgentCreateClientSerializer(serializers.ModelSerializer):
    """Agent creates a pre-verified client. Password is required and communicated to the client."""
    password = serializers.CharField(write_only=True, required=True, min_length=8)

    class Meta:
        model = User
        fields = [
            "email", "password", "nom", "prenoms", "profession",
            "profession_type", "telephone", "telephone2",
        ]

    def validate_email(self, value):
        return validate_unique_email(value)

    def validate_telephone(self, value):
        return validate_unique_phone(value)

    def validate_telephone2(self, value):
        return validate_unique_phone(value)

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(
            password=password,
            role="client",
            verified=True,
            **validated_data,
        )
        return user


class AdminCreateAgentSerializer(serializers.ModelSerializer):
    """Admin creates an agent account."""
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            "email", "password", "nom", "prenoms", "telephone", "telephone2",
        ]
        extra_kwargs = {
            "telephone": {"required": False, "allow_blank": True, "default": ""},
            "telephone2": {"required": False, "allow_blank": True, "default": ""},
        }

    def validate_email(self, value):
        return validate_unique_email(value)

    def validate_telephone(self, value):
        return validate_unique_phone(value)

    def validate_telephone2(self, value):
        return validate_unique_phone(value)

    def create(self, validated_data):
        user = User.objects.create_user(
            role="agent",
            verified=True,
            profession="Agent ACS",
            profession_type="autre",
            **validated_data,
        )
        return user


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField()
    new_password = serializers.CharField(min_length=8)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Mot de passe actuel incorrect")
        return value

    def validate_new_password(self, value):
        validate_password(value, self.context["request"].user)
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8)

    def validate_new_password(self, value):
        validate_password(value)
        return value


class UserAuditLogSerializer(serializers.ModelSerializer):
    performed_by = serializers.CharField(source="performed_by.full_name", allow_null=True)
    target_user = serializers.CharField(source="target_user.full_name")

    class Meta:
        model = UserAuditLog
        fields = ["id", "action", "metadata", "performed_by", "target_user", "ip_address", "created_at"]

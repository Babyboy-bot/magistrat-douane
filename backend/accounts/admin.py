from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model

from .models import UserAuditLog

User = get_user_model()


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "nom", "prenoms", "role", "profession_type", "verified", "date_joined")
    list_filter = ("role", "profession_type", "verified")
    search_fields = ("email", "nom", "prenoms", "telephone")
    ordering = ("-date_joined",)

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Informations personnelles", {"fields": ("nom", "prenoms", "profession", "profession_type", "telephone", "telephone2", "photo")}),
        ("Rôle & Vérification", {"fields": ("role", "verified", "verified_at", "verified_by")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "nom", "prenoms", "telephone", "profession_type", "role", "password1", "password2"),
        }),
    )


@admin.register(UserAuditLog)
class UserAuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "action", "performed_by", "target_user")
    list_filter = ("action", "created_at")
    search_fields = ("performed_by__email", "target_user__email", "metadata")
    readonly_fields = ("created_at",)

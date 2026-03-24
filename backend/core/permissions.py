"""
Permissions partagées entre toutes les apps.
Importer depuis ici — ne plus définir localement dans chaque views.py.
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAgentOrAdmin(BasePermission):
    """Seuls les agents et admins peuvent modifier ou supprimer."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role in ("agent", "admin")


class IsAdminOnly(BasePermission):
    """Réservé aux administrateurs uniquement."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role == "admin"


class IsOwnerOrAgentOrAdmin(BasePermission):
    """
    Le propriétaire de l'objet (client) ou un agent/admin peut accéder.
    Requiert que l'objet ait un champ `client` ou `user`.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.role in ("agent", "admin"):
            return True
        owner = getattr(obj, "client", None) or getattr(obj, "user", None)
        return owner == request.user


class IsVerifiedClient(BasePermission):
    """Réservé aux clients vérifiés (account_status active ou verified)."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role in ("agent", "admin"):
            return True
        return request.user.account_status in ("active", "verified")

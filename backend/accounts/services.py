"""
Service layer — accounts
Logique métier utilisateurs : vérification, mot de passe, création, désactivation.
Les vues délèguent ici et ne font que gérer HTTP.
"""
import secrets
import string
import logging

from django.utils import timezone

from .models import User
from .audit import log_user_action, log_register, log_verify

logger = logging.getLogger("audit")


# ── Mot de passe ─────────────────────────────────────────────────────────────


def generate_temp_password() -> str:
    """Génère un mot de passe temporaire sécurisé (10 chars + A1!)."""
    return (
        "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(10))
        + "A1!"
    )


def reset_user_password(user: User) -> str:
    """
    Réinitialise le mot de passe d'un utilisateur avec un mot de passe temporaire.
    Retourne le mot de passe temporaire généré.
    """
    temp_pw = generate_temp_password()
    user.set_password(temp_pw)
    user.save(update_fields=["password"])
    log_user_action(user, user, "password_reset", {"method": "reset_view"})
    logger.info(f"RESET_PASSWORD | user={user.email or user.telephone} | temp_pw={temp_pw}")
    return temp_pw


# ── Vérification / Rejet prospect ────────────────────────────────────────────


def verify_prospect(target: User, agent: User) -> None:
    """
    Vérifie un prospect : le passe en client vérifié.
    Lève ValueError si la cible n'est pas un prospect.
    """
    if target.role != "prospect":
        raise ValueError("Seuls les prospects peuvent être vérifiés.")
    target.verified = True
    target.verified_at = timezone.now()
    target.verified_by = agent
    target.role = "client"
    target.save()
    log_verify(agent, target, "approve")
    log_user_action(agent, target, "role_change", {"from": "prospect", "to": "client"})


def reject_prospect(target: User, agent: User) -> None:
    """
    Rejette un prospect : désactive son compte.
    Lève ValueError si la cible n'est pas un prospect.
    """
    if target.role != "prospect":
        raise ValueError("Seuls les prospects peuvent être rejetés.")
    target.is_active = False
    target.save()
    log_verify(agent, target, "reject")
    log_user_action(agent, target, "deactivation", {"reason": "verify_reject"})


# ── Désactivation ────────────────────────────────────────────────────────────


def deactivate_user(target: User, admin: User) -> None:
    """
    Désactive (soft-delete) un compte utilisateur.
    Lève ValueError si la cible est un administrateur.
    """
    if target.role == "admin":
        raise ValueError("Impossible de supprimer un administrateur.")
    target.is_active = False
    target.save(update_fields=["is_active"])
    log_user_action(admin, target, "deactivation", {"reason": "admin_delete"})


def toggle_user_active(target: User, is_active: bool, admin: User) -> None:
    """Active ou désactive un utilisateur et journalise l'action."""
    old = target.is_active
    target.is_active = is_active
    target.save(update_fields=["is_active"])
    action = "activation" if is_active else "deactivation"
    log_user_action(admin, target, action, {"from": old, "to": is_active})


# ── Création ─────────────────────────────────────────────────────────────────


def create_client_by_agent(serializer_data: dict, agent: User) -> User:
    """
    Crée un client pré-vérifié par un agent.
    Retourne l'utilisateur créé.
    """
    from .serializers import AgentCreateClientSerializer
    serializer = AgentCreateClientSerializer(data=serializer_data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    user.verified_by = agent
    user.verified_at = timezone.now()
    user.save(update_fields=["verified_by", "verified_at"])
    log_register(user, "")
    log_user_action(agent, user, "creation", {"role": user.role})
    return user

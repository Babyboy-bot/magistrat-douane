import secrets
import string

from django.utils import timezone

from .audit import log_verify, log_user_action
from .models import User


def reset_user_password(user: User) -> str:
    """
    Génère un mot de passe temporaire sécurisé, le définit sur l'utilisateur et le retourne.
    Format garanti : au moins 1 majuscule, 1 chiffre, 1 caractère spécial.
    """
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    while True:
        pw = "Temp@" + "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(6)) + "A1!"
        if (
            any(c.isupper() for c in pw)
            and any(c.isdigit() for c in pw)
            and any(c in "!@#$%" for c in pw)
            and len(pw) >= 10
        ):
            break
    user.set_password(pw)
    user.save(update_fields=["password"])
    return pw


def verify_prospect(target: User, agent: User) -> None:
    """
    Vérifie un prospect : le passe en client vérifié.
    Accepte role=prospect (nouveau workflow) et role=client !verified (rétrocompat).
    """
    if target.verified:
        raise ValueError("Ce compte est déjà vérifié.")
    if target.role not in ("prospect", "client"):
        raise ValueError("Seuls les prospects peuvent être vérifiés.")
    target.verified = True
    target.verified_at = timezone.now()
    target.verified_by = agent
    target.role = "client"
    target.account_status = "verified"
    target.save()
    log_verify(agent, target, "approve")
    log_user_action(agent, target, "role_change", {"from": "prospect", "to": "client"})
    try:
        from notifications.service import notification_service
        notification_service.send_notification_to_user(
            user_id=target.id,
            title="Compte vérifié ✓",
            message=f"Votre identité a été validée par {agent.full_name}. Vous avez maintenant accès à tous les services ACS.",
            type="success",
            priority="high",
            data={"event": "account_verified"},
        )
    except Exception:
        pass
    from notifications.emails import send_critical_notification_email
    send_critical_notification_email(
        target, "Votre compte est validé",
        f"Votre identité a été validée par {agent.full_name}. Vous pouvez maintenant "
        "vous connecter et souscrire à Magist-Assur depuis votre espace.",
    )


def reject_prospect(target: User, agent: User) -> None:
    """
    Rejette un prospect ou un client non vérifié : désactive son compte.
    Lève ValueError si la cible est déjà vérifiée ou est un agent/admin.
    """
    if target.role not in ("prospect", "client"):
        raise ValueError("Seuls les prospects et clients non vérifiés peuvent être rejetés.")
    if target.verified:
        raise ValueError("Impossible de rejeter un compte déjà vérifié.")
    target.is_active = False
    target.save(update_fields=["is_active"])
    log_verify(agent, target, "reject")
    log_user_action(agent, target, "deactivation", {"reason": "verify_reject"})


def deactivate_user(user: User, admin: User) -> None:
    """
    Désactive un compte utilisateur.
    Lève ValueError si l'utilisateur cible est un admin.
    """
    if user.role == "admin":
        raise ValueError("Impossible de désactiver un compte administrateur.")
    user.is_active = False
    user.save(update_fields=["is_active"])
    log_user_action(admin, user, "deactivation", {"reason": "manual"})

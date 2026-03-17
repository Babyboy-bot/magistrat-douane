"""Simple audit logger for security events."""
import logging

from .models import UserAuditLog

logger = logging.getLogger("audit")


def log_login_success(user, ip):
    logger.info(f"LOGIN_OK | user={user.email} role={user.role} ip={ip}")


def log_login_failed(email, ip):
    logger.warning(f"LOGIN_FAIL | email={email} ip={ip}")


def log_register(user, ip):
    logger.info(f"REGISTER | user={user.email} profession={user.profession_type} ip={ip}")


def log_verify(agent, target, action):
    logger.info(f"VERIFY_{action.upper()} | agent={agent.email} target={target.email}")


def log_password_change(user, ip):
    logger.info(f"PASSWORD_CHANGE | user={user.email} ip={ip}")


def get_client_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


def log_user_action(performed_by, target, action, metadata=None):
    """Persist audit entry for sensitive user actions."""
    UserAuditLog.objects.create(
        performed_by=performed_by if performed_by and performed_by.is_authenticated else None,
        target_user=target,
        action=action,
        metadata=metadata or {},
    )

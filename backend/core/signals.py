"""
core/signals.py — Audit trail avant/après pour les mutations métier.
Modèles surveillés : Emission, Paiement, ClientRequest, ContratEpargne, ContratPrevoyance.
"""
import threading
from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from django.forms.models import model_to_dict
from django.db.models.fields.files import FieldFile

_audit_ctx = threading.local()


def set_audit_user(user, ip=None):
    """Appeler depuis les vues pour enregistrer l'utilisateur courant."""
    _audit_ctx.user = user
    _audit_ctx.ip = ip


def _get_user():
    return getattr(_audit_ctx, "user", None)


def _get_ip():
    return getattr(_audit_ctx, "ip", None)


def _serialize(instance):
    """Sérialise un modèle en dict JSON-safe (pas de types non-sérialisables)."""
    if instance is None:
        return None
    raw = model_to_dict(instance)
    result = {}
    for k, v in raw.items():
        if isinstance(v, FieldFile):
            result[k] = v.name if v.name else None
        elif hasattr(v, "pk"):
            result[k] = v.pk
        elif hasattr(v, "__iter__") and not isinstance(v, (str, bytes)):
            result[k] = [x.pk if hasattr(x, "pk") else x for x in v]
        else:
            result[k] = str(v) if not isinstance(v, (int, float, bool, type(None))) else v
    return result


def _record(instance, action, before=None, after=None):
    from .models import AuditEntry
    user = _get_user()
    AuditEntry.objects.create(
        object_type=instance.__class__.__name__,
        object_id=instance.pk,
        object_repr=str(instance)[:200],
        action=action,
        before=before,
        after=after,
        performed_by=user if user and getattr(user, "is_authenticated", False) else None,
        ip_address=_get_ip(),
    )


AUDITED_MODELS = set()


def register_audit_signals(*models):
    """Enregistre les signaux pour les modèles passés en argument."""
    for model in models:
        if model in AUDITED_MODELS:
            continue
        AUDITED_MODELS.add(model)

        @receiver(pre_save, sender=model, weak=False)
        def on_pre_save(sender, instance, **kwargs):
            if instance.pk:
                try:
                    instance._audit_before = _serialize(
                        sender.objects.get(pk=instance.pk)
                    )
                except sender.DoesNotExist:
                    instance._audit_before = None
            else:
                instance._audit_before = None

        @receiver(post_save, sender=model, weak=False)
        def on_post_save(sender, instance, created, **kwargs):
            after = _serialize(instance)
            before = getattr(instance, "_audit_before", None)
            _record(
                instance,
                action="created" if created else "updated",
                before=None if created else before,
                after=after,
            )

        @receiver(post_delete, sender=model, weak=False)
        def on_post_delete(sender, instance, **kwargs):
            _record(
                instance,
                action="deleted",
                before=_serialize(instance),
                after=None,
            )

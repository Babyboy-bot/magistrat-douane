from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        from .models import Emission, Paiement, ClientRequest
        from .signals import register_audit_signals
        register_audit_signals(Emission, Paiement, ClientRequest)

        try:
            from magistassur.models import ContratEpargne, ContratPrevoyance
            register_audit_signals(ContratEpargne, ContratPrevoyance)
        except Exception:
            pass

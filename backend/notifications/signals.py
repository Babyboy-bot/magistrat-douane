"""
Signal handlers for automatic notifications.
"""
from decimal import Decimal

from django.db.models.signals import post_save, pre_save
from django.dispatch import Signal, receiver
from django.contrib.auth import get_user_model

from core.models import Paiement, ClientRequest
from .service import notification_service

# Custom signal for notifications
notification_sent = Signal()

def send_notification_on_model_save(sender, instance, created, **kwargs):
    """Automatically send notification when certain models are saved."""
    if created:
        # Send notification when new user is created
        if sender == get_user_model():
            notification_service.send_notification_to_role(
                role='admin',
                title='Nouvel utilisateur inscrit',
                message=f'{instance.nom} {instance.prenoms} s\'est inscrit sur la plateforme',
                type='success',
                priority='medium'
            )
        
        # Send notification when new request is created
        elif hasattr(instance, 'status') and hasattr(instance, 'user'):
            if hasattr(instance, 'user') and instance.user:
                notification_service.send_notification_to_user(
                    user_id=instance.user.id,
                    title='Nouvelle requête',
                    message=f'Votre requête a été reçue et sera traitée prochainement',
                    type='info',
                    priority='medium',
                    data={'request_id': instance.id}
                )

def _format_amount(amount: Decimal) -> str:
    return f"{amount:,.0f}".replace(",", " ")


@receiver(post_save, sender=Paiement, dispatch_uid="notifications_payment_created")
def send_payment_notifications(sender, instance: Paiement, created, **kwargs):
    if not created:
        return

    emission = instance.emission
    client = emission.client if emission else None
    agent = emission.agent if emission else None

    montant = instance.montant_regle or Decimal(0)
    solde = emission.solde if emission else Decimal(0)

    data_client = {
        "event": "emission_paiement",
        "emission_id": emission.id if emission else None,
        "paiement_id": instance.id,
        "reference": instance.reference,
    }
    data_agent = {
        "event": "emission_paiement_agent",
        "emission_id": emission.id if emission else None,
        "paiement_id": instance.id,
        "reference": instance.reference,
    }

    if client:
        notification_service.send_notification_to_user(
            user_id=client.id,
            title="Paiement reçu",
            message=(
                f"Nous avons bien reçu votre paiement de {_format_amount(montant)} FCFA "
                f"pour la police {emission.num_police}. Solde restant : {_format_amount(solde)} FCFA."
            ),
            type="success",
            priority="medium",
            data=data_client,
        )

    if agent:
        notification_service.send_notification_to_user(
            user_id=agent.id,
            title="Paiement client enregistré",
            message=(
                f"{client.full_name if client else 'Le client'} a réglé {_format_amount(montant)} FCFA "
                f"pour la police {emission.num_police}. Solde restant : {_format_amount(solde)} FCFA."
            ),
            type="info",
            priority="medium",
            data=data_agent,
        )


@receiver(pre_save, sender=ClientRequest, dispatch_uid="notifications_request_store_previous")
def store_previous_request_status(sender, instance: ClientRequest, **kwargs):
    if not instance.pk:
        instance._old_status = None
        return
    try:
        previous = sender.objects.get(pk=instance.pk)
        instance._old_status = previous.status
    except sender.DoesNotExist:
        instance._old_status = None


@receiver(post_save, sender=ClientRequest, dispatch_uid="notifications_request_status")
def send_request_notifications(sender, instance: ClientRequest, created, **kwargs):
    data = {"event": "new_request", "request_id": instance.id, "numero": instance.numero, "type": instance.type}

    if created:
        notification_service.send_notification_to_role(
            role="admin",
            title="Nouveau prospect",
            message=(
                f"{instance.client.full_name} a créé une demande {instance.get_type_display().lower()}"
                " et attend une prise en charge."
            ),
            type="warning",
            priority="medium",
            data=data,
        )
        return

    previous_status = getattr(instance, "_old_status", None)
    if (
        previous_status != ClientRequest.Status.TRAITE
        and instance.status == ClientRequest.Status.TRAITE
        and instance.client
    ):
        notification_service.send_notification_to_user(
            user_id=instance.client_id,
            title="Votre requête est traitée",
            message=(
                f"Votre demande {instance.numero} ({instance.get_type_display()}) a été traitée."
            ),
            type="success",
            priority="medium",
            data=data,
        )


# Connect signals
post_save.connect(send_notification_on_model_save, dispatch_uid='notifications')

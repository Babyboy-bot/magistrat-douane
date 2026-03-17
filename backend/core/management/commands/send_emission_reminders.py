from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import Emission
from notifications.service import notification_service


class Command(BaseCommand):
    help = "Envoie les notifications pour les émissions dont l'échéance approche ou est dépassée"

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=7,
            help="Nombre de jours avant l'échéance pour alerter",
        )

    def handle(self, *args, **options):
        days_before = options["days"]
        today = timezone.now().date()
        upcoming_limit = today + timedelta(days=days_before)

        emissions = (
            Emission.objects.select_related("client", "agent")
            .filter(echeance__lte=upcoming_limit, echeance__gte=today)
        )

        overdue_emissions = (
            Emission.objects.select_related("client", "agent")
            .filter(echeance__lt=today)
        )

        count = 0
        for emission in emissions:
            data = {"emission_id": emission.id, "num_police": emission.num_police}
            message = (
                f"Votre échéance pour la police {emission.num_police} arrive à échéance le "
                f"{emission.echeance.strftime('%d/%m/%Y')}. Pensez à régulariser."
            )

            if emission.client:
                notification_service.send_notification_to_user(
                    user_id=emission.client_id,
                    title="Échéance à venir",
                    message=message,
                    type="warning",
                    priority="medium",
                    data=data,
                )
                count += 1

            if emission.agent:
                notification_service.send_notification_to_user(
                    user_id=emission.agent_id,
                    title="Échéance client à suivre",
                    message=(
                        f"{emission.client.full_name if emission.client else 'Le client'} a une échéance le "
                        f"{emission.echeance.strftime('%d/%m/%Y')} pour la police {emission.num_police}."
                    ),
                    type="info",
                    priority="low",
                    data=data,
                )
                count += 1

        for emission in overdue_emissions:
            data = {"emission_id": emission.id, "num_police": emission.num_police}
            message = (
                f"Votre échéance pour la police {emission.num_police} est dépassée depuis le "
                f"{emission.echeance.strftime('%d/%m/%Y')}. Veuillez contacter votre agent."
            )

            if emission.client:
                notification_service.send_notification_to_user(
                    user_id=emission.client_id,
                    title="Échéance dépassée",
                    message=message,
                    type="error",
                    priority="high",
                    data=data,
                )
                count += 1

            if emission.agent:
                notification_service.send_notification_to_user(
                    user_id=emission.agent_id,
                    title="Échéance client dépassée",
                    message=(
                        f"{emission.client.full_name if emission.client else 'Le client'} a dépassé l'échéance du "
                        f"{emission.echeance.strftime('%d/%m/%Y')} pour la police {emission.num_police}."
                    ),
                    type="warning",
                    priority="medium",
                    data=data,
                )
                count += 1

        self.stdout.write(self.style.SUCCESS(f"Notifications envoyées : {count}"))

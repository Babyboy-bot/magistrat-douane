from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0009_backfill_soldee_situation"),
    ]

    operations = [
        migrations.AlterField(
            model_name="clientrequest",
            name="status",
            field=models.CharField(
                choices=[
                    ("en_attente", "En attente"),
                    ("en_cours", "En cours"),
                    ("devis_envoye", "Devis envoyé"),
                    ("en_revision", "En révision"),
                    ("valide", "Validé"),
                    ("refuse", "Refusé"),
                    ("traite", "Traité"),
                ],
                default="en_attente",
                max_length=20,
                verbose_name="Statut",
            ),
        ),
    ]

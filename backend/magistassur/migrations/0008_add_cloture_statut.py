from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("magistassur", "0007_num_police_null"),
    ]

    operations = [
        migrations.AlterField(
            model_name="contratepargne",
            name="statut",
            field=models.CharField(
                choices=[
                    ("en_cours", "En cours"),
                    ("rachete", "Racheté"),
                    ("arrive_terme", "Arrivé à terme"),
                    ("suspendu", "Suspendu"),
                    ("cloture", "Clôturé"),
                ],
                default="en_cours",
                max_length=20,
                verbose_name="Statut",
            ),
        ),
        migrations.AlterField(
            model_name="contratprevoyance",
            name="statut",
            field=models.CharField(
                choices=[
                    ("en_cours", "En cours"),
                    ("sinistre", "Sinistre déclaré"),
                    ("expire", "Expiré"),
                    ("resilie", "Résilié"),
                    ("cloture", "Clôturé"),
                ],
                default="en_cours",
                max_length=20,
                verbose_name="Statut",
            ),
        ),
    ]

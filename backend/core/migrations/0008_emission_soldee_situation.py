from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0007_document_confirmed_at"),
    ]

    operations = [
        migrations.AlterField(
            model_name="emission",
            name="situation",
            field=models.CharField(
                choices=[
                    ("Affaire nouvelle", "Affaire nouvelle"),
                    ("Incorporation", "Incorporation"),
                    ("Retrait", "Retrait"),
                    ("Renouvellement", "Renouvellement"),
                    ("Modification", "Modification"),
                    ("Soldée", "Soldée"),
                ],
                default="Affaire nouvelle",
                max_length=30,
                verbose_name="Situation",
            ),
        ),
        migrations.AddIndex(
            model_name="emission",
            index=models.Index(fields=["situation"], name="idx_emission_situation"),
        ),
    ]

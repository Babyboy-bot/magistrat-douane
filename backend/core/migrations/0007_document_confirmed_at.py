from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0006_sinistre_note"),
    ]

    operations = [
        migrations.AddField(
            model_name="document",
            name="confirmed_at",
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name="Confirmé reçu le",
            ),
        ),
    ]

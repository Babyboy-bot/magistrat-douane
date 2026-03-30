from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0005_add_audit_entry"),
    ]

    operations = [
        migrations.AddField(
            model_name="clientrequest",
            name="sinistre_note",
            field=models.TextField(
                blank=True,
                default="",
                verbose_name="Note de clôture (sinistre)",
            ),
        ),
    ]

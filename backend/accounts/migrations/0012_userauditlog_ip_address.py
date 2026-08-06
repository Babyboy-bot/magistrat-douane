from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0011_add_email_isactive_indexes"),
    ]

    operations = [
        migrations.AddField(
            model_name="userauditlog",
            name="ip_address",
            field=models.GenericIPAddressField(blank=True, null=True, verbose_name="Adresse IP"),
        ),
    ]

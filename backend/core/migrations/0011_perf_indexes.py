from django.db import migrations, models


class Migration(migrations.Migration):
    """Indexes de performance : Emission.agent, Emission.date, ClientRequest.agent, ClientRequest.created_at."""

    dependencies = [
        ("core", "0010_add_cotation_statuses"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="emission",
            index=models.Index(fields=["agent"], name="idx_emission_agent"),
        ),
        migrations.AddIndex(
            model_name="emission",
            index=models.Index(fields=["-date"], name="idx_emission_date_desc"),
        ),
        migrations.AddIndex(
            model_name="clientrequest",
            index=models.Index(fields=["agent"], name="idx_request_agent"),
        ),
        migrations.AddIndex(
            model_name="clientrequest",
            index=models.Index(fields=["-created_at"], name="idx_request_created_desc"),
        ),
    ]

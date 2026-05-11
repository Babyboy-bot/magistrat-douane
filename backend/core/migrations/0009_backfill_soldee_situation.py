from django.db import migrations
from django.db.models import Sum, F, Value, DecimalField
from django.db.models.functions import Coalesce


def backfill_soldee(apps, schema_editor):
    Emission = apps.get_model("core", "Emission")
    # Récupère toutes les émissions non déjà marquées Soldée
    for emission in Emission.objects.exclude(situation="Soldée"):
        total_paye = emission.paiements.aggregate(
            t=Coalesce(Sum("montant_regle"), Value(0, output_field=DecimalField()))
        )["t"]
        if total_paye >= emission.prime_ttc:
            emission.situation = "Soldée"
            emission.save(update_fields=["situation"])


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0008_emission_soldee_situation"),
    ]

    operations = [
        migrations.RunPython(backfill_soldee, migrations.RunPython.noop),
    ]

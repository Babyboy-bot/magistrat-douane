from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("magistassur", "0009_add_pris_en_charge_par"),
    ]

    operations = [
        migrations.AddField(
            model_name="contratepargne",
            name="piece_identite",
            field=models.FileField(
                blank=True,
                null=True,
                upload_to="magistassur/pieces_identite/",
                verbose_name="Pièce d'identité",
            ),
        ),
        migrations.AddField(
            model_name="contratepargne",
            name="rib_document",
            field=models.FileField(
                blank=True,
                null=True,
                upload_to="magistassur/ribs/",
                verbose_name="RIB",
            ),
        ),
    ]

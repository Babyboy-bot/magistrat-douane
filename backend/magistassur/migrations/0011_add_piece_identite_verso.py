from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("magistassur", "0010_add_documents_epargne"),
    ]

    operations = [
        migrations.AddField(
            model_name="contratepargne",
            name="piece_identite_verso",
            field=models.FileField(
                blank=True,
                null=True,
                upload_to="magistassur/pieces_identite/",
                verbose_name="Pièce d'identité (verso)",
            ),
        ),
    ]

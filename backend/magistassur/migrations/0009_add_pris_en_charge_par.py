from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("magistassur", "0008_add_cloture_statut"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="contratepargne",
            name="pris_en_charge_par",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="epargnes_en_traitement",
                to=settings.AUTH_USER_MODEL,
                verbose_name="En traitement par",
            ),
        ),
        migrations.AddField(
            model_name="contratprevoyance",
            name="pris_en_charge_par",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="prevoyances_en_traitement",
                to=settings.AUTH_USER_MODEL,
                verbose_name="En traitement par",
            ),
        ),
    ]

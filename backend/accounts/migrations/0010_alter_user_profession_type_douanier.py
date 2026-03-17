from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0009_add_telephone_index'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='profession_type',
            field=models.CharField(
                choices=[('magistrat', 'Magistrat'), ('douanier', 'Douanier'), ('autre', 'Autre')],
                default='autre',
                max_length=20,
                verbose_name='Catégorie professionnelle',
            ),
        ),
    ]

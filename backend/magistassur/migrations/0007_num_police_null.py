from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('magistassur', '0006_alter_contratepargne_num_police_and_more'),
    ]

    operations = [
        # Convertir les chaînes vides en NULL avant d'ajouter la contrainte null=True
        migrations.RunSQL(
            "UPDATE magistassur_contratepargne SET num_police = NULL WHERE num_police = '';",
            reverse_sql="UPDATE magistassur_contratepargne SET num_police = '' WHERE num_police IS NULL;",
        ),
        migrations.RunSQL(
            "UPDATE magistassur_contratprevoyance SET num_police = NULL WHERE num_police = '';",
            reverse_sql="UPDATE magistassur_contratprevoyance SET num_police = '' WHERE num_police IS NULL;",
        ),
        migrations.AlterField(
            model_name='contratepargne',
            name='num_police',
            field=models.CharField(blank=True, default=None, max_length=50, null=True, unique=True, verbose_name='N° Police'),
        ),
        migrations.AlterField(
            model_name='contratprevoyance',
            name='num_police',
            field=models.CharField(blank=True, default=None, max_length=50, null=True, unique=True, verbose_name='N° Police'),
        ),
    ]

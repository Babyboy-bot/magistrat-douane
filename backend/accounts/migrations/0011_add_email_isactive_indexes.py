from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0010_alter_user_profession_type_douanier"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="user",
            index=models.Index(fields=["email"], name="idx_user_email"),
        ),
        migrations.AddIndex(
            model_name="user",
            index=models.Index(fields=["is_active"], name="idx_user_is_active"),
        ),
    ]

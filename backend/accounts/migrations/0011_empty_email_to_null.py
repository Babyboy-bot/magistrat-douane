from django.db import migrations


def empty_email_to_null(apps, schema_editor):
    apps.get_model("accounts", "User").objects.filter(email="").update(email=None)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0010_alter_user_profession_type_douanier"),
    ]

    operations = [
        migrations.RunPython(empty_email_to_null, migrations.RunPython.noop),
    ]

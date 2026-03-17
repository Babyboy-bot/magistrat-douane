from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0007_user_account_status_user_risk_level_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserAuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("action", models.CharField(choices=[
                    ("activation", "Activation"),
                    ("deactivation", "Désactivation"),
                    ("role_change", "Changement de rôle"),
                    ("status_change", "Changement de statut"),
                    ("password_reset", "Réinitialisation mot de passe"),
                ], max_length=50)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("performed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="audit_actions", to="accounts.user")),
                ("target_user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="audit_logs", to="accounts.user")),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]

from django.contrib.auth.tokens import PasswordResetTokenGenerator


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    """Jeton de vérification d'email, distinct du reset de mot de passe (sel propre).

    Le hash inclut l'adresse et l'état de vérification : un lien émis pour une
    ancienne adresse devient invalide dès que l'email change, et un lien déjà
    utilisé ne peut plus resservir.
    """
    key_salt = "accounts.tokens.EmailVerificationTokenGenerator"

    def _make_hash_value(self, user, timestamp):
        return f"{super()._make_hash_value(user, timestamp)}{user.email or ''}{user.email_verified}"


email_verification_token = EmailVerificationTokenGenerator()

"""
Emails transactionnels de la plateforme ACS.
Tous les envois passent par _send() qui gère les erreurs sans bloquer l'application.
"""
import logging
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()


def _acs_contact():
    return getattr(settings, 'ACS_CONTACT_PHONE', '+225 00 00 00 00')


def _from_email():
    return getattr(settings, 'DEFAULT_FROM_EMAIL', 'ACS <noreply@acs.ci>')


def _send(subject, body_txt, body_html, to_email):
    """Envoi générique avec gestion d'erreur silencieuse (ne bloque pas la requête)."""
    if not to_email or not to_email.strip():
        return
    try:
        msg = EmailMultiAlternatives(subject, body_txt, _from_email(), [to_email])
        msg.attach_alternative(body_html, "text/html")
        msg.send()
        logger.info("Email envoyé → %s : %s", to_email, subject)
    except Exception as exc:
        logger.error("Échec envoi email → %s : %s", to_email, exc)


# ── 1. Bienvenue (après inscription) ──────────────────────────────────────────

def send_welcome_email(user):
    """Envoyé au prospect/client juste après la création de son compte."""
    if not user.email:
        return
    subject = "Bienvenue sur la plateforme ACS"
    nom_complet = f"{user.nom} {user.prenoms}"
    body_txt = (
        f"Bonjour M./Mme {nom_complet},\n\n"
        "Bienvenue sur la plateforme ACS — Assurances Conseils & Services.\n\n"
        "Votre compte a bien été créé. Vous pouvez dès à présent vous connecter "
        "à votre espace personnel pour gérer vos contrats et effectuer vos demandes en ligne.\n\n"
        f"Pour toute question, contactez-nous au : {_acs_contact()}\n\n"
        "Cordialement,\nL'équipe ACS"
    )
    body_html = f"""
<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:auto">
  <div style="background:#1e3a5f;padding:20px;border-radius:8px 8px 0 0">
    <h2 style="color:#f59e0b;margin:0">ACS — Assurances Conseils &amp; Services</h2>
  </div>
  <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
    <p>Bonjour M./Mme <strong>{nom_complet}</strong>,</p>
    <p>Bienvenue sur la plateforme <strong>ACS — Assurances Conseils &amp; Services</strong>.</p>
    <p>Votre compte a bien été créé. Vous pouvez dès à présent vous connecter à votre espace
       personnel pour gérer vos contrats et effectuer vos demandes en ligne.</p>
    <p>Pour toute question : <strong>{_acs_contact()}</strong></p>
    <br>
    <p>Cordialement,<br><strong>L'équipe ACS</strong></p>
  </div>
</body></html>"""
    _send(subject, body_txt, body_html, user.email)


# ── 2. Accusé de réception (après soumission d'une requête) ───────────────────

def send_request_acknowledgment(client_request):
    """Accusé de réception envoyé au client après soumission d'une requête."""
    client = client_request.client
    if not client.email:
        return
    type_display = client_request.get_type_display()
    numero = client_request.numero
    nom_complet = f"{client.nom} {client.prenoms}"

    subject = f"Accusé de réception — {numero}"
    body_txt = (
        f"Bonjour M./Mme {nom_complet},\n\n"
        f"Nous vous remercions d'avoir contacté ACS et d'avoir soumis une demande de {type_display}.\n\n"
        f"Nous confirmons que votre demande a bien été reçue sous le numéro {numero} "
        "et est en cours de traitement par notre équipe.\n\n"
        f"Pour toute question ou précision, contactez-nous au : {_acs_contact()}\n\n"
        "Cordialement,\nL'équipe ACS"
    )
    body_html = f"""
<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:auto">
  <div style="background:#1e3a5f;padding:20px;border-radius:8px 8px 0 0">
    <h2 style="color:#f59e0b;margin:0">ACS — Assurances Conseils &amp; Services</h2>
  </div>
  <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
    <p>Bonjour M./Mme <strong>{nom_complet}</strong>,</p>
    <p>Nous vous remercions d'avoir contacté ACS et d'avoir soumis une demande de
       <strong>{type_display}</strong>.</p>
    <p>Nous confirmons que votre demande a bien été reçue sous le numéro
       <strong style="color:#1e3a5f">{numero}</strong>
       et est en cours de traitement par notre équipe.</p>
    <p>Pour toute question : <strong>{_acs_contact()}</strong></p>
    <br>
    <p>Cordialement,<br><strong>L'équipe ACS</strong></p>
  </div>
</body></html>"""
    _send(subject, body_txt, body_html, client.email)


# ── 3. Requête traitée (quand l'agent marque comme terminé) ───────────────────

def send_request_treated(client_request):
    """Email de confirmation envoyé au client quand sa requête est traitée."""
    client = client_request.client
    if not client.email:
        return
    numero = client_request.numero
    nom_complet = f"{client.nom} {client.prenoms}"

    subject = f"Votre requête {numero} a été traitée"
    body_txt = (
        f"Bonjour M./Mme {nom_complet},\n\n"
        f"Nous avons le plaisir de vous informer que votre requête {numero} a été traitée.\n\n"
        "Vous voudrez bien vous connecter à votre espace personnel pour télécharger "
        "les documents afférents.\n\n"
        f"Pour toute question : {_acs_contact()}\n\n"
        "Cordialement,\nL'équipe ACS"
    )
    body_html = f"""
<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:auto">
  <div style="background:#1e3a5f;padding:20px;border-radius:8px 8px 0 0">
    <h2 style="color:#f59e0b;margin:0">ACS — Assurances Conseils &amp; Services</h2>
  </div>
  <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
    <p>Bonjour M./Mme <strong>{nom_complet}</strong>,</p>
    <p>Nous avons le plaisir de vous informer que votre requête
       <strong style="color:#1e3a5f">{numero}</strong> a été traitée.</p>
    <p>Veuillez vous connecter à votre <strong>espace personnel</strong> pour
       télécharger les documents afférents.</p>
    <p>Pour toute question : <strong>{_acs_contact()}</strong></p>
    <br>
    <p>Cordialement,<br><strong>L'équipe ACS</strong></p>
  </div>
</body></html>"""
    _send(subject, body_txt, body_html, client.email)


# ── 4. Alerte agents (nouvelle requête soumise par un client) ─────────────────

def send_new_request_alert_to_agents(client_request):
    """Alerte envoyée à tous les agents actifs lors d'une nouvelle requête."""
    client = client_request.client
    type_display = client_request.get_type_display()
    numero = client_request.numero
    nom_client = f"{client.nom} {client.prenoms}"

    subject = f"Nouvelle demande — {type_display} — {numero}"
    body_txt = (
        f"Une nouvelle demande a été soumise par {nom_client}.\n\n"
        f"Type    : {type_display}\n"
        f"Numéro  : {numero}\n"
        f"Tél.    : {client.telephone or 'N/A'}\n"
        f"Email   : {client.email or 'N/A'}\n\n"
        "Veuillez traiter cette demande depuis votre espace agent.\n\n"
        "Cordialement,\nSystème ACS"
    )
    body_html = f"""
<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:auto">
  <div style="background:#1e3a5f;padding:20px;border-radius:8px 8px 0 0">
    <h2 style="color:#f59e0b;margin:0">ACS — Nouvelle demande client</h2>
  </div>
  <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
    <p>Une nouvelle demande a été soumise via la plateforme.</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0">
      <tr style="background:#f9fafb">
        <td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold">Client</td>
        <td style="padding:10px;border:1px solid #e5e7eb">{nom_client}</td>
      </tr>
      <tr>
        <td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold">Type</td>
        <td style="padding:10px;border:1px solid #e5e7eb">{type_display}</td>
      </tr>
      <tr style="background:#f9fafb">
        <td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold">Numéro</td>
        <td style="padding:10px;border:1px solid #e5e7eb"><strong style="color:#1e3a5f">{numero}</strong></td>
      </tr>
      <tr>
        <td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold">Téléphone</td>
        <td style="padding:10px;border:1px solid #e5e7eb">{client.telephone or 'N/A'}</td>
      </tr>
      <tr style="background:#f9fafb">
        <td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold">Email</td>
        <td style="padding:10px;border:1px solid #e5e7eb">{client.email or 'N/A'}</td>
      </tr>
    </table>
    <p>Veuillez traiter cette demande depuis votre <strong>espace agent</strong>.</p>
    <br>
    <p>Cordialement,<br><strong>Système ACS</strong></p>
  </div>
</body></html>"""

    agents = User.objects.filter(
        role="agent", is_active=True
    ).exclude(email="").exclude(email__isnull=True)
    for agent in agents:
        _send(subject, body_txt, body_html, agent.email)


# ── 5. Livrable disponible (agent → client) ───────────────────────────────────

def send_livrable_notification(request_obj, document_obj):
    """Notifie le client qu'un document a été déposé sur sa requête."""
    client = request_obj.client
    if not client.email:
        return

    nom_client = f"{client.nom} {client.prenoms}"
    numero = request_obj.numero
    type_display = request_obj.get_type_display()
    doc_nom = document_obj.nom

    subject = f"[ACS] Document disponible — {numero}"
    body_txt = (
        f"Bonjour M./Mme {nom_client},\n\n"
        f"Un nouveau document a été déposé sur votre requête {numero} ({type_display}) :\n\n"
        f"  📄 {doc_nom}\n\n"
        "Connectez-vous à votre espace client pour le télécharger dans la section « Mes Documents ».\n\n"
        f"Pour toute question : {_acs_contact()}\n\n"
        "Cordialement,\nL'équipe ACS"
    )
    body_html = f"""
<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:auto">
  <div style="background:#1e3a5f;padding:20px;border-radius:8px 8px 0 0">
    <h2 style="color:#f59e0b;margin:0">ACS — Document disponible</h2>
  </div>
  <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
    <p>Bonjour M./Mme <strong>{nom_client}</strong>,</p>
    <p>Un nouveau document a été déposé sur votre requête
       <strong style="color:#1e3a5f">{numero}</strong> ({type_display}) :</p>
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
      <span style="font-size:24px">📄</span>
      <p style="font-weight:bold;color:#166534;margin:8px 0 0">{doc_nom}</p>
    </div>
    <p>Connectez-vous à votre <strong>espace client</strong> pour le télécharger
       dans la section <em>Mes Documents</em>.</p>
    <p style="color:#6b7280;font-size:13px">Besoin d'aide ? {_acs_contact()}</p>
    <br>
    <p>Cordialement,<br><strong>L'équipe ACS</strong></p>
  </div>
</body></html>"""

    _send(subject, body_txt, body_html, client.email)


# ── Reset mot de passe ────────────────────────────────────────────────────────

def send_password_reset_email(user, temp_pw: str):
    """Envoyé à l'utilisateur avec son mot de passe temporaire."""
    if not user.email:
        return
    subject = "ACS — Réinitialisation de votre mot de passe"
    nom_complet = f"{user.nom} {user.prenoms}"
    body_txt = (
        f"Bonjour M./Mme {nom_complet},\n\n"
        "Une réinitialisation de votre mot de passe a été demandée.\n\n"
        f"Votre mot de passe temporaire : {temp_pw}\n\n"
        "Veuillez vous connecter et modifier ce mot de passe immédiatement.\n\n"
        f"Pour toute question, contactez-nous au : {_acs_contact()}\n\n"
        "Cordialement,\nL'équipe ACS"
    )
    body_html = f"""
<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:auto">
  <div style="background:#1e3a5f;padding:20px;border-radius:8px 8px 0 0">
    <h2 style="color:#f59e0b;margin:0">ACS — Réinitialisation de mot de passe</h2>
  </div>
  <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
    <p>Bonjour M./Mme <strong>{nom_complet}</strong>,</p>
    <p>Une réinitialisation de votre mot de passe a été demandée.</p>
    <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
      <p style="margin:0;font-size:13px;color:#92400e">Mot de passe temporaire</p>
      <p style="font-size:20px;font-weight:bold;color:#1e3a5f;letter-spacing:2px;margin:8px 0 0">{temp_pw}</p>
    </div>
    <p>Connectez-vous et <strong>changez ce mot de passe immédiatement</strong>
       depuis votre espace personnel.</p>
    <p style="color:#6b7280;font-size:13px">Besoin d'aide ? {_acs_contact()}</p>
    <br>
    <p>Cordialement,<br><strong>L'équipe ACS</strong></p>
  </div>
</body></html>"""

    _send(subject, body_txt, body_html, user.email)

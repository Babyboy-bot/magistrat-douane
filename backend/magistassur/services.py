"""
Service layer — magistassur
Toute la logique métier contrats (Épargne / Prévoyance) est ici.
Les vues délèguent à ces fonctions ; elles ne font que parser la requête HTTP et retourner la réponse.
"""
from datetime import date as date_type

from django.utils import timezone

from .models import ContratEpargne, ContratPrevoyance, CotisationEpargne


# ── Helpers internes ────────────────────────────────────────────────────────


def _notifier_changement_statut(client_id, num_police: str, type_contrat: str, statut_display: str) -> None:
    """Envoie une notification WS au client après changement de statut."""
    try:
        from notifications.service import notification_service
        notification_service.send_notification_to_user(
            user_id=client_id,
            title="Statut de votre contrat mis à jour",
            message=(
                f"Votre contrat {type_contrat} MAGIST\u2019ASSUR "
                f"({num_police or 'en attente de police'}) "
                f"est maintenant\u00a0: {statut_display}."
            ),
            type="info",
            priority="medium",
            data={"type": type_contrat.lower(), "statut": statut_display},
        )
    except Exception:
        pass


# ── Requêtes client ─────────────────────────────────────────────────────────


def traiter_requete_magist(client_id, agent) -> None:
    """
    Marque comme traitée la dernière requête souscription_magist en attente du client.
    Appelé après activation d'un contrat.
    """
    try:
        from core.models import ClientRequest
        req = (
            ClientRequest.objects
            .filter(client_id=client_id, type="souscription_magist")
            .exclude(status=ClientRequest.Status.TRAITE)
            .order_by("-created_at")
            .first()
        )
        if req:
            req.status = ClientRequest.Status.TRAITE
            req.agent = agent
            req.treated_at = timezone.now()
            req.save(update_fields=["status", "agent", "treated_at"])
    except Exception:
        pass


# ── Épargne ─────────────────────────────────────────────────────────────────


def assigner_police_epargne(contrat: ContratEpargne, num_police: str, code_inspection: str, agent) -> None:
    """Assigne un numéro de police et active le contrat Épargne."""
    contrat.num_police = num_police
    contrat.code_inspection = code_inspection
    contrat.statut = ContratEpargne.Statut.EN_COURS
    contrat.agent = agent
    contrat.save(update_fields=["num_police", "code_inspection", "statut", "agent"])
    traiter_requete_magist(contrat.client_id, agent)


def changer_statut_epargne(contrat: ContratEpargne, nouveau_statut: str) -> None:
    """
    Change le statut d'un contrat Épargne.
    Lève ValueError si la transition est invalide.
    """
    statuts_valides = [s.value for s in ContratEpargne.Statut]
    if nouveau_statut not in statuts_valides:
        raise ValueError(f"Statut invalide. Valeurs acceptées\u00a0: {statuts_valides}")
    if nouveau_statut == ContratEpargne.Statut.EN_COURS and not contrat.num_police:
        raise ValueError(
            "Impossible de passer en 'En cours' sans numéro de police. "
            "Utilisez 'Assigner N° police'."
        )
    contrat.statut = nouveau_statut
    contrat.save(update_fields=["statut"])
    _notifier_changement_statut(
        contrat.client_id,
        contrat.num_police,
        "Épargne",
        contrat.get_statut_display(),
    )


def ajouter_cotisation_epargne(contrat: ContratEpargne, data: dict) -> CotisationEpargne:
    """
    Enregistre une cotisation sur un contrat Épargne actif.
    Lève ValueError si le contrat n'est pas éligible.
    """
    from .serializers import CotisationEpargneSerializer
    if contrat.statut != ContratEpargne.Statut.EN_COURS:
        raise ValueError(f"Cotisation impossible : le contrat est '{contrat.get_statut_display()}'.")
    if not contrat.num_police:
        raise ValueError("Cotisation impossible : le contrat n'a pas encore de numéro de police.")
    serializer = CotisationEpargneSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    cotisation = serializer.save(contrat=contrat)
    contrat.capital_constitue += cotisation.montant
    contrat.save(update_fields=["capital_constitue"])
    return cotisation


# ── Prévoyance ───────────────────────────────────────────────────────────────


def assigner_police_prevoyance(
    contrat: ContratPrevoyance,
    num_police: str,
    code_inspection: str,
    agent,
    date_effet_raw: str = "",
) -> None:
    """Assigne un numéro de police et active le contrat Prévoyance."""
    contrat.num_police = num_police
    contrat.code_inspection = code_inspection
    contrat.statut = ContratPrevoyance.Statut.EN_COURS
    contrat.agent = agent
    if date_effet_raw:
        try:
            d = date_type.fromisoformat(date_effet_raw)
            contrat.date_effet = d
            contrat.date_echeance = d.replace(year=d.year + 1)
        except ValueError:
            pass
    contrat.save(update_fields=["num_police", "code_inspection", "statut", "agent", "date_effet", "date_echeance"])
    traiter_requete_magist(contrat.client_id, agent)


def changer_statut_prevoyance(contrat: ContratPrevoyance, nouveau_statut: str) -> None:
    """
    Change le statut d'un contrat Prévoyance.
    Lève ValueError si la transition est invalide.
    """
    statuts_valides = [s.value for s in ContratPrevoyance.Statut]
    if nouveau_statut not in statuts_valides:
        raise ValueError(f"Statut invalide. Valeurs acceptées\u00a0: {statuts_valides}")
    if nouveau_statut == ContratPrevoyance.Statut.EN_COURS and not contrat.num_police:
        raise ValueError(
            "Impossible de passer en 'En cours' sans numéro de police. "
            "Utilisez 'Assigner N° police'."
        )
    contrat.statut = nouveau_statut
    contrat.save(update_fields=["statut"])
    _notifier_changement_statut(
        contrat.client_id,
        contrat.num_police,
        "Prévoyance",
        contrat.get_statut_display(),
    )

from datetime import date as date_type
from django.db import transaction
from django.utils import timezone

from .models import ContratEpargne, ContratPrevoyance, CotisationEpargne


# ── Requêtes client ──────────────────────────────────────────────────────────


def traiter_requete_magist(client_id, agent) -> None:
    """
    Marque comme traitée la dernière requête souscription_magist en attente du client.
    Appelé après activation d'un contrat.
    """
    try:
        from core.models import ClientRequest
        req = (
            ClientRequest.objects
            .filter(client_id=client_id, type="souscription_magist", status="en_attente")
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


# ── Épargne ──────────────────────────────────────────────────────────────────


@transaction.atomic
def create_contrat_epargne(validated_data: dict, agent) -> ContratEpargne:
    """
    Crée un contrat épargne avec validation métier.
    Lève ValueError si les données sont incohérentes.
    """
    montant = validated_data.get("montant_cotisation")
    if montant is not None and montant <= 0:
        raise ValueError("Le montant de cotisation doit être strictement positif.")

    contrat = ContratEpargne.objects.create(**validated_data, agent=agent)
    return contrat


def assigner_police_epargne(contrat: ContratEpargne, num_police: str, code_inspection: str, agent) -> None:
    """Assigne un numéro de police et active le contrat Épargne."""
    contrat.num_police = num_police
    contrat.code_inspection = code_inspection
    contrat.statut = ContratEpargne.Statut.EN_COURS
    contrat.agent = agent
    contrat.save(update_fields=["num_police", "code_inspection", "statut", "agent"])
    traiter_requete_magist(contrat.client_id, agent)


def changer_statut_epargne(contrat: ContratEpargne, nouveau_statut: str) -> None:
    """Change le statut d'un contrat épargne avec validation métier."""
    statuts_valides = [s.value for s in ContratEpargne.Statut]
    if nouveau_statut not in statuts_valides:
        raise ValueError(f"Statut invalide : {nouveau_statut}. Valeurs acceptées : {statuts_valides}")
    if nouveau_statut == ContratEpargne.Statut.EN_COURS and not contrat.num_police:
        raise ValueError("Impossible de passer en cours sans numéro de police.")
    contrat.statut = nouveau_statut
    contrat.save(update_fields=["statut"])


def ajouter_cotisation_epargne(contrat: ContratEpargne, data: dict) -> CotisationEpargne:
    """Ajoute une cotisation à un contrat épargne actif."""
    if contrat.statut != ContratEpargne.Statut.EN_COURS:
        raise ValueError("Cotisation impossible : le contrat n'est pas en cours.")
    if not contrat.num_police:
        raise ValueError("Cotisation impossible : numéro de police manquant.")
    montant = data.get("montant", 0)
    date_echeance = data.get("date_echeance")
    cotisation = CotisationEpargne.objects.create(
        contrat=contrat,
        montant=montant,
        date_echeance=date_echeance,
        statut=CotisationEpargne.Statut.PAYEE,
    )
    contrat.capital_constitue = (contrat.capital_constitue or 0) + montant
    contrat.save(update_fields=["capital_constitue"])
    return cotisation


# ── Prévoyance ───────────────────────────────────────────────────────────────


@transaction.atomic
def create_contrat_prevoyance(validated_data: dict, agent) -> ContratPrevoyance:
    """
    Crée un contrat prévoyance avec validation métier.
    Atomique : rollback complet en cas d'erreur.
    """
    contrat = ContratPrevoyance.objects.create(**validated_data, agent=agent)
    return contrat


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
    """Change le statut d'un contrat prévoyance avec validation métier."""
    statuts_valides = [s.value for s in ContratPrevoyance.Statut]
    if nouveau_statut not in statuts_valides:
        raise ValueError(f"Statut invalide : {nouveau_statut}. Valeurs acceptées : {statuts_valides}")
    if nouveau_statut == ContratPrevoyance.Statut.EN_COURS and not contrat.num_police:
        raise ValueError("Impossible de passer en cours sans numéro de police.")
    contrat.statut = nouveau_statut
    contrat.save(update_fields=["statut"])

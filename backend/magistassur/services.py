from datetime import date as date_type
from django.db import transaction
from django.utils import timezone

from .models import ContratEpargne, ContratPrevoyance, CotisationEpargne


# ── Requêtes client ──────────────────────────────────────────────────────────


def _derniere_requete_magist(client_id, statuses):
    from core.models import ClientRequest
    return (
        ClientRequest.objects
        .filter(client_id=client_id, type="souscription_magist", status__in=statuses)
        .order_by("-created_at")
        .first()
    )


def creer_requete_contrat(contrat, produit: str, extra_details: dict | None = None):
    """
    Crée la ligne d'historique « Souscription Magist-Assur » propre au contrat
    (une requête par contrat) et la lie au contrat.
    """
    from core.models import ClientRequest
    req = ClientRequest.objects.create(
        client=contrat.client,
        type="souscription_magist",
        details={"produit": produit, **(extra_details or {})},
    )
    contrat.requete = req
    contrat.save(update_fields=["requete"])
    return req


def _requete_du_contrat(contrat, statuses):
    """Requête liée au contrat ; repli sur la dernière requête ouverte (données legacy)."""
    req = getattr(contrat, "requete", None)
    if req:
        return req if req.status in statuses else None
    return _derniere_requete_magist(contrat.client_id, statuses)


def marquer_requete_en_cours(contrat, agent):
    """
    Passe la requête liée au contrat à « en cours » et l'assigne à l'agent —
    appelé à la prise en charge d'un contrat.
    """
    try:
        req = _requete_du_contrat(contrat, ["en_attente", "en_cours"])
        if req:
            req.status = "en_cours"
            req.agent = agent
            req.save(update_fields=["status", "agent"])
        return req
    except Exception as e:
        import logging
        logging.getLogger("magistassur").warning(
            "marquer_requete_en_cours failed for contrat_id=%s: %s", contrat.id, e
        )
        return None


def traiter_requete_magist(contrat, agent) -> None:
    """
    Marque comme traitée la requête liée au contrat.
    Appelé après activation d'un contrat (attribution du N° de police).
    """
    try:
        from core.models import ClientRequest
        req = _requete_du_contrat(contrat, ["en_attente", "en_cours"])
        if req:
            req.status = ClientRequest.Status.TRAITE
            req.agent = agent
            req.treated_at = timezone.now()
            req.save(update_fields=["status", "agent", "treated_at"])
    except Exception as e:
        import logging
        logging.getLogger("magistassur").warning(
            "traiter_requete_magist failed for contrat_id=%s: %s", contrat.id, e
        )


def est_responsable(user, contrat) -> bool:
    """Seuls l'admin et l'agent qui a le dossier en charge peuvent agir dessus
    (police, statut, cotisations, exports, données médicales)."""
    return user.role == "admin" or contrat.pris_en_charge_par_id == user.id


def marquer_envoye_nsia(contrat, agent) -> None:
    """Marque le dossier comme transmis à NSIA (en attente du N° de police)."""
    if contrat.num_police:
        raise ValueError("Ce contrat a déjà un numéro de police.")
    if not est_responsable(agent, contrat):
        raise PermissionError("Prenez le dossier en charge avant de l'envoyer à NSIA.")
    contrat.envoye_nsia_at = timezone.now()
    contrat.save(update_fields=["envoye_nsia_at"])


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
    traiter_requete_magist(contrat, agent)


def changer_statut_epargne(contrat: ContratEpargne, nouveau_statut: str) -> None:
    """Change le statut d'un contrat épargne avec validation métier."""
    if contrat.statut == ContratEpargne.Statut.CLOTURE:
        raise ValueError("Ce contrat est clôturé définitivement. Son statut ne peut plus être modifié.")
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
    try:
        from decimal import Decimal as _Decimal, InvalidOperation
        montant = _Decimal(str(data.get("montant") or 0))
    except (TypeError, ValueError, InvalidOperation):
        raise ValueError("Le montant doit être un nombre valide.")
    if montant <= 0:
        raise ValueError("Le montant de cotisation doit être strictement positif.")
    date_echeance = data.get("date_echeance")
    if not date_echeance:
        raise ValueError("La date d'échéance est obligatoire.")
    date_paiement = data.get("date_paiement") or timezone.localdate()
    cotisation = CotisationEpargne.objects.create(
        contrat=contrat,
        montant=montant,
        date_echeance=date_echeance,
        date_paiement=date_paiement,
        reference=(data.get("reference") or "").strip(),
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
            try:
                contrat.date_echeance = d.replace(year=d.year + 1)
            except ValueError:
                contrat.date_echeance = d.replace(year=d.year + 1, day=28)
        except ValueError:
            pass
    contrat.save(update_fields=["num_police", "code_inspection", "statut", "agent", "date_effet", "date_echeance"])
    traiter_requete_magist(contrat, agent)


def changer_statut_prevoyance(contrat: ContratPrevoyance, nouveau_statut: str) -> None:
    """Change le statut d'un contrat prévoyance avec validation métier."""
    if contrat.statut == ContratPrevoyance.Statut.CLOTURE:
        raise ValueError("Ce contrat est clôturé définitivement. Son statut ne peut plus être modifié.")
    statuts_valides = [s.value for s in ContratPrevoyance.Statut]
    if nouveau_statut not in statuts_valides:
        raise ValueError(f"Statut invalide : {nouveau_statut}. Valeurs acceptées : {statuts_valides}")
    if nouveau_statut == ContratPrevoyance.Statut.EN_COURS and not contrat.num_police:
        raise ValueError("Impossible de passer en cours sans numéro de police.")
    contrat.statut = nouveau_statut
    contrat.save(update_fields=["statut"])

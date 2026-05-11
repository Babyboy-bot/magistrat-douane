"""
core/views/ — Package de vues.
Chaque module correspond à un domaine métier.
"""
from .emissions import (
    EmissionListCreateView,
    EmissionDetailView,
    PaiementCreateView,
    emission_totals_view,
    emission_balance_view,
    export_emissions,
    EmissionImportView,
)
from .requests import (
    ClientRequestListCreateView,
    ClientRequestDetailView,
    treat_request_view,
    claim_request_view,
    release_request_view,
    envoyer_devis_view,
    valider_cotation_view,
    revision_cotation_view,
    refuser_cotation_view,
    envoyer_attestations_view,
)
from .documents import (
    RequestLivrablesView,
    DocumentUploadView,
    CarteGriseUploadView,
    ConfirmLivrableView,
)
from .dashboard import (
    CompagnieListView,
    dashboard_stats_view,
)
from .audit import AuditEntryListView

__all__ = [
    "EmissionListCreateView", "EmissionDetailView", "PaiementCreateView",
    "emission_totals_view", "emission_balance_view", "export_emissions", "EmissionImportView",
    "ClientRequestListCreateView", "ClientRequestDetailView",
    "treat_request_view", "claim_request_view", "release_request_view",
    "RequestLivrablesView", "DocumentUploadView", "CarteGriseUploadView", "ConfirmLivrableView",
    "CompagnieListView", "dashboard_stats_view",
    "AuditEntryListView",
]

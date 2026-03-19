from django.urls import path
from . import views

urlpatterns = [
    path("emissions/", views.EmissionListCreateView.as_view(), name="emission_list"),
    path("emissions/<int:pk>/", views.EmissionDetailView.as_view(), name="emission_detail"),
    path("emissions/<int:pk>/balance/", views.emission_balance_view, name="emission_balance"),
    path("paiements/", views.PaiementCreateView.as_view(), name="paiement_create"),
    path("requests/", views.ClientRequestListCreateView.as_view(), name="request_list"),
    path("requests/<int:pk>/", views.ClientRequestDetailView.as_view(), name="request_detail"),
    path("requests/<int:pk>/treat/", views.treat_request_view, name="request_treat"),
    path("requests/<int:pk>/claim/", views.claim_request_view, name="request_claim"),
    path("requests/<int:pk>/release/", views.release_request_view, name="request_release"),
    path("requests/<int:pk>/livrables/", views.RequestLivrablesView.as_view(), name="request_livrables"),
    path("documents/", views.DocumentUploadView.as_view(), name="document_upload"),
    path("carte-grise/", views.CarteGriseUploadView.as_view(), name="carte_grise_upload"),
    path("dashboard/stats/", views.dashboard_stats_view, name="dashboard_stats"),
    path("emissions/totals/", views.emission_totals_view, name="emission_totals"),
    path("emissions/import/", views.EmissionImportView.as_view(), name="emission_import"),
    path("emissions/export/", views.export_emissions, name="export_emissions"),
    path("compagnies/", views.CompagnieListView.as_view(), name="compagnies"),
]

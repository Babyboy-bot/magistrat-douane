from django.contrib import admin
from .models import (
    ContratEpargne, Correspondant, BeneficiaireEpargne, CotisationEpargne,
    ContratPrevoyance, AssureAssocie, BeneficiairePrevoyance, QuestionnaireMedical,
)


class CorrespondantInline(admin.TabularInline):
    model = Correspondant
    extra = 1


class BeneficiaireEpargneInline(admin.TabularInline):
    model = BeneficiaireEpargne
    extra = 1


class CotisationEpargneInline(admin.TabularInline):
    model = CotisationEpargne
    extra = 0
    readonly_fields = ["created_at"]


@admin.register(ContratEpargne)
class ContratEpargneAdmin(admin.ModelAdmin):
    list_display = ["num_police", "client", "montant_cotisation", "periodicite", "duree_annees", "statut", "created_at"]
    list_filter = ["statut", "periodicite"]
    search_fields = ["num_police", "client__nom", "client__prenoms"]
    inlines = [CorrespondantInline, BeneficiaireEpargneInline, CotisationEpargneInline]
    readonly_fields = ["capital_constitue", "created_at", "updated_at"]


class AssureAssocieInline(admin.TabularInline):
    model = AssureAssocie
    extra = 1


class BeneficiairePrevoyanceInline(admin.TabularInline):
    model = BeneficiairePrevoyance
    extra = 1


class QuestionnaireMedicalInline(admin.StackedInline):
    model = QuestionnaireMedical
    extra = 0


@admin.register(ContratPrevoyance)
class ContratPrevoyanceAdmin(admin.ModelAdmin):
    list_display = ["num_police", "client", "garantie_prevoyance_deces", "garantie_frais_funeraires", "statut", "created_at"]
    list_filter = ["statut", "garantie_prevoyance_deces", "garantie_frais_funeraires"]
    search_fields = ["num_police", "client__nom", "client__prenoms"]
    inlines = [AssureAssocieInline, BeneficiairePrevoyanceInline, QuestionnaireMedicalInline]
    readonly_fields = ["created_at", "updated_at"]

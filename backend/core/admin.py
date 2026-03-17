from django.contrib import admin
from .models import Emission, Paiement, ClientRequest, Document


class PaiementInline(admin.TabularInline):
    model = Paiement
    extra = 0


class DocumentInline(admin.TabularInline):
    model = Document
    extra = 0


@admin.register(Emission)
class EmissionAdmin(admin.ModelAdmin):
    list_display = ("num_police", "client", "risque", "compagnie", "prime_ttc", "echeance", "situation")
    list_filter = ("risque", "compagnie", "situation")
    search_fields = ("num_police", "num_facture", "client__nom", "client__prenoms")
    inlines = [PaiementInline]


@admin.register(Paiement)
class PaiementAdmin(admin.ModelAdmin):
    list_display = ("reference", "emission", "montant_regle", "date_reglement")
    search_fields = ("reference",)


@admin.register(ClientRequest)
class ClientRequestAdmin(admin.ModelAdmin):
    list_display = ("numero", "client", "type", "status", "agent", "created_at")
    list_filter = ("type", "status")
    search_fields = ("numero", "client__nom")
    inlines = [DocumentInline]


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("nom", "request", "is_livrable", "uploaded_by", "created_at")
    list_filter = ("is_livrable",)

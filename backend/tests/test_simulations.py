"""
Tests de simulation E2E — Parcours utilisateurs complets.
Simulent des scénarios réels : client soumet → agent prend en charge → agent traite → notification reçue.
"""
import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient

from core.models import ClientRequest, Emission, Document
from notifications.models import Notification

User = get_user_model()


# ── Simulation 1: Parcours complet cotation automobile ────────────────────────

@pytest.mark.django_db
class TestSimulationCotationAuto:
    """
    Simulation: Client demande cotation → Agent prend en charge → Agent envoie devis
    → Client valide devis → Agent envoie attestations → Agent clôture souscription.
    """

    def test_full_cotation_workflow(self, api_client, client_user, agent):
        # 1. Client se connecte et crée une demande de cotation
        api_client.force_authenticate(user=client_user)
        resp = api_client.post("/api/requests/", {
            "type": "cotation_auto",
            "details": {"vehicule": "Toyota Corolla", "immatriculation": "AB-123-CD"},
        }, format="json")
        assert resp.status_code == 201
        request_id = resp.data["id"]
        assert resp.data["status"] == "en_attente"

        # 2. Agent liste les demandes en attente
        api_client.force_authenticate(user=agent)
        resp = api_client.get("/api/requests/?status=en_attente")
        assert resp.status_code == 200
        assert any(r["id"] == request_id for r in resp.data["results"])

        # 3. Agent prend en charge la demande
        resp = api_client.post(f"/api/requests/{request_id}/claim/")
        assert resp.status_code == 200
        req = ClientRequest.objects.get(id=request_id)
        assert req.agent == agent
        assert req.status == "en_cours"

        # 4. Agent envoie le devis
        from django.core.files.uploadedfile import SimpleUploadedFile
        devis_file = SimpleUploadedFile("devis.pdf", b"%PDF-1.4 devis cotation", content_type="application/pdf")
        resp = api_client.post(f"/api/requests/{request_id}/envoyer-devis/", {
            "fichier": devis_file,
        }, format="multipart")
        assert resp.status_code == 200
        req.refresh_from_db()
        assert req.status == "devis_envoye"

        # 5. Client valide le devis
        api_client.force_authenticate(user=client_user)
        resp = api_client.post(f"/api/requests/{request_id}/valider/")
        assert resp.status_code == 200
        req.refresh_from_db()
        assert req.status == "valide"

        # 6. Agent envoie les attestations
        api_client.force_authenticate(user=agent)
        attestation_file = SimpleUploadedFile("attestation.pdf", b"%PDF-1.4 attestation", content_type="application/pdf")
        resp = api_client.post(f"/api/requests/{request_id}/envoyer-attestations/", {
            "fichiers": attestation_file,
        }, format="multipart")
        assert resp.status_code == 200
        req.refresh_from_db()
        assert req.status == "traite"

        # 7. Vérifier que le client a reçu des notifications
        notifs = Notification.objects.filter(user=client_user)
        assert notifs.count() >= 2  # Au moins 2 notifications (devis + attestations)


# ── Simulation 2: Parcours complet souscription Magist'Assur Épargne ──────────

@pytest.mark.django_db
class TestSimulationSouscriptionEpargne:
    """
    Simulation: Client crée contrat épargne → Agent prend en charge
    → Agent assigne police → Agent ajoute cotisation → Capital augmente.
    """

    def test_full_epargne_workflow(self, api_client, client_user, agent):
        from magistassur.models import ContratEpargne, CotisationEpargne

        # 1. Client crée un contrat épargne
        api_client.force_authenticate(user=client_user)
        resp = api_client.post("/api/magistassur/epargne/", {
            "duree_annees": 10,
            "periodicite": "mensuelle",
            "date_premiere_cotisation": "2025-01-01",
            "montant_cotisation": 25000,
            "beneficiaires": [
                {"nom": "Épouse", "taux_repartition": 60},
                {"nom": "Fils", "taux_repartition": 40},
            ],
        }, format="json")
        assert resp.status_code == 201
        contrat_id = resp.data["id"]

        # 2. Agent liste les contrats
        api_client.force_authenticate(user=agent)
        resp = api_client.get("/api/magistassur/epargne/")
        assert resp.status_code == 200
        assert any(c["id"] == contrat_id for c in resp.data["results"])

        # 3. Agent prend en charge
        resp = api_client.post(f"/api/magistassur/epargne/{contrat_id}/prise-en-charge/")
        assert resp.status_code == 200
        contrat = ContratEpargne.objects.get(id=contrat_id)
        assert contrat.pris_en_charge_par == agent

        # 4. Agent assigne police
        resp = api_client.post(f"/api/magistassur/epargne/{contrat_id}/assign-police/", {
            "num_police": "POL-SIM-EP-001",
            "code_inspection": "INSP-SIM-001",
        }, format="json")
        assert resp.status_code == 200
        contrat.refresh_from_db()
        assert contrat.num_police == "POL-SIM-EP-001"
        assert contrat.statut == "en_cours"

        # 5. Agent ajoute une cotisation
        resp = api_client.post(f"/api/magistassur/epargne/{contrat_id}/cotisation/", {
            "montant": 25000,
            "date_echeance": "2025-02-01",
        }, format="json")
        assert resp.status_code == 201
        contrat.refresh_from_db()
        assert contrat.capital_constitue == 25000

        # 6. Agent ajoute une 2e cotisation
        resp = api_client.post(f"/api/magistassur/epargne/{contrat_id}/cotisation/", {
            "montant": 25000,
            "date_echeance": "2025-03-01",
        }, format="json")
        assert resp.status_code == 201
        contrat.refresh_from_db()
        assert contrat.capital_constitue == 50000

        # 7. Vérifier les notifications client
        notifs = Notification.objects.filter(user=client_user)
        assert notifs.count() >= 1  # Notification activation contrat

        # 8. Client consulte son contrat
        api_client.force_authenticate(user=client_user)
        resp = api_client.get(f"/api/magistassur/epargne/{contrat_id}/")
        assert resp.status_code == 200
        assert resp.data["num_police"] == "POL-SIM-EP-001"
        assert resp.data["capital_constitue"] == "50000"


# ── Simulation 3: Parcours complet souscription Magist'Assur Prévoyance ───────

@pytest.mark.django_db
class TestSimulationSouscriptionPrevoyance:
    """
    Simulation: Client crée contrat prévoyance avec questionnaire médical
    → Agent assigne police avec date d'effet → Vérification échéance.
    """

    def test_full_prevoyance_workflow(self, api_client, client_user, agent):
        from magistassur.models import ContratPrevoyance, QuestionnaireMedical

        # 1. Client crée un contrat prévoyance avec assurés et questionnaire
        api_client.force_authenticate(user=client_user)
        resp = api_client.post("/api/magistassur/prevoyance/", {
            "garantie_prevoyance_deces": True,
            "garantie_frais_funeraires": True,
            "assures_associes": [
                {"lien_parente": "conjoint", "nom": "Conjoint Test"},
                {"lien_parente": "enfant", "nom": "Enfant Test 1"},
                {"lien_parente": "enfant", "nom": "Enfant Test 2"},
            ],
            "questionnaire_medical": {
                "taille_cm": 175,
                "poids_kg": "72.0",
                "fumeur": False,
                "sport": True,
                "sport_titre": "Amateur",
            },
        }, format="json")
        assert resp.status_code == 201
        contrat_id = resp.data["id"]

        # 2. Vérifier que les assurés associés ont été créés avec auto-indemnité
        contrat = ContratPrevoyance.objects.get(id=contrat_id)
        assert contrat.assures_associes.count() == 3
        conjoint = contrat.assures_associes.get(lien_parente="conjoint")
        assert conjoint.montant_indemnite == 1_000_000
        enfant = contrat.assures_associes.filter(lien_parente="enfant").first()
        assert enfant.montant_indemnite == 500_000

        # 3. Vérifier le questionnaire médical
        assert contrat.questionnaire_medical is not None
        assert contrat.questionnaire_medical.taille_cm == 175
        assert contrat.questionnaire_medical.sport is True

        # 4. Agent assigne police avec date d'effet
        api_client.force_authenticate(user=agent)
        resp = api_client.post(f"/api/magistassur/prevoyance/{contrat_id}/assign-police/", {
            "num_police": "POL-SIM-PRV-001",
            "code_inspection": "INSP-PRV-001",
            "date_effet": "2025-06-15",
        }, format="json")
        assert resp.status_code == 200
        contrat.refresh_from_db()
        assert contrat.date_effet.isoformat() == "2025-06-15"
        assert contrat.date_echeance.isoformat() == "2026-06-15"

        # 5. Agent déclare un sinistre
        resp = api_client.post(f"/api/magistassur/prevoyance/{contrat_id}/change-statut/", {
            "statut": "sinistre",
        }, format="json")
        assert resp.status_code == 200
        contrat.refresh_from_db()
        assert contrat.statut == "sinistre"

        # 6. Client met à jour le questionnaire médical
        api_client.force_authenticate(user=client_user)
        resp = api_client.patch(f"/api/magistassur/prevoyance/{contrat_id}/questionnaire/", {
            "fumeur": True,
            "cigarettes_par_jour": 5,
        }, format="json")
        assert resp.status_code == 200
        contrat.refresh_from_db()
        assert contrat.questionnaire_medical.fumeur is True
        assert contrat.questionnaire_medical.cigarettes_par_jour == 5


# ── Simulation 4: Parcours déclaration de sinistre ────────────────────────────

@pytest.mark.django_db
class TestSimulationDeclarationSinistre:
    """
    Simulation: Client déclare un sinistre → Agent prend en charge
    → Agent traite le sinistre → Client reçoit notification.
    """

    def test_full_sinistre_workflow(self, api_client, client_user, agent):
        # 1. Client déclare un sinistre
        api_client.force_authenticate(user=client_user)
        resp = api_client.post("/api/requests/", {
            "type": "declaration_sinistre",
            "details": {
                "nature": "Accident",
                "date_sinistre": "2025-07-15",
                "lieu": "Abidjan",
                "description": "Collision à un carrefour",
            },
        }, format="json")
        assert resp.status_code == 201
        request_id = resp.data["id"]

        # 2. Agent prend en charge
        api_client.force_authenticate(user=agent)
        resp = api_client.post(f"/api/requests/{request_id}/claim/")
        assert resp.status_code == 200

        # 3. Agent traite le sinistre
        resp = api_client.post(f"/api/requests/{request_id}/treat/", {
            "note": "Sinistre traité, indemnisation validée",
        }, format="json")
        assert resp.status_code == 200
        req = ClientRequest.objects.get(id=request_id)
        assert req.status == "traite"
        assert req.sinistre_note == "Sinistre traité, indemnisation validée"
        assert req.treated_at is not None

        # 4. Vérifier notification au client
        notifs = Notification.objects.filter(user=client_user)
        assert notifs.count() >= 1


# ── Simulation 5: Parcours changement de police ───────────────────────────────

@pytest.mark.django_db
class TestSimulationChangementPolice:
    """
    Simulation: Client demande changement → Agent prend en charge
    → Agent upload nouveaux documents → Agent clôture le changement.
    """

    def test_full_changement_workflow(self, api_client, client_user, agent):
        from django.core.files.uploadedfile import SimpleUploadedFile

        # 1. Client demande un changement d'immatriculation
        api_client.force_authenticate(user=client_user)
        resp = api_client.post("/api/requests/", {
            "type": "changement_immatriculation",
            "details": {
                "motif": "Changement d'immatriculation",
                "ancienne_immat": "AB-123-CD",
                "nouvelle_immat": "EF-456-GH",
            },
        }, format="json")
        assert resp.status_code == 201
        request_id = resp.data["id"]

        # 2. Agent prend en charge
        api_client.force_authenticate(user=agent)
        resp = api_client.post(f"/api/requests/{request_id}/claim/")
        assert resp.status_code == 200

        # 3. Agent clôture le changement avec documents
        doc_file = SimpleUploadedFile("nouvelle_carte.pdf", b"%PDF-1.4 nouvelle carte grise", content_type="application/pdf")
        resp = api_client.post(f"/api/requests/{request_id}/cloturer-changement/", {
            "fichiers": doc_file,
            "new_immatriculation": "EF-456-GH",
        }, format="multipart")
        assert resp.status_code == 200
        req = ClientRequest.objects.get(id=request_id)
        assert req.status == "traite"

        # 4. Vérifier qu'un document a été uploadé
        docs = Document.objects.filter(request_id=request_id)
        assert docs.count() >= 1


# ── Simulation 6: Multi-agents concurrent sur même demande ────────────────────

@pytest.mark.django_db
class TestSimulationConcurrentAgents:
    """
    Simulation: Deux agents tentent de prendre en charge la même demande
    simultanément → Le premier réussit, le second obtient 409.
    """

    def test_concurrent_claim(self, api_client, client_user, agent, agent2):
        # 1. Client crée une demande
        api_client.force_authenticate(user=client_user)
        resp = api_client.post("/api/requests/", {
            "type": "cotation_auto",
            "details": {"vehicule": "Honda"},
        }, format="json")
        request_id = resp.data["id"]

        # 2. Agent 1 prend en charge
        api_client.force_authenticate(user=agent)
        resp1 = api_client.post(f"/api/requests/{request_id}/claim/")
        assert resp1.status_code == 200

        # 3. Agent 2 tente de prendre en charge → 409
        api_client.force_authenticate(user=agent2)
        resp2 = api_client.post(f"/api/requests/{request_id}/claim/")
        assert resp2.status_code == 409

        # 4. Vérifier que seul l'agent 1 est assigné
        req = ClientRequest.objects.get(id=request_id)
        assert req.agent == agent


# ── Simulation 7: Parcours complet import émissions + dashboard ───────────────

@pytest.mark.django_db
class TestSimulationImportAndDashboard:
    """
    Simulation: Admin importe un CSV d'émissions → Agent consulte dashboard
    → Agent voit ses statistiques → Client consulte ses propres émissions.
    """

    def test_full_import_dashboard_workflow(self, api_client, admin_user, agent, client_user):
        # 1. Admin importe un CSV
        csv_content = (
            "client_email,risque,compagnie,num_police,num_facture,date,effet,echeance,prime_nette,prime_ttc,situation\n"
            f"{client_user.email},Automobile,NSIA,POL-IMP-001,FAC-IMP-001,2025-01-15,2025-01-15,2026-01-14,100000,120000,Affaire nouvelle\n"
            f"{client_user.email},MRH,ALLIANZ,POL-IMP-002,FAC-IMP-002,2025-02-01,2025-02-01,2026-01-31,50000,60000,Affaire nouvelle\n"
        )
        from django.core.files.uploadedfile import SimpleUploadedFile
        csv_file = SimpleUploadedFile("emissions.csv", csv_content.encode("utf-8"), content_type="text/csv")

        api_client.force_authenticate(user=admin_user)
        resp = api_client.post("/api/emissions/import/", {"file": csv_file}, format="multipart")
        assert resp.status_code == 200
        assert Emission.objects.filter(num_police__in=["POL-IMP-001", "POL-IMP-002"]).count() == 2

        # 2. Agent consulte le dashboard
        api_client.force_authenticate(user=agent)
        resp = api_client.get("/api/dashboard/stats/")
        assert resp.status_code == 200
        assert "total_contrats" in resp.data
        assert "total_primes" in resp.data

        # 3. Client consulte ses émissions
        api_client.force_authenticate(user=client_user)
        resp = api_client.get("/api/emissions/")
        assert resp.status_code == 200
        assert resp.data["count"] == 2
        for item in resp.data["results"]:
            assert item["client"] == client_user.id


# ── Simulation 8: Upload carte grise liée à une demande ───────────────────────

@pytest.mark.django_db
class TestSimulationCarteGriseUpload:
    """
    Simulation: Client crée demande cotation → Client upload carte grise liée
    → Agent consulte la demande avec documents.
    """

    def test_carte_grise_linked_to_request(self, api_client, client_user, agent):
        from django.core.files.uploadedfile import SimpleUploadedFile

        # 1. Client crée une demande
        api_client.force_authenticate(user=client_user)
        resp = api_client.post("/api/requests/", {
            "type": "cotation_auto",
            "details": {"vehicule": "Toyota"},
        }, format="json")
        request_id = resp.data["id"]

        # 2. Client upload la carte grise liée
        carte_file = SimpleUploadedFile("carte_grise.pdf", b"%PDF-1.4 carte grise", content_type="application/pdf")
        resp = api_client.post("/api/carte-grise/", {
            "file": carte_file,
            "request_id": request_id,
        }, format="multipart")
        assert resp.status_code in (200, 201)

        # 3. Vérifier que le document est lié à la demande
        doc = Document.objects.get(request_id=request_id)
        assert doc.nom.startswith("carte_grise")

        # 4. Agent consulte les livrables de la demande
        api_client.force_authenticate(user=agent)
        resp = api_client.get(f"/api/requests/{request_id}/livrables/")
        assert resp.status_code == 200

"""Correctifs sécurité lot 3 — audit fuites de données.

- création épargne : les champs fichier ne contournent plus la validation
- /media/ : type servi selon la signature réelle, sinon téléchargement forcé
- export PDF : balisage ReportLab neutralisé dans les valeurs saisies
"""
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework_simplejwt.tokens import RefreshToken

from magistassur.exports import export_epargne_pdf
from magistassur.models import ContratEpargne

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
HTML = b"<html><body><script>alert(document.domain)</script></body></html>"

EPARGNE_FORM = {
    "duree_annees": "10", "periodicite": "mensuelle",
    "montant_cotisation": "25000", "date_premiere_cotisation": "2030-01-01",
}


def _bearer(client, user):
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}")


@pytest.fixture
def media_root(settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    return tmp_path


@pytest.mark.django_db
class TestCreateIgnoresFiles:
    def test_html_file_in_create_not_stored(self, api_client, client_user, media_root):
        _bearer(api_client, client_user)
        resp = api_client.post("/api/magistassur/epargne/", {
            **EPARGNE_FORM,
            "piece_identite": SimpleUploadedFile("evil.html", HTML, content_type="image/jpeg"),
        }, format="multipart")
        assert resp.status_code == 201
        contrat = ContratEpargne.objects.get(pk=resp.data["id"])
        assert not contrat.piece_identite
        assert not list(media_root.rglob("evil*"))

    def test_multipart_create_without_client_field(self, api_client, client_user, media_root):
        """Régression : le formulaire multipart d'un client sans champ client échouait."""
        _bearer(api_client, client_user)
        resp = api_client.post("/api/magistassur/epargne/", EPARGNE_FORM, format="multipart")
        assert resp.status_code == 201
        assert ContratEpargne.objects.get(pk=resp.data["id"]).client_id == client_user.id

    def test_client_cannot_create_for_someone_else(self, api_client, client_user, client_user_douanier):
        _bearer(api_client, client_user)
        resp = api_client.post("/api/magistassur/epargne/", {
            **EPARGNE_FORM, "client": client_user_douanier.id,
        }, format="json")
        assert resp.status_code == 201
        assert ContratEpargne.objects.get(pk=resp.data["id"]).client_id == client_user.id

    def test_agent_must_designate_client(self, api_client, agent):
        _bearer(api_client, agent)
        resp = api_client.post("/api/magistassur/epargne/", EPARGNE_FORM, format="json")
        assert resp.status_code == 400
        assert "client" in resp.data

    def test_upload_documents_still_rejects_html(self, api_client, client_user, media_root):
        contrat = ContratEpargne.objects.create(client=client_user, **{
            "duree_annees": 10, "periodicite": "mensuelle",
            "montant_cotisation": 25000, "date_premiere_cotisation": "2030-01-01",
        })
        _bearer(api_client, client_user)
        resp = api_client.post(f"/api/magistassur/epargne/{contrat.id}/upload-documents/", {
            "piece_identite": SimpleUploadedFile("evil.html", HTML, content_type="image/jpeg"),
        }, format="multipart")
        assert resp.status_code == 400


@pytest.mark.django_db
class TestMediaContentType:
    def _contrat_with_file(self, client_user, media_root, rel, data):
        p = media_root / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)
        return ContratEpargne.objects.create(
            client=client_user, duree_annees=10, periodicite="mensuelle",
            date_premiere_cotisation="2030-01-01", montant_cotisation=25000,
            piece_identite=rel,
        )

    def test_html_disguised_is_forced_download(self, api_client, client_user, agent, media_root):
        rel = "magistassur/pieces_identite/legacy.html"
        self._contrat_with_file(client_user, media_root, rel, HTML)
        _bearer(api_client, agent)
        resp = api_client.get(f"/media/{rel}")
        assert resp.status_code == 200
        assert resp["Content-Type"] == "application/octet-stream"
        assert resp["Content-Disposition"].startswith("attachment")

    def test_png_with_wrong_extension_served_as_png(self, api_client, client_user, agent, media_root):
        rel = "magistassur/pieces_identite/cni.html"
        self._contrat_with_file(client_user, media_root, rel, PNG)
        _bearer(api_client, agent)
        resp = api_client.get(f"/media/{rel}")
        assert resp["Content-Type"] == "image/png"
        assert not resp.get("Content-Disposition", "").startswith("attachment")


@pytest.mark.django_db
class TestPdfMarkupEscaped:
    def test_img_tag_in_field_not_interpreted(self, client_user):
        # Sans échappement, ReportLab tente d'ouvrir ce chemin et lève une erreur.
        contrat = ContratEpargne.objects.create(
            client=client_user, duree_annees=10, periodicite="mensuelle",
            date_premiere_cotisation="2030-01-01", montant_cotisation=25000,
            adresse_postale='<img src="/nonexistent/cni_autre_client.png"/> <b>x',
            num_police='<font color="red">P1</font>',
        )
        resp = export_epargne_pdf(contrat)
        assert resp.status_code == 200
        assert resp.content.startswith(b"%PDF")

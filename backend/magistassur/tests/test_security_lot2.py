"""Correctifs sécurité lot 2 — audit accès.

- /media/ : chaque fichier doit être rattaché à son propriétaire (IDOR)
- photo de profil : validation magic bytes (anti XSS stocké)
- contrats : suppression admin-only, modification par l'agent en charge
"""
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import ClientRequest, Document
from magistassur.models import ContratEpargne, ContratPrevoyance

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
SVG = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'


def _bearer(client, user):
    token = str(RefreshToken.for_user(user).access_token)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")


def _write(media_root, rel, data=b"secret-content"):
    p = media_root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(data)


@pytest.fixture
def epargne(db, client_user):
    return ContratEpargne.objects.create(
        client=client_user, duree_annees=10, periodicite="mensuelle",
        date_premiere_cotisation="2030-01-01", montant_cotisation=25000, capital_constitue=0,
    )


@pytest.fixture
def media_root(settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    return tmp_path


@pytest.mark.django_db
class TestMediaAccessControl:
    REL = "magistassur/pieces_identite/cni.png"

    def test_anonymous_rejected(self, api_client, media_root, epargne):
        epargne.piece_identite = self.REL
        epargne.save(update_fields=["piece_identite"])
        _write(media_root, self.REL)
        assert api_client.get(f"/media/{self.REL}").status_code == 401

    def test_other_client_cannot_read(self, api_client, media_root, epargne, client_user_douanier):
        """IDOR : un autre client ne doit pas lire la CNI d'un magistrat."""
        epargne.piece_identite = self.REL
        epargne.save(update_fields=["piece_identite"])
        _write(media_root, self.REL)
        _bearer(api_client, client_user_douanier)
        assert api_client.get(f"/media/{self.REL}").status_code == 404

    def test_owner_can_read(self, api_client, media_root, epargne, client_user):
        epargne.piece_identite = self.REL
        epargne.save(update_fields=["piece_identite"])
        _write(media_root, self.REL)
        _bearer(api_client, client_user)
        assert api_client.get(f"/media/{self.REL}").status_code == 200

    def test_agent_can_read(self, api_client, media_root, epargne, agent):
        epargne.piece_identite = self.REL
        epargne.save(update_fields=["piece_identite"])
        _write(media_root, self.REL)
        _bearer(api_client, agent)
        assert api_client.get(f"/media/{self.REL}").status_code == 200

    def test_path_traversal_blocked(self, api_client, media_root, client_user):
        _bearer(api_client, client_user)
        resp = api_client.get("/media/../settings.py")
        assert resp.status_code == 404

    def test_orphan_file_denied_to_client(self, api_client, media_root, client_user):
        """Un fichier sans objet lié est refusé (évite les orphelins publics)."""
        _write(media_root, "magistassur/ribs/orphan.png")
        _bearer(api_client, client_user)
        assert api_client.get("/media/magistassur/ribs/orphan.png").status_code == 404

    def test_orphan_file_ok_for_agent(self, api_client, media_root, agent):
        _write(media_root, "documents/2026/01/orphan.png")
        _bearer(api_client, agent)
        assert api_client.get("/media/documents/2026/01/orphan.png").status_code == 200

    def test_document_livrable_owner_only(self, api_client, media_root, client_user, client_user_douanier, agent):
        rel = "documents/2026/01/livrable.pdf"
        _write(media_root, rel)
        req = ClientRequest.objects.create(client=client_user, type="cotation_auto")
        doc = Document.objects.create(
            nom="police.pdf", fichier=rel, uploaded_by=agent, request=req, is_livrable=True,
        )
        _bearer(api_client, client_user_douanier)
        assert api_client.get(f"/media/{rel}").status_code == 404
        _bearer(api_client, client_user)
        assert api_client.get(f"/media/{rel}").status_code == 200

    def test_avatar_shared_between_authenticated(self, api_client, media_root, client_user, client_user_douanier):
        rel = "avatars/photo.png"
        _write(media_root, rel)
        client_user.photo = rel
        client_user.save(update_fields=["photo"])
        _bearer(api_client, client_user_douanier)
        assert api_client.get(f"/media/{rel}").status_code == 200


@pytest.mark.django_db
class TestPhotoValidation:
    def test_svg_photo_rejected(self, api_client, client_user):
        api_client.force_authenticate(user=client_user)
        resp = api_client.patch("/api/auth/me/", {
            "photo": SimpleUploadedFile("evil.svg", SVG, content_type="image/svg+xml"),
        }, format="multipart")
        assert resp.status_code == 400
        client_user.refresh_from_db()
        assert not client_user.photo

    def test_html_photo_rejected(self, api_client, client_user):
        api_client.force_authenticate(user=client_user)
        resp = api_client.patch("/api/auth/me/", {
            "photo": SimpleUploadedFile("evil.html", b"<html><script>alert(1)</script></html>", content_type="text/html"),
        }, format="multipart")
        assert resp.status_code == 400

    def test_png_photo_accepted(self, api_client, client_user, media_root):
        api_client.force_authenticate(user=client_user)
        resp = api_client.patch("/api/auth/me/", {
            "photo": SimpleUploadedFile("me.png", PNG, content_type="image/png"),
        }, format="multipart")
        assert resp.status_code == 200


@pytest.mark.django_db
class TestContratWriteRestrictions:
    def test_agent_cannot_delete(self, api_client, agent, epargne):
        api_client.force_authenticate(user=agent)
        resp = api_client.delete(f"/api/magistassur/epargne/{epargne.id}/")
        assert resp.status_code == 403
        assert ContratEpargne.objects.filter(pk=epargne.pk).exists()

    def test_admin_can_delete(self, api_client, admin_user, epargne):
        api_client.force_authenticate(user=admin_user)
        resp = api_client.delete(f"/api/magistassur/epargne/{epargne.id}/")
        assert resp.status_code == 204

    def test_agent_cannot_update_other_agent_dossier(self, api_client, agent, agent2, epargne):
        epargne.pris_en_charge_par = agent2
        epargne.save(update_fields=["pris_en_charge_par"])
        api_client.force_authenticate(user=agent)
        resp = api_client.patch(
            f"/api/magistassur/epargne/{epargne.id}/",
            {"montant_cotisation": 1}, format="json",
        )
        assert resp.status_code == 403

    def test_agent_cannot_update_after_nsia(self, api_client, agent, epargne):
        from django.utils import timezone
        epargne.pris_en_charge_par = agent
        epargne.envoye_nsia_at = timezone.now()
        epargne.save()
        api_client.force_authenticate(user=agent)
        resp = api_client.patch(
            f"/api/magistassur/epargne/{epargne.id}/",
            {"montant_cotisation": 1}, format="json",
        )
        assert resp.status_code == 403

    def test_agent_can_update_own_open_dossier(self, api_client, agent, epargne):
        epargne.pris_en_charge_par = agent
        epargne.save(update_fields=["pris_en_charge_par"])
        api_client.force_authenticate(user=agent)
        resp = api_client.patch(
            f"/api/magistassur/epargne/{epargne.id}/",
            {"montant_cotisation": 30000}, format="json",
        )
        assert resp.status_code == 200
        epargne.refresh_from_db()
        assert epargne.montant_cotisation == 30000

    def test_client_cannot_update_own_contract(self, api_client, client_user, epargne):
        api_client.force_authenticate(user=client_user)
        resp = api_client.patch(
            f"/api/magistassur/epargne/{epargne.id}/",
            {"montant_cotisation": 1}, format="json",
        )
        assert resp.status_code == 403

    def test_agent_cannot_delete_prevoyance(self, api_client, agent, client_user):
        contrat = ContratPrevoyance.objects.create(client=client_user, garantie_prevoyance_deces=True)
        api_client.force_authenticate(user=agent)
        resp = api_client.delete(f"/api/magistassur/prevoyance/{contrat.id}/")
        assert resp.status_code == 403

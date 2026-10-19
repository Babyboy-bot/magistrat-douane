"""Tests lot 3 — protection des fichiers /media/ (H4).

Les media contiennent pièces d'identité, RIB et documents clients :
ils ne doivent être servis qu'aux utilisateurs authentifiés.
"""
import pytest
from rest_framework_simplejwt.tokens import RefreshToken


@pytest.fixture
def media_file(settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    f = tmp_path / "doc.pdf"
    f.write_bytes(b"%PDF-1.4 test")
    return "doc.pdf"


@pytest.mark.django_db
class TestProtectedMedia:
    def test_anonymous_gets_401(self, api_client, media_file):
        resp = api_client.get(f"/media/{media_file}")
        assert resp.status_code == 401

    def test_authenticated_gets_file(self, api_client, agent, media_file):
        api_client.cookies["access_token"] = str(RefreshToken.for_user(agent).access_token)
        resp = api_client.get(f"/media/{media_file}")
        assert resp.status_code == 200
        assert resp["Content-Type"] == "application/pdf"

    def test_client_cannot_read_unowned_file(self, api_client, client_user, media_file):
        """Un fichier non rattaché au client lui est refusé (anti-IDOR)."""
        api_client.cookies["access_token"] = str(RefreshToken.for_user(client_user).access_token)
        resp = api_client.get(f"/media/{media_file}")
        assert resp.status_code == 404

    def test_inactive_user_rejected(self, api_client, client_user, media_file):
        client_user.is_active = False
        client_user.save()
        api_client.cookies["access_token"] = str(RefreshToken.for_user(client_user).access_token)
        resp = api_client.get(f"/media/{media_file}")
        assert resp.status_code == 401

    def test_directory_traversal_rejected(self, api_client, client_user, media_file):
        api_client.cookies["access_token"] = str(RefreshToken.for_user(client_user).access_token)
        resp = api_client.get("/media/../settings.py")
        assert resp.status_code in (400, 404)

    def test_missing_file_404(self, api_client, client_user, settings, tmp_path):
        settings.MEDIA_ROOT = str(tmp_path)
        api_client.cookies["access_token"] = str(RefreshToken.for_user(client_user).access_token)
        resp = api_client.get("/media/absent.pdf")
        assert resp.status_code == 404

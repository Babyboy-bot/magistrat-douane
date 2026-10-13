"""Tests lot 2 — replay de notifications à la connexion WS (G34).

Le consumer renvoie les requêtes en attente à chaque connexion agent.
Elles doivent porter `initial=True` pour que le frontend les affiche
silencieusement (pas de toast, pas de son).
"""
import pytest

from core.models import ClientRequest
from notifications.consumers import _pending_requests_payload


@pytest.mark.django_db
class TestPendingRequestsReplay:
    def test_replayed_requests_are_flagged_initial(self, client_request):
        pending = _pending_requests_payload()
        assert pending, "la requête en attente devrait être rejouée"
        assert all(p.get("initial") is True for p in pending)

    def test_replay_contains_request_identifiers(self, client_request):
        pending = _pending_requests_payload()
        assert pending[0]["request_id"] == client_request.id
        assert pending[0]["event"] == "new_request"

    def test_treated_requests_not_replayed(self, client_request_en_cours):
        client_request_en_cours.status = ClientRequest.Status.TRAITE
        client_request_en_cours.save()
        pending = _pending_requests_payload()
        assert all(p["request_id"] != client_request_en_cours.id for p in pending)

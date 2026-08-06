"""
Locust — Tests de charge/performance pour Magistrat-Douane.
Simule des utilisateurs simultanés sur l'API backend.

Utilisation:
    pip install locust
    locust -f backend/tests/locustfile.py --host=http://127.0.0.1:8000

Puis ouvrir http://localhost:8089 pour configurer le nombre d'utilisateurs et le ramp-up.
"""
from locust import HttpUser, task, between, SequentialTaskSet
import random


class ClientWorkflow(SequentialTaskSet):
    """Simule un parcours client complet : login → dashboard → portfolio → création demande."""

    def on_start(self):
        """Connexion initiale."""
        self.client.post("/api/auth/login/", json={
            "identifier": "client@test.ci",
            "password": "TestPass123!",
        })

    @task
    def view_dashboard(self):
        self.client.get("/api/dashboard/stats/")

    @task
    def view_emissions(self):
        self.client.get("/api/emissions/")

    @task
    def view_requests(self):
        self.client.get("/api/requests/")

    @task
    def create_cotation_request(self):
        self.client.post("/api/requests/", json={
            "type": "cotation_auto",
            "details": {
                "vehicule": f"Vehicle-{random.randint(1, 1000)}",
                "immatriculation": f"AB-{random.randint(100, 999)}-CD",
            },
        })

    @task
    def view_portfolio(self):
        self.client.get("/api/emissions/")


class AgentWorkflow(SequentialTaskSet):
    """Simule un parcours agent : login → dashboard → liste demandes → stats."""

    def on_start(self):
        self.client.post("/api/auth/login/", json={
            "identifier": "agent@acs.ci",
            "password": "TestPass123!",
        })

    @task
    def view_dashboard(self):
        self.client.get("/api/dashboard/stats/")

    @task
    def view_pending_requests(self):
        self.client.get("/api/requests/?status=en_attente")

    @task
    def view_in_progress_requests(self):
        self.client.get("/api/requests/?status=en_cours")

    @task
    def view_emissions(self):
        self.client.get("/api/emissions/")

    @task
    def view_magistassur_epargne(self):
        self.client.get("/api/magistassur/epargne/")

    @task
    def view_magistassur_prevoyance(self):
        self.client.get("/api/magistassur/prevoyance/")


class AdminWorkflow(SequentialTaskSet):
    """Simule un parcours admin : login → dashboard → audit trail → import."""

    def on_start(self):
        self.client.post("/api/auth/login/", json={
            "identifier": "admin@acs.ci",
            "password": "AdminPass123!",
        })

    @task
    def view_dashboard(self):
        self.client.get("/api/dashboard/stats/")

    @task
    def view_audit_trail(self):
        self.client.get("/api/audit-trail/")

    @task
    def view_all_emissions(self):
        self.client.get("/api/emissions/")

    @task
    def view_all_agents(self):
        self.client.get("/api/auth/users/?role=agent")


class MagistratDouaneUser(HttpUser):
    """Utilisateur principal — répartit entre client, agent et admin."""
    wait_time = between(1, 3)

    tasks = {
        ClientWorkflow: 60,    # 60% de clients
        AgentWorkflow: 30,     # 30% d'agents
        AdminWorkflow: 10,     # 10% d'admins
    }

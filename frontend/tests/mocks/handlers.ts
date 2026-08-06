/**
 * MSW (Mock Service Worker) — Handlers pour simuler l'API backend.
 * Permet de tester le frontend indépendamment du backend.
 *
 * Utilisation:
 *   npm install -D msw
 *   npx msw init public/ --save
 *   import { worker } from "./tests/mocks/browser"
 *   worker.start()
 */
import { http, HttpResponse } from "msw";

const API_URL = "http://127.0.0.1:8000/api";

// ── Données mockées ──────────────────────────────────────────────────────────

const mockUsers = {
  client: {
    id: 1, email: "client@test.ci", nom: "Client", prenoms: "Test",
    role: "client", telephone: "0700000000", full_name: "Client Test",
    account_status: "active", is_active: true, verified: true,
  },
  agent: {
    id: 2, email: "agent@acs.ci", nom: "Agent", prenoms: "Test",
    role: "agent", telephone: "0700000001", full_name: "Agent Test",
    account_status: "active", is_active: true, verified: true,
  },
  admin: {
    id: 3, email: "admin@acs.ci", nom: "Admin", prenoms: "Test",
    role: "admin", telephone: "0700000002", full_name: "Admin Test",
    account_status: "active", is_active: true, verified: true,
  },
};

const mockEmissions = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  client: 1,
  agent: 2,
  num_police: `POL-MOCK-${String(i + 1).padStart(3, "0")}`,
  num_facture: `FAC-MOCK-${String(i + 1).padStart(3, "0")}`,
  compagnie: ["NSIA", "ALLIANZ", "AXA"][i % 3],
  risque: ["Automobile", "MRH", "Santé"][i % 3],
  prime_nette: `${100000 + i * 10000}`,
  prime_ttc: `${120000 + i * 12000}`,
  date: "2025-01-15",
  effet: "2025-01-15",
  echeance: "2026-01-14",
  situation: "Affaire nouvelle",
}));

const mockRequests = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  client: 1,
  agent: i < 5 ? 2 : null,
  numero: `RQ-2025-${String(i + 1).padStart(4, "0")}`,
  type: ["cotation_auto", "cotation_mrh", "declaration_sinistre", "changement_immatriculation"][i % 4],
  status: ["en_attente", "en_cours", "devis_envoye", "valide", "traite"][i % 5],
  details: { vehicule: "Toyota Corolla" },
  created_at: "2025-07-01T10:00:00Z",
  treated_at: i < 3 ? "2025-07-05T14:00:00Z" : null,
}));

const mockNotifications = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  title: ["Devis disponible", "Attestations envoyées", "Contrat activé", "Sinistre traité", "Bienvenue"][i],
  message: "Ceci est une notification de test.",
  type: ["info", "success", "success", "info", "info"][i],
  read: i < 2,
  created_at: "2025-07-01T10:00:00Z",
}));

const mockDashboardStats = {
  total_contrats: 15,
  contrats_actifs: 12,
  contrats_expires: 3,
  total_primes: 1800000,
  primes_payees: 1500000,
  primes_impayees: 300000,
  total_clients: 50,
  total_prospects: 5,
  total_agents: 8,
};

const mockEpargneContrats = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  client: 1,
  agent: 2,
  num_police: i < 3 ? `POL-EP-${String(i + 1).padStart(3, "0")}` : null,
  duree_annees: 10,
  periodicite: "mensuelle",
  montant_cotisation: "25000",
  capital_constitue: `${i * 25000}`,
  statut: ["en_cours", "en_cours", "en_cours", "en_attente", "suspendu"][i],
  created_at: "2025-01-01T10:00:00Z",
}));

// ── Handlers ─────────────────────────────────────────────────────────────────

export const handlers = [
  // ── Auth ───────────────────────────────────────────────────────────────────
  http.post(`${API_URL}/auth/login/`, () => {
    return HttpResponse.json({
      user: mockUsers.client,
      detail: "Connexion réussie",
    }, {
      headers: {
        "Set-Cookie": "access_token=mock-jwt-access; HttpOnly; Path=/",
      },
    });
  }),

  http.post(`${API_URL}/auth/register/`, () => {
    return HttpResponse.json({
      id: 99,
      email: "newuser@test.ci",
      role: "client",
      verified: false,
    }, { status: 201 });
  }),

  http.post(`${API_URL}/auth/reset-password/`, () => {
    return HttpResponse.json({ detail: "Si ce compte existe, un email a été envoyé." });
  }),

  http.post(`${API_URL}/auth/refresh/`, () => {
    return HttpResponse.json({ detail: "Token rafraîchi" });
  }),

  http.post(`${API_URL}/auth/logout/`, () => {
    return HttpResponse.json({ detail: "Déconnexion réussie" });
  }),

  http.get(`${API_URL}/auth/me/`, () => {
    return HttpResponse.json(mockUsers.client);
  }),

  // ── Dashboard ──────────────────────────────────────────────────────────────
  http.get(`${API_URL}/dashboard/stats/`, () => {
    return HttpResponse.json(mockDashboardStats);
  }),

  // ── Emissions ──────────────────────────────────────────────────────────────
  http.get(`${API_URL}/emissions/`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    return HttpResponse.json({
      count: mockEmissions.length,
      next: null,
      previous: null,
      results: mockEmissions,
    });
  }),

  http.get(`${API_URL}/emissions/:id/`, ({ params }) => {
    const emission = mockEmissions.find((e) => e.id === parseInt(params.id as string));
    if (emission) return HttpResponse.json(emission);
    return HttpResponse.json({ detail: "Introuvable" }, { status: 404 });
  }),

  // ── Requests ───────────────────────────────────────────────────────────────
  http.get(`${API_URL}/requests/`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    let results = mockRequests;
    if (status) results = results.filter((r) => r.status === status);
    return HttpResponse.json({ count: results.length, next: null, previous: null, results });
  }),

  http.post(`${API_URL}/requests/`, () => {
    return HttpResponse.json({
      id: 999,
      numero: "RQ-2025-9999",
      status: "en_attente",
      type: "cotation_auto",
      details: {},
    }, { status: 201 });
  }),

  http.post(`${API_URL}/requests/:id/claim/`, () => {
    return HttpResponse.json({ ...mockRequests[0], status: "en_cours", agent: 2 });
  }),

  http.post(`${API_URL}/requests/:id/treat/`, () => {
    return HttpResponse.json({ ...mockRequests[0], status: "traite" });
  }),

  http.post(`${API_URL}/requests/:id/envoyer-devis/`, () => {
    return HttpResponse.json({ ...mockRequests[0], status: "devis_envoye" });
  }),

  http.post(`${API_URL}/requests/:id/valider/`, () => {
    return HttpResponse.json({ ...mockRequests[0], status: "valide" });
  }),

  http.post(`${API_URL}/requests/:id/envoyer-attestations/`, () => {
    return HttpResponse.json({ ...mockRequests[0], status: "traite" });
  }),

  // ── Magistassur ────────────────────────────────────────────────────────────
  http.get(`${API_URL}/magistassur/epargne/`, () => {
    return HttpResponse.json({
      count: mockEpargneContrats.length,
      next: null,
      previous: null,
      results: mockEpargneContrats,
    });
  }),

  http.post(`${API_URL}/magistassur/epargne/`, () => {
    return HttpResponse.json({
      id: 100,
      client: 1,
      duree_annees: 10,
      periodicite: "mensuelle",
      montant_cotisation: "25000",
      statut: "en_attente",
    }, { status: 201 });
  }),

  http.post(`${API_URL}/magistassur/epargne/:id/assign-police/`, () => {
    return HttpResponse.json({ ...mockEpargneContrats[0], num_police: "POL-NEW", statut: "en_cours" });
  }),

  http.post(`${API_URL}/magistassur/epargne/:id/prise-en-charge/`, () => {
    return HttpResponse.json({ ...mockEpargneContrats[0], pris_en_charge_par: 2 });
  }),

  http.get(`${API_URL}/magistassur/prevoyance/`, () => {
    return HttpResponse.json({ count: 0, next: null, previous: null, results: [] });
  }),

  // ── Notifications ──────────────────────────────────────────────────────────
  http.get(`${API_URL}/notifications/`, () => {
    return HttpResponse.json({
      count: mockNotifications.length,
      next: null,
      previous: null,
      results: mockNotifications,
    });
  }),

  // ── Compagnies ─────────────────────────────────────────────────────────────
  http.get(`${API_URL}/compagnies/`, () => {
    return HttpResponse.json(["NSIA", "ALLIANZ", "AXA", "SUNU", "SAAR"]);
  }),

  // ── Audit ──────────────────────────────────────────────────────────────────
  http.get(`${API_URL}/audit-trail/`, () => {
    return HttpResponse.json({ count: 0, next: null, previous: null, results: [] });
  }),
];

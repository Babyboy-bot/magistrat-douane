import { apiFetch, API_BASE } from "./client";
import type { Emission, Paiement, PaginatedResponse } from "@/lib/types";

// ── Types ────────────────────────────────────────────────────────────────────

export interface EmissionListParams {
  page?: number; pageSize?: number; search?: string;
  clientId?: string; agentId?: string; compagnie?: string;
  risque?: string; situation?: string;
  dateFrom?: string; dateTo?: string;
  echeanceFrom?: string; echeanceTo?: string;
  ordering?: string;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

export function mapPaiement(p: Record<string, unknown>): Paiement {
  const emId = p.emission_id ?? p.emission ?? (p.emission && typeof p.emission === "object" ? (p.emission as Record<string, unknown>).id : undefined);
  return {
    id: String(p.id),
    emissionId: emId ? String(emId) : "",
    dateReglement: p.date_reglement as string,
    reference: p.reference as string,
    montantRegle: Number(p.montant_regle),
    observations: (p.observations as string) || undefined,
  };
}

export function mapEmission(e: Record<string, unknown>): Emission {
  return {
    id: String(e.id),
    clientId: String(e.client_id),
    clientNom: e.client_nom as string,
    date: e.date as string,
    risque: e.risque as string,
    compagnie: e.compagnie as string,
    numFacture: e.num_facture as string,
    numPolice: e.num_police as string,
    marque: e.marque as string,
    immatriculation: e.immatriculation as string,
    effet: e.effet as string,
    echeance: e.echeance as string,
    primeNette: Number(e.prime_nette),
    primeTTC: Number(e.prime_ttc),
    tauxCommission: Number(e.taux_commission ?? 0),
    montantCommission: Number(e.montant_commission ?? 0),
    totalPaye: Number(e.total_paye ?? 0),
    solde: Number(e.solde ?? 0),
    situation: e.situation as Emission["situation"],
    paiements: Array.isArray(e.paiements) ? (e.paiements as Record<string, unknown>[]).map(mapPaiement) : [],
  };
}

// ── Emissions API ────────────────────────────────────────────────────────────

export const emissionsApi = {
  async list(params?: EmissionListParams): Promise<PaginatedResponse<Emission>> {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", String(params.page));
    if (params?.pageSize) q.append("page_size", String(params.pageSize));
    if (params?.search) q.append("search", params.search);
    if (params?.clientId) q.append("client", params.clientId);
    if (params?.agentId) q.append("agent", params.agentId);
    if (params?.compagnie) q.append("compagnie", params.compagnie);
    if (params?.risque) q.append("risque", params.risque);
    if (params?.situation) q.append("situation", params.situation);
    if (params?.dateFrom) q.append("date__gte", params.dateFrom);
    if (params?.dateTo) q.append("date__lte", params.dateTo);
    if (params?.echeanceFrom) q.append("echeance__gte", params.echeanceFrom);
    if (params?.echeanceTo) q.append("echeance__lte", params.echeanceTo);
    if (params?.ordering) q.append("ordering", params.ordering);
    const url = q.toString() ? `/api/emissions/?${q}` : "/api/emissions/";
    try {
      const raw = await apiFetch<PaginatedResponse<Record<string, unknown>> | Record<string, unknown>[]>(url);
      if (Array.isArray(raw)) return { results: raw.map(mapEmission), count: raw.length, next: null, previous: null };
      const results = Array.isArray(raw.results) ? raw.results : [];
      return { results: results.map(mapEmission), count: (raw.count as number) ?? results.length, next: (raw.next as string | null) ?? null, previous: (raw.previous as string | null) ?? null };
    } catch {
      return { results: [], count: 0, next: null, previous: null };
    }
  },

  async create(data: Record<string, unknown>): Promise<Emission> {
    const payload = {
      client: data.clientId, agent: data.agentId, date: data.date,
      risque: data.risque, compagnie: data.compagnie, num_facture: data.numFacture,
      num_police: data.numPolice, effet: data.effet, echeance: data.echeance,
      prime_nette: data.primeNette, prime_ttc: data.primeTtc, situation: data.situation,
      marque: data.marque, immatriculation: data.immatriculation, paiements: data.paiements ?? [],
    };
    const raw = await apiFetch<Record<string, unknown>>("/api/emissions/", { method: "POST", body: JSON.stringify(payload) });
    return mapEmission(raw);
  },

  async getById(id: string): Promise<Emission> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/emissions/${id}/`);
    return mapEmission(raw);
  },

  async totals(params?: EmissionListParams): Promise<{ prime_nette: number; prime_ttc: number; total_paye: number; solde: number; commission: number; count: number }> {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.compagnie) q.append("compagnie", params.compagnie);
    if (params?.risque) q.append("risque", params.risque);
    if (params?.situation) q.append("situation", params.situation);
    if (params?.clientId) q.append("client", params.clientId);
    if (params?.agentId) q.append("agent", params.agentId);
    if (params?.dateFrom) q.append("date__gte", params.dateFrom);
    if (params?.dateTo) q.append("date__lte", params.dateTo);
    const url = q.toString() ? `/api/emissions/totals/?${q}` : "/api/emissions/totals/";
    return apiFetch(url);
  },

  async getBalance(id: string): Promise<{ emission_id: number; prime_ttc: number; total_paye: number; solde: number }> {
    return apiFetch(`/api/emissions/${id}/balance/`);
  },

  async importPortfolio(file: File): Promise<{ created: number; skipped: number; errors: string[]; total_rows: number }> {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch("/api/emissions/import/", { method: "POST", body: fd });
  },

  async export(queryString: string): Promise<void> {
    const url = queryString ? `${API_BASE}/api/emissions/export/?${queryString}` : `${API_BASE}/api/emissions/export/`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || "Erreur export"); }
    const blob = await res.blob();
    const dl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = dl; a.download = `emissions_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    window.URL.revokeObjectURL(dl);
  },
};

// ── Paiements API ────────────────────────────────────────────────────────────

export const paiementsApi = {
  async list(emissionId?: string): Promise<Paiement[]> {
    const url = emissionId ? `/api/paiements/?emission_id=${emissionId}` : "/api/paiements/";
    try {
      const raw = await apiFetch(url);
      return Array.isArray(raw) ? (raw as Record<string, unknown>[]).map(mapPaiement) : [];
    } catch { return []; }
  },

  async create(data: Record<string, unknown>): Promise<Paiement> {
    const raw = await apiFetch<Record<string, unknown>>("/api/paiements/", {
      method: "POST",
      body: JSON.stringify({ emission: data.emissionId, date_reglement: data.dateReglement, reference: data.reference, montant_regle: data.montantRegle, observations: data.observations }),
    });
    return mapPaiement(raw);
  },

  async update(id: string, data: Partial<{ dateReglement: string; reference: string; montantRegle: number; observations?: string }>): Promise<Paiement> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/paiements/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
    return mapPaiement(raw);
  },
};

// ── Compagnies API ───────────────────────────────────────────────────────────

export const compagniesApi = {
  async search(query?: string): Promise<string[]> {
    const q = new URLSearchParams();
    if (query) q.append("search", query);
    const url = q.toString() ? `/api/compagnies/?${q}` : "/api/compagnies/";
    try {
      const raw = await apiFetch<Array<{ id: string; name: string }>>(url);
      return raw.map((item) => item.name);
    } catch { return []; }
  },
};

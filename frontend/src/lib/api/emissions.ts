import { apiFetch, API_BASE } from "./client";
import type { Emission, Paiement, PaginatedResponse } from "@/lib/types";
import { fmtDate } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

export type EmissionListParams = {
  clientId?: string;
  agentId?: string;
  compagnie?: string;
  risque?: string;
  situation?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  dateMin?: string;
  dateMax?: string;
  dateFrom?: string;
  dateTo?: string;
  echeanceMin?: string;
  echeanceMax?: string;
  echeanceFrom?: string;
  echeanceTo?: string;
  ordering?: string;
};

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapPaiement(p: Record<string, unknown>): Paiement {
  return {
    id: String(p.id),
    emissionId: String(p.emission),
    dateReglement: fmtDate(p.date_reglement as string),
    reference: (p.reference as string) ?? "",
    montantRegle: Number(p.montant_regle ?? 0),
    observations: (p.observations as string) ?? "",
  };
}

function mapEmission(e: Record<string, unknown>): Emission {
  return {
    id: String(e.id),
    clientId: e.client ? String(e.client) : "",
    clientNom: (e.client_nom as string) ?? "",
    date: fmtDate(e.date as string),
    risque: (e.risque as string) ?? "",
    compagnie: (e.compagnie as string) ?? "",
    numFacture: (e.num_facture as string) ?? "",
    numPolice: (e.num_police as string) ?? "",
    marque: (e.marque as string) ?? "",
    immatriculation: (e.immatriculation as string) ?? "",
    effet: fmtDate(e.effet as string),
    echeance: fmtDate(e.echeance as string),
    primeNette: Number(e.prime_nette ?? 0),
    primeTTC: Number(e.prime_ttc ?? 0),
    tauxCommission: Number(e.taux_commission ?? 0),
    montantCommission: Number(e.montant_commission ?? 0),
    totalPaye: Number(e.total_paye ?? 0),
    solde: Number(e.solde ?? 0),
    situation: (e.situation as Emission["situation"]) ?? "Affaire nouvelle",
    paiements: Array.isArray(e.paiements)
      ? (e.paiements as Record<string, unknown>[]).map(mapPaiement)
      : [],
  };
}

function normalizePaginated(
  raw: Record<string, unknown> | Record<string, unknown>[]
): PaginatedResponse<Emission> {
  if (Array.isArray(raw)) {
    return { results: raw.map(mapEmission), count: raw.length, next: null, previous: null };
  }
  const results = Array.isArray(raw.results) ? (raw.results as Record<string, unknown>[]) : [];
  return {
    results: results.map(mapEmission),
    count: (raw.count as number) ?? results.length,
    next: (raw.next as string | null) ?? null,
    previous: (raw.previous as string | null) ?? null,
  };
}

// ── Emissions API ─────────────────────────────────────────────────────────────

export const emissionsApi = {
  async list(params?: EmissionListParams): Promise<PaginatedResponse<Emission>> {
    const q = new URLSearchParams();
    if (params?.clientId) q.append("client", params.clientId);
    if (params?.agentId) q.append("agent", params.agentId);
    if (params?.compagnie) q.append("compagnie", params.compagnie);
    if (params?.risque) q.append("risque", params.risque);
    if (params?.situation) q.append("situation", params.situation);
    if (params?.search) q.append("search", params.search);
    if (params?.page) q.append("page", String(params.page));
    if (params?.pageSize) q.append("page_size", String(params.pageSize));
    if (params?.dateMin) q.append("date__gte", params.dateMin);
    if (params?.dateMax) q.append("date__lte", params.dateMax);
    if (params?.echeanceMin) q.append("echeance__gte", params.echeanceMin);
    if (params?.echeanceMax) q.append("echeance__lte", params.echeanceMax);
    const url = q.toString() ? `/api/emissions/?${q}` : "/api/emissions/";
    try {
      const raw = await apiFetch<Record<string, unknown> | Record<string, unknown>[]>(url);
      return normalizePaginated(raw as Record<string, unknown>);
    } catch {
      return { results: [], count: 0, next: null, previous: null };
    }
  },

  async create(data: {
    date: string;
    situation: string;
    clientId: string;
    risque: string;
    compagnie: string;
    numFacture?: string;
    numPolice?: string;
    effet?: string;
    echeance?: string;
    primeNette: number;
    primeTtc: number;
    marque?: string;
    immatriculation?: string;
    paiements?: unknown[];
  }): Promise<Emission> {
    const raw = await apiFetch<Record<string, unknown>>("/api/emissions/", {
      method: "POST",
      body: JSON.stringify({
        client: data.clientId,
        date: data.date,
        situation: data.situation,
        risque: data.risque,
        compagnie: data.compagnie,
        num_facture: data.numFacture ?? "",
        num_police: data.numPolice ?? "",
        effet: data.effet ?? "",
        echeance: data.echeance ?? "",
        prime_nette: data.primeNette,
        prime_ttc: data.primeTtc,
        marque: data.marque ?? "-",
        immatriculation: data.immatriculation ?? "-",
      }),
    });
    return mapEmission(raw);
  },

  async getById(id: string): Promise<Emission> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/emissions/${id}/`);
    return mapEmission(raw);
  },

  async getBalance(id: string): Promise<{ solde: number; total_paye: number; prime_ttc: number }> {
    return apiFetch(`/api/emissions/${id}/balance/`);
  },

  async export(queryString: string): Promise<void> {
    const url = `${API_BASE}/api/emissions/export/${queryString ? `?${queryString}` : ""}`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("Erreur lors de l'export");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = "emissions.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  },

  async importPortfolio(file: File): Promise<{ created: number; skipped: number; errors: string[]; total_rows: number }> {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch("/api/emissions/import/", {
      method: "POST",
      body: formData,
    });
  },
};

// ── Paiements API ─────────────────────────────────────────────────────────────

export const paiementsApi = {
  async create(data: {
    emissionId: string;
    dateReglement: string;
    reference: string;
    montantRegle: number;
    observations?: string;
  }): Promise<Paiement> {
    const raw = await apiFetch<Record<string, unknown>>("/api/paiements/", {
      method: "POST",
      body: JSON.stringify({
        emission: data.emissionId,
        date_reglement: data.dateReglement,
        reference: data.reference,
        montant_regle: data.montantRegle,
        observations: data.observations ?? "",
      }),
    });
    return mapPaiement(raw);
  },
};

// ── Compagnies API ────────────────────────────────────────────────────────────

export const compagniesApi = {
  async search(query: string): Promise<string[]> {
    try {
      const q = new URLSearchParams({ search: query });
      const raw = await apiFetch<{ results: string[] } | string[]>(`/api/compagnies/?${q}`);
      if (Array.isArray(raw)) return raw;
      if (raw && typeof raw === "object" && "results" in raw) return raw.results;
      return [];
    } catch {
      return [];
    }
  },
};

// ── Dashboard API ─────────────────────────────────────────────────────────────

interface DashboardStatsRaw {
  total_contrats: number;
  contrats_actifs: number;
  contrats_expires: number;
  total_primes: number;
  primes_payees: number;
  primes_impayees: number;
  total_clients: number;
  total_prospects: number;
  total_agents: number;
  [key: string]: number;
}

export const dashboardApi = {
  async stats(): Promise<DashboardStatsRaw> {
    try {
      return await apiFetch<DashboardStatsRaw>("/api/dashboard/stats/");
    } catch {
      return {
        total_contrats: 0, contrats_actifs: 0, contrats_expires: 0,
        total_primes: 0, primes_payees: 0, primes_impayees: 0,
        total_clients: 0, total_prospects: 0, total_agents: 0,
      };
    }
  },
};

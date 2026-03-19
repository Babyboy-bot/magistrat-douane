// ── Configuration ──

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export async function downloadFile(url: string, nom: string): Promise<void> {
  try {
    const response = await fetch(url, { credentials: "include" });
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
}

type ApiFetchOptions = RequestInit & {
  skipAuthHandling?: boolean;
};

// ── Compagnies API ──

export const compagniesApi = {
  async search(query?: string): Promise<string[]> {
    const params = new URLSearchParams();
    if (query) {
      params.append("search", query);
    }
    const url = params.toString() ? `/api/compagnies/?${params.toString()}` : "/api/compagnies/";
    try {
      const raw = await apiFetch<Array<{ id: string; name: string }>>(url);
      return raw.map((item) => item.name);
    } catch (error) {
      console.error("Compagnies API error:", error);
      return [];
    }
  },
};

// ── Type imports ──
import type {
  User,
  UserRole,
  Profession,
  AccountStatus,
  RiskLevel,
  Emission,
  Paiement,
  ClientRequest,
  RequestType,
  RequestStatus,
  Document,
  AuditLogEntry,
  PaginatedResponse,
  ContratEpargne,
  ContratPrevoyance,
} from "@/lib/types";

// ── Helpers ──

const extractErrorMessage = (data: unknown): string | undefined => {
  if (!data) return undefined;
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj.detail === "string") return obj.detail;
    if (typeof obj.message === "string") return obj.message;
    for (const value of Object.values(obj)) {
      if (typeof value === "string" && value.trim()) {
        return value;
      }
      if (Array.isArray(value) && value.length) {
        const first = value[0];
        if (typeof first === "string" && first.trim()) {
          return first;
        }
      }
    }
  }
  return undefined;
};

// ── Shared refresh promise (prevents race conditions on simultaneous 401s) ──
let _refreshPromise: Promise<boolean> | null = null;

const _doRefresh = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    _refreshPromise = null;
  }
};

const refreshOnce = (): Promise<boolean> => {
  if (!_refreshPromise) _refreshPromise = _doRefresh();
  return _refreshPromise;
};

// ── Core API fetch function with automatic token refresh ──

export const apiFetch = async <T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> => {
  const { skipAuthHandling = false, ...requestOptions } = options;

  const baseHeaders: Record<string, string> =
    requestOptions.body instanceof FormData ? {} : { "Content-Type": "application/json" };

  const mergedHeaders: Record<string, string> = {
    ...baseHeaders,
    ...(requestOptions.headers as Record<string, string> | undefined),
  };

  const buildRequestInit = (): RequestInit => ({
    ...requestOptions,
    headers: mergedHeaders,
    credentials: "include",
  });

  const buildApiUrl = (p: string) => `${API_BASE}${p}`;

  // First attempt
  let response = await fetch(buildApiUrl(path), buildRequestInit());

  // If 401, try to refresh token once (unless skipped)
  if (!skipAuthHandling && response.status === 401 && !path.includes('/token/refresh/')) {
    const refreshed = await refreshOnce();
    if (refreshed) {
      response = await fetch(buildApiUrl(path), buildRequestInit());
    } else {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
      throw new Error('Session expirée');
    }
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message = extractErrorMessage(errorBody);
    throw new Error(message || `HTTP ${response.status}`);
  }

  if (response.status === 204) return {} as T;
  return response.json() as Promise<T>;
};

// ── Query param helpers ──

export interface EmissionListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  clientId?: string;
  agentId?: string;
  compagnie?: string;
  risque?: string;
  situation?: string;
  dateFrom?: string;
  dateTo?: string;
  echeanceFrom?: string;
  echeanceTo?: string;
  ordering?: string;
}

// ── Mapping helpers (snake_case API → camelCase frontend) ──

function mapUser(u: Record<string, unknown>): User {
  return {
    id: String(u.id),
    nom: u.nom as string,
    prenoms: u.prenoms as string,
    profession: (u.profession as string) || "",
    professionType: (u.profession_type as Profession) || "autre",
    telephone: u.telephone as string,
    telephone2: (u.telephone2 as string) || "",
    email: (u.email as string) || "",
    photo: (u.photo as string) || "",
    role: u.role as UserRole,
    verified: Boolean(u.verified),
    verifiedAt: (u.verified_at as string) || undefined,
    verifiedBy: (u.verified_by as string) || undefined,
    accountStatus: (u.account_status as AccountStatus) || "active",
    riskLevel: (u.risk_level as RiskLevel) || "standard",
    createdAt: u.created_at as string,
    is_active: Boolean(u.is_active),
  };
}

function mapAuditLog(entry: Record<string, unknown>): AuditLogEntry {
  return {
    id: String(entry.id),
    action: entry.action as string,
    metadata: (entry.metadata as Record<string, unknown>) || {},
    performedBy: (entry.performed_by as string) || null,
    targetUser: entry.target_user as string,
    createdAt: entry.created_at as string,
  };
}

// ── Audit Logs API ──

export const auditLogsApi = {
  async list(params?: { userId?: string; action?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<AuditLogEntry>> {
    const query = new URLSearchParams();
    if (params?.userId) query.append("user_id", params.userId);
    if (params?.action) query.append("action", params.action);
    if (params?.page) query.append("page", String(params.page));
    if (params?.pageSize) query.append("page_size", String(params.pageSize));
    const url = query.toString() ? `/api/auth/audit-logs/?${query.toString()}` : "/api/auth/audit-logs/";
    const raw = await apiFetch<PaginatedResponse<Record<string, unknown>> | Record<string, unknown>[]>(url);

    if (Array.isArray(raw)) {
      return {
        results: raw.map(mapAuditLog),
        count: raw.length,
        next: null,
        previous: null,
      };
    }

    const resultsArray = Array.isArray(raw.results) ? raw.results : [];
    return {
      results: resultsArray.map(mapAuditLog),
      count: raw.count ?? resultsArray.length,
      next: raw.next ?? null,
      previous: raw.previous ?? null,
    };
  },
};

// ── Auth API ──

export const authApi = {
  async login(identifier: string, password: string): Promise<User> {
    const raw = await apiFetch<Record<string, unknown>>(
      "/api/auth/login/",
      {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
        skipAuthHandling: true,
      }
    );
    return mapUser(raw);
  },

  async logout(): Promise<void> {
    await apiFetch("/api/auth/logout/", { method: "POST" });
  },

  async me(): Promise<User> {
    const raw = await apiFetch<Record<string, unknown>>("/api/auth/me/");
    return mapUser(raw);
  },

  async updateProfile(data: Partial<{
    nom: string;
    prenoms: string;
    profession: string;
    telephone: string;
    telephone2: string;
  }>): Promise<User> {
    const raw = await apiFetch<Record<string, unknown>>("/api/auth/me/", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return mapUser(raw);
  },

  async register(data: {
    nom: string;
    prenoms: string;
    profession: string;
    profession_type: string;
    telephone: string;
    telephone2?: string;
    email: string;
    password: string;
  }): Promise<User> {
    const raw = await apiFetch<Record<string, unknown>>("/api/auth/register/", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return mapUser(raw);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiFetch("/api/auth/me/password/", {
      method: "POST",
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  },

  async resetPassword(identifier: string): Promise<{ message: string }> {
    const raw = await apiFetch<Record<string, unknown>>("/api/auth/reset-password/", {
      method: "POST",
      body: JSON.stringify({ identifier }),
    });
    return raw as { message: string };
  },
};

// ── Users API ──

export type UserListParams = {
  role?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  profession_type?: string;
  exclude_profession_type?: string;
  risk_level?: string;
  account_status?: string;
};

export const usersApi = {
  async listPaginated(params?: UserListParams): Promise<PaginatedResponse<User>> {
    const query = new URLSearchParams();
    if (params?.role) query.append("role", params.role);
    if (params?.search) query.append("search", params.search);
    if (params?.page) query.append("page", String(params.page));
    if (params?.pageSize) query.append("page_size", String(params.pageSize));
    if (params?.profession_type) query.append("profession_type", params.profession_type);
    if (params?.exclude_profession_type) query.append("exclude_profession_type", params.exclude_profession_type);
    if (params?.risk_level) query.append("risk_level", params.risk_level);
    if (params?.account_status) query.append("account_status", params.account_status);
    const url = query.toString() ? `/api/auth/users/?${query.toString()}` : "/api/auth/users/";

    try {
      const raw = await apiFetch<PaginatedResponse<Record<string, unknown>> | Record<string, unknown>[]>(url);

      if (Array.isArray(raw)) {
        return {
          results: raw.map(mapUser),
          count: raw.length,
          next: null,
          previous: null,
        };
      }

      const resultsArray = Array.isArray(raw.results) ? raw.results : [];
      return {
        results: resultsArray.map(mapUser),
        count: raw.count ?? resultsArray.length,
        next: raw.next ?? null,
        previous: raw.previous ?? null,
      };
    } catch (error) {
      console.error('Users API error:', error);
      return { results: [], count: 0, next: null, previous: null };
    }
  },

  async list(role?: string): Promise<User[]> {
    const response = await usersApi.listPaginated({ role, pageSize: 200 });
    return response.results;
  },

  async create(data: {
    nom: string;
    prenoms: string;
    email: string;
    telephone: string;
    telephone2?: string;
    password: string;
  }): Promise<User> {
    const raw = await apiFetch<Record<string, unknown>>("/api/auth/users/create/", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return mapUser(raw);
  },

  async update(id: number, data: Partial<{
    nom: string;
    prenoms: string;
    email: string;
    telephone: string;
    telephone2: string;
    is_active: boolean;
    password?: string;
  }>): Promise<User> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/auth/users/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return mapUser(raw);
  },

  async verify(id: number): Promise<void> {
    await apiFetch(`/api/auth/users/verify/`, { 
      method: "POST",
      body: JSON.stringify({ user_id: id, action: "verify" })
    });
  },

  async reject(id: number): Promise<void> {
    await apiFetch(`/api/auth/users/verify/`, { 
      method: "POST",
      body: JSON.stringify({ user_id: id, action: "reject" })
    });
  },

  async remind(id: number): Promise<void> {
    await apiFetch("/api/auth/users/remind/", {
      method: "POST",
      body: JSON.stringify({ user_id: id }),
    });
  },

  async createClient(data: {
    nom: string;
    prenoms: string;
    email: string;
    telephone: string;
    telephone2?: string;
    password: string;
  }): Promise<User> {
    const raw = await apiFetch<Record<string, unknown>>("/api/auth/users/create/", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return mapUser(raw);
  },
};

// ── Agents API ──

export const agentsApi = {
  async list(): Promise<User[]> {
    try {
      const raw = await apiFetch("/api/auth/users/?role=agent");
      // Gérer la pagination Django REST Framework
      let dataArray = [];
      if (raw && typeof raw === 'object' && 'results' in raw) {
        // Format paginé : {count, next, previous, results}
        dataArray = Array.isArray(raw.results) ? raw.results : [];
      } else if (Array.isArray(raw)) {
        // Format direct : [user1, user2, ...]
        dataArray = raw;
      }
      return dataArray.map(mapUser);
    } catch (error) {
      console.error('Agents API error:', error);
      return []; // Toujours retourner un tableau vide en cas d'erreur
    }
  },

  async create(data: {
    email: string;
    password: string;
    nom: string;
    prenoms: string;
    telephone?: string;
    telephone2?: string;
  }): Promise<User> {
    const raw = await apiFetch<Record<string, unknown>>("/api/auth/agents/create/", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return mapUser(raw);
  },

  async update(id: number, data: Partial<{
    nom: string;
    prenoms: string;
    email: string;
    telephone: string;
    telephone2: string;
    is_active: boolean;
    password?: string;
  }>): Promise<User> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/auth/agents/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return mapUser(raw);
  },
};

// ── Emissions API ──

export const emissionsApi = {
  async list(params?: EmissionListParams): Promise<PaginatedResponse<Emission>> {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.pageSize) query.append("page_size", String(params.pageSize));
    if (params?.search) query.append("search", params.search);
    if (params?.clientId) query.append("client", params.clientId);
    if (params?.agentId) query.append("agent", params.agentId);
    if (params?.compagnie) query.append("compagnie", params.compagnie);
    if (params?.risque) query.append("risque", params.risque);
    if (params?.situation) query.append("situation", params.situation);
    if (params?.dateFrom) query.append("date__gte", params.dateFrom);
    if (params?.dateTo) query.append("date__lte", params.dateTo);
    if (params?.echeanceFrom) query.append("echeance__gte", params.echeanceFrom);
    if (params?.echeanceTo) query.append("echeance__lte", params.echeanceTo);
    if (params?.ordering) query.append("ordering", params.ordering);
    const url = query.toString() ? `/api/emissions/?${query.toString()}` : "/api/emissions/";
    try {
      const raw = await apiFetch<
        PaginatedResponse<Record<string, unknown>> | Record<string, unknown>[]
      >(url);
      if (Array.isArray(raw)) {
        return {
          results: raw.map(mapEmission),
          count: raw.length,
          next: null,
          previous: null,
        };
      }
      const resultsArray = Array.isArray(raw.results) ? raw.results : [];
      return {
        results: resultsArray.map(mapEmission),
        count: raw.count ?? resultsArray.length,
        next: raw.next ?? null,
        previous: raw.previous ?? null,
      };
    } catch (error) {
      console.error("Emissions API error:", error);
      return {
        results: [],
        count: 0,
        next: null,
        previous: null,
      };
    }
  },

  async create(data: Record<string, unknown>): Promise<Emission> {
    const payload = {
      client: data.clientId,
      agent: data.agentId,
      date: data.date,
      risque: data.risque,
      compagnie: data.compagnie,
      num_facture: data.numFacture,
      num_police: data.numPolice,
      effet: data.effet,
      echeance: data.echeance,
      prime_nette: data.primeNette,
      prime_ttc: data.primeTtc,
      situation: data.situation,
      marque: data.marque,
      immatriculation: data.immatriculation,
      paiements: data.paiements ?? [],
    };

    const raw = await apiFetch<Record<string, unknown>>("/api/emissions/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return mapEmission(raw);
  },

  async getById(id: string): Promise<Emission> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/emissions/${id}/`);
    return mapEmission(raw);
  },

  async getBalance(id: string): Promise<{ emission_id: number; prime_ttc: number; total_paye: number; solde: number }> {
    return apiFetch(`/api/emissions/${id}/balance/`);
  },

  async importPortfolio(file: File): Promise<{
    created: number;
    skipped: number;
    errors: string[];
    total_rows: number;
  }> {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch("/api/emissions/import/", {
      method: "POST",
      body: formData,
    });
  },

  async export(queryString: string): Promise<void> {
    const url = queryString
      ? `${API_BASE}/api/emissions/export/?${queryString}`
      : `${API_BASE}/api/emissions/export/`;
    const response = await fetch(url, {
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Erreur export");
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `emissions_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },
};

// ── Mapping helpers for complex types ──

function mapDocument(d: Record<string, unknown>): Document {
  return {
    id: String(d.id),
    nom: d.nom as string,
    typeFichier: (d.type_fichier as string) ?? "",
    fichier: (d.fichier as string) ?? "",
    isLivrable: Boolean(d.is_livrable),
    uploadedBy: d.uploaded_by ? String(d.uploaded_by) : "",
    createdAt: (d.created_at as string) ?? "",
  };
}

function mapRequest(r: Record<string, unknown>): ClientRequest {
  return {
    id: String(r.id),
    numero: r.numero as string,
    clientId: r.client ? String(r.client) : (r.client_id ? String(r.client_id) : ''),
    clientNom: r.client_nom as string,
    type: r.type as RequestType,
    status: r.status as RequestStatus,
    agentId: r.agent ? String(r.agent) : (r.agent_id ? String(r.agent_id) : undefined),
    agentNom: (r.agent_nom as string) || undefined,
    documents: Array.isArray(r.documents) && r.documents.length > 0 ? (r.documents as Record<string, unknown>[]).map(mapDocument) : [],
    livrables: Array.isArray(r.livrables) && r.livrables.length > 0 ? (r.livrables as Record<string, unknown>[]).map(mapDocument) : [],
    createdAt: r.created_at ? new Date(r.created_at as string).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "",
    treatedAt: r.treated_at ? new Date(r.treated_at as string).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : undefined,
    details: r.details as Record<string, unknown>,
  };
}

// ── Requests API ──

export const requestsApi = {
  async list(clientId?: string): Promise<ClientRequest[]> {
    const url = clientId ? `/api/requests/?client_id=${clientId}` : "/api/requests/";
    try {
      const raw = await apiFetch(url);
      // Gérer la pagination Django REST Framework
      let dataArray = [];
      if (raw && typeof raw === 'object' && 'results' in raw) {
        // Format paginé : {count, next, previous, results}
        dataArray = Array.isArray(raw.results) ? raw.results : [];
      } else if (Array.isArray(raw)) {
        // Format direct : [request1, request2, ...]
        dataArray = raw;
      }
      return dataArray.map(mapRequest);
    } catch (error) {
      console.error('Requests API error:', error);
      return []; // Toujours retourner un tableau vide en cas d'erreur
    }
  },

  async create(type: RequestType, details: Record<string, unknown>): Promise<ClientRequest> {
    const raw = await apiFetch<Record<string, unknown>>("/api/requests/", {
      method: "POST",
      body: JSON.stringify({
        type: type,
        details: details
      }),
    });
    return mapRequest(raw);
  },

  async update(id: string, data: {
    agentId?: string;
    status: RequestStatus;
    details?: Record<string, unknown>;
  }): Promise<ClientRequest> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/requests/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return mapRequest(raw);
  },

  async treat(id: string | number): Promise<ClientRequest> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/requests/${id}/treat/`, {
      method: "POST",
    });
    return mapRequest(raw);
  },

  async claim(id: string | number): Promise<ClientRequest> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/requests/${id}/claim/`, {
      method: "POST",
    });
    return mapRequest(raw);
  },

  async release(id: string | number): Promise<ClientRequest> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/requests/${id}/release/`, {
      method: "POST",
    });
    return mapRequest(raw);
  },

  async getLivrables(id: string | number): Promise<Document[]> {
    const raw = await apiFetch<Record<string, unknown>[]>(`/api/requests/${id}/livrables/`);
    return Array.isArray(raw) ? raw.map(mapDocument) : [];
  },

  async uploadLivrable(id: string | number, file: File, nom: string): Promise<Document> {
    const formData = new FormData();
    formData.append("fichier", file);
    formData.append("nom", nom);
    formData.append("type_fichier", file.type);
    const raw = await apiFetch<Record<string, unknown>>(`/api/requests/${id}/livrables/`, {
      method: "POST",
      body: formData,
    });
    return mapDocument(raw);
  },
};

// ── Mapping helpers for complex types ──

function mapEmission(e: Record<string, unknown>): Emission {
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
    paiements: Array.isArray(e.paiements)
      ? (e.paiements as Record<string, unknown>[]).map(mapPaiement)
      : [],
  };
}

function mapPaiement(p: Record<string, unknown>): Paiement {
  const emissionPk =
    p.emission_id ?? p.emission ?? (p.emission && typeof p.emission === "object" ? (p.emission as Record<string, unknown>).id : undefined);
  return {
    id: String(p.id),
    emissionId: emissionPk ? String(emissionPk) : "",
    dateReglement: p.date_reglement as string,
    reference: p.reference as string,
    montantRegle: Number(p.montant_regle),
    observations: (p.observations as string) || undefined,
  };
}

// ── Payments API ──

export const paiementsApi = {
  async list(emissionId?: string): Promise<Paiement[]> {
    const url = emissionId ? `/api/paiements/?emission_id=${emissionId}` : "/api/paiements/";
    try {
      const raw = await apiFetch(url);
      // S'assurer que raw est toujours un tableau
      const dataArray = Array.isArray(raw) ? raw : [];
      return dataArray.map(mapPaiement);
    } catch (error) {
      console.error('Paiements API error:', error);
      return []; // Toujours retourner un tableau vide en cas d'erreur
    }
  },

  async create(data: Record<string, unknown>): Promise<Paiement> {
    const payload = {
      emission: data.emissionId,
      date_reglement: data.dateReglement,
      reference: data.reference,
      montant_regle: data.montantRegle,
      observations: data.observations,
    };
    const raw = await apiFetch<Record<string, unknown>>("/api/paiements/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return mapPaiement(raw);
  },

  async update(id: string, data: Partial<{
    dateReglement: string;
    reference: string;
    montantRegle: number;
    observations?: string;
  }>): Promise<Paiement> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/paiements/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return mapPaiement(raw);
  },
};

// ── Documents API ──

export const documentsApi = {
  async list(requestId?: string): Promise<Document[]> {
    const url = requestId ? `/api/documents/?request_id=${requestId}` : "/api/documents/";
    try {
      const raw = await apiFetch(url);
      // S'assurer que raw est toujours un tableau
      const dataArray = Array.isArray(raw) ? raw : [];
      return dataArray.map(mapDocument);
    } catch (error) {
      console.error('Documents API error:', error);
      return []; // Toujours retourner un tableau vide en cas d'erreur
    }
  },

  async uploadCarteGrise(file: File): Promise<{
    document_id: string;
    document_nom: string;
    file_size: number;
    file_type: string;
    message: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const raw = await apiFetch("/api/carte-grise/", {
        method: "POST",
        body: formData,
      });
      return raw as {
        document_id: string;
        document_nom: string;
        file_size: number;
        file_type: string;
        message: string;
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      // Si 401, rediriger vers login
      if (message.includes('401') || message.includes('Session expired')) {
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
        throw new Error('Session expirée, veuillez vous reconnecter');
      }
      throw error;
    }
  },

  async upload(file: File, requestId?: string | number, isLivrable?: boolean): Promise<Document> {
    const formData = new FormData();
    formData.append('fichier', file); // Backend attend 'fichier'
    formData.append('nom', file.name); // Champ obligatoire
    if (requestId) {
      formData.append('request', String(requestId));
    }
    if (isLivrable) {
      formData.append('is_livrable', 'true');
    }

    const raw = await apiFetch<Record<string, unknown>>("/api/documents/", {
      method: "POST",
      body: formData,
    });
    return mapDocument(raw);
  },

  async delete(id: string): Promise<void> {
    await apiFetch(`/api/documents/${id}/`, { method: "DELETE" });
  },
};

// ── MAGIST'ASSUR API ──

function mapContratEpargne(r: Record<string, unknown>): ContratEpargne {
  return {
    id: String(r.id),
    numPolice: (r.num_police as string) || "",
    clientId: String(r.client),
    clientNom: (r.client_nom as string) || "",
    agentId: r.agent ? String(r.agent) : undefined,
    dureeAnnees: (r.duree_annees as number) || 0,
    periodicite: (r.periodicite as ContratEpargne["periodicite"]) || "mensuelle",
    datePremiereCotisation: (r.date_premiere_cotisation as string) || undefined,
    dateEffet: (r.date_effet as string) || undefined,
    montantCotisation: Number(r.montant_cotisation) || 0,
    capitalConstitue: Number(r.capital_constitue) || 0,
    modePaiement: (r.mode_paiement as string) || "",
    numeroCompte: (r.numero_compte as string) || "",
    statut: (r.statut as ContratEpargne["statut"]) || "en_cours",
    fraisGestionPct: Number(r.frais_gestion_pct) || 5,
    fraisAccessoires: Number(r.frais_accessoires) || 1000,
    coutPolice: Number(r.cout_police) || 10000,
    tauxInteret: Number(r.taux_interet) || 3.5,
    primeAnnuelle: Number(r.prime_annuelle) || 0,
    correspondants: (r.correspondants as Record<string, unknown>[] || []).map((c) => ({
      id: String(c.id),
      numero: (c.numero as 1 | 2),
      nom: (c.nom as string) || "",
      prenom: (c.prenom as string) || "",
      domicile: (c.domicile as string) || "",
      adressePostale: (c.adresse_postale as string) || "",
      telephone: (c.telephone as string) || "",
      email: (c.email as string) || "",
      whatsapp: (c.whatsapp as string) || "",
    })),
    beneficiaires: (r.beneficiaires as Record<string, unknown>[] || []).map((b) => ({
      id: String(b.id),
      conjointCorps: Boolean(b.conjoint_corps),
      enfantsNes: Boolean(b.enfants_nes),
      nom: (b.nom as string) || "",
      dateNaissance: (b.date_naissance as string) || undefined,
      domicile: (b.domicile as string) || "",
      telephone: (b.telephone as string) || "",
      email: (b.email as string) || "",
      enQualiteDe: (b.en_qualite_de as string) || "",
      tauxRepartition: Number(b.taux_repartition) || 100,
    })),
    cotisations: (r.cotisations as Record<string, unknown>[] || []).map((c) => ({
      id: String(c.id),
      dateEcheance: (c.date_echeance as string) || "",
      datePaiement: (c.date_paiement as string) || undefined,
      montant: Number(c.montant) || 0,
      statut: (c.statut as ContratEpargne["cotisations"][0]["statut"]),
      reference: (c.reference as string) || "",
    })),
    createdAt: (r.created_at as string) || "",
    civilite: (r.civilite as string) || undefined,
    situationMatrimoniale: (r.situation_matrimoniale as string) || undefined,
    dateNaissance: (r.date_naissance as string) || undefined,
    numeroPiece: (r.numero_piece as string) || undefined,
    nni: (r.nni as string) || undefined,
    professionDetail: (r.profession_detail as string) || undefined,
    statutProfessionnel: (r.statut_professionnel as string) || undefined,
    revenuMensuel: r.revenu_mensuel ? Number(r.revenu_mensuel) : undefined,
    origineRevenu: (r.origine_revenu as string) || undefined,
    whatsapp: (r.whatsapp as string) || undefined,
    telephone: (r.telephone as string) || undefined,
    emailPersonnel: (r.email_personnel as string) || undefined,
    adressePostale: (r.adresse_postale as string) || undefined,
  };
}

function mapContratPrevoyance(r: Record<string, unknown>): ContratPrevoyance {
  return {
    id: String(r.id),
    numPolice: (r.num_police as string) || "",
    clientId: String(r.client),
    clientNom: (r.client_nom as string) || "",
    agentId: r.agent ? String(r.agent) : undefined,
    garantiePrevoyanceDeces: Boolean(r.garantie_prevoyance_deces),
    garantiefraisFuneraires: Boolean(r.garantie_frais_funeraires),
    dateEffet: (r.date_effet as string) || undefined,
    dateEcheance: (r.date_echeance as string) || undefined,
    statut: (r.statut as ContratPrevoyance["statut"]) || "en_cours",
    primeAnnuelle: Number(r.prime_annuelle) || 0,
    fraisFixes: Number(r.frais_fixes) || 3500,
    assuresAssocies: (r.assures_associes as Record<string, unknown>[] || []).map((a) => ({
      id: String(a.id),
      lienParente: (a.lien_parente as AssureAssocieType),
      nom: (a.nom as string) || "",
      dateNaissance: (a.date_naissance as string) || undefined,
      contact: (a.contact as string) || "",
      montantIndemnite: Number(a.montant_indemnite) || 0,
      prime: Number(a.prime) || 0,
    })),
    beneficiaires: (r.beneficiaires as Record<string, unknown>[] || []).map((b) => ({
      id: String(b.id),
      conjointCorps: Boolean(b.conjoint_corps),
      enfantsNes: Boolean(b.enfants_nes),
      nom: (b.nom as string) || "",
      dateNaissance: (b.date_naissance as string) || undefined,
      telephone: (b.telephone as string) || "",
      enQualiteDe: (b.en_qualite_de as string) || "",
      tauxRepartition: Number(b.taux_repartition) || 100,
    })),
    questionnaireMedical: r.questionnaire_medical ? {
      id: String((r.questionnaire_medical as Record<string, unknown>).id),
      tailleCm: (r.questionnaire_medical as Record<string, unknown>).taille_cm as number | undefined,
      poidsKg: (r.questionnaire_medical as Record<string, unknown>).poids_kg as number | undefined,
      tensionArterielle: (r.questionnaire_medical as Record<string, unknown>).tension_arterielle as string | undefined,
      fumeur: Boolean((r.questionnaire_medical as Record<string, unknown>).fumeur),
      alcool: (r.questionnaire_medical as Record<string, unknown>).alcool as string || "",
      sport: Boolean((r.questionnaire_medical as Record<string, unknown>).sport),
      invalidite: Boolean((r.questionnaire_medical as Record<string, unknown>).invalidite),
      antecedents: ((r.questionnaire_medical as Record<string, unknown>).antecedents as Record<string, Record<string, string>>) || {},
    } : undefined,
    createdAt: (r.created_at as string) || "",
    civilite: (r.civilite as string) || undefined,
    situationMatrimoniale: (r.situation_matrimoniale as string) || undefined,
    dateNaissance: (r.date_naissance as string) || undefined,
    numeroPiece: (r.numero_piece as string) || undefined,
    nni: (r.nni as string) || undefined,
    professionDetail: (r.profession_detail as string) || undefined,
    whatsapp: (r.whatsapp as string) || undefined,
    telephone: (r.telephone as string) || undefined,
    emailPersonnel: (r.email_personnel as string) || undefined,
    adressePostale: (r.adresse_postale as string) || undefined,
  };
}

type AssureAssocieType = "conjoint" | "enfant" | "pere" | "mere";

export const magistassurApi = {
  // Épargne
  async listEpargne(params?: { clientId?: string; statut?: string }): Promise<ContratEpargne[]> {
    const q = new URLSearchParams();
    if (params?.clientId) q.append("client_id", params.clientId);
    if (params?.statut) q.append("statut", params.statut);
    const url = q.toString() ? `/api/magistassur/epargne/?${q}` : "/api/magistassur/epargne/";
    const raw = await apiFetch<Record<string, unknown>[]>(url);
    return (raw || []).map(mapContratEpargne);
  },

  async createEpargne(data: Record<string, unknown>): Promise<ContratEpargne> {
    const raw = await apiFetch<Record<string, unknown>>("/api/magistassur/epargne/", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return mapContratEpargne(raw);
  },

  async getEpargne(id: string): Promise<ContratEpargne> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/magistassur/epargne/${id}/`);
    return mapContratEpargne(raw);
  },

  // Prévoyance
  async listPrevoyance(params?: { clientId?: string; statut?: string }): Promise<ContratPrevoyance[]> {
    const q = new URLSearchParams();
    if (params?.clientId) q.append("client_id", params.clientId);
    if (params?.statut) q.append("statut", params.statut);
    const url = q.toString() ? `/api/magistassur/prevoyance/?${q}` : "/api/magistassur/prevoyance/";
    const raw = await apiFetch<Record<string, unknown>[]>(url);
    return (raw || []).map(mapContratPrevoyance);
  },

  async createPrevoyance(data: Record<string, unknown>): Promise<ContratPrevoyance> {
    const raw = await apiFetch<Record<string, unknown>>("/api/magistassur/prevoyance/", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return mapContratPrevoyance(raw);
  },

  async getPrevoyance(id: string): Promise<ContratPrevoyance> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/magistassur/prevoyance/${id}/`);
    return mapContratPrevoyance(raw);
  },

  async saveQuestionnaireMedical(prevoyanceId: string, data: Record<string, unknown>): Promise<void> {
    await apiFetch(`/api/magistassur/prevoyance/${prevoyanceId}/questionnaire/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async changeStatutEpargne(id: string, statut: string): Promise<ContratEpargne> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/magistassur/epargne/${id}/change-statut/`, {
      method: "POST",
      body: JSON.stringify({ statut }),
    });
    return mapContratEpargne(raw);
  },

  async changeStatutPrevoyance(id: string, statut: string): Promise<ContratPrevoyance> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/magistassur/prevoyance/${id}/change-statut/`, {
      method: "POST",
      body: JSON.stringify({ statut }),
    });
    return mapContratPrevoyance(raw);
  },

  async assignPoliceEpargne(id: string, numPolice: string, codeInspection?: string): Promise<ContratEpargne> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/magistassur/epargne/${id}/assign-police/`, {
      method: "POST",
      body: JSON.stringify({ num_police: numPolice, code_inspection: codeInspection || "" }),
    });
    return mapContratEpargne(raw);
  },

  async assignPolicePrevoyance(id: string, numPolice: string, codeInspection?: string): Promise<ContratPrevoyance> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/magistassur/prevoyance/${id}/assign-police/`, {
      method: "POST",
      body: JSON.stringify({ num_police: numPolice, code_inspection: codeInspection || "" }),
    });
    return mapContratPrevoyance(raw);
  },
};

// ── Dashboard API ──

export const dashboardApi = {
  async stats(role?: string): Promise<{
    total_contrats: number;
    contrats_actifs: number;
    contrats_expires: number;
    total_primes: number;
    primes_payees: number;
    primes_impayees: number;
    total_clients: number;
    total_prospects: number;
    total_agents: number;
  }> {
    const url = role ? `/api/dashboard/stats/?role=${role}` : "/api/dashboard/stats/";
    const raw = await apiFetch(url);
    return raw as {
      total_contrats: number;
      contrats_actifs: number;
      contrats_expires: number;
      total_primes: number;
      primes_payees: number;
      primes_impayees: number;
      total_clients: number;
      total_prospects: number;
      total_agents: number;
    };
  },
};

import { apiFetch } from "./client";
import { mapUser } from "./auth";
import type { User, AuditLogEntry, PaginatedResponse } from "@/lib/types";

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapAuditLog(entry: Record<string, unknown>): AuditLogEntry {
  return {
    id: String(entry.id),
    action: entry.action as string,
    metadata: (entry.metadata as Record<string, unknown>) || {},
    performedBy: (entry.performed_by as string) || null,
    targetUser: entry.target_user as string,
    ipAddress: (entry.ip_address as string) || null,
    createdAt: entry.created_at as string,
  };
}

function normalizePaginated<T>(
  raw: PaginatedResponse<Record<string, unknown>> | Record<string, unknown>[],
  mapper: (item: Record<string, unknown>) => T
): PaginatedResponse<T> {
  if (Array.isArray(raw)) {
    return { results: raw.map(mapper), count: raw.length, next: null, previous: null };
  }
  const results = Array.isArray(raw.results) ? raw.results : [];
  return {
    results: results.map(mapper),
    count: (raw.count as number) ?? results.length,
    next: (raw.next as string | null) ?? null,
    previous: (raw.previous as string | null) ?? null,
  };
}

// ── Users API ────────────────────────────────────────────────────────────────

export const usersApi = {
  async listPaginated(params?: UserListParams): Promise<PaginatedResponse<User>> {
    const q = new URLSearchParams();
    if (params?.role) q.append("role", params.role);
    if (params?.search) q.append("search", params.search);
    if (params?.page) q.append("page", String(params.page));
    if (params?.pageSize) q.append("page_size", String(params.pageSize));
    if (params?.profession_type) q.append("profession_type", params.profession_type);
    if (params?.exclude_profession_type) q.append("exclude_profession_type", params.exclude_profession_type);
    if (params?.risk_level) q.append("risk_level", params.risk_level);
    if (params?.account_status) q.append("account_status", params.account_status);
    const url = q.toString() ? `/api/auth/users/?${q}` : "/api/auth/users/";
    try {
      const raw = await apiFetch<PaginatedResponse<Record<string, unknown>> | Record<string, unknown>[]>(url);
      return normalizePaginated(raw, mapUser);
    } catch {
      return { results: [], count: 0, next: null, previous: null };
    }
  },

  async list(role?: string): Promise<User[]> {
    const res = await usersApi.listPaginated({ role, pageSize: 200 });
    return res.results;
  },

  async update(id: number, data: Partial<{ nom: string; prenoms: string; email: string; telephone: string; telephone2: string; is_active: boolean; password?: string }>): Promise<User> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/auth/users/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return mapUser(raw);
  },

  async verify(id: number): Promise<void> {
    await apiFetch("/api/auth/users/verify/", {
      method: "POST",
      body: JSON.stringify({ user_id: id, action: "verify" }),
    });
  },

  async reject(id: number): Promise<void> {
    await apiFetch("/api/auth/users/verify/", {
      method: "POST",
      body: JSON.stringify({ user_id: id, action: "reject" }),
    });
  },

  async remind(id: number): Promise<void> {
    await apiFetch("/api/auth/users/remind/", {
      method: "POST",
      body: JSON.stringify({ user_id: id }),
    });
  },
};

// ── Agents API ───────────────────────────────────────────────────────────────

export const agentsApi = {
  async list(): Promise<User[]> {
    try {
      const raw = await apiFetch("/api/auth/users/?role=agent");
      if (raw && typeof raw === "object" && "results" in raw) {
        return (Array.isArray((raw as { results: unknown[] }).results) ? (raw as { results: Record<string, unknown>[] }).results : []).map(mapUser);
      }
      return Array.isArray(raw) ? (raw as Record<string, unknown>[]).map(mapUser) : [];
    } catch {
      return [];
    }
  },

  async create(data: { email: string; password: string; nom: string; prenoms: string; telephone?: string; telephone2?: string }): Promise<User> {
    const raw = await apiFetch<Record<string, unknown>>("/api/auth/agents/create/", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return mapUser(raw);
  },

  async update(id: number, data: Partial<{ nom: string; prenoms: string; email: string; telephone: string; telephone2: string; is_active: boolean; password?: string }>): Promise<User> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/auth/agents/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return mapUser(raw);
  },
};

// ── Audit Logs API ───────────────────────────────────────────────────────────

export const auditLogsApi = {
  async list(params?: { userId?: string; action?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<AuditLogEntry>> {
    const q = new URLSearchParams();
    if (params?.userId) q.append("user_id", params.userId);
    if (params?.action) q.append("action", params.action);
    if (params?.page) q.append("page", String(params.page));
    if (params?.pageSize) q.append("page_size", String(params.pageSize));
    const url = q.toString() ? `/api/auth/audit-logs/?${q}` : "/api/auth/audit-logs/";
    const raw = await apiFetch<PaginatedResponse<Record<string, unknown>> | Record<string, unknown>[]>(url);
    return normalizePaginated(raw, mapAuditLog);
  },

  exportCsvUrl(action?: string): string {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
    const q = new URLSearchParams();
    if (action) q.append("action", action);
    return `${API_BASE}/api/auth/audit-logs/export/${q.toString() ? "?" + q : ""}`;
  },
};

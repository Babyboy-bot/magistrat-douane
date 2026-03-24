import { apiFetch } from "./client";
import type { ClientRequest, Document, RequestType, RequestStatus } from "@/lib/types";

// ── Mappers ──────────────────────────────────────────────────────────────────

function normalizeFileUrl(url: string | null | undefined): string {
  if (!url) return "";
  try { return new URL(url).pathname; } catch { return url; }
}

export function mapDocument(d: Record<string, unknown>): Document {
  return {
    id: String(d.id),
    nom: d.nom as string,
    typeFichier: (d.type_fichier as string) ?? "",
    fichier: normalizeFileUrl(d.fichier as string),
    isLivrable: Boolean(d.is_livrable),
    uploadedBy: d.uploaded_by ? String(d.uploaded_by) : "",
    createdAt: (d.created_at as string) ?? "",
  };
}

export function mapRequest(r: Record<string, unknown>): ClientRequest {
  const fmtDate = (v: unknown) =>
    v ? new Date(v as string).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
  return {
    id: String(r.id),
    numero: r.numero as string,
    clientId: r.client ? String(r.client) : (r.client_id ? String(r.client_id) : ""),
    clientNom: r.client_nom as string,
    type: r.type as RequestType,
    status: r.status as RequestStatus,
    agentId: r.agent ? String(r.agent) : (r.agent_id ? String(r.agent_id) : undefined),
    agentNom: (r.agent_nom as string) || undefined,
    documents: Array.isArray(r.documents) ? (r.documents as Record<string, unknown>[]).map(mapDocument) : [],
    livrables: Array.isArray(r.livrables) ? (r.livrables as Record<string, unknown>[]).map(mapDocument) : [],
    createdAt: fmtDate(r.created_at),
    treatedAt: r.treated_at ? fmtDate(r.treated_at) : undefined,
    details: r.details as Record<string, unknown>,
  };
}

// ── Requests API ─────────────────────────────────────────────────────────────

export const requestsApi = {
  async list(clientId?: string): Promise<ClientRequest[]> {
    const url = clientId ? `/api/requests/?client_id=${clientId}` : "/api/requests/";
    try {
      const raw = await apiFetch(url);
      const arr = raw && typeof raw === "object" && "results" in raw
        ? (Array.isArray((raw as { results: unknown }).results) ? (raw as { results: Record<string, unknown>[] }).results : [])
        : (Array.isArray(raw) ? raw as Record<string, unknown>[] : []);
      return arr.map(mapRequest);
    } catch { return []; }
  },

  async create(type: RequestType, details: Record<string, unknown>): Promise<ClientRequest> {
    const raw = await apiFetch<Record<string, unknown>>("/api/requests/", {
      method: "POST",
      body: JSON.stringify({ type, details }),
    });
    return mapRequest(raw);
  },

  async update(id: string, data: { agentId?: string; status: RequestStatus; details?: Record<string, unknown> }): Promise<ClientRequest> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/requests/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return mapRequest(raw);
  },

  async treat(id: string | number): Promise<ClientRequest> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/requests/${id}/treat/`, { method: "POST" });
    return mapRequest(raw);
  },

  async claim(id: string | number): Promise<ClientRequest> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/requests/${id}/claim/`, { method: "POST" });
    return mapRequest(raw);
  },

  async release(id: string | number): Promise<ClientRequest> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/requests/${id}/release/`, { method: "POST" });
    return mapRequest(raw);
  },

  async getLivrables(id: string | number): Promise<Document[]> {
    const raw = await apiFetch<Record<string, unknown>[]>(`/api/requests/${id}/livrables/`);
    return Array.isArray(raw) ? raw.map(mapDocument) : [];
  },

  async uploadLivrable(id: string | number, file: File, nom: string): Promise<Document> {
    const fd = new FormData();
    fd.append("fichier", file);
    fd.append("nom", nom);
    fd.append("type_fichier", file.type);
    const raw = await apiFetch<Record<string, unknown>>(`/api/requests/${id}/livrables/`, { method: "POST", body: fd });
    return mapDocument(raw);
  },
};

// ── Documents API ────────────────────────────────────────────────────────────

export const documentsApi = {
  async list(requestId?: string): Promise<Document[]> {
    const url = requestId ? `/api/documents/?request_id=${requestId}` : "/api/documents/";
    try {
      const raw = await apiFetch(url);
      return Array.isArray(raw) ? (raw as Record<string, unknown>[]).map(mapDocument) : [];
    } catch { return []; }
  },

  async uploadCarteGrise(file: File): Promise<{ document_id: string; document_nom: string; file_size: number; file_type: string; message: string }> {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch("/api/carte-grise/", { method: "POST", body: fd });
  },

  async upload(file: File, requestId?: string | number, isLivrable?: boolean): Promise<Document> {
    const fd = new FormData();
    fd.append("fichier", file);
    fd.append("nom", file.name);
    if (requestId) fd.append("request", String(requestId));
    if (isLivrable) fd.append("is_livrable", "true");
    const raw = await apiFetch<Record<string, unknown>>("/api/documents/", { method: "POST", body: fd });
    return mapDocument(raw);
  },

  async delete(id: string): Promise<void> {
    await apiFetch(`/api/documents/${id}/`, { method: "DELETE" });
  },
};

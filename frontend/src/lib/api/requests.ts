import { apiFetch } from "./client";
import type { ClientRequest, Document, RequestType, RequestStatus } from "@/lib/types";
import { fmtDate } from "@/lib/utils";

// ── Mappers ──────────────────────────────────────────────────────────────────

function normalizeFileUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const base = process.env.NEXT_PUBLIC_API_BASE ?? "";
  return `${base}${url.startsWith("/") ? url : "/" + url}`;
}

export function mapDocument(d: Record<string, unknown>): Document {
  return {
    id: String(d.id),
    nom: d.nom as string,
    typeFichier: (d.type_fichier as string) ?? "",
    fichier: normalizeFileUrl(d.fichier as string),
    isLivrable: Boolean(d.is_livrable),
    confirmedAt: (d.confirmed_at as string) || undefined,
    uploadedBy: d.uploaded_by ? String(d.uploaded_by) : "",
    createdAt: (d.created_at as string) ?? "",
  };
}

export function mapRequest(r: Record<string, unknown>): ClientRequest {
  return {
    id: String(r.id),
    numero: r.numero as string,
    clientId: r.client ? String(r.client) : (r.client_id ? String(r.client_id) : ""),
    clientNom: r.client_nom as string,
    type: r.type as RequestType,
    status: r.status as RequestStatus,
    agentId: r.agent ? String(r.agent) : (r.agent_id ? String(r.agent_id) : undefined),
    agentNom: (r.agent_nom as string) || undefined,
    agentTelephone: (r.agent_telephone as string) || undefined,
    documents: Array.isArray(r.documents) ? (r.documents as Record<string, unknown>[]).map(mapDocument) : [],
    livrables: Array.isArray(r.livrables) ? (r.livrables as Record<string, unknown>[]).map(mapDocument) : [],
    createdAt: fmtDate(r.created_at as string),
    treatedAt: r.treated_at ? fmtDate(r.treated_at as string) : undefined,
    details: r.details as Record<string, unknown>,
    sinistre_note: (r.sinistre_note as string) || undefined,
  };
}

// ── Requests API ─────────────────────────────────────────────────────────────

export const requestsApi = {
  async list(clientId?: string): Promise<ClientRequest[]> {
    const url = clientId ? `/api/requests/?client_id=${clientId}&page_size=200` : "/api/requests/";
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

  async treat(id: string | number, note?: string): Promise<ClientRequest> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/requests/${id}/treat/`, {
      method: "POST",
      body: note ? JSON.stringify({ note }) : undefined,
    });
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

  async envoyerDevis(id: string | number, fichier: File, nom?: string): Promise<ClientRequest> {
    const fd = new FormData();
    fd.append("fichier", fichier);
    if (nom) fd.append("nom", nom);
    const raw = await apiFetch<Record<string, unknown>>(`/api/requests/${id}/envoyer-devis/`, { method: "POST", body: fd });
    return mapRequest(raw);
  },

  async validerCotation(id: string | number): Promise<ClientRequest> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/requests/${id}/valider/`, { method: "POST" });
    return mapRequest(raw);
  },

  async revisionCotation(id: string | number, note?: string): Promise<ClientRequest> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/requests/${id}/revision/`, {
      method: "POST",
      body: note ? JSON.stringify({ note }) : undefined,
    });
    return mapRequest(raw);
  },

  async refuserCotation(id: string | number, note?: string): Promise<ClientRequest> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/requests/${id}/refuser/`, {
      method: "POST",
      body: note ? JSON.stringify({ note }) : undefined,
    });
    return mapRequest(raw);
  },

  async envoyerAttestations(id: string | number, fichiers: File[], nom?: string): Promise<ClientRequest> {
    const fd = new FormData();
    fichiers.forEach(f => fd.append("fichiers", f));
    if (nom) fd.append("nom", nom);
    const raw = await apiFetch<Record<string, unknown>>(`/api/requests/${id}/envoyer-attestations/`, { method: "POST", body: fd });
    return mapRequest(raw);
  },

  async confirmLivrable(documentId: string | number): Promise<Document> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/documents/${documentId}/confirm/`, { method: "POST" });
    return mapDocument(raw);
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

  async cloturerChangement(
    id: string | number,
    fichiers: File[],
    newImmatriculation?: string
  ): Promise<ClientRequest> {
    const fd = new FormData();
    fichiers.forEach(f => fd.append("fichiers", f));
    if (newImmatriculation) fd.append("new_immatriculation", newImmatriculation);
    const raw = await apiFetch<Record<string, unknown>>(`/api/requests/${id}/cloturer-changement/`, { method: "POST", body: fd });
    return mapRequest(raw);
  },

  async cloturerSouscription(
    id: string | number,
    fichiers: File[],
    emission: {
      numPolice: string;
      numFacture?: string;
      compagnie: string;
      risque?: string;
      marque?: string;
      immatriculation?: string;
      date?: string;
      effet?: string;
      echeance: string;
      primeNette?: number;
      primeTtc: number;
      situation?: string;
    }
  ): Promise<ClientRequest> {
    const fd = new FormData();
    fichiers.forEach(f => fd.append("fichiers", f));
    fd.append("num_police", emission.numPolice);
    if (emission.numFacture) fd.append("num_facture", emission.numFacture);
    fd.append("compagnie", emission.compagnie);
    if (emission.risque) fd.append("risque", emission.risque);
    if (emission.marque) fd.append("marque", emission.marque);
    if (emission.immatriculation) fd.append("immatriculation", emission.immatriculation);
    if (emission.date) fd.append("date", emission.date);
    if (emission.effet) fd.append("effet", emission.effet);
    fd.append("echeance", emission.echeance);
    if (emission.primeNette) fd.append("prime_nette", String(emission.primeNette));
    fd.append("prime_ttc", String(emission.primeTtc));
    if (emission.situation) fd.append("situation", emission.situation);
    const raw = await apiFetch<Record<string, unknown>>(`/api/requests/${id}/cloturer-souscription/`, { method: "POST", body: fd });
    return mapRequest(raw);
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

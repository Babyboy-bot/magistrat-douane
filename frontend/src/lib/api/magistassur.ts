import { apiFetch } from "./client";
import type { ContratEpargne, ContratPrevoyance } from "@/lib/types";

type AssureAssocieType = "conjoint" | "enfant" | "pere" | "mere";

// ── Mappers ──────────────────────────────────────────────────────────────────

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
    correspondants: ((r.correspondants as Record<string, unknown>[]) || []).map((c) => ({
      id: String(c.id),
      numero: c.numero as 1 | 2,
      nom: (c.nom as string) || "",
      prenom: (c.prenom as string) || "",
      domicile: (c.domicile as string) || "",
      adressePostale: (c.adresse_postale as string) || "",
      telephone: (c.telephone as string) || "",
      email: (c.email as string) || "",
      whatsapp: (c.whatsapp as string) || "",
    })),
    beneficiaires: ((r.beneficiaires as Record<string, unknown>[]) || []).map((b) => ({
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
    cotisations: ((r.cotisations as Record<string, unknown>[]) || []).map((c) => ({
      id: String(c.id),
      dateEcheance: (c.date_echeance as string) || "",
      datePaiement: (c.date_paiement as string) || undefined,
      montant: Number(c.montant) || 0,
      statut: c.statut as ContratEpargne["cotisations"][0]["statut"],
      reference: (c.reference as string) || "",
    })),
    createdAt: (r.created_at as string) || "",
    prisEnChargeNom: (r.pris_en_charge_nom as string) || undefined,
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
    pieceIdentiteUrl: (r.piece_identite_url as string) || undefined,
    pieceIdentiteVersoUrl: (r.piece_identite_verso_url as string) || undefined,
    ribDocumentUrl: (r.rib_document_url as string) || undefined,
    prisEnChargeId: r.pris_en_charge_par ? String(r.pris_en_charge_par) : undefined,
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
    assuresAssocies: ((r.assures_associes as Record<string, unknown>[]) || []).map((a) => ({
      id: String(a.id),
      lienParente: a.lien_parente as AssureAssocieType,
      nom: (a.nom as string) || "",
      dateNaissance: (a.date_naissance as string) || undefined,
      contact: (a.contact as string) || "",
      montantIndemnite: Number(a.montant_indemnite) || 0,
      prime: Number(a.prime) || 0,
    })),
    beneficiaires: ((r.beneficiaires as Record<string, unknown>[]) || []).map((b) => ({
      id: String(b.id),
      conjointCorps: Boolean(b.conjoint_corps),
      enfantsNes: Boolean(b.enfants_nes),
      nom: (b.nom as string) || "",
      dateNaissance: (b.date_naissance as string) || undefined,
      telephone: (b.telephone as string) || "",
      enQualiteDe: (b.en_qualite_de as string) || "",
      tauxRepartition: Number(b.taux_repartition) || 100,
    })),
    questionnaireMedical: r.questionnaire_medical
      ? (() => {
          const q = r.questionnaire_medical as Record<string, unknown>;
          return {
            id: String(q.id),
            tailleCm: q.taille_cm as number | undefined,
            poidsKg: q.poids_kg as number | undefined,
            tensionArterielle: q.tension_arterielle as string | undefined,
            fumeur: Boolean(q.fumeur),
            alcool: (q.alcool as string) || "",
            sport: Boolean(q.sport),
            invalidite: Boolean(q.invalidite),
            antecedents: (q.antecedents as Record<string, Record<string, string>>) || {},
          };
        })()
      : undefined,
    createdAt: (r.created_at as string) || "",
    prisEnChargeNom: (r.pris_en_charge_nom as string) || undefined,
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
    correspNom: (r.corresp_nom as string) || undefined,
    correspPrenom: (r.corresp_prenom as string) || undefined,
    correspTelephone: (r.corresp_telephone as string) || undefined,
    correspEmail: (r.corresp_email as string) || undefined,
    correspWhatsapp: (r.corresp_whatsapp as string) || undefined,
    prisEnChargeId: r.pris_en_charge_par ? String(r.pris_en_charge_par) : undefined,
  };
}

// ── Magistassur API ──────────────────────────────────────────────────────────

export const magistassurApi = {
  async listEpargne(params?: { clientId?: string; statut?: string }): Promise<ContratEpargne[]> {
    const q = new URLSearchParams();
    if (params?.clientId) q.append("client_id", params.clientId);
    if (params?.statut) q.append("statut", params.statut);
    q.append("page_size", "200");
    const url = `/api/magistassur/epargne/?${q}`;
    const raw = await apiFetch<unknown>(url);
    const arr = raw && typeof raw === "object" && "results" in raw
      ? (Array.isArray((raw as { results: unknown }).results) ? (raw as { results: Record<string, unknown>[] }).results : [])
      : (Array.isArray(raw) ? raw as Record<string, unknown>[] : []);
    return arr.map(mapContratEpargne);
  },

  async createEpargne(data: Record<string, unknown>): Promise<ContratEpargne> {
    const raw = await apiFetch<Record<string, unknown>>("/api/magistassur/epargne/", { method: "POST", body: JSON.stringify(data) });
    return mapContratEpargne(raw);
  },

  async getEpargne(id: string): Promise<ContratEpargne> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/magistassur/epargne/${id}/`);
    return mapContratEpargne(raw);
  },

  async listPrevoyance(params?: { clientId?: string; statut?: string }): Promise<ContratPrevoyance[]> {
    const q = new URLSearchParams();
    if (params?.clientId) q.append("client_id", params.clientId);
    if (params?.statut) q.append("statut", params.statut);
    q.append("page_size", "200");
    const url = `/api/magistassur/prevoyance/?${q}`;
    const raw = await apiFetch<unknown>(url);
    const arr = raw && typeof raw === "object" && "results" in raw
      ? (Array.isArray((raw as { results: unknown }).results) ? (raw as { results: Record<string, unknown>[] }).results : [])
      : (Array.isArray(raw) ? raw as Record<string, unknown>[] : []);
    return arr.map(mapContratPrevoyance);
  },

  async createPrevoyance(data: Record<string, unknown>): Promise<ContratPrevoyance> {
    const raw = await apiFetch<Record<string, unknown>>("/api/magistassur/prevoyance/", { method: "POST", body: JSON.stringify(data) });
    return mapContratPrevoyance(raw);
  },

  async getPrevoyance(id: string): Promise<ContratPrevoyance> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/magistassur/prevoyance/${id}/`);
    return mapContratPrevoyance(raw);
  },

  async saveQuestionnaireMedical(prevoyanceId: string, data: Record<string, unknown>): Promise<void> {
    await apiFetch(`/api/magistassur/prevoyance/${prevoyanceId}/questionnaire/`, { method: "POST", body: JSON.stringify(data) });
  },

  async changeStatutEpargne(id: string, statut: string): Promise<ContratEpargne> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/magistassur/epargne/${id}/change-statut/`, { method: "POST", body: JSON.stringify({ statut }) });
    return mapContratEpargne(raw);
  },

  async changeStatutPrevoyance(id: string, statut: string): Promise<ContratPrevoyance> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/magistassur/prevoyance/${id}/change-statut/`, { method: "POST", body: JSON.stringify({ statut }) });
    return mapContratPrevoyance(raw);
  },

  async priseEnChargeEpargne(id: string): Promise<ContratEpargne> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/magistassur/epargne/${id}/prise-en-charge/`, { method: "POST" });
    return mapContratEpargne(raw);
  },

  async libererEpargne(id: string): Promise<ContratEpargne> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/magistassur/epargne/${id}/liberer/`, { method: "POST" });
    return mapContratEpargne(raw);
  },

  async priseEnChargePrevoyance(id: string): Promise<ContratPrevoyance> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/magistassur/prevoyance/${id}/prise-en-charge/`, { method: "POST" });
    return mapContratPrevoyance(raw);
  },

  async libererPrevoyance(id: string): Promise<ContratPrevoyance> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/magistassur/prevoyance/${id}/liberer/`, { method: "POST" });
    return mapContratPrevoyance(raw);
  },

  async uploadDocumentsEpargne(id: string, files: { pieceIdentite?: File; pieceIdentiteVerso?: File; ribDocument?: File }): Promise<ContratEpargne> {
    const fd = new FormData();
    if (files.pieceIdentite) fd.append("piece_identite", files.pieceIdentite);
    if (files.pieceIdentiteVerso) fd.append("piece_identite_verso", files.pieceIdentiteVerso);
    if (files.ribDocument) fd.append("rib_document", files.ribDocument);
    const raw = await apiFetch<Record<string, unknown>>(`/api/magistassur/epargne/${id}/upload-documents/`, { method: "POST", body: fd });
    return mapContratEpargne(raw);
  },

  async assignPoliceEpargne(id: string, numPolice: string, codeInspection?: string): Promise<ContratEpargne> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/magistassur/epargne/${id}/assign-police/`, {
      method: "POST", body: JSON.stringify({ num_police: numPolice, code_inspection: codeInspection || "" }),
    });
    return mapContratEpargne(raw);
  },

  async assignPolicePrevoyance(id: string, numPolice: string, codeInspection?: string, dateEffet?: string): Promise<ContratPrevoyance> {
    const raw = await apiFetch<Record<string, unknown>>(`/api/magistassur/prevoyance/${id}/assign-police/`, {
      method: "POST", body: JSON.stringify({ num_police: numPolice, code_inspection: codeInspection || "", date_effet: dateEffet || "" }),
    });
    return mapContratPrevoyance(raw);
  },

  async exportEpargneExcel(id: string): Promise<void> {
    const res = await fetch(`/api/magistassur/epargne/${id}/export-excel/`, { credentials: "include" });
    if (!res.ok) throw new Error("Erreur export Excel");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `epargne_${id}.xlsx`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
  },

  async exportEpargnePdf(id: string): Promise<void> {
    const res = await fetch(`/api/magistassur/epargne/${id}/export-pdf/`, { credentials: "include" });
    if (!res.ok) throw new Error("Erreur export PDF");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `epargne_${id}.pdf`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
  },

  async exportPrevoyanceExcel(id: string): Promise<void> {
    const res = await fetch(`/api/magistassur/prevoyance/${id}/export-excel/`, { credentials: "include" });
    if (!res.ok) throw new Error("Erreur export Excel");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `prevoyance_${id}.xlsx`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
  },

  async exportPrevoyancePdf(id: string): Promise<void> {
    const res = await fetch(`/api/magistassur/prevoyance/${id}/export-pdf/`, { credentials: "include" });
    if (!res.ok) throw new Error("Erreur export PDF");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `prevoyance_${id}.pdf`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
  },
};

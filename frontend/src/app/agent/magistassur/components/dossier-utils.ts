import { fmtDate } from "@/lib/utils";
import type { ContratEpargne, ContratPrevoyance } from "@/lib/types";

export type Item =
  | { kind: "epargne"; c: ContratEpargne }
  | { kind: "prevoyance"; c: ContratPrevoyance };

/** Étapes du traitement d'un dossier, dans l'ordre. */
export type Etape = "a_prendre" | "a_traiter" | "envoye" | "actif" | "archive";

export const STATUTS_ARCHIVES = ["cloture", "resilie", "rachete", "expire", "arrive_terme"];
export const STATUTS_DESTRUCTIFS = ["resilie", "rachete", "cloture"];

export const STATUT_LABELS: Record<string, string> = {
  en_cours: "En cours",
  rachete: "Racheté",
  arrive_terme: "Arrivé à terme",
  suspendu: "Suspendu",
  sinistre: "Sinistre",
  expire: "Expiré",
  resilie: "Résilié",
  cloture: "Clôturé",
};

export const STATUT_COLORS: Record<string, string> = {
  en_cours: "bg-emerald-100 text-emerald-800 border-emerald-200",
  suspendu: "bg-amber-100 text-amber-800 border-amber-200",
  sinistre: "bg-red-100 text-red-800 border-red-200",
  rachete: "bg-amber-100 text-amber-800 border-amber-200",
  arrive_terme: "bg-navy-100 text-navy-700 border-navy-200",
  expire: "bg-navy-50 text-navy-500 border-navy-100",
  resilie: "bg-red-100 text-red-800 border-red-200",
  cloture: "bg-navy-100 text-navy-700 border-navy-200",
};

export const PERIODICITE_COURTE: Record<string, string> = {
  mensuelle: "mois", trimestrielle: "trimestre", semestrielle: "semestre", annuelle: "an",
};

export const formatCFA = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
export const formatDate = (d?: string) => (d ? fmtDate(d) : "—");

export const itemKey = (it: Item) => `${it.kind}-${it.c.id}`;

export function etapeOf(it: Item): Etape {
  const c = it.c;
  if (c.numPolice) return STATUTS_ARCHIVES.includes(c.statut) ? "archive" : "actif";
  if (!c.prisEnChargeId) return "a_prendre";
  return c.envoyeNsiaAt ? "envoye" : "a_traiter";
}

export function montantLabel(it: Item): string {
  return it.kind === "epargne"
    ? `${formatCFA(it.c.montantCotisation)} / ${PERIODICITE_COURTE[it.c.periodicite] || it.c.periodicite}`
    : `${formatCFA(it.c.primeAnnuelle)} / an`;
}

export function produitLabel(it: Item): string {
  if (it.kind === "epargne") return "Épargne";
  const g = [it.c.garantiePrevoyanceDeces && "Décès", it.c.garantiefraisFuneraires && "Funéraires"].filter(Boolean);
  return `Prévoyance${g.length ? " · " + g.join(" + ") : ""}`;
}

/** Contrôle des pièces : épargne = CNI recto/verso + RIB ; prévoyance = questionnaire médical. */
export function piecesStatus(it: Item): { ok: boolean; label: string } {
  if (it.kind === "prevoyance") {
    return it.c.questionnaireMedical
      ? { ok: true, label: "Questionnaire ✓" }
      : { ok: false, label: "Questionnaire manquant" };
  }
  const n = [it.c.pieceIdentiteUrl, it.c.pieceIdentiteVersoUrl, it.c.ribDocumentUrl].filter(Boolean).length;
  return n === 3 ? { ok: true, label: "3/3 pièces" } : { ok: false, label: `${n}/3 pièces` };
}

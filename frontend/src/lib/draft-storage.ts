// Stockage local du brouillon Magist-Assur (texte : localStorage, pièces : IndexedDB).
export const DRAFT_KEY_PREFIX = "magistassur_unifie_draft";
export const FILES_DB_NAME = "magistassur_files";

/** Efface tout brouillon Magist-Assur du navigateur — appelé à la déconnexion
 *  pour qu'aucune donnée personnelle ne reste sur un poste partagé. */
export function purgeMagistassurDrafts(): void {
  if (typeof window === "undefined") return;
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(DRAFT_KEY_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
    indexedDB.deleteDatabase(FILES_DB_NAME);
  } catch {
    /* stockage indisponible (navigation privée) : rien à purger */
  }
}

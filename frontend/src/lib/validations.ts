import { z } from "zod";

// ── Helpers ────────────────────────────────────────────────────────────────────
export const requiredStr = (msg = "Ce champ est obligatoire") => z.string().min(1, msg);
export const optionalStr = () => z.string().optional();

// ── Cotation Automobile ────────────────────────────────────────────────────────
export const cotationAutoSchema = z.object({
  nom: optionalStr(),
  telephone: optionalStr(),
  email: optionalStr(),
  marque: requiredStr("La marque / modèle est obligatoire"),
  immatriculation: requiredStr("L'immatriculation est obligatoire"),
  genre: optionalStr(),
  energie: optionalStr(),
  puissanceFiscale: optionalStr(),
  placesAssises: optionalStr(),
  dateMiseCirculation: optionalStr(),
  usage: optionalStr(),
  valeurNeuve: optionalStr(),
  valeurVenale: optionalStr(),
});
export type CotationAutoValues = z.infer<typeof cotationAutoSchema>;

// ── Cotation MRH ───────────────────────────────────────────────────────────────
export const cotationMRHSchema = z.object({
  nom: optionalStr(),
  telephone: optionalStr(),
  email: optionalStr(),
  qualite: requiredStr("Veuillez sélectionner votre qualité"),
  nature: requiredStr("Veuillez sélectionner la nature du risque"),
  situationGeographique: requiredStr("La situation géographique est obligatoire"),
  valeurBatiment: optionalStr(),
  loyerMensuel: optionalStr(),
  valeurContenu: optionalStr(),
  nombrePieces: optionalStr(),
});
export type CotationMRHValues = z.infer<typeof cotationMRHSchema>;

// ── Déclaration de Sinistre ────────────────────────────────────────────────────
export const sinistreSchema = z.object({
  contratId: requiredStr("Veuillez sélectionner un contrat"),
  dateSinistre: requiredStr("La date du sinistre est obligatoire"),
  heureSinistre: optionalStr(),
  lieuSinistre: requiredStr("Le lieu du sinistre est obligatoire"),
  natureSinistre: requiredStr("La nature du sinistre est obligatoire"),
  circonstances: requiredStr("Les circonstances sont obligatoires"),
  degatsMateriels: optionalStr(),
  degatsCorporels: optionalStr(),
  temoins: optionalStr(),
  constatAmiable: optionalStr(),
  pvPolice: optionalStr(),
  observations: optionalStr(),
});
export type SinistreValues = z.infer<typeof sinistreSchema>;

// ── Demande de Changement ──────────────────────────────────────────────────────
export const changeSchema = z.object({
  changement: requiredStr("Veuillez sélectionner le type de changement"),
});
export type ChangeValues = z.infer<typeof changeSchema>;

// ── Incorporation — Souscripteur (étape 1) ────────────────────────────────────
export const incorporationSouscripteurSchema = z.object({
  nom: requiredStr("Le nom & prénoms est obligatoire"),
  profession: requiredStr("La profession est obligatoire"),
  adressePostale: requiredStr("L'adresse postale est obligatoire"),
  telephone: requiredStr("Le téléphone est obligatoire"),
});
export type IncorporationSouscripteurValues = z.infer<typeof incorporationSouscripteurSchema>;

// ── Incorporation — Véhicule (étape 2) ────────────────────────────────────────
const HEAVY_GENRES = ["Camionnette", "Camion"];
export const incorporationVehiculeSchema = z.object({
  proprietaire: requiredStr("Le nom du propriétaire est obligatoire"),
  immatriculation: requiredStr("L'immatriculation est obligatoire"),
  marque: requiredStr("La marque est obligatoire"),
  genre: requiredStr("Le genre du véhicule est obligatoire"),
  energie: requiredStr("L'énergie est obligatoire"),
  placesAssises: requiredStr("Le nombre de places assises est obligatoire"),
  dateMiseCirculation: requiredStr("La date de mise en circulation est obligatoire"),
  usage: optionalStr(),
  puissanceFiscale: optionalStr(),
  ptac: optionalStr(),
  pv: optionalStr(),
  cu: optionalStr(),
  valeurNeuve: requiredStr("La valeur neuve est obligatoire"),
  valeurVenale: requiredStr("La valeur vénale est obligatoire"),
}).superRefine((data, ctx) => {
  if (HEAVY_GENRES.includes(data.genre)) {
    if (!data.ptac) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Le P.T.A.C. est obligatoire pour ce type de véhicule", path: ["ptac"] });
    if (!data.pv) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Le P.V. est obligatoire pour ce type de véhicule", path: ["pv"] });
    if (!data.cu) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La C.U. est obligatoire pour ce type de véhicule", path: ["cu"] });
  }
});
export type IncorporationVehiculeValues = z.infer<typeof incorporationVehiculeSchema>;

// ── Profil utilisateur ─────────────────────────────────────────────────────────
export const profileSchema = z.object({
  nom: requiredStr("Le nom est obligatoire"),
  prenoms: requiredStr("Les prénoms sont obligatoires"),
  profession: optionalStr(),
  telephone: requiredStr("Le téléphone principal est obligatoire"),
  telephone2: optionalStr(),
});
export type ProfileValues = z.infer<typeof profileSchema>;

// ── Changement de mot de passe ─────────────────────────────────────────────────
export const passwordSchema = z
  .object({
    current: requiredStr("Le mot de passe actuel est obligatoire"),
    newPassword: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    confirm: requiredStr("Veuillez confirmer le mot de passe"),
  })
  .refine((d) => d.newPassword === d.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });
export type PasswordValues = z.infer<typeof passwordSchema>;

// ── Souscription MRH — Souscripteur (étape 1) ────────────────────────────────
export const mrhSouscripteurSchema = z.object({
  nom: requiredStr("Le nom & prénoms est obligatoire"),
  profession: requiredStr("La profession est obligatoire"),
  adressePostale: requiredStr("L'adresse postale est obligatoire"),
  telephone: requiredStr("Le téléphone est obligatoire"),
  qualite: requiredStr("Veuillez sélectionner votre qualité (propriétaire / locataire)"),
});
export type MRHSouscripteurValues = z.infer<typeof mrhSouscripteurSchema>;

// ── Souscription MRH — Risque (étape 2) ──────────────────────────────────────
export const mrhRisqueSchema = z.object({
  qualite: z.string(),
  nature: requiredStr("Veuillez sélectionner la nature du risque"),
  nombreNiveaux: optionalStr(),
  situationGeographique: requiredStr("La situation géographique est obligatoire"),
  valeurBatiment: optionalStr(),
  loyerMensuel: optionalStr(),
  valeurContenu: requiredStr("La valeur du contenu est obligatoire"),
  nombrePieces: requiredStr("Le nombre de pièces est obligatoire"),
  superficieDeveloppee: optionalStr(),
}).superRefine((data, ctx) => {
  if (data.nature === "niveau" && !data.nombreNiveaux) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Le nombre de niveaux est obligatoire", path: ["nombreNiveaux"] });
  }
  if (data.qualite === "proprietaire" && !data.valeurBatiment) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La valeur du bâtiment est obligatoire", path: ["valeurBatiment"] });
  }
  if (data.qualite === "locataire" && !data.loyerMensuel) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Le loyer mensuel est obligatoire", path: ["loyerMensuel"] });
  }
});
export type MRHRisqueValues = z.infer<typeof mrhRisqueSchema>;

// ── Émission (agent) ───────────────────────────────────────────────────────────
export const emissionSchema = z.object({
  date: requiredStr("La date est obligatoire"),
  situation: optionalStr(),
  client: requiredStr("Veuillez sélectionner un client"),
  risque: requiredStr("Le risque est obligatoire"),
  compagnie: requiredStr("La compagnie est obligatoire"),
  numFacture: optionalStr(),
  numPolice: requiredStr("Le N° de police est obligatoire"),
  effet: requiredStr("La date d'effet est obligatoire"),
  echeance: requiredStr("La date d'échéance est obligatoire"),
  primeNette: requiredStr("La prime nette est obligatoire"),
  primeTtc: requiredStr("La prime TTC est obligatoire"),
  marque: optionalStr(),
  immatriculation: optionalStr(),
});
export type EmissionValues = z.infer<typeof emissionSchema>;

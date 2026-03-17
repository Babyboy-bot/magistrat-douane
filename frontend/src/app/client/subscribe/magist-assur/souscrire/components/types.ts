export interface IdentiteState {
  nom: string; prenoms: string; civilite: string; nom_epoux: string;
  date_naissance: string; pays_naissance: string;
  type_piece: string; validite_piece: string; numero_piece: string; nni: string;
  situation_matrimoniale: string; adresse_postale: string; email_personnel: string;
  telephone: string; whatsapp: string; facebook: string; linkedin: string; autres_reseaux: string;
  statut_professionnel: string; revenu_mensuel: string; origine_revenu: string;
  profession_detail: string; secteur_activite: string; telephone_bureau: string;
  email_professionnel: string; residence_principale: string; autre_residence: string;
}

export interface CorrespondantState {
  numero: number; nom: string; prenom: string; domicile: string; adresse_postale: string;
  telephone: string; email: string; whatsapp: string; facebook: string; linkedin: string; autres_reseaux: string;
}

export interface AssureState {
  assure_nom: string; assure_prenoms: string; assure_date_naissance: string; assure_lieu_naissance: string;
  assure_type_piece: string; assure_validite_piece: string; assure_numero_piece: string; assure_nni: string;
  assure_telephone: string; assure_lien: string; assure_adresse_postale: string; assure_email: string;
  assure_profession: string; assure_employeur: string; assure_email_pro: string;
  assure_adresse_employeur: string; assure_telephone_bureau: string;
  assure_nsia_anterieur: boolean; assure_nsia_type_contrat: string; assure_nsia_num_police: string;
}

export interface CotisationState {
  duree_annees: string; periodicite: string; date_premiere_cotisation: string; date_effet: string;
  montant_cotisation: string; mode_paiement: string; numero_compte: string;
}

export interface BeneficiaireEpargne {
  nom: string; en_qualite_de: string; date_naissance: string; domicile: string;
  adresse_postale: string; telephone: string; whatsapp: string; email: string; taux_repartition: string;
}

export type LienParente = "conjoint" | "enfant" | "pere" | "mere";

export interface AssureAssocie {
  lien_parente: LienParente; nom: string; date_naissance: string; contact: string;
}

export interface BeneficiairePrev {
  nom: string; date_naissance: string; telephone: string; en_qualite_de: string; taux_repartition: string;
}

export interface QuestionnaireState {
  taille_cm: string; poids_kg: string; tension_arterielle: string;
  fumeur: boolean; cigarettes_par_jour: string;
  alcool: string; distractions: string;
  sport: boolean; sport_titre: string;
  invalidite: boolean; invalidite_nature: string; invalidite_date: string;
}

export const PERIODICITE_LABELS: Record<string, string> = {
  mensuelle: "Mensuelle", trimestrielle: "Trimestrielle",
  semestrielle: "Semestrielle", annuelle: "Annuelle",
};

export const INDEMNITES: Record<LienParente, number> = {
  conjoint: 1_000_000, enfant: 500_000, pere: 750_000, mere: 750_000,
};

export const MAX_ASSURES: Record<LienParente, number> = {
  conjoint: 1, enfant: 4, pere: 1, mere: 1,
};

export const LIEN_LABELS: Record<LienParente, string> = {
  conjoint: "Conjoint(e)", enfant: "Enfant", pere: "Père", mere: "Mère",
};

export const PATHOLOGIES: { categorie: string; items: string[] }[] = [
  { categorie: "(a) Affections Cardio-vasculaires", items: ["AVC", "HTA", "Paralysie", "Autres / à préciser"] },
  { categorie: "(b) Affections respiratoires", items: ["Asthme", "Tuberculose", "Autres / à préciser"] },
  { categorie: "(c) Affections du foie", items: ["Cirrhose de foie", "Autres / à préciser"] },
  { categorie: "(d) Cancer", items: ["Prostate", "Foie", "Seins", "Reins", "Autres / à préciser"] },
  { categorie: "(e) Insuffisances rénale", items: ["Insuffisances rénale"] },
  { categorie: "(f) Œdèmes des membres inférieurs", items: ["Œdèmes des membres inférieurs"] },
  { categorie: "(g) SIDA, VIH, infections chroniques", items: ["SIDA, VIH, infections chroniques ou inexpliquées ?"] },
  { categorie: "(h) Diabète", items: ["Diabète"] },
  { categorie: "(i) Autres affections à préciser", items: ["Autres affections à préciser"] },
];

export const MEMBRES_LABELS = ["Assuré Principal", "Conjoint(e)", "Enfant(s)", "Père", "Mère", "Beau-Père", "Belle-Mère"];
export const MEMBRES_KEYS  = ["assure", "conjoint", "enfants", "pere", "mere", "beau_pere", "belle_mere"];

export const formatCFA = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";

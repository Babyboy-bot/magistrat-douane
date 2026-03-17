export type UserRole = "client" | "prospect" | "agent" | "admin";

export type Profession = "magistrat" | "douanier" | "autre";

export type AccountStatus = "active" | "pending_verification" | "verified" | "restricted";

export type RiskLevel = "standard" | "premium" | "sensitive";

export const PROFESSION_LABELS: Record<Profession, string> = {
  magistrat: "Magistrat",
  douanier: "Douanier",
  autre: "Autre",
};

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  active: "Actif",
  pending_verification: "En attente de vérification",
  verified: "Vérifié",
  restricted: "Restreint",
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  standard: "Standard",
  premium: "Premium",
  sensitive: "Sensible",
};

export interface User {
  id: string;
  nom: string;
  prenoms: string;
  profession: string;
  professionType: Profession;
  telephone: string;
  telephone2?: string;
  email: string;
  photo?: string;
  role: UserRole;
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  accountStatus: AccountStatus;
  riskLevel: RiskLevel;
  createdAt: string;
  is_active: boolean;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  performedBy?: string | null;
  targetUser: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
  currentPage?: number;
  pageSize?: number;
}

export interface Emission {
  id: string;
  clientId: string;
  clientNom: string;
  date: string;
  risque: string;
  compagnie: string;
  numFacture: string;
  numPolice: string;
  marque: string;
  immatriculation: string;
  effet: string;
  echeance: string;
  primeNette: number;
  primeTTC: number;
  tauxCommission: number;
  montantCommission: number;
  totalPaye: number;
  solde: number;
  situation: "Affaire nouvelle" | "Incorporation" | "Retrait" | "Renouvellement" | "Modification";
  paiements: Paiement[];
}

export interface Paiement {
  id: string;
  emissionId: string;
  dateReglement: string;
  reference: string;
  montantRegle: number;
  observations?: string;
}

export type RequestType =
  | "cotation_auto"
  | "cotation_mrh"
  | "souscription_auto"
  | "souscription_mrh"
  | "souscription_magist"
  | "incorporation"
  | "changement_nom"
  | "changement_immatriculation"
  | "declaration_sinistre";

export type RequestStatus = "en_attente" | "en_cours" | "traite";

export interface ClientRequest {
  id: string;
  numero: string;
  clientId: string;
  clientNom: string;
  type: RequestType;
  status: RequestStatus;
  agentId?: string;
  agentNom?: string;
  documents: Document[];
  livrables: Document[];
  createdAt: string;
  treatedAt?: string;
  details: Record<string, unknown>;
}

export interface Document {
  id: string;
  nom: string;
  typeFichier: string;
  fichier: string;
  isLivrable: boolean;
  uploadedBy: string;
  createdAt: string;
}

export interface CompteStats {
  primeTotale: number;
  primePayee: number;
  primeAPayer: number;
}

export interface DashboardStats {
  totalContrats: number;
  contratsActifs: number;
  contratsExpires: number;
  totalPrimes: number;
  primesPayees: number;
  primesImpayees: number;
  echeancesProches: Emission[];
}

export const RISQUES: { nom: string; tauxCommission: number }[] = [
  { nom: "Automobile", tauxCommission: 20 },
  { nom: "Automobile TPV", tauxCommission: 10 },
  { nom: "Tous risques Sauf", tauxCommission: 27 },
  { nom: "Tous Dommages Sauf", tauxCommission: 27 },
  { nom: "Multirisque Professionnelle", tauxCommission: 27 },
  { nom: "Multirisque Immeuble", tauxCommission: 27 },
  { nom: "Multirisque Habitation", tauxCommission: 27 },
  { nom: "Bris de Machines", tauxCommission: 18 },
  { nom: "Vol et Détournement", tauxCommission: 25 },
  { nom: "Globale de banque", tauxCommission: 25 },
  { nom: "Facultés maritimes", tauxCommission: 21 },
  { nom: "Facultés aériennes", tauxCommission: 21 },
  { nom: "Facultés terrestres", tauxCommission: 21 },
  { nom: "Corps (maritime, fluviaux)", tauxCommission: 18 },
  { nom: "Corps plaisance", tauxCommission: 20 },
  { nom: "Corps aérien", tauxCommission: 10 },
  { nom: "RC armateur", tauxCommission: 17 },
  { nom: "Assurance maladie", tauxCommission: 15 },
  { nom: "Individuelle Accidents", tauxCommission: 24 },
  { nom: "Assistance Voyage", tauxCommission: 20 },
  { nom: "Responsabilité Civile", tauxCommission: 23 },
  { nom: "Tous risques chantiers", tauxCommission: 18 },
  { nom: "RC Décennale", tauxCommission: 15 },
];

export const COMPAGNIES = [
  "Activa Assurances",
  "AFG Assurances",
  "Amsa Assurances",
  "Atlanta Assurances",
  "Atlantique Assurances",
  "AXA Assurances",
  "Coris Assurances",
  "GNA CI",
  "NSIA Assurances",
  "SanlamAllianz",
  "SCHIBA",
  "Sérenity",
  "SAAR CI",
  "SUNU Assurances IARD",
];

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  cotation_auto: "Cotation Automobile",
  cotation_mrh: "Cotation Multirisque Habitation",
  souscription_auto: "Souscription Automobile",
  souscription_mrh: "Souscription MRH",
  souscription_magist: "Souscription Magist-Assur",
  incorporation: "Incorporation",
  changement_nom: "Changement de Nom",
  changement_immatriculation: "Changement d'Immatriculation",
  declaration_sinistre: "Déclaration de Sinistre",
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  en_attente: "En attente",
  en_cours: "En cours",
  traite: "Traité",
};

// ── MAGIST'ASSUR ─────────────────────────────────────

export type PeriodiciteEpargne = "mensuelle" | "trimestrielle" | "semestrielle" | "annuelle";
export type StatutContrat = "en_cours" | "rachete" | "arrive_terme" | "suspendu" | "sinistre" | "expire" | "resilie";

export interface Correspondant {
  id?: string;
  numero: 1 | 2;
  nom: string;
  prenom: string;
  domicile: string;
  adressePostale: string;
  telephone: string;
  email: string;
  whatsapp: string;
}

export interface BeneficiaireEpargne {
  id?: string;
  conjointCorps: boolean;
  enfantsNes: boolean;
  nom: string;
  dateNaissance?: string;
  domicile: string;
  telephone: string;
  email: string;
  enQualiteDe: string;
  tauxRepartition: number;
}

export interface CotisationEpargne {
  id: string;
  dateEcheance: string;
  datePaiement?: string;
  montant: number;
  statut: "en_attente" | "payee" | "en_retard" | "rachat";
  reference: string;
}

export interface ContratEpargne {
  id: string;
  numPolice: string;
  clientId: string;
  clientNom: string;
  agentId?: string;
  dureeAnnees: number;
  periodicite: PeriodiciteEpargne;
  datePremiereCotisation?: string;
  dateEffet?: string;
  montantCotisation: number;
  capitalConstitue: number;
  modePaiement: string;
  numeroCompte: string;
  statut: StatutContrat;
  fraisGestionPct: number;
  fraisAccessoires: number;
  coutPolice: number;
  tauxInteret: number;
  primeAnnuelle: number;
  correspondants: Correspondant[];
  beneficiaires: BeneficiaireEpargne[];
  cotisations: CotisationEpargne[];
  createdAt: string;
  // Champs souscripteur
  civilite?: string;
  situationMatrimoniale?: string;
  dateNaissance?: string;
  typepiece?: string;
  numeroPiece?: string;
  nni?: string;
  professionDetail?: string;
  statutProfessionnel?: string;
  revenuMensuel?: number;
  origineRevenu?: string;
  whatsapp?: string;
  telephone?: string;
  emailPersonnel?: string;
  adressePostale?: string;
}

export interface AssureAssocie {
  id?: string;
  lienParente: "conjoint" | "enfant" | "pere" | "mere";
  nom: string;
  dateNaissance?: string;
  contact: string;
  montantIndemnite: number;
  prime: number;
}

export interface BeneficiairePrevoyance {
  id?: string;
  conjointCorps: boolean;
  enfantsNes: boolean;
  nom: string;
  dateNaissance?: string;
  telephone: string;
  enQualiteDe: string;
  tauxRepartition: number;
}

export interface QuestionnaireMedical {
  id?: string;
  tailleCm?: number;
  poidsKg?: number;
  tensionArterielle?: string;
  fumeur: boolean;
  cigarettesParJour?: number;
  alcool: string;
  sport: boolean;
  sportTitre?: string;
  invalidite: boolean;
  invaliditeNature?: string;
  invaliditeDate?: string;
  distractions?: string;
  antecedents: Record<string, Record<string, string>>;
}

export interface ContratPrevoyance {
  id: string;
  numPolice: string;
  clientId: string;
  clientNom: string;
  agentId?: string;
  garantiePrevoyanceDeces: boolean;
  garantiefraisFuneraires: boolean;
  dateEffet?: string;
  dateEcheance?: string;
  statut: StatutContrat;
  primeAnnuelle: number;
  fraisFixes: number;
  assuresAssocies: AssureAssocie[];
  beneficiaires: BeneficiairePrevoyance[];
  questionnaireMedical?: QuestionnaireMedical;
  createdAt: string;
  // Champs souscripteur
  civilite?: string;
  situationMatrimoniale?: string;
  dateNaissance?: string;
  numeroPiece?: string;
  nni?: string;
  professionDetail?: string;
  whatsapp?: string;
  telephone?: string;
  emailPersonnel?: string;
  adressePostale?: string;
}

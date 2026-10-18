"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle, ChevronDown, ChevronUp, TrendingUp, Shield, Heart, Clock, FileText, CreditCard, Users, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { magistassurApi } from "@/lib/api";
import { toast } from "sonner";

import { StepIdentite } from "./components/step-identite";
import { StepCorrespondants } from "./components/step-correspondants";
import { StepAssure } from "./components/step-assure";
import { StepCotisation } from "./components/step-cotisation";
import { StepBeneficiairesEpargne } from "./components/step-beneficiaires-epargne";
import { StepOptionsPrevoyance } from "./components/step-options-prevoyance";
import { StepGaranties } from "./components/step-garanties";
import { StepBeneficiairesPrev } from "./components/step-beneficiaires-prev";
import { StepQuestionnaire } from "./components/step-questionnaire";
import { StepRecap } from "./components/step-recap";
import type {
  IdentiteState, CorrespondantState, AssureState, CotisationState,
  BeneficiaireEpargne, AssureAssocie, BeneficiairePrev, QuestionnaireState,
} from "./components/types";

// Le brouillon et les fichiers sont scopés par utilisateur : sur un poste
// partagé, le compte B ne doit jamais voir les données du compte A.
const DRAFT_KEY_LEGACY = "magistassur_unifie_draft";
const draftKeyFor = (uid: string | number) => `magistassur_unifie_draft_${uid}`;
const fileKeyFor = (uid: string | number, name: string) => `${uid}:${name}`;
const FILES_DB_NAME = "magistassur_files";
const FILES_STORE_NAME = "files";

// IndexedDB helpers
const openFilesDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(FILES_DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(FILES_STORE_NAME)) {
        db.createObjectStore(FILES_STORE_NAME);
      }
    };
  });
};

const saveFileToIndexedDB = async (key: string, file: File): Promise<void> => {
  const db = await openFilesDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FILES_STORE_NAME], "readwrite");
    const store = transaction.objectStore(FILES_STORE_NAME);
    const request = store.put(file, key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

const getFileFromIndexedDB = async (key: string): Promise<File | null> => {
  const db = await openFilesDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FILES_STORE_NAME], "readonly");
    const store = transaction.objectStore(FILES_STORE_NAME);
    const request = store.get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
};

const deleteFileFromIndexedDB = async (key: string): Promise<void> => {
  const db = await openFilesDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FILES_STORE_NAME], "readwrite");
    const store = transaction.objectStore(FILES_STORE_NAME);
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

const emptyId = (): IdentiteState => ({
  nom: "", prenoms: "", civilite: "", nom_epoux: "", date_naissance: "", pays_naissance: "",
  type_piece: "", validite_piece: "", numero_piece: "", nni: "", situation_matrimoniale: "",
  adresse_postale: "", email_personnel: "", telephone: "", whatsapp: "", facebook: "",
  linkedin: "", autres_reseaux: "", statut_professionnel: "", revenu_mensuel: "",
  origine_revenu: "", profession_detail: "", secteur_activite: "", telephone_bureau: "",
  email_professionnel: "", residence_principale: "", autre_residence: "",
});

const emptyCorresp = (n: number): CorrespondantState => ({
  numero: n, nom: "", prenom: "", domicile: "", adresse_postale: "",
  telephone: "", email: "", whatsapp: "", facebook: "", linkedin: "", autres_reseaux: "",
});

const emptyAssure = (): AssureState => ({
  assure_nom: "", assure_prenoms: "", assure_date_naissance: "", assure_lieu_naissance: "",
  assure_type_piece: "", assure_validite_piece: "", assure_numero_piece: "", assure_nni: "",
  assure_telephone: "", assure_lien: "", assure_adresse_postale: "", assure_email: "",
  assure_profession: "", assure_employeur: "", assure_email_pro: "",
  assure_adresse_employeur: "", assure_telephone_bureau: "",
  assure_nsia_anterieur: false, assure_nsia_type_contrat: "", assure_nsia_num_police: "",
});

const emptyQ = (): QuestionnaireState => ({
  taille_cm: "", poids_kg: "", tension_arterielle: "",
  fumeur: false, cigarettes_par_jour: "", alcool: "", distractions: "",
  sport: false, sport_titre: "", invalidite: false, invalidite_nature: "", invalidite_date: "",
});

const STEP_LABELS_FIXED = ["Identité", "Correspondants", "Assuré", "Cotisation", "Bénéf. Épargne", "Options"];
const STEP_LABELS_PREV  = ["Garanties", "Bénéf. Prévoyance", "Questionnaire médical"];

function StepIndicator({ current, steps, onJump }: { current: number; steps: string[]; onJump?: (i: number) => void }) {
  const pct = Math.round(((current) / (steps.length - 1)) * 100);
  return (
    <div className="mb-6 space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="font-medium text-amber-700">{steps[current]}</span>
        <span>{current + 1} / {steps.length}</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-amber-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <div key={`${s}-${i}`} className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={i >= current}
              onClick={() => i < current && onJump?.(i)}
              title={i < current ? `Revenir à l'étape « ${s} »` : undefined}
              className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition ${
                i < current ? "bg-amber-600 text-white cursor-pointer hover:ring-2 hover:ring-amber-300" :
                i === current ? "bg-amber-600 text-white ring-2 ring-amber-300" :
                "bg-gray-200 text-gray-500 cursor-default"}`}>
              {i < current ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
            </button>
            <span className={`text-[10px] hidden sm:block mr-1 ${i === current ? "text-amber-700 font-semibold" : "text-gray-400"}`}>{s}</span>
            {i < steps.length - 1 && <div className={`w-4 h-0.5 mx-0.5 ${i < current ? "bg-amber-600" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SouscrirePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showEncadre, setShowEncadre] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  /* ── Fichiers ── */
  const [pieceIdentiteFile, setPieceIdentiteFile] = useState<File | null>(null);
  const [pieceIdentiteVersoFile, setPieceIdentiteVersoFile] = useState<File | null>(null);
  const [ribFile, setRibFile] = useState<File | null>(null);

  const fileKey = useCallback(
    (name: string) => fileKeyFor(user?.id ?? "anon", name),
    [user?.id],
  );

  const handleSetPieceIdentiteFile = useCallback(async (file: File | null) => {
    setPieceIdentiteFile(file);
    if (file) {
      await saveFileToIndexedDB(fileKey("pieceIdentite"), file);
    } else {
      await deleteFileFromIndexedDB(fileKey("pieceIdentite"));
    }
  }, [fileKey]);

  const handleSetPieceIdentiteVersoFile = useCallback(async (file: File | null) => {
    setPieceIdentiteVersoFile(file);
    if (file) {
      await saveFileToIndexedDB(fileKey("pieceIdentiteVerso"), file);
    } else {
      await deleteFileFromIndexedDB(fileKey("pieceIdentiteVerso"));
    }
  }, [fileKey]);

  const handleSetRibFile = useCallback(async (file: File | null) => {
    setRibFile(file);
    if (file) {
      await saveFileToIndexedDB(fileKey("rib"), file);
    } else {
      await deleteFileFromIndexedDB(fileKey("rib"));
    }
  }, [fileKey]);

  /* ── État Épargne ── */
  const [id, setId] = useState<IdentiteState>(emptyId());
  const [corresp1, setCorresp1] = useState<CorrespondantState>(emptyCorresp(1));
  const [corresp2, setCorresp2] = useState<CorrespondantState>(emptyCorresp(2));
  const [assureIdem, setAssureIdem] = useState(true);
  const [assure, setAssure] = useState<AssureState>(emptyAssure());
  const [cot, setCot] = useState<CotisationState>({ duree_annees: "10", periodicite: "mensuelle", date_premiere_cotisation: "", date_effet: "", montant_cotisation: "25000", mode_paiement: "prelevement", numero_compte: "CI" });
  const [benefConjoint_e, setBenefConjoint_e] = useState(false);
  const [benefEnfants_e, setBenefEnfants_e] = useState(false);
  const [autresBenef_e, setAutresBenef_e] = useState<BeneficiaireEpargne[]>([{ nom: "", en_qualite_de: "", date_naissance: "", domicile: "", adresse_postale: "", telephone: "", whatsapp: "", email: "", taux_repartition: "" }]);
  const [consentementDonnees, setConsentementDonnees] = useState<boolean | null>(null);

  /* ── Choix prévoyance ── */
  const [garantieDeces, setGarantieDeces] = useState(false);
  const [garantieFuneraires, setGarantieFuneraires] = useState(false);

  /* ── Correspondant Prévoyance ── */
  const [prevCorrespIdem, setPrevCorrespIdem] = useState<boolean | null>(null);
  const [prevCorresp, setPrevCorresp] = useState<CorrespondantState>(emptyCorresp(0));

  /* ── État Prévoyance ── */
  const [assuresAssocies, setAssuresAssocies] = useState<AssureAssocie[]>([]);
  const [benefConjoint_p, setBenefConjoint_p] = useState(false);
  const [benefEnfants_p, setBenefEnfants_p] = useState(false);
  const [autresBenef_p, setAutresBenef_p] = useState<BeneficiairePrev[]>([{ nom: "", date_naissance: "", telephone: "", en_qualite_de: "", taux_repartition: "" }]);
  const [q, setQ] = useState<QuestionnaireState>(emptyQ());
  const [antecedents, setAntecedents] = useState<Record<string, Record<string, string>>>({});

  /* ── Steps dynamiques ── */
  const steps = useMemo(() => {
    const s = [...STEP_LABELS_FIXED];
    if (garantieDeces || garantieFuneraires) s.push(...STEP_LABELS_PREV);
    s.push("Récapitulatif");
    return s;
  }, [garantieDeces, garantieFuneraires]);

  const stepId = useMemo(() => {
    const ids = ["identite", "correspondants", "assure", "cotisation", "benef-epargne", "options"];
    if (garantieDeces || garantieFuneraires) ids.push("garanties", "benef-prev", "questionnaire");
    ids.push("recap");
    return ids[step] || "recap";
  }, [step, garantieDeces, garantieFuneraires]);

  /* ── Brouillon ── */
  useEffect(() => {
    if (!user) return;
    // Migration : brouillon créé sous l'ancienne clé globale → clé par utilisateur
    const legacy = localStorage.getItem(DRAFT_KEY_LEGACY);
    if (legacy && !localStorage.getItem(draftKeyFor(user.id))) {
      localStorage.setItem(draftKeyFor(user.id), legacy);
    }
    if (legacy) localStorage.removeItem(DRAFT_KEY_LEGACY);
    const raw = localStorage.getItem(draftKeyFor(user.id));
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (d.id) setId(p => ({ ...p, ...d.id }));
        if (d.corresp1) setCorresp1(p => ({ ...p, ...d.corresp1 }));
        if (d.corresp2) setCorresp2(p => ({ ...p, ...d.corresp2 }));
        if (d.prevCorrespIdem !== undefined) setPrevCorrespIdem(d.prevCorrespIdem);
        if (d.prevCorresp) setPrevCorresp(p => ({ ...p, ...d.prevCorresp }));
        if (d.assureIdem !== undefined) setAssureIdem(d.assureIdem);
        if (d.assure) setAssure(d.assure);
        if (d.cot) setCot({ ...d.cot, numero_compte: d.cot.numero_compte || "CI" });
        if (d.benefConjoint_e !== undefined) setBenefConjoint_e(d.benefConjoint_e);
        if (d.benefEnfants_e !== undefined) setBenefEnfants_e(d.benefEnfants_e);
        if (d.autresBenef_e) setAutresBenef_e(d.autresBenef_e);
        if (d.consentementDonnees !== undefined) setConsentementDonnees(d.consentementDonnees);
        if (d.garantieDeces !== undefined) setGarantieDeces(d.garantieDeces);
        if (d.garantieFuneraires !== undefined) setGarantieFuneraires(d.garantieFuneraires);
        if (d.assuresAssocies) setAssuresAssocies(d.assuresAssocies);
        if (d.benefConjoint_p !== undefined) setBenefConjoint_p(d.benefConjoint_p);
        if (d.benefEnfants_p !== undefined) setBenefEnfants_p(d.benefEnfants_p);
        if (d.autresBenef_p) setAutresBenef_p(d.autresBenef_p);
        if (d.q) setQ(d.q);
        if (d.antecedents) setAntecedents(d.antecedents);
        if (d.step !== undefined) setStep(d.step);
        setHasDraft(true);
        toast.info("Brouillon restauré — vous pouvez reprendre votre saisie.");
        // Restaurer les fichiers depuis IndexedDB (clé scopée, repli sur
        // l'ancienne clé globale pour les brouillons existants)
        ["pieceIdentite", "pieceIdentiteVerso", "rib"].forEach(async (name) => {
          const setters: Record<string, (f: File | null) => void> = {
            pieceIdentite: setPieceIdentiteFile,
            pieceIdentiteVerso: setPieceIdentiteVersoFile,
            rib: setRibFile,
          };
          let f = await getFileFromIndexedDB(fileKey(name));
          if (!f) {
            f = await getFileFromIndexedDB(name);
            if (f) {
              await saveFileToIndexedDB(fileKey(name), f);
              await deleteFileFromIndexedDB(name);
            }
          }
          setters[name](f);
        });
        return;
      } catch { /* brouillon corrompu */ }
    }
    setId(p => ({
      ...p,
      nom: user.nom || "",
      prenoms: user.prenoms || "",
      telephone: user.telephone || "",
      email_personnel: user.email || "",
      profession_detail: user.profession || "",
    }));
    // corresp1 n'est PAS pré-rempli : un correspondant doit être une personne
    // différente du souscripteur (le bouton « Identique à moi » reste dispo).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const draft = {
      step, id, corresp1, corresp2, prevCorrespIdem, prevCorresp, assureIdem, assure, cot,
      benefConjoint_e, benefEnfants_e, autresBenef_e, consentementDonnees,
      garantieDeces, garantieFuneraires,
      assuresAssocies, benefConjoint_p, benefEnfants_p, autresBenef_p, q, antecedents,
    };
    localStorage.setItem(draftKeyFor(user.id), JSON.stringify(draft));
    setLastSaved(new Date());
  }, [step, id, corresp1, corresp2, prevCorrespIdem, prevCorresp, assureIdem, assure, cot, benefConjoint_e, benefEnfants_e, autresBenef_e, consentementDonnees, garantieDeces, garantieFuneraires, assuresAssocies, benefConjoint_p, benefEnfants_p, autresBenef_p, q, antecedents, user]);

  useEffect(() => {
    if (!id.date_naissance) return;
    const birth = new Date(id.date_naissance);
    if (isNaN(birth.getTime())) return;
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear()
      - (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
    const max = Math.max(1, 65 - age);
    setCot(prev => ({ ...prev, duree_annees: String(max) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id.date_naissance]);

  useEffect(() => {
    if (cot.date_premiere_cotisation && !cot.date_effet) {
      setCot(prev => ({ ...prev, date_effet: prev.date_premiere_cotisation }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cot.date_premiere_cotisation]);

  const clearDraft = async () => {
    localStorage.removeItem(draftKeyFor(user?.id ?? "anon"));
    await deleteFileFromIndexedDB(fileKey("pieceIdentite"));
    await deleteFileFromIndexedDB(fileKey("pieceIdentiteVerso"));
    await deleteFileFromIndexedDB(fileKey("rib"));
    setPieceIdentiteFile(null);
    setPieceIdentiteVersoFile(null);
    setRibFile(null);
    setHasDraft(false);
    toast.success("Brouillon effacé.");
  };

  /* ── Erreur de champ : scroll + surbrillance rouge ── */
  const fail = (field: string, msg: string): boolean => {
    toast.error(msg);
    setInvalidField(field);
    return false;
  };

  useEffect(() => {
    if (!invalidField) return;
    const el = document.querySelector<HTMLElement>(`[data-field="${invalidField}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("field-invalid");
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
      el.focus({ preventScroll: true });
    }
    const clear = () => { el.classList.remove("field-invalid"); setInvalidField(null); };
    el.addEventListener("input", clear, { once: true });
    el.addEventListener("click", clear, { once: true });
    return () => {
      el.removeEventListener("input", clear);
      el.removeEventListener("click", clear);
    };
  }, [invalidField]);

  const validateStep = (): boolean => {
    const isMaried = id.situation_matrimoniale === "marie" || id.situation_matrimoniale === "concubin";
    switch (stepId) {
      case "identite":
        if (!id.civilite) return fail("civilite", "Veuillez sélectionner une civilité.");
        if (!id.nom.trim()) return fail("nom", "Le nom est obligatoire.");
        if (!id.prenoms.trim()) return fail("prenoms", "Les prénoms sont obligatoires.");
        if (!id.date_naissance) return fail("date_naissance", "La date de naissance est obligatoire.");
        if (!id.pays_naissance.trim()) return fail("pays_naissance", "Le pays/ville de naissance est obligatoire.");
        if (!id.type_piece) return fail("type_piece", "Veuillez sélectionner un type de pièce d'identité.");
        if (!id.nni.trim()) return fail("nni", "Le NNI est obligatoire.");
        if (!id.situation_matrimoniale) return fail("situation_matrimoniale", "La situation matrimoniale est obligatoire.");
        if (!id.email_personnel.trim()) return fail("email_personnel", "L'email personnel est obligatoire.");
        if (!id.telephone.trim()) return fail("telephone", "Le numéro de téléphone est obligatoire.");
        if (!id.statut_professionnel) return fail("statut_professionnel", "Le statut professionnel est obligatoire.");
        if (!id.origine_revenu) return fail("origine_revenu", "L'origine des cotisations est obligatoire.");
        return true;
      case "correspondants":
        if (!corresp1.nom.trim()) return fail("c1_nom", "Le nom du correspondant 1 est obligatoire.");
        if (!corresp1.prenom.trim()) return fail("c1_prenom", "Le prénom du correspondant 1 est obligatoire.");
        if (!corresp1.telephone.trim()) return fail("c1_telephone", "Le téléphone du correspondant 1 est obligatoire.");
        if (prevCorrespIdem === false) {
          if (!prevCorresp.nom.trim()) return fail("pc_nom", "Correspondant Prévoyance — le nom est obligatoire.");
          if (!prevCorresp.prenom.trim()) return fail("pc_prenom", "Correspondant Prévoyance — le prénom est obligatoire.");
          if (!prevCorresp.domicile.trim()) return fail("pc_domicile", "Correspondant Prévoyance — le domicile est obligatoire.");
        }
        return true;
      case "assure":
        if (!assureIdem) {
          if (!assure.assure_nom.trim()) return fail("assure_nom", "Le nom de l'assuré est obligatoire.");
          if (!assure.assure_prenoms.trim()) return fail("assure_prenoms", "Les prénoms de l'assuré sont obligatoires.");
          if (!assure.assure_date_naissance) return fail("assure_date_naissance", "La date de naissance de l'assuré est obligatoire.");
        }
        return true;
      case "cotisation": {
        if (!cot.duree_annees || Number(cot.duree_annees) < 1) return fail("duree_annees", "La durée doit être d'au moins 1 an.");
        if (!cot.periodicite) return fail("periodicite", "La périodicité est obligatoire.");
        if (!cot.date_premiere_cotisation) return fail("date_premiere_cotisation", "La date de 1ère cotisation est obligatoire.");
        const todayStr = new Date().toISOString().slice(0, 10);
        if (cot.date_premiere_cotisation < todayStr) return fail("date_premiere_cotisation", "La date de 1ère cotisation ne peut pas être dans le passé.");
        if (cot.date_effet && cot.date_effet < todayStr) return fail("date_effet", "La date d'effet ne peut pas être dans le passé.");
        if (!cot.montant_cotisation || Number(cot.montant_cotisation) < 25000) return fail("montant_cotisation", "Le montant doit être au minimum de 25 000 FCFA.");
        const rib = cot.numero_compte.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        if (!rib) return fail("numero_compte", "Le numéro de compte (RIB) est obligatoire.");
        if (rib.startsWith("CI")) {
          // RIB imprimé sur le chèque : CIxx + 20 car. (= 24) — IBAN complet : CIxx + 24 car. (= 28)
          const rest = rib.slice(4).length;
          if (rest !== 20 && rest !== 24) {
            return fail("numero_compte", `RIB incomplet — 20 caractères attendus après « CIxx » (comme imprimé sur le chèque), ${rest} saisi${rest > 1 ? "s" : ""}.`);
          }
        } else if (rib.length < 8 || rib.length > 24) {
          return fail("numero_compte", "Le n° de compte local doit contenir entre 8 et 24 caractères.");
        }
        return true;
      }
      case "benef-epargne": {
        const hasAny = benefConjoint_e || benefEnfants_e || autresBenef_e.some(b => b.nom.trim());
        if (!hasAny) return fail("benef_choix", "Désignez au moins un bénéficiaire.");
        if (consentementDonnees === null) return fail("consentement", "Veuillez indiquer votre consentement au traitement de vos données personnelles (OUI ou NON).");
        for (let i = 0; i < autresBenef_e.length; i++) {
          const b = autresBenef_e[i];
          if (!b.nom.trim()) continue;
          if (!b.en_qualite_de.trim()) return fail(`benef_e_${i}`, `Bénéficiaire ${i + 1} — « En qualité de » est obligatoire.`);
          if (!b.domicile.trim()) return fail(`benef_e_${i}`, `Bénéficiaire ${i + 1} — Le domicile est obligatoire.`);
          if (!b.adresse_postale.trim()) return fail(`benef_e_${i}`, `Bénéficiaire ${i + 1} — L'adresse postale est obligatoire.`);
          if (!b.telephone.trim()) return fail(`benef_e_${i}`, `Bénéficiaire ${i + 1} — Le numéro de téléphone est obligatoire.`);
        }
        const named_e = autresBenef_e.filter(b => b.nom.trim());
        if (named_e.length > 0) {
          const total_e = named_e.reduce((s, b) => s + (Number(b.taux_repartition) || 0), 0);
          if (total_e !== 100) return fail("benef_e_total", `Répartition des bénéficiaires : ${total_e}% — le total doit être de 100%.`);
        }
        return true;
      }
      case "garanties":
        if (garantieFuneraires) {
          for (let i = 0; i < assuresAssocies.length; i++) {
            const a = assuresAssocies[i];
            if (!a.nom.trim()) return fail(`assure_assoc_${i}`, `Assuré associé ${i + 1} — le nom est obligatoire.`);
            if (!a.contact.trim()) return fail(`assure_assoc_${i}`, `Assuré associé ${i + 1} — le contact est obligatoire.`);
          }
        }
        return true;
      case "benef-prev": {
        for (let i = 0; i < autresBenef_p.length; i++) {
          const b = autresBenef_p[i];
          if (!b.nom.trim()) continue;
          if (!b.en_qualite_de.trim()) return fail(`benef_p_${i}`, `Bénéficiaire prévoyance ${i + 1} — « En qualité de » est obligatoire.`);
        }
        const named_p = autresBenef_p.filter(b => b.nom.trim());
        if (named_p.length > 0) {
          const total_p = named_p.reduce((s, b) => s + (Number(b.taux_repartition) || 0), 0);
          if (total_p !== 100) return fail("benef_p_total", `Répartition des bénéficiaires prévoyance : ${total_p}% — le total doit être de 100%.`);
        }
        return true;
      }
      case "questionnaire": {
        if (!q.taille_cm) return fail("taille_cm", "La taille est obligatoire.");
        if (!q.poids_kg) return fail("poids_kg", "Le poids est obligatoire.");
        if (!q.tension_arterielle.trim()) return fail("tension_arterielle", "La tension artérielle est obligatoire.");
        if (!q.alcool) return fail("alcool", "Veuillez indiquer votre consommation d'alcool.");
        if (!q.distractions.trim()) return fail("distractions", "Les distractions/loisirs sont obligatoires.");
        const isAutres = (item: string) => item.toLowerCase().includes("autres") || item.toLowerCase().includes("préciser");
        const PATHOLOGIES_LOCAL = [
          { items: ["AVC", "HTA", "Paralysie", "Autres / à préciser"] },
          { items: ["Asthme", "Tuberculose", "Autres / à préciser"] },
          { items: ["Cirrhose de foie", "Autres / à préciser"] },
          { items: ["Prostate", "Foie", "Seins", "Reins", "Autres / à préciser"] },
          { items: ["Insuffisances rénale"] },
          { items: ["Œdèmes des membres inférieurs"] },
          { items: ["SIDA, VIH, infections chroniques ou inexpliquées ?"] },
          { items: ["Diabète"] },
          { items: ["Autres affections à préciser"] },
        ];
        const MEMBRES_KEYS_LOCAL = ["assure", "conjoint", "enfants", "pere", "mere", "beau_pere", "belle_mere"];
        for (const cat of PATHOLOGIES_LOCAL) {
          for (const item of cat.items) {
            if (isAutres(item)) continue;
            for (const mk of MEMBRES_KEYS_LOCAL) {
              if (!antecedents[item]?.[mk]) {
                return fail("antecedents", `Antécédents — remplissez toutes les cases pour "${item}". Utilisez le bouton "Non partout" si aucun antécédent.`);
              }
            }
          }
        }
        return true;
      }
      default:
        return true;
    }
  };

  const goNext = () => {
    if (validateStep()) {
      setStep(s => Math.min(s + 1, steps.length - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const goBack = () => {
    if (step > 0) { setStep(s => s - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }
    else router.push("/client/dashboard");
  };
  const isLast = step === steps.length - 1;

  /* ── Soumission ── */
  const handleSubmit = async () => {
    if (!user) return;
    // Tenter de récupérer depuis IndexedDB si le state est null (après refresh)
    const finalPieceFile = pieceIdentiteFile ?? await getFileFromIndexedDB(fileKey("pieceIdentite"));
    const finalPieceVersoFile = pieceIdentiteVersoFile ?? await getFileFromIndexedDB(fileKey("pieceIdentiteVerso"));
    const finalRibFile = ribFile ?? await getFileFromIndexedDB(fileKey("rib"));
    if (!finalPieceFile) { toast.error("La pièce d'identité (recto) est obligatoire."); return; }
    if (!finalPieceVersoFile) { toast.error("La pièce d'identité (verso) est obligatoire."); return; }
    if (!finalRibFile) { toast.error("Le document RIB est obligatoire."); return; }
    setLoading(true);
    try {
      const montant = Number(cot.montant_cotisation) || 0;
      const epargneContrat = await magistassurApi.createEpargne({
        client: user.id, ...id,
        date_naissance: id.date_naissance || null,
        validite_piece: id.validite_piece || null,
        revenu_mensuel: id.revenu_mensuel ? Number(id.revenu_mensuel) : null,
        assure_idem: assureIdem,
        ...(assureIdem ? {} : { ...assure, assure_date_naissance: assure.assure_date_naissance || null, assure_validite_piece: assure.assure_validite_piece || null }),
        duree_annees: Number(cot.duree_annees),
        periodicite: cot.periodicite,
        date_premiere_cotisation: cot.date_premiere_cotisation || null,
        date_effet: cot.date_effet || null,
        montant_cotisation: montant,
        mode_paiement: cot.mode_paiement,
        numero_compte: cot.numero_compte,
        correspondants: [...(corresp1.nom ? [corresp1] : []), ...(corresp2.nom ? [corresp2] : [])],
        beneficiaires: [
          ...(benefConjoint_e ? [{ conjoint_corps: true, enfants_nes: false, nom: "", taux_repartition: 0, domicile: "", adresse_postale: "", telephone: "", email: "", en_qualite_de: "Conjoint(e) du souscripteur" }] : []),
          ...(benefEnfants_e ? [{ conjoint_corps: false, enfants_nes: true, nom: "", taux_repartition: 0, domicile: "", adresse_postale: "", telephone: "", email: "", en_qualite_de: "Enfants nés ou à naître" }] : []),
          ...autresBenef_e.filter(b => b.nom).map(b => ({ ...b, date_naissance: b.date_naissance || null, conjoint_corps: false, enfants_nes: false, taux_repartition: Number(b.taux_repartition) || 0 })),
        ],
        consentement_donnees: consentementDonnees,
      });

      let prevoyanceError: string | null = null;
      if (garantieDeces || garantieFuneraires) {
        try {
          await magistassurApi.createPrevoyance({
            client: user.id, ...id,
            date_naissance: id.date_naissance || null,
            validite_piece: id.validite_piece || null,
            ...((): Record<string, string> => {
              const c = prevCorrespIdem ? corresp1 : prevCorresp;
              return {
                corresp_nom: c.nom, corresp_prenom: c.prenom,
                corresp_domicile: c.domicile, corresp_adresse_postale: c.adresse_postale,
                corresp_telephone: c.telephone, corresp_email: c.email,
                corresp_whatsapp: c.whatsapp, corresp_facebook: c.facebook,
                corresp_linkedin: c.linkedin, corresp_autres_reseaux: c.autres_reseaux,
              };
            })(),
            garantie_prevoyance_deces: garantieDeces,
            garantie_frais_funeraires: garantieFuneraires,
            assures_associes: assuresAssocies.map(a => ({ ...a, date_naissance: a.date_naissance || null, montant_indemnite: ({ conjoint: 1_000_000, enfant: 500_000, pere: 750_000, mere: 750_000 })[a.lien_parente] })),
            beneficiaires: [
              ...(benefConjoint_p ? [{ conjoint_corps: true, enfants_nes: false, nom: "", taux_repartition: 0, telephone: "", en_qualite_de: "Conjoint(e)" }] : []),
              ...(benefEnfants_p ? [{ conjoint_corps: false, enfants_nes: true, nom: "", taux_repartition: 0, telephone: "", en_qualite_de: "Enfants nés ou à naître" }] : []),
              ...autresBenef_p.filter(b => b.nom).map(b => ({ ...b, date_naissance: b.date_naissance || null, conjoint_corps: false, enfants_nes: false, taux_repartition: Number(b.taux_repartition) || 0 })),
            ],
            questionnaire_medical: {
              taille_cm: q.taille_cm ? Number(q.taille_cm) : null,
              poids_kg: q.poids_kg ? Number(q.poids_kg) : null,
              tension_arterielle: q.tension_arterielle, fumeur: q.fumeur,
              cigarettes_par_jour: q.cigarettes_par_jour ? Number(q.cigarettes_par_jour) : null,
              alcool: q.alcool, distractions: q.distractions, sport: q.sport, sport_titre: q.sport_titre,
              invalidite: q.invalidite, invalidite_nature: q.invalidite_nature, invalidite_date: q.invalidite_date || null, antecedents,
            },
          });
        } catch (err) {
          prevoyanceError = err instanceof Error ? err.message : "Erreur prévoyance";
        }
      }

      if (finalPieceFile || finalRibFile) {
        await magistassurApi.uploadDocumentsEpargne(epargneContrat.id, { pieceIdentite: finalPieceFile ?? undefined, pieceIdentiteVerso: finalPieceVersoFile ?? undefined, ribDocument: finalRibFile ?? undefined });
      }
      localStorage.removeItem(draftKeyFor(user.id));
      await deleteFileFromIndexedDB(fileKey("pieceIdentite"));
      await deleteFileFromIndexedDB(fileKey("pieceIdentiteVerso"));
      await deleteFileFromIndexedDB(fileKey("rib"));
      if (prevoyanceError) {
        toast.warning(`Épargne soumis avec succès, mais la prévoyance a échoué : ${prevoyanceError}. Vous pourrez retenter la prévoyance séparément.`);
      } else {
        const msg = (garantieDeces || garantieFuneraires) ? "MAGIST'ASSUR ÉPARGNE + PRÉVOYANCE soumis avec succès !" : "MAGIST'ASSUR ÉPARGNE soumis avec succès !";
        toast.success(msg);
      }
      router.push("/client/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la souscription");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (stepId) {
      case "identite":        return <StepIdentite id={id} setId={setId} pieceIdentiteFile={pieceIdentiteFile} setPieceIdentiteFile={handleSetPieceIdentiteFile} pieceIdentiteVersoFile={pieceIdentiteVersoFile} setPieceIdentiteVersoFile={handleSetPieceIdentiteVersoFile} />;
      case "correspondants":  return <StepCorrespondants corresp1={corresp1} setCorresp1={setCorresp1} corresp2={corresp2} setCorresp2={setCorresp2} prevCorrespIdem={prevCorrespIdem} setPrevCorrespIdem={setPrevCorrespIdem} prevCorresp={prevCorresp} setPrevCorresp={setPrevCorresp} />;
      case "assure":          return <StepAssure assureIdem={assureIdem} setAssureIdem={setAssureIdem} assure={assure} setAssure={setAssure} />;
      case "cotisation":      return <StepCotisation cot={cot} setCot={setCot} dateNaissance={id.date_naissance} ribFile={ribFile} setRibFile={handleSetRibFile} />;
      case "benef-epargne":   return <StepBeneficiairesEpargne benefConjoint={benefConjoint_e} setBenefConjoint={setBenefConjoint_e} benefEnfants={benefEnfants_e} setBenefEnfants={setBenefEnfants_e} autresBenef={autresBenef_e} setAutresBenef={setAutresBenef_e} consentementDonnees={consentementDonnees} setConsentementDonnees={setConsentementDonnees} situationMatrimoniale={id.situation_matrimoniale} />;
      case "options":         return <StepOptionsPrevoyance garantieDeces={garantieDeces} setGarantieDeces={setGarantieDeces} garantieFuneraires={garantieFuneraires} setGarantieFuneraires={setGarantieFuneraires} cot={cot} />;
      case "garanties":       return <StepGaranties garantieDeces={garantieDeces} garantieFuneraires={garantieFuneraires} assuresAssocies={assuresAssocies} setAssuresAssocies={setAssuresAssocies} situationMatrimoniale={id.situation_matrimoniale} />;
      case "benef-prev":      return <StepBeneficiairesPrev benefConjoint={benefConjoint_p} setBenefConjoint={setBenefConjoint_p} benefEnfants={benefEnfants_p} setBenefEnfants={setBenefEnfants_p} autresBenef={autresBenef_p} setAutresBenef={setAutresBenef_p} epargneData={{ conjoint: benefConjoint_e, enfants: benefEnfants_e, autres: autresBenef_e }} />;
      case "questionnaire":   return <StepQuestionnaire q={q} setQ={setQ} antecedents={antecedents} setAntecedents={setAntecedents} />;
      case "recap":           return <StepRecap id={id} corresp1={corresp1} corresp2={corresp2} assureIdem={assureIdem} assure={assure} cot={cot} benefConjoint_e={benefConjoint_e} benefEnfants_e={benefEnfants_e} autresBenef_e={autresBenef_e} garantieDeces={garantieDeces} garantieFuneraires={garantieFuneraires} assuresAssocies={assuresAssocies} benefConjoint_p={benefConjoint_p} benefEnfants_p={benefEnfants_p} autresBenef_p={autresBenef_p} userName={`${user?.nom || ""} ${user?.prenoms || ""}`} />;
      default: return null;
    }
  };

  /* ── Compte non vérifié : blocage avant toute saisie ── */
  if (user && !user.verified) {
    return (
      <div className="max-w-lg mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/client/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-600" />
            MAGIST&apos;ASSUR
          </h1>
        </div>
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-8 text-center">
          <Lock className="h-14 w-14 text-amber-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Compte en attente de vérification</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Votre compte magistrat doit d&apos;abord être vérifié par un agent ACS avant de souscrire à MAGIST&apos;ASSUR.
            Vous serez notifié dès l&apos;activation de vos accès.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => router.push("/client/dashboard")}>
            Retour au tableau de bord
          </Button>
        </div>
      </div>
    );
  }

  /* ── Écran d'introduction ── */
  if (showIntro) {
    return (
      <div className="max-w-2xl mx-auto space-y-5 pb-10">
        {/* En-tête */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/client/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-600" />
              MAGIST&apos;ASSUR
            </h1>
            <p className="text-xs text-gray-500">Assurance vie des magistrats — NSIA Vie Assurances</p>
          </div>
        </div>

        {/* Bannière personnalisée */}
        <div className="bg-gradient-to-br from-amber-600 to-amber-800 rounded-2xl p-5 text-white">
          <p className="text-sm opacity-80">Bienvenue,</p>
          <p className="text-xl font-bold mt-0.5">{user?.nom} {user?.prenoms}</p>
          <p className="text-sm opacity-75 mt-2">Après avoir rendu justice, assurez votre avenir et protégez votre famille.</p>
          <div className="flex items-center gap-2 mt-3 text-xs opacity-70">
            <Clock className="h-3.5 w-3.5" />
            <span>Durée estimée : 15 à 20 minutes</span>
          </div>
        </div>

        {/* Explication du parcours */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">Comment ça fonctionne ?</p>
          <p>Ce formulaire couvre jusqu&apos;à <strong>3 produits</strong> en une seule souscription. L&apos;Épargne est <strong>obligatoire</strong>. Les garanties Prévoyance sont <strong>optionnelles</strong> et vous seront proposées après l&apos;Épargne.</p>
        </div>

        {/* Les 3 produits */}
        <p className="text-sm font-semibold text-gray-700 px-1">Les produits inclus dans ce formulaire</p>

        <div className="space-y-3">
          {/* Épargne */}
          <div className="rounded-xl border-2 border-purple-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900">ÉPARGNE Retraite</span>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">Obligatoire</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Constituez un capital retraite complémentaire. Transmis à vos bénéficiaires en cas de décès avant le terme.</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                  <span>✓ Prime libre ≥ 25 000 FCFA / période</span>
                  <span>✓ Taux garanti 3,5%/an + participations</span>
                  <span>✓ Rachat possible dès 15% des cotisations</span>
                </div>
              </div>
            </div>
          </div>

          {/* Prévoyance Décès */}
          <div className="rounded-xl border-2 border-amber-100 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900">PRÉVOYANCE Décès</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">Optionnel</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Capital versé à vos bénéficiaires en cas de décès toutes causes.</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                  <span>✓ 45 000 FCFA/an</span>
                  <span>✓ Capital : 10 000 000 FCFA</span>
                  <span>✓ Questionnaire médical requis</span>
                </div>
              </div>
            </div>
          </div>

          {/* Frais Funéraires */}
          <div className="rounded-xl border-2 border-amber-100 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <Heart className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900">FRAIS Funéraires</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">Optionnel</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Indemnité forfaitaire pour couvrir les obsèques du magistrat et de sa famille.</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                  <span>✓ 58 000 FCFA/an</span>
                  <span>✓ Magistrat 1M · Conjoint 1M · Enfants 500K</span>
                  <span>✓ Ascendants 750K</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ce qu'il faut préparer */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">📎 Ce qu&apos;il vous faut préparer</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FileText className="h-4 w-4 text-amber-500 shrink-0" />
              <span>CNI ou Passeport en cours de validité</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CreditCard className="h-4 w-4 text-amber-500 shrink-0" />
              <span>RIB (si prélèvement bancaire)</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Infos bénéficiaires (nom, contact)</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        {hasDraft ? (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800 text-center">
              📋 Un brouillon est en cours — votre saisie reprendra à l&apos;étape <strong>{step + 1}/{steps.length}</strong>.
            </div>
            <Button
              onClick={() => setShowIntro(false)}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white h-12 text-base font-semibold rounded-xl">
              Reprendre ma souscription
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <button
              type="button"
              onClick={async () => { await clearDraft(); window.location.reload(); }}
              className="w-full text-sm text-red-500 hover:text-red-700 underline">
              Recommencer à zéro (effacer le brouillon)
            </button>
          </>
        ) : (
          <Button
            onClick={() => setShowIntro(false)}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white h-12 text-base font-semibold rounded-xl">
            Commencer ma souscription
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        )}
        <p className="text-xs text-center text-gray-400">Votre saisie est sauvegardée automatiquement. Vous pouvez reprendre à tout moment.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => step > 0 ? setStep(step - 1) : router.push("/client/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-amber-600" />
            MAGIST&apos;ASSUR
          </h1>
          <p className="text-xs text-gray-500">Bulletin d&apos;adhésion — NSIA Vie Assurances</p>
        </div>
      </div>

      {/* Encadré contractuel */}
      <div className="border border-amber-300 rounded-xl overflow-hidden">
        <button type="button" onClick={() => setShowEncadre(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 hover:bg-amber-100 transition text-left">
          <span className="text-sm font-semibold text-amber-800">📋 Informations contractuelles MAGIST&apos;ASSUR</span>
          {showEncadre ? <ChevronUp className="h-4 w-4 text-amber-700 shrink-0" /> : <ChevronDown className="h-4 w-4 text-amber-700 shrink-0" />}
        </button>
        {showEncadre && (
          <div className="px-4 py-3 bg-white space-y-2 text-xs text-gray-700">
            <p className="italic text-gray-500">Ce formulaire couvre 3 produits : Épargne Retraite (obligatoire), Prévoyance Décès (optionnel), Frais Funéraires (optionnel). Lisez attentivement chaque section avant de signer.</p>
            <p><strong>Épargne :</strong> Prime ≥ 25 000 FCFA · Taux 3,5%/an + participations bénéfices · Rachat dès 15% cotisations versées</p>
            <p><strong>Prévoyance Décès :</strong> 45 000 FCFA/an → 10 000 000 FCFA capital · Pas de valeur de rachat</p>
            <p><strong>Frais Funéraires :</strong> 58 000 FCFA/an → Magistrat 1M · Conjoint 1M · Enfants 500K · Ascendants 750K</p>
          </div>
        )}
      </div>

      {/* Brouillon */}
      {hasDraft && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm">
          <span className="text-blue-700">📋 Brouillon restauré — étape {step + 1}/{steps.length}</span>
          <button onClick={clearDraft} className="text-xs text-blue-500 hover:text-red-500 underline ml-2">Effacer</button>
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <StepIndicator current={step} steps={steps} onJump={setStep} />
        </div>
        {lastSaved && (
          <p className="shrink-0 text-[10px] text-emerald-600 flex items-center gap-1 pb-1">
            <CheckCircle className="h-3 w-3" />
            Sauvegardé à {lastSaved.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>

      {renderStep()}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={goBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour
        </Button>
        {!isLast ? (
          <Button className="bg-amber-600 hover:bg-amber-700" onClick={goNext}>
            {stepId === "options" && !garantieDeces && !garantieFuneraires ? "Continuer sans prévoyance" : "Suivant"}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Soumettre la demande
          </Button>
        )}
      </div>
    </div>
  );
}

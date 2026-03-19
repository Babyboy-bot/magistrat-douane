"use client";

import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle, ChevronDown, ChevronUp, TrendingUp, Shield, Heart, Clock, FileText, CreditCard, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { magistassurApi, requestsApi } from "@/lib/api";
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

const DRAFT_KEY = "magistassur_unifie_draft";

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

function StepIndicator({ current, steps }: { current: number; steps: string[] }) {
  return (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
      {steps.map((s, i) => (
        <div key={`${s}-${i}`} className="flex items-center gap-1 shrink-0">
          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
            i < current ? "bg-amber-600 text-white" :
            i === current ? "bg-amber-600 text-white ring-2 ring-amber-300" :
            "bg-gray-200 text-gray-500"}`}>
            {i < current ? <CheckCircle className="h-4 w-4" /> : i + 1}
          </div>
          <span className={`text-[10px] hidden sm:block mr-1 ${i === current ? "text-amber-700 font-semibold" : "text-gray-400"}`}>{s}</span>
          {i < steps.length - 1 && <div className={`w-4 h-0.5 mx-0.5 ${i < current ? "bg-amber-600" : "bg-gray-200"}`} />}
        </div>
      ))}
    </div>
  );
}

export default function SouscrirePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAllowed = !user || user.professionType === "magistrat" || user.professionType === "douanier";

  // Guard: accès réservé aux magistrats et douaniers
  useEffect(() => {
    if (user && !isAllowed) {
      router.replace("/client/subscribe/magist-assur");
    }
  }, [user, isAllowed, router]);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [showEncadre, setShowEncadre] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  type SubscribeMode = "loading" | "full" | "prevoyance_only" | "already_complete";
  const [subscribeMode, setSubscribeMode] = useState<SubscribeMode>("loading");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      magistassurApi.listEpargne(),
      magistassurApi.listPrevoyance(),
    ]).then(([epargnes, prevoyances]) => {
      const activeE = epargnes.filter(e => !!e.numPolice);
      const activeP = prevoyances.filter(p => !!p.numPolice);
      const hasE = activeE.length > 0;
      const hasP = activeP.length > 0;
      if (hasE && hasP) {
        setSubscribeMode("already_complete");
      } else if (hasE) {
        setSubscribeMode("prevoyance_only");
        const e = activeE[0];
        setCot({
          duree_annees: String(e.dureeAnnees),
          periodicite: e.periodicite,
          date_premiere_cotisation: e.datePremiereCotisation || "",
          date_effet: e.dateEffet || "",
          montant_cotisation: String(e.montantCotisation),
          mode_paiement: e.modePaiement || "prelevement",
          numero_compte: e.numeroCompte || "",
        });
      } else {
        setSubscribeMode("full");
      }
    }).catch(() => setSubscribeMode("full"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  /* ── État Épargne ── */
  const [id, setId] = useState<IdentiteState>(emptyId());
  const [corresp1, setCorresp1] = useState<CorrespondantState>(emptyCorresp(1));
  const [corresp2, setCorresp2] = useState<CorrespondantState>(emptyCorresp(2));
  const [assureIdem, setAssureIdem] = useState(true);
  const [assure, setAssure] = useState<AssureState>(emptyAssure());
  const [cot, setCot] = useState<CotisationState>({ duree_annees: "10", periodicite: "mensuelle", date_premiere_cotisation: "", date_effet: "", montant_cotisation: "25000", mode_paiement: "prelevement", numero_compte: "" });
  const [benefConjoint_e, setBenefConjoint_e] = useState(false);
  const [benefEnfants_e, setBenefEnfants_e] = useState(false);
  const [autresBenef_e, setAutresBenef_e] = useState<BeneficiaireEpargne[]>([{ nom: "", en_qualite_de: "", date_naissance: "", domicile: "", adresse_postale: "", telephone: "", whatsapp: "", email: "", taux_repartition: "" }]);
  const [consentementDonnees, setConsentementDonnees] = useState<boolean | null>(null);

  /* ── Choix prévoyance ── */
  const [garantieDeces, setGarantieDeces] = useState(false);
  const [garantieFuneraires, setGarantieFuneraires] = useState(false);

  /* ── État Prévoyance ── */
  const [assuresAssocies, setAssuresAssocies] = useState<AssureAssocie[]>([]);
  const [benefConjoint_p, setBenefConjoint_p] = useState(false);
  const [benefEnfants_p, setBenefEnfants_p] = useState(false);
  const [autresBenef_p, setAutresBenef_p] = useState<BeneficiairePrev[]>([{ nom: "", date_naissance: "", telephone: "", en_qualite_de: "", taux_repartition: "" }]);
  const [q, setQ] = useState<QuestionnaireState>(emptyQ());
  const [antecedents, setAntecedents] = useState<Record<string, Record<string, string>>>({});

  /* ── Steps dynamiques ── */
  const steps = useMemo(() => {
    if (subscribeMode === "prevoyance_only") {
      const s = ["Options Prévoyance"];
      if (garantieDeces || garantieFuneraires) s.push(...STEP_LABELS_PREV);
      s.push("Récapitulatif");
      return s;
    }
    const s = [...STEP_LABELS_FIXED];
    if (garantieDeces || garantieFuneraires) s.push(...STEP_LABELS_PREV);
    s.push("Récapitulatif");
    return s;
  }, [subscribeMode, garantieDeces, garantieFuneraires]);

  const stepId = useMemo(() => {
    if (subscribeMode === "prevoyance_only") {
      const ids = ["options"];
      if (garantieDeces || garantieFuneraires) ids.push("garanties", "benef-prev", "questionnaire");
      ids.push("recap");
      return ids[step] || "recap";
    }
    const ids = ["identite", "correspondants", "assure", "cotisation", "benef-epargne", "options"];
    if (garantieDeces || garantieFuneraires) ids.push("garanties", "benef-prev", "questionnaire");
    ids.push("recap");
    return ids[step] || "recap";
  }, [step, subscribeMode, garantieDeces, garantieFuneraires]);

  /* ── Brouillon ── */
  useEffect(() => {
    if (!user) return;
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (d.id) setId(p => ({ ...p, ...d.id }));
        if (d.corresp1) setCorresp1(p => ({ ...p, ...d.corresp1 }));
        if (d.corresp2) setCorresp2(p => ({ ...p, ...d.corresp2 }));
        if (d.assureIdem !== undefined) setAssureIdem(d.assureIdem);
        if (d.assure) setAssure(d.assure);
        if (d.cot) setCot(d.cot);
        const sitMat = d.id?.situation_matrimoniale;
        const hasConjointSit = sitMat === "marie" || sitMat === "concubin";
        if (d.benefConjoint_e !== undefined) setBenefConjoint_e(hasConjointSit ? d.benefConjoint_e : false);
        if (d.benefEnfants_e !== undefined) setBenefEnfants_e(d.benefEnfants_e);
        if (d.autresBenef_e) setAutresBenef_e(d.autresBenef_e);
        if (d.consentementDonnees !== undefined) setConsentementDonnees(d.consentementDonnees);
        if (d.garantieDeces !== undefined) setGarantieDeces(d.garantieDeces);
        if (d.garantieFuneraires !== undefined) setGarantieFuneraires(d.garantieFuneraires);
        if (d.assuresAssocies) setAssuresAssocies(hasConjointSit ? d.assuresAssocies : d.assuresAssocies.filter((a: {lien_parente: string}) => a.lien_parente !== "conjoint"));
        if (d.benefConjoint_p !== undefined) setBenefConjoint_p(hasConjointSit ? d.benefConjoint_p : false);
        if (d.benefEnfants_p !== undefined) setBenefEnfants_p(d.benefEnfants_p);
        if (d.autresBenef_p) setAutresBenef_p(d.autresBenef_p);
        if (d.q) setQ(d.q);
        if (d.antecedents) setAntecedents(d.antecedents);
        if (d.step !== undefined) setStep(d.step);
        setHasDraft(true);
        setShowIntro(false);
        toast.info("Brouillon restauré — vous pouvez reprendre votre saisie.");
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const draft = {
      step, id, corresp1, corresp2, assureIdem, assure, cot,
      benefConjoint_e, benefEnfants_e, autresBenef_e, consentementDonnees,
      garantieDeces, garantieFuneraires,
      assuresAssocies, benefConjoint_p, benefEnfants_p, autresBenef_p, q, antecedents,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [step, id, corresp1, corresp2, assureIdem, assure, cot, benefConjoint_e, benefEnfants_e, autresBenef_e, consentementDonnees, garantieDeces, garantieFuneraires, assuresAssocies, benefConjoint_p, benefEnfants_p, autresBenef_p, q, antecedents, user]);

  const clearDraft = () => { localStorage.removeItem(DRAFT_KEY); setHasDraft(false); toast.success("Brouillon effacé."); };
  const goNext = () => setStep(s => Math.min(s + 1, steps.length - 1));
  const goBack = () => { if (step > 0) setStep(s => s - 1); else router.back(); };
  const isLast = step === steps.length - 1;

  /* ── Soumission ── */
  const handleSubmit = async () => {
    if (!user) return;
    if (subscribeMode === "prevoyance_only" && !garantieDeces && !garantieFuneraires) {
      toast.error("Sélectionnez au moins une garantie prévoyance avant de soumettre");
      return;
    }
    setLoading(true);
    try {
      const montant = Number(cot.montant_cotisation) || 0;
      if (subscribeMode !== "prevoyance_only") await magistassurApi.createEpargne({
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
          ...autresBenef_e.filter(b => b.nom).map(b => ({ ...b, conjoint_corps: false, enfants_nes: false, taux_repartition: Number(b.taux_repartition) || 0 })),
        ],
        consentement_donnees: consentementDonnees,
      });

      if (garantieDeces || garantieFuneraires) {
          await magistassurApi.createPrevoyance({
            client: user.id, ...id,
            date_naissance: id.date_naissance || null,
            validite_piece: id.validite_piece || null,
            corresp_nom: corresp1.nom, corresp_prenom: corresp1.prenom,
            corresp_domicile: corresp1.domicile, corresp_adresse_postale: corresp1.adresse_postale,
            corresp_telephone: corresp1.telephone, corresp_email: corresp1.email,
            corresp_whatsapp: corresp1.whatsapp, corresp_facebook: corresp1.facebook,
            corresp_linkedin: corresp1.linkedin, corresp_autres_reseaux: corresp1.autres_reseaux,
            garantie_prevoyance_deces: garantieDeces,
            garantie_frais_funeraires: garantieFuneraires,
            assures_associes: assuresAssocies.map(a => ({ ...a, date_naissance: a.date_naissance || null, montant_indemnite: ({ conjoint: 1_000_000, enfant: 500_000, pere: 750_000, mere: 750_000 })[a.lien_parente] })),
            beneficiaires: [
              ...(benefConjoint_p ? [{ conjoint_corps: true, enfants_nes: false, nom: "", taux_repartition: 0, telephone: "", en_qualite_de: "Conjoint(e)" }] : []),
              ...(benefEnfants_p ? [{ conjoint_corps: false, enfants_nes: true, nom: "", taux_repartition: 0, telephone: "", en_qualite_de: "Enfants nés ou à naître" }] : []),
              ...autresBenef_p.filter(b => b.nom).map(b => ({ ...b, conjoint_corps: false, enfants_nes: false, taux_repartition: Number(b.taux_repartition) || 0 })),
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
      }

      // Notif agents — non bloquant : si ça échoue, les contrats existent déjà
      try {
        const produits = subscribeMode === "prevoyance_only"
          ? [...(garantieDeces ? ["Prévoyance Décès"] : []), ...(garantieFuneraires ? ["Frais Funéraires"] : [])]
          : ["Épargne", ...(garantieDeces ? ["Prévoyance Décès"] : []), ...(garantieFuneraires ? ["Frais Funéraires"] : [])];
        await requestsApi.create("souscription_magist", {
          produits,
          montant_cotisation: Number(cot.montant_cotisation),
          periodicite: cot.periodicite,
          duree_annees: Number(cot.duree_annees),
        });
      } catch {
        // Notification non critique — la souscription reste valide
      }

      localStorage.removeItem(DRAFT_KEY);
      const msg = subscribeMode === "prevoyance_only"
        ? "Prévoyance ajoutée avec succès à votre contrat !"
        : (garantieDeces || garantieFuneraires) ? "MAGIST'ASSUR ÉPARGNE + PRÉVOYANCE soumis avec succès !" : "MAGIST'ASSUR ÉPARGNE soumis avec succès !";
      toast.success(msg);
      router.push("/client/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la souscription");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (stepId) {
      case "identite":        return <StepIdentite id={id} setId={setId} />;
      case "correspondants":  return <StepCorrespondants corresp1={corresp1} setCorresp1={setCorresp1} corresp2={corresp2} setCorresp2={setCorresp2} />;
      case "assure":          return <StepAssure assureIdem={assureIdem} setAssureIdem={setAssureIdem} assure={assure} setAssure={setAssure} />;
      case "cotisation":      return <StepCotisation cot={cot} setCot={setCot} />;
      case "benef-epargne":   return <StepBeneficiairesEpargne benefConjoint={benefConjoint_e} setBenefConjoint={setBenefConjoint_e} benefEnfants={benefEnfants_e} setBenefEnfants={setBenefEnfants_e} autresBenef={autresBenef_e} setAutresBenef={setAutresBenef_e} consentementDonnees={consentementDonnees} setConsentementDonnees={setConsentementDonnees} situationMatrimoniale={id.situation_matrimoniale} />;
      case "options":         return <StepOptionsPrevoyance garantieDeces={garantieDeces} setGarantieDeces={setGarantieDeces} garantieFuneraires={garantieFuneraires} setGarantieFuneraires={setGarantieFuneraires} cot={cot} situationMatrimoniale={id.situation_matrimoniale} />;
      case "garanties":       return <StepGaranties garantieDeces={garantieDeces} garantieFuneraires={garantieFuneraires} assuresAssocies={assuresAssocies} setAssuresAssocies={setAssuresAssocies} situationMatrimoniale={id.situation_matrimoniale} />;
      case "benef-prev":      return <StepBeneficiairesPrev benefConjoint={benefConjoint_p} setBenefConjoint={setBenefConjoint_p} benefEnfants={benefEnfants_p} setBenefEnfants={setBenefEnfants_p} autresBenef={autresBenef_p} setAutresBenef={setAutresBenef_p} situationMatrimoniale={id.situation_matrimoniale} />;
      case "questionnaire":   return <StepQuestionnaire q={q} setQ={setQ} antecedents={antecedents} setAntecedents={setAntecedents} situationMatrimoniale={id.situation_matrimoniale} />;
      case "recap":           return <StepRecap id={id} corresp1={corresp1} corresp2={corresp2} assureIdem={assureIdem} assure={assure} cot={cot} benefConjoint_e={benefConjoint_e} benefEnfants_e={benefEnfants_e} autresBenef_e={autresBenef_e} garantieDeces={garantieDeces} garantieFuneraires={garantieFuneraires} assuresAssocies={assuresAssocies} benefConjoint_p={benefConjoint_p} benefEnfants_p={benefEnfants_p} autresBenef_p={autresBenef_p} userName={`${user?.nom || ""} ${user?.prenoms || ""}`} />;
      default: return null;
    }
  };

  if (!isAllowed) return null;

  if (subscribeMode === "loading") {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (subscribeMode === "already_complete") {
    return (
      <div className="max-w-2xl mx-auto space-y-5 pb-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Shield className="h-5 w-5 text-amber-600" />MAGIST&apos;ASSUR</h1>
        </div>
        <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-6 text-white text-center">
          <CheckCircle className="h-14 w-14 mx-auto mb-3" />
          <p className="text-xl font-bold">Vous êtes déjà couvert !</p>
          <p className="text-sm opacity-80 mt-2">Vous disposez déjà des 3 produits MAGIST&apos;ASSUR : Épargne, Prévoyance Décès et Frais Funéraires.</p>
        </div>
        <Button variant="outline" className="w-full" onClick={() => router.push("/client/dashboard")}>
          Retour au tableau de bord
        </Button>
      </div>
    );
  }

  /* ── Écran d'introduction ── */
  if (showIntro) {
    if (subscribeMode === "prevoyance_only") {
      return (
        <div className="max-w-2xl mx-auto space-y-5 pb-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Shield className="h-5 w-5 text-amber-600" />MAGIST&apos;ASSUR</h1>
              <p className="text-xs text-gray-500">Ajout de Prévoyance — NSIA Vie Assurances</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-600 to-amber-800 rounded-2xl p-5 text-white">
            <p className="text-sm opacity-80">Vous avez déjà un contrat Épargne actif.</p>
            <p className="text-xl font-bold mt-0.5">Ajoutez la Prévoyance</p>
            <p className="text-sm opacity-75 mt-2">Complétez votre couverture en ajoutant une ou deux garanties prévoyance.</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">Ce formulaire ne modifie pas votre Épargne.</p>
            <p>Seules les étapes Prévoyance vous seront présentées. Votre contrat Épargne reste inchangé.</p>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border-2 border-amber-100 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0"><Shield className="h-5 w-5 text-amber-500" /></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2"><span className="font-bold text-gray-900">PRÉVOYANCE Décès</span><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Optionnel</span></div>
                  <p className="text-sm text-gray-500 mt-1">45 000 FCFA/an · Capital 10 000 000 FCFA</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border-2 border-amber-100 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0"><Heart className="h-5 w-5 text-amber-500" /></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2"><span className="font-bold text-gray-900">FRAIS Funéraires</span><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Optionnel</span></div>
                  <p className="text-sm text-gray-500 mt-1">58 000 FCFA/an · Magistrat + Famille couverts</p>
                </div>
              </div>
            </div>
          </div>
          <Button onClick={() => setShowIntro(false)} className="w-full bg-amber-600 hover:bg-amber-700 text-white h-12 text-base font-semibold rounded-xl">
            Ajouter la Prévoyance <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      );
    }
    return (
      <div className="max-w-2xl mx-auto space-y-5 pb-10">
        {/* En-tête */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
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
        <Button
          onClick={() => setShowIntro(false)}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white h-12 text-base font-semibold rounded-xl">
          Commencer ma souscription
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
        <p className="text-xs text-center text-gray-400">Votre saisie est sauvegardée automatiquement. Vous pouvez reprendre à tout moment.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => step > 0 ? setStep(step - 1) : router.back()}>
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

      <StepIndicator current={step} steps={steps} />

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

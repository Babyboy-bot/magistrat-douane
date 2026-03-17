"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Heart, CheckCircle, Loader2, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { magistassurApi } from "@/lib/api";
import { toast } from "sonner";

const STEPS = ["Identité", "Correspondant", "Garanties & Famille", "Bénéficiaires", "Questionnaire médical", "Récapitulatif"];

const formatCFA = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";

const PATHOLOGIES: { categorie: string; items: string[] }[] = [
  { categorie: "(a) Affections Cardio-vasculaires", items: ["AVC", "HTA", "Paralysie", "Autres / à préciser"] },
  { categorie: "(b) Affections respiratoires", items: ["Asthme", "Tuberculose", "Autres / à préciser"] },
  { categorie: "(c) Affections du foie", items: ["Cirrhose de foie", "Autres / à préciser"] },
  { categorie: "(d) Cancer", items: ["Prostate", "Foie", "Seins", "Reins", "Autres / à préciser"] },
  { categorie: "(e) Insuffisances rénale", items: ["Insuffisances rénale"] },
  { categorie: "(f) Œdèmes des membres inférieurs", items: ["Œdèmes des membres inférieurs"] },
  { categorie: "(g) SIDA, VIH, infections chroniques ou inexpliquées", items: ["SIDA, VIH, infections chroniques ou inexpliquées ?"] },
  { categorie: "(h) Diabète", items: ["Diabète"] },
  { categorie: "(i) Autres affections à préciser", items: ["Autres affections à préciser"] },
];

const MEMBRES_LABELS = ["Assuré Principal", "Conjoint(e)", "Enfant(s)", "Père", "Mère", "Beau-Père", "Belle-Mère"];
const MEMBRES_KEYS = ["assure", "conjoint", "enfants", "pere", "mere", "beau_pere", "belle_mere"];

type LienParente = "conjoint" | "enfant" | "pere" | "mere";

const INDEMNITES: Record<LienParente, number> = {
  conjoint: 1_000_000,
  enfant: 500_000,
  pere: 750_000,
  mere: 750_000,
};

const MAX_ASSURES: Record<LienParente, number> = {
  conjoint: 1,
  enfant: 4,
  pere: 1,
  mere: 1,
};

const LIEN_LABELS: Record<LienParente, string> = {
  conjoint: "Conjoint(e)",
  enfant: "Enfant",
  pere: "Père",
  mere: "Mère",
};

function StepIndicator({ current, steps }: { current: number; steps: string[] }) {
  return (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1 shrink-0">
          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i < current ? "bg-amber-600 text-white" : i === current ? "bg-amber-600 text-white ring-2 ring-amber-300" : "bg-gray-200 text-gray-500"}`}>
            {i < current ? <CheckCircle className="h-4 w-4" /> : i + 1}
          </div>
          <span className={`text-[10px] hidden sm:block mr-1 ${i === current ? "text-amber-700 font-semibold" : "text-gray-400"}`}>{s}</span>
          {i < steps.length - 1 && <div className={`w-4 h-0.5 mx-0.5 ${i < current ? "bg-amber-600" : "bg-gray-200"}`} />}
        </div>
      ))}
    </div>
  );
}

const DRAFT_KEY_PREVOYANCE = "magistassur_prevoyance_draft";
const emptyBenef = () => ({ nom: "", date_naissance: "", telephone: "", en_qualite_de: "", taux_repartition: "" });

export default function PrevoyancePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [showEncadre, setShowEncadre] = useState(false);

  /* ── Étape 0 — Identité souscripteur ── */
  const [id, setId] = useState({
    nom: "", prenoms: "",
    civilite: "", date_naissance: "", pays_naissance: "",
    type_piece: "", validite_piece: "", numero_piece: "", nni: "",
    situation_matrimoniale: "", adresse_postale: "", email_personnel: "",
    telephone: "", whatsapp: "", facebook: "", linkedin: "", autres_reseaux: "",
    profession_detail: "", telephone_bureau: "", email_professionnel: "",
    residence_principale: "", autre_residence: "",
  });

  /* ── Étape 1 — Correspondant (1 seul pour Prévoyance) ── */
  const [corresp, setCorresp] = useState({
    nom: "", prenom: "", domicile: "", adresse_postale: "",
    telephone: "", email: "", whatsapp: "", facebook: "", linkedin: "", autres_reseaux: "",
  });

  /* ── Étape 2 — Garanties & Assurés associés ── */
  const [garantieDeces, setGarantieDeces] = useState(false);
  const [garantieFuneraires, setGarantieFuneraires] = useState(false);
  const [assuresAssocies, setAssuresAssocies] = useState<Array<{
    lien_parente: LienParente; nom: string; date_naissance: string; contact: string;
  }>>([]);

  /* ── Étape 3 — Bénéficiaires ── */
  const [benefConjoint, setBenefConjoint] = useState(false);
  const [benefEnfants, setBenefEnfants] = useState(false);
  const [autresBenef, setAutresBenef] = useState([emptyBenef()]);

  /* ── Étape 4 — Questionnaire médical ── */
  const [q, setQ] = useState({
    taille_cm: "", poids_kg: "", tension_arterielle: "",
    fumeur: false, cigarettes_par_jour: "",
    alcool: "", distractions: "",
    sport: false, sport_titre: "",
    invalidite: false, invalidite_nature: "", invalidite_date: "",
  });
  const [antecedents, setAntecedents] = useState<Record<string, Record<string, string>>>({})

  /* ── 1. Chargement brouillon ou pré-remplissage profil ── */
  useEffect(() => {
    if (!user) return;
    const raw = localStorage.getItem(DRAFT_KEY_PREVOYANCE);
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (d.id) setId(prev => ({ ...prev, ...d.id }));
        if (d.corresp) setCorresp(prev => ({ ...prev, ...d.corresp }));
        if (d.garantieDeces !== undefined) setGarantieDeces(d.garantieDeces);
        if (d.garantieFuneraires !== undefined) setGarantieFuneraires(d.garantieFuneraires);
        if (d.assuresAssocies) setAssuresAssocies(d.assuresAssocies);
        if (d.benefConjoint !== undefined) setBenefConjoint(d.benefConjoint);
        if (d.benefEnfants !== undefined) setBenefEnfants(d.benefEnfants);
        if (d.autresBenef) setAutresBenef(d.autresBenef);
        if (d.q) setQ(d.q);
        if (d.antecedents) setAntecedents(d.antecedents);
        if (d.step) setStep(d.step);
        setHasDraft(true);
        toast.info("Brouillon restauré — vous pouvez reprendre votre saisie.");
        return;
      } catch { /* brouillon corrompu, ignorer */ }
    }
    // Pré-remplissage depuis le profil
    setId(prev => ({
      ...prev,
      nom: user.nom || "",
      prenoms: user.prenoms || "",
      telephone: user.telephone || "",
      email_personnel: user.email || "",
      profession_detail: user.profession || "",
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  /* ── 2. Auto-save brouillon ── */
  useEffect(() => {
    if (!user) return;
    const draft = { step, id, corresp, garantieDeces, garantieFuneraires, assuresAssocies, benefConjoint, benefEnfants, autresBenef, q, antecedents };
    localStorage.setItem(DRAFT_KEY_PREVOYANCE, JSON.stringify(draft));
  }, [step, id, corresp, garantieDeces, garantieFuneraires, assuresAssocies, benefConjoint, benefEnfants, autresBenef, q, antecedents, user]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY_PREVOYANCE);
    setHasDraft(false);
    toast.success("Brouillon effacé.");
  };

  /* ── 3. Navigation (standard — toutes les étapes visibles) ── */
  const goNext = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => { if (step > 0) setStep(s => s - 1); else router.back(); };

  const primeAnnuelle = (garantieDeces ? 45000 : 0) + (garantieFuneraires ? 58000 : 0);

  const countAssure = (lien: LienParente) => assuresAssocies.filter(a => a.lien_parente === lien).length;

  const addAssure = (lien: LienParente) => {
    if (countAssure(lien) >= MAX_ASSURES[lien]) return;
    setAssuresAssocies([...assuresAssocies, { lien_parente: lien, nom: "", date_naissance: "", contact: "" }]);
  };

  const removeAssure = (i: number) => setAssuresAssocies(assuresAssocies.filter((_, idx) => idx !== i));

  const setAntecedent = (pathologie: string, membre: string, value: string) => {
    setAntecedents(prev => ({ ...prev, [pathologie]: { ...(prev[pathologie] || {}), [membre]: value } }));
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!garantieDeces && !garantieFuneraires) {
      toast.error("Veuillez sélectionner au moins une garantie");
      return;
    }
    setLoading(true);
    try {
      await magistassurApi.createPrevoyance({
        client: user.id,
        ...id,
        date_naissance: id.date_naissance || null,
        validite_piece: id.validite_piece || null,
        // Correspondant — champs plats corresp_*
        corresp_nom: corresp.nom,
        corresp_prenom: corresp.prenom,
        corresp_domicile: corresp.domicile,
        corresp_adresse_postale: corresp.adresse_postale,
        corresp_telephone: corresp.telephone,
        corresp_email: corresp.email,
        corresp_whatsapp: corresp.whatsapp,
        corresp_facebook: corresp.facebook,
        corresp_linkedin: corresp.linkedin,
        corresp_autres_reseaux: corresp.autres_reseaux,
        garantie_prevoyance_deces: garantieDeces,
        garantie_frais_funeraires: garantieFuneraires,
        assures_associes: assuresAssocies.map(a => ({
          ...a,
          date_naissance: a.date_naissance || null,
          montant_indemnite: INDEMNITES[a.lien_parente],
        })),
        beneficiaires: [
          ...(benefConjoint ? [{ conjoint_corps: true, enfants_nes: false, nom: "", taux_repartition: 0, telephone: "", en_qualite_de: "Conjoint(e)" }] : []),
          ...(benefEnfants ? [{ conjoint_corps: false, enfants_nes: true, nom: "", taux_repartition: 0, telephone: "", en_qualite_de: "Enfants nés ou à naître" }] : []),
          ...autresBenef.filter(b => b.nom).map(b => ({
            ...b,
            conjoint_corps: false,
            enfants_nes: false,
            taux_repartition: Number(b.taux_repartition) || 0,
          })),
        ],
        questionnaire_medical: {
          taille_cm: q.taille_cm ? Number(q.taille_cm) : null,
          poids_kg: q.poids_kg ? Number(q.poids_kg) : null,
          tension_arterielle: q.tension_arterielle,
          fumeur: q.fumeur,
          cigarettes_par_jour: q.cigarettes_par_jour ? Number(q.cigarettes_par_jour) : null,
          alcool: q.alcool,
          distractions: q.distractions,
          sport: q.sport,
          sport_titre: q.sport_titre,
          invalidite: q.invalidite,
          invalidite_nature: q.invalidite_nature,
          invalidite_date: q.invalidite_date || null,
          antecedents,
        },
      });
      localStorage.removeItem(DRAFT_KEY_PREVOYANCE);
      toast.success("Demande MAGIST'ASSUR PRÉVOYANCE soumise avec succès !");
      router.push("/client/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la souscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => step > 0 ? setStep(step - 1) : router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Heart className="h-5 w-5 text-amber-600" />
            MAGIST&apos;ASSUR PRÉVOYANCE
          </h1>
          <p className="text-xs text-gray-500">Bulletin d&apos;adhésion — NSIA Vie Assurances</p>
        </div>
      </div>

      {/* ── Encadré du contrat (pré-contractuel obligatoire) ── */}
      <div className="border border-amber-300 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowEncadre(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 hover:bg-amber-100 transition text-left">
          <span className="text-sm font-semibold text-amber-800">📋 Encadré du contrat MAGIST&apos;ASSUR PRÉVOYANCE</span>
          {showEncadre ? <ChevronUp className="h-4 w-4 text-amber-700 shrink-0" /> : <ChevronDown className="h-4 w-4 text-amber-700 shrink-0" />}
        </button>
        {showEncadre && (
          <div className="px-4 py-3 bg-white space-y-3 text-sm text-gray-700">
            <p className="text-xs text-gray-500 italic">
              Cet encadré a pour objet d&apos;attirer l&apos;attention du souscripteur sur certaines dispositions essentielles de la proposition d&apos;assurance. Il est important que le souscripteur lise intégralement la proposition d&apos;assurance et pose toutes les questions nécessaires avant de signer le bulletin d&apos;adhésion.
            </p>
            <div>
              <p className="font-semibold text-gray-800">1 — Nature du contrat</p>
              <p className="text-xs mt-0.5">Contrat d&apos;assurance vie individuel de prévoyance.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">2 — Garantie de base</p>
              <p className="text-xs mt-0.5">Le contrat d&apos;assurance MAGIST&apos;ASSUR PRÉVOYANCE a pour objet de garantir aux bénéficiaires le paiement d&apos;un capital en cas de décès toutes causes du magistrat.</p>
              <p className="text-xs mt-1">En cas de décès du conjoint, d&apos;un enfant ou d&apos;un ascendant (père ou mère), il est payé une indemnité forfaitaire destinée à couvrir les frais d&apos;obsèques de la personne décédée.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">3 — Délai de paiement des prestations</p>
              <p className="text-xs mt-0.5">10 jours suivant la transmission des pièces justificatives à NSIA Vie Assurances en cas de décès d&apos;un assuré avant le terme du contrat.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">4 — Participations aux bénéfices</p>
              <p className="text-xs mt-0.5">Ce contrat ne comporte pas de participations aux bénéfices.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">5 — Faculté de rachat</p>
              <p className="text-xs mt-0.5">Conformément aux dispositions de l&apos;article 77 du Code CIMA, ce contrat n&apos;a aucune valeur de rachat.</p>
            </div>
          </div>
        )}
      </div>

      {hasDraft && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm">
          <span className="text-blue-700">📋 Brouillon restauré — étape {step + 1}/{STEPS.length}</span>
          <button onClick={clearDraft} className="text-xs text-blue-500 hover:text-red-500 underline ml-2">Effacer</button>
        </div>
      )}

      <StepIndicator current={step} steps={STEPS} />

      {/* ── Étape 0 : Identité ── */}
      {step === 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">1. Souscripteur</CardTitle></CardHeader>
          <CardContent className="space-y-4">

            {/* 1. Civilité — PREMIER comme sur le bulletin */}
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wide">Civilité</Label>
              <div className="grid grid-cols-3 gap-3 mt-1">
                {["Madame", "Mademoiselle", "Monsieur"].map(c => (
                  <button key={c} type="button"
                    onClick={() => setId({ ...id, civilite: c })}
                    className={`border rounded-lg py-2 text-sm font-medium transition ${id.civilite === c ? "bg-amber-600 text-white border-amber-600" : "border-gray-300 hover:border-amber-400"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Nom */}
            <div><Label>Nom</Label><Input value={id.nom} onChange={e => setId({ ...id, nom: e.target.value })} /></div>

            {/* 3. Prénoms */}
            <div><Label>Prénoms</Label><Input value={id.prenoms} onChange={e => setId({ ...id, prenoms: e.target.value })} /></div>

            {/* 4. Date de naissance */}
            <div><Label>Date de Naissance</Label><Input type="date" value={id.date_naissance} onChange={e => setId({ ...id, date_naissance: e.target.value })} /></div>

            {/* 5. Pays / Ville de naissance */}
            <div><Label>Pays / Ville de Naissance</Label><Input value={id.pays_naissance} onChange={e => setId({ ...id, pays_naissance: e.target.value })} /></div>

            {/* 6. Type de pièce */}
            <div>
              <Label>Type de pièce d&apos;identité</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {["CNI", "Passeport", "Autres"].map(t => (
                  <button key={t} type="button"
                    onClick={() => setId({ ...id, type_piece: t.toLowerCase() })}
                    className={`border rounded-lg py-2 text-sm font-medium transition ${id.type_piece === t.toLowerCase() ? "bg-amber-600 text-white border-amber-600" : "border-gray-300 hover:border-amber-400"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* 7. Validité de la pièce */}
            <div><Label>Validité de la pièce</Label><Input type="date" value={id.validite_piece} onChange={e => setId({ ...id, validite_piece: e.target.value })} /></div>

            {/* 8. Numéro de la pièce */}
            <div><Label>Numéro de la pièce d&apos;identité</Label><Input value={id.numero_piece} onChange={e => setId({ ...id, numero_piece: e.target.value })} /></div>

            {/* 9. NNI */}
            <div><Label>Numéro National d&apos;Identité (NNI)</Label><Input value={id.nni} onChange={e => setId({ ...id, nni: e.target.value })} /></div>

            {/* 10. Situation matrimoniale */}
            <div>
              <Label>Situation matrimoniale</Label>
              <div className="grid grid-cols-3 gap-2 mt-1 flex-wrap">
                {[
                  { val: "celibataire", label: "Célibataire" },
                  { val: "marie", label: "Marié(e)" },
                  { val: "divorce", label: "Divorcé(e)" },
                  { val: "veuf", label: "Veuf(ve)" },
                  { val: "concubin", label: "Concubin" },
                ].map(({ val, label }) => (
                  <button key={val} type="button"
                    onClick={() => setId({ ...id, situation_matrimoniale: val })}
                    className={`border rounded-lg py-2 text-xs font-medium transition ${id.situation_matrimoniale === val ? "bg-amber-600 text-white border-amber-600" : "border-gray-300 hover:border-amber-400"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 11. Adresse postale personnelle */}
            <div><Label>Adresse postale personnelle</Label><Input value={id.adresse_postale} onChange={e => setId({ ...id, adresse_postale: e.target.value })} /></div>

            {/* 12. Email personnel */}
            <div><Label>Email personnel</Label><Input type="email" value={id.email_personnel} onChange={e => setId({ ...id, email_personnel: e.target.value })} /></div>

            {/* 13. Tél. / Cél. */}
            <div><Label>Tél. / Cél.</Label><Input value={id.telephone} onChange={e => setId({ ...id, telephone: e.target.value })} /></div>

            {/* 14-17. Réf. Réseaux Sociaux */}
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Réf. Réseaux Sociaux</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>WhatsApp</Label><Input value={id.whatsapp} onChange={e => setId({ ...id, whatsapp: e.target.value })} /></div>
              <div><Label>Facebook</Label><Input value={id.facebook} onChange={e => setId({ ...id, facebook: e.target.value })} /></div>
              <div><Label>LinkedIn</Label><Input value={id.linkedin} onChange={e => setId({ ...id, linkedin: e.target.value })} /></div>
              <div><Label>* Autres à préciser</Label><Input value={id.autres_reseaux} onChange={e => setId({ ...id, autres_reseaux: e.target.value })} /></div>
            </div>

            {/* 18. Profession */}
            <div><Label>Profession</Label><Input value={id.profession_detail} onChange={e => setId({ ...id, profession_detail: e.target.value })} /></div>

            {/* 19. Téléphone Bureau */}
            <div><Label>Téléphone Bureau</Label><Input value={id.telephone_bureau} onChange={e => setId({ ...id, telephone_bureau: e.target.value })} /></div>

            {/* 20. Email Professionnel */}
            <div><Label>Email Professionnel</Label><Input type="email" value={id.email_professionnel} onChange={e => setId({ ...id, email_professionnel: e.target.value })} /></div>

            {/* 21. Résidence principale */}
            <div><Label>Résidence principale (Ville-Commune-Quartier-Rue-Lot-Ilot)</Label><Input value={id.residence_principale} onChange={e => setId({ ...id, residence_principale: e.target.value })} /></div>

            {/* 22. Autre(s) résidence(s) */}
            <div><Label>Autre(s) résidence(s)</Label><Input value={id.autre_residence} onChange={e => setId({ ...id, autre_residence: e.target.value })} /></div>

            <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">
              <strong>NB :</strong> Joindre obligatoirement une copie lisible recto/verso de la pièce d&apos;identité officielle en cours de validité.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Étape 1 : Correspondant ── */}
      {step === 1 && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Correspondant</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nom</Label><Input value={corresp.nom} onChange={e => setCorresp({ ...corresp, nom: e.target.value })} /></div>
              <div><Label>Prénom</Label><Input value={corresp.prenom} onChange={e => setCorresp({ ...corresp, prenom: e.target.value })} /></div>
            </div>
            <div><Label>Domicile (Ville-Commune-Quartier-Rue-Lot-Ilot)</Label><Input value={corresp.domicile} onChange={e => setCorresp({ ...corresp, domicile: e.target.value })} /></div>
            <div><Label>Adresse Postale</Label><Input value={corresp.adresse_postale} onChange={e => setCorresp({ ...corresp, adresse_postale: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tél. / Cél.</Label><Input value={corresp.telephone} onChange={e => setCorresp({ ...corresp, telephone: e.target.value })} /></div>
              <div><Label>E-mail</Label><Input type="email" value={corresp.email} onChange={e => setCorresp({ ...corresp, email: e.target.value })} /></div>
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Réf. Réseaux Sociaux</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>WhatsApp</Label><Input value={corresp.whatsapp} onChange={e => setCorresp({ ...corresp, whatsapp: e.target.value })} /></div>
              <div><Label>Facebook</Label><Input value={corresp.facebook} onChange={e => setCorresp({ ...corresp, facebook: e.target.value })} /></div>
              <div><Label>LinkedIn</Label><Input value={corresp.linkedin} onChange={e => setCorresp({ ...corresp, linkedin: e.target.value })} /></div>
              <div><Label>* Autres à préciser</Label><Input value={corresp.autres_reseaux} onChange={e => setCorresp({ ...corresp, autres_reseaux: e.target.value })} /></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Étape 2 : Garanties & Assurés associés ── */}
      {step === 2 && (
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">2. Les garanties et capitaux proposés</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {/* Prévoyance Décès */}
              <div
                onClick={() => setGarantieDeces(!garantieDeces)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition ${garantieDeces ? "border-amber-500 bg-amber-50" : "border-gray-200 hover:border-amber-300"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Prévoyances Décès — Magistrat uniquement</p>
                    <div className="mt-2 space-y-0.5 text-xs text-gray-600">
                      <p>Capital total : <strong>{formatCFA(10_000_000)}</strong></p>
                      <p>dont indemnité Magistrat : <strong>{formatCFA(1_000_000)}</strong></p>
                      <p>dont indemnité Conjoint : <strong>{formatCFA(1_000_000)}</strong></p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-amber-700 text-base">{formatCFA(45_000)}</p>
                    <p className="text-xs text-gray-400">/an</p>
                    <div className={`mt-2 h-5 w-5 rounded border-2 flex items-center justify-center ml-auto ${garantieDeces ? "bg-amber-500 border-amber-500" : "border-gray-400"}`}>
                      {garantieDeces && <CheckCircle className="h-3 w-3 text-white" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Frais Funéraires */}
              <div
                onClick={() => setGarantieFuneraires(!garantieFuneraires)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition ${garantieFuneraires ? "border-amber-500 bg-amber-50" : "border-gray-200 hover:border-amber-300"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Frais Funéraires — Magistrat &amp; Famille</p>
                    <div className="mt-2 space-y-0.5 text-xs text-gray-600">
                      <p>Magistrat : <strong>{formatCFA(1_000_000)}</strong></p>
                      <p>Conjoint(e) : <strong>{formatCFA(1_000_000)}</strong></p>
                      <p>Enfants (04) : <strong>{formatCFA(500_000)}</strong>/enfant</p>
                      <p>Père — Mère : <strong>{formatCFA(750_000)}</strong>/ascendant</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-amber-700 text-base">{formatCFA(58_000)}</p>
                    <p className="text-xs text-gray-400">/an</p>
                    <div className={`mt-2 h-5 w-5 rounded border-2 flex items-center justify-center ml-auto ${garantieFuneraires ? "bg-amber-500 border-amber-500" : "border-gray-400"}`}>
                      {garantieFuneraires && <CheckCircle className="h-3 w-3 text-white" />}
                    </div>
                  </div>
                </div>
              </div>

              {primeAnnuelle > 0 && (
                <div className="bg-amber-50 rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex justify-between font-bold">
                    <span>Prime annuelle totale</span>
                    <span className="text-amber-700">{formatCFA(primeAnnuelle)}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    NB : Il vous sera prélevé en sus de la première prime des frais fixes de <strong>2 500 FCFA</strong> au titre du Coût de Police et des frais accessoires de <strong>1 000 FCFA</strong>.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assurés associés — Frais Funéraires */}
          {garantieFuneraires && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Frais Funéraires — Assuré Principal &amp; Assurés Associés</CardTitle>
                <p className="text-xs text-gray-500">Conjoint-Enfants-Ascendants</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(["conjoint", "enfant", "pere", "mere"] as LienParente[]).map(lien => {
                    const count = countAssure(lien);
                    const max = MAX_ASSURES[lien];
                    const full = count >= max;
                    return (
                      <Button key={lien} variant="outline" size="sm"
                        onClick={() => addAssure(lien)}
                        disabled={full}
                        className={full ? "opacity-40 cursor-not-allowed" : ""}>
                        <Plus className="h-3 w-3 mr-1" />
                        {LIEN_LABELS[lien]}
                        <span className="ml-1 text-xs text-amber-600">({formatCFA(INDEMNITES[lien])})</span>
                        <span className="ml-1 text-xs text-gray-400">{count}/{max}</span>
                      </Button>
                    );
                  })}
                </div>

                {assuresAssocies.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {assuresAssocies.map((a, i) => (
                      <div key={i} className="border rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-amber-700 uppercase">
                            {LIEN_LABELS[a.lien_parente]} — Indemnité : {formatCFA(INDEMNITES[a.lien_parente])}
                          </span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAssure(i)}>
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Nom et Prénoms *</Label>
                            <Input className="h-8 text-sm" value={a.nom}
                              onChange={e => { const arr = [...assuresAssocies]; arr[i] = { ...arr[i], nom: e.target.value }; setAssuresAssocies(arr); }} />
                          </div>
                          <div>
                            <Label className="text-xs">Date de naissance</Label>
                            <Input className="h-8 text-sm" type="date" value={a.date_naissance}
                              onChange={e => { const arr = [...assuresAssocies]; arr[i] = { ...arr[i], date_naissance: e.target.value }; setAssuresAssocies(arr); }} />
                          </div>
                          <div>
                            <Label className="text-xs">Lien de parenté</Label>
                            <Input className="h-8 text-sm" value={LIEN_LABELS[a.lien_parente]} readOnly disabled />
                          </div>
                          <div>
                            <Label className="text-xs">Contact</Label>
                            <Input className="h-8 text-sm" value={a.contact}
                              onChange={e => { const arr = [...assuresAssocies]; arr[i] = { ...arr[i], contact: e.target.value }; setAssuresAssocies(arr); }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* TOTAL indemnités funéraires */}
                <div className="flex justify-between items-center border-t pt-3 mt-2">
                  <span className="text-sm font-semibold text-gray-700">TOTAL indemnités funérailles</span>
                  <span className="text-sm font-bold text-amber-700">
                    {formatCFA(
                      1_000_000 + assuresAssocies.reduce((sum, a) => sum + INDEMNITES[a.lien_parente], 0)
                    )}
                  </span>
                </div>
                <p className="text-xs text-gray-400">dont Assuré principal : {formatCFA(1_000_000)} (inclus)</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Étape 3 : Bénéficiaires ── */}
      {step === 3 && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">3. Bénéficiaires</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              * L&apos;assuré désigne comme bénéficiaire(s) en cas de décès avant le terme du contrat :
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Checkbox checked={benefConjoint} onCheckedChange={c => setBenefConjoint(!!c)} id="bc" />
                <Label htmlFor="bc" className="cursor-pointer">Conjoint(e) non séparé(e) de corps</Label>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Checkbox checked={benefEnfants} onCheckedChange={c => setBenefEnfants(!!c)} id="be" />
                <Label htmlFor="be" className="cursor-pointer">Enfants nés ou à naître</Label>
              </div>
            </div>

            <p className="text-sm font-semibold text-gray-700">* Autre(s) bénéficiaire(s) à désigner ci-dessous :</p>
            <div className="space-y-3">
              {autresBenef.map((b, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-500">Bénéficiaire {i + 1}</span>
                    {autresBenef.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAutresBenef(autresBenef.filter((_, idx) => idx !== i))}>
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Nom &amp; Prénom(s)</Label><Input className="h-8 text-sm" value={b.nom} onChange={e => { const a = [...autresBenef]; a[i] = { ...a[i], nom: e.target.value }; setAutresBenef(a); }} /></div>
                    <div><Label className="text-xs">Date de naissance</Label><Input className="h-8 text-sm" type="date" value={b.date_naissance} onChange={e => { const a = [...autresBenef]; a[i] = { ...a[i], date_naissance: e.target.value }; setAutresBenef(a); }} /></div>
                    <div><Label className="text-xs">N° téléphone</Label><Input className="h-8 text-sm" value={b.telephone} onChange={e => { const a = [...autresBenef]; a[i] = { ...a[i], telephone: e.target.value }; setAutresBenef(a); }} /></div>
                    <div><Label className="text-xs">En qualité de</Label><Input className="h-8 text-sm" value={b.en_qualite_de} onChange={e => { const a = [...autresBenef]; a[i] = { ...a[i], en_qualite_de: e.target.value }; setAutresBenef(a); }} /></div>
                    <div><Label className="text-xs">Taux de répartition (%)</Label><Input className="h-8 text-sm" type="number" min={0} max={100} value={b.taux_repartition} onChange={e => { const a = [...autresBenef]; a[i] = { ...a[i], taux_repartition: e.target.value }; setAutresBenef(a); }} /></div>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => setAutresBenef([...autresBenef, emptyBenef()])}>
              <Plus className="h-3 w-3 mr-1" /> Ajouter un bénéficiaire
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Étape 4 : Questionnaire médical ── */}
      {step === 4 && (
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">4. Questionnaire médical sur l&apos;état de santé</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-800 space-y-1">
                <p>— Les déclarations de l&apos;assuré constituent la base du contrat d&apos;assurance.</p>
                <p>— Nous vous invitons à répondre avec sincérité et exactitude.</p>
                <p>— Vos déclarations sont strictement confidentielles.</p>
                <p><strong>NB :</strong> À remplir obligatoirement ; si vous ignorez votre taille, poids ou tension, rendez-vous dans un établissement médical ou hospitalier et faites noter ces informations.</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>1. Taille (cm)</Label>
                  <Input type="number" value={q.taille_cm} onChange={e => setQ({ ...q, taille_cm: e.target.value })} placeholder="ex: 175" />
                </div>
                <div>
                  <Label>2. Poids (kg)</Label>
                  <Input type="number" value={q.poids_kg} onChange={e => setQ({ ...q, poids_kg: e.target.value })} placeholder="ex: 70" />
                </div>
                <div>
                  <Label>3. Tension artérielle</Label>
                  <Input value={q.tension_arterielle} onChange={e => setQ({ ...q, tension_arterielle: e.target.value })} placeholder="ex: 12/8" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">4. Fumez-vous ?</Label>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setQ({ ...q, fumeur: true })} className={`flex-1 border rounded-lg py-1.5 text-sm ${q.fumeur ? "bg-amber-600 text-white border-amber-600" : "border-gray-300"}`}>Oui</button>
                    <button type="button" onClick={() => setQ({ ...q, fumeur: false, cigarettes_par_jour: "" })} className={`flex-1 border rounded-lg py-1.5 text-sm ${!q.fumeur ? "bg-gray-200 border-gray-300" : "border-gray-300"}`}>Non</button>
                  </div>
                  {q.fumeur && (
                    <div className="mt-2">
                      <Label className="text-xs">Si oui, combien de cigarettes par jour ?</Label>
                      <Input type="number" className="mt-1" value={q.cigarettes_par_jour} onChange={e => setQ({ ...q, cigarettes_par_jour: e.target.value })} />
                    </div>
                  )}
                </div>

                <div>
                  <Label className="mb-2 block">5. Buvez-vous de l&apos;alcool ?</Label>
                  <div className="grid grid-cols-3 gap-1">
                    {[["non", "Non"], ["pas_du_tout", "Pas du tout"], ["a_l_occasion", "À l'occasion"], ["regulierement", "Régulièrement"]].map(([v, l]) => (
                      <button key={v} type="button" onClick={() => setQ({ ...q, alcool: v })} className={`border rounded-lg py-1.5 text-xs transition ${q.alcool === v ? "bg-amber-600 text-white border-amber-600" : "border-gray-300 hover:border-amber-400"}`}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label>6. Vos distractions</Label>
                <Input value={q.distractions} onChange={e => setQ({ ...q, distractions: e.target.value })} placeholder="Loisirs, activités..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">7. Pratiquez-vous un sport ?</Label>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setQ({ ...q, sport: true })} className={`flex-1 border rounded-lg py-1.5 text-sm ${q.sport ? "bg-amber-600 text-white border-amber-600" : "border-gray-300"}`}>Oui</button>
                    <button type="button" onClick={() => setQ({ ...q, sport: false, sport_titre: "" })} className={`flex-1 border rounded-lg py-1.5 text-sm ${!q.sport ? "bg-gray-200 border-gray-300" : "border-gray-300"}`}>Non</button>
                  </div>
                  {q.sport && (
                    <div className="mt-2">
                      <Label className="text-xs">Si oui, à quel titre ?</Label>
                      <div className="flex gap-2 mt-1">
                        {[["amateur", "Amateur"], ["professionnel", "Professionnel"]].map(([v, l]) => (
                          <button key={v} type="button" onClick={() => setQ({ ...q, sport_titre: v })} className={`flex-1 border rounded-lg py-1.5 text-xs ${q.sport_titre === v ? "bg-amber-600 text-white border-amber-600" : "border-gray-300"}`}>{l}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="mb-2 block">8. Êtes-vous atteint d&apos;une infirmité ?</Label>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setQ({ ...q, invalidite: true })} className={`flex-1 border rounded-lg py-1.5 text-sm ${q.invalidite ? "bg-amber-600 text-white border-amber-600" : "border-gray-300"}`}>Oui</button>
                    <button type="button" onClick={() => setQ({ ...q, invalidite: false, invalidite_nature: "", invalidite_date: "" })} className={`flex-1 border rounded-lg py-1.5 text-sm ${!q.invalidite ? "bg-gray-200 border-gray-300" : "border-gray-300"}`}>Non</button>
                  </div>
                  {q.invalidite && (
                    <div className="mt-2 space-y-2">
                      <div><Label className="text-xs">Si oui, de quelle nature ?</Label><Input className="mt-1" value={q.invalidite_nature} onChange={e => setQ({ ...q, invalidite_nature: e.target.value })} /></div>
                      <div><Label className="text-xs">Date de survenance</Label><Input type="date" className="mt-1" value={q.invalidite_date} onChange={e => setQ({ ...q, invalidite_date: e.target.value })} /></div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-sm">Avez-vous déjà été diagnostiqué et traité pour les affections suivantes ?</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-xs min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left p-2 font-semibold w-40">Affections</th>
                      {MEMBRES_LABELS.map(m => <th key={m} className="p-1 text-center font-semibold text-[10px] leading-tight">{m}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {PATHOLOGIES.map(cat => (
                      cat.items.map((item, idx) => (
                        <tr key={`${cat.categorie}-${item}`} className={`${idx === 0 ? "border-t-2 border-gray-200" : "border-t border-gray-100"}`}>
                          <td className="p-1.5 text-gray-700 align-top">
                            {idx === 0 && <span className="text-[9px] text-gray-400 block font-semibold">{cat.categorie}</span>}
                            {item}
                          </td>
                          {MEMBRES_KEYS.map(mk => (
                            <td key={mk} className="p-1 text-center align-middle">
                              <select
                                className="text-xs border rounded px-1 py-0.5 w-12"
                                value={antecedents[item]?.[mk] || ""}
                                onChange={e => setAntecedent(item, mk, e.target.value)}
                              >
                                <option value="">—</option>
                                <option value="Oui">Oui</option>
                                <option value="Non">Non</option>
                              </select>
                            </td>
                          ))}
                        </tr>
                      ))
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Étape 5 : Récapitulatif ── */}
      {step === 5 && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Récapitulatif — MAGIST&apos;ASSUR PRÉVOYANCE</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="bg-amber-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between"><span className="text-gray-500">Souscripteur</span><span className="font-medium">{user?.nom} {user?.prenoms}</span></div>
              {garantieDeces && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Prévoyance Décès</span>
                  <span className="font-medium text-green-700">✓ Capital 10 000 000 FCFA</span>
                </div>
              )}
              {garantieFuneraires && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Frais Funéraires</span>
                  <span className="font-medium text-green-700">✓ {assuresAssocies.length} assuré(s) associé(s)</span>
                </div>
              )}
              <div className="flex justify-between border-t border-amber-200 pt-2">
                <span className="font-semibold">Prime annuelle</span>
                <span className="font-bold text-amber-700">{formatCFA(primeAnnuelle)}</span>
              </div>
              <p className="text-xs text-gray-500">+ 2 500 FCFA coût de police + 1 000 FCFA frais accessoires (1ère prime)</p>
              <p className="text-xs text-gray-500">Première prime totale : <strong>{formatCFA(primeAnnuelle + 3500)}</strong></p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700">
              <strong>Déclaration sur l&apos;honneur :</strong> Je soussigné(e) {user?.nom} {user?.prenoms}, certifie avoir répondu avec sincérité et exactitude au questionnaire médical, sans rien dissimuler sur mon état de santé passé ou actuel. Je prends acte que toute réticence ou fausse déclaration de ma part entraînera la nullité du contrat.
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Navigation ── */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={goBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour
        </Button>
        {step < STEPS.length - 1 ? (
          <Button className="bg-amber-600 hover:bg-amber-700" onClick={goNext}>
            Suivant <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Soumettre la demande
          </Button>
        )}
      </div>
    </div>
  );
}

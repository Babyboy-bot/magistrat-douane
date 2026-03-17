"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, TrendingUp, CheckCircle, Loader2, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
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

const STEPS = ["Identité", "Correspondants", "Assuré", "Cotisation", "Bénéficiaires", "Récapitulatif"];

const PERIODICITE_LABELS: Record<string, string> = {
  mensuelle: "Mensuelle",
  trimestrielle: "Trimestrielle",
  semestrielle: "Semestrielle",
  annuelle: "Annuelle",
};

const formatCFA = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";

function StepIndicator({ current, steps }: { current: number; steps: string[] }) {
  return (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1 shrink-0">
          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i < current ? "bg-purple-600 text-white" : i === current ? "bg-purple-600 text-white ring-2 ring-purple-300" : "bg-gray-200 text-gray-500"}`}>
            {i < current ? <CheckCircle className="h-4 w-4" /> : i + 1}
          </div>
          <span className={`text-[10px] hidden sm:block mr-1 ${i === current ? "text-purple-700 font-semibold" : "text-gray-400"}`}>{s}</span>
          {i < steps.length - 1 && <div className={`w-4 h-0.5 mx-0.5 ${i < current ? "bg-purple-600" : "bg-gray-200"}`} />}
        </div>
      ))}
    </div>
  );
}

const DRAFT_KEY_EPARGNE = "magistassur_epargne_draft";
const emptyCorrespondant = (n: number) => ({ numero: n, nom: "", prenom: "", domicile: "", adresse_postale: "", telephone: "", email: "", whatsapp: "", facebook: "", linkedin: "", autres_reseaux: "" });
const emptyBenef = () => ({ nom: "", en_qualite_de: "", date_naissance: "", domicile: "", adresse_postale: "", telephone: "", whatsapp: "", email: "", taux_repartition: "" });

export default function EpargnePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [showEncadre, setShowEncadre] = useState(false);

  /* ── Étape 0 — Identité souscripteur ── */
  const [id, setId] = useState({
    nom: "", prenoms: "",
    civilite: "", nom_epoux: "", date_naissance: "", pays_naissance: "",
    type_piece: "", validite_piece: "", numero_piece: "", nni: "",
    situation_matrimoniale: "", adresse_postale: "", email_personnel: "",
    telephone: "", whatsapp: "", facebook: "", linkedin: "", autres_reseaux: "",
    statut_professionnel: "", revenu_mensuel: "", origine_revenu: "",
    profession_detail: "", secteur_activite: "", telephone_bureau: "",
    email_professionnel: "", residence_principale: "", autre_residence: "",
  });

  /* ── Étape 1 — Correspondants ── */
  const [corresp1, setCorresp1] = useState(emptyCorrespondant(1));
  const [corresp2, setCorresp2] = useState(emptyCorrespondant(2));

  /* ── Étape 2 — Assuré ── */
  const [assureIdem, setAssureIdem] = useState(true);
  const [assure, setAssure] = useState({
    assure_nom: "", assure_prenoms: "", assure_date_naissance: "", assure_lieu_naissance: "",
    assure_type_piece: "", assure_validite_piece: "", assure_numero_piece: "", assure_nni: "",
    assure_telephone: "", assure_lien: "", assure_adresse_postale: "", assure_email: "",
    assure_profession: "", assure_employeur: "", assure_email_pro: "",
    assure_adresse_employeur: "", assure_telephone_bureau: "",
    assure_nsia_anterieur: false, assure_nsia_type_contrat: "", assure_nsia_num_police: "",
  });

  /* ── Étape 3 — Cotisation ── */
  const [cot, setCot] = useState({
    duree_annees: "10", periodicite: "mensuelle",
    date_premiere_cotisation: "", date_effet: "",
    montant_cotisation: "25000", mode_paiement: "", numero_compte: "",
  });

  /* ── Étape 4 — Bénéficiaires ── */
  const [benefConjoint, setBenefConjoint] = useState(false);
  const [benefEnfants, setBenefEnfants] = useState(false);
  const [autresBenef, setAutresBenef] = useState([emptyBenef()]);
  const [consentementDonnees, setConsentementDonnees] = useState<boolean | null>(null);

  /* ── 1. Chargement brouillon ou pré-remplissage profil ── */
  useEffect(() => {
    if (!user) return;
    const raw = localStorage.getItem(DRAFT_KEY_EPARGNE);
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (d.id) setId(prev => ({ ...prev, ...d.id }));
        if (d.corresp1) setCorresp1(prev => ({ ...prev, ...d.corresp1 }));
        if (d.corresp2) setCorresp2(prev => ({ ...prev, ...d.corresp2 }));
        if (d.assureIdem !== undefined) setAssureIdem(d.assureIdem);
        if (d.assure) setAssure(d.assure);
        if (d.cot) setCot(d.cot);
        if (d.benefConjoint !== undefined) setBenefConjoint(d.benefConjoint);
        if (d.benefEnfants !== undefined) setBenefEnfants(d.benefEnfants);
        if (d.autresBenef) setAutresBenef(d.autresBenef);
        if (d.consentementDonnees !== undefined) setConsentementDonnees(d.consentementDonnees);
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
    const draft = { step, id, corresp1, corresp2, assureIdem, assure, cot, benefConjoint, benefEnfants, autresBenef, consentementDonnees };
    localStorage.setItem(DRAFT_KEY_EPARGNE, JSON.stringify(draft));
  }, [step, id, corresp1, corresp2, assureIdem, assure, cot, benefConjoint, benefEnfants, autresBenef, consentementDonnees, user]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY_EPARGNE);
    setHasDraft(false);
    toast.success("Brouillon effacé.");
  };

  const goNext = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => { if (step > 0) setStep(s => s - 1); else router.back(); };

  const montant = Number(cot.montant_cotisation) || 0;
  const totalCotisation = montant + 1000;
  const periodeLabel = PERIODICITE_LABELS[cot.periodicite] || cot.periodicite;

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await magistassurApi.createEpargne({
        client: user.id,
        ...id,
        date_naissance: id.date_naissance || null,
        validite_piece: id.validite_piece || null,
        revenu_mensuel: id.revenu_mensuel ? Number(id.revenu_mensuel) : null,
        assure_idem: assureIdem,
        ...(assureIdem ? {} : {
          ...assure,
          assure_date_naissance: assure.assure_date_naissance || null,
          assure_validite_piece: assure.assure_validite_piece || null,
        }),
        duree_annees: Number(cot.duree_annees),
        periodicite: cot.periodicite,
        date_premiere_cotisation: cot.date_premiere_cotisation || null,
        date_effet: cot.date_effet || null,
        montant_cotisation: montant,
        mode_paiement: cot.mode_paiement,
        numero_compte: cot.numero_compte,
        correspondants: [
          ...(corresp1.nom ? [corresp1] : []),
          ...(corresp2.nom ? [corresp2] : []),
        ],
        beneficiaires: [
          ...(benefConjoint ? [{ conjoint_corps: true, enfants_nes: false, nom: "", taux_repartition: 0, domicile: "", adresse_postale: "", telephone: "", email: "", en_qualite_de: "Conjoint(e) du souscripteur" }] : []),
          ...(benefEnfants ? [{ conjoint_corps: false, enfants_nes: true, nom: "", taux_repartition: 0, domicile: "", adresse_postale: "", telephone: "", email: "", en_qualite_de: "Enfants nés ou à naître" }] : []),
          ...autresBenef.filter(b => b.nom).map(b => ({
            ...b,
            conjoint_corps: false,
            enfants_nes: false,
            taux_repartition: Number(b.taux_repartition) || 0,
          })),
        ],
        consentement_donnees: consentementDonnees,
      });
      localStorage.removeItem(DRAFT_KEY_EPARGNE);
      toast.success("Demande MAGIST'ASSUR ÉPARGNE soumise avec succès !");
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
            <TrendingUp className="h-5 w-5 text-purple-600" />
            MAGIST&apos;ASSUR ÉPARGNE
          </h1>
          <p className="text-xs text-gray-500">Bulletin d&apos;adhésion — NSIA Vie Assurances</p>
        </div>
      </div>

      {/* ── Encadré du contrat (pré-contractuel obligatoire) ── */}
      <div className="border border-purple-300 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowEncadre(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-purple-50 hover:bg-purple-100 transition text-left">
          <span className="text-sm font-semibold text-purple-800">📋 Encadré du contrat MAGIST&apos;ASSUR ÉPARGNE</span>
          {showEncadre ? <ChevronUp className="h-4 w-4 text-purple-700 shrink-0" /> : <ChevronDown className="h-4 w-4 text-purple-700 shrink-0" />}
        </button>
        {showEncadre && (
          <div className="px-4 py-3 bg-white space-y-3 text-sm text-gray-700">
            <p className="text-xs text-gray-500 italic">
              Cet encadré a pour objet d&apos;attirer l&apos;attention du souscripteur sur certaines dispositions essentielles de la proposition d&apos;assurance. Il est important que le souscripteur lise intégralement la proposition d&apos;assurance et pose toutes les questions nécessaires avant de signer le bulletin d&apos;adhésion.
            </p>
            <div>
              <p className="font-semibold text-gray-800">1 — Nature du contrat</p>
              <p className="text-xs mt-0.5">Contrat d&apos;assurance vie individuel d&apos;épargne.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">2 — Garantie de base</p>
              <p className="text-xs mt-0.5">Le contrat MAGIST&apos;ASSUR ÉPARGNE a pour objet la constitution et le service d&apos;un capital en vue de s&apos;assurer une retraite complémentaire.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">3 — Délai de paiement des prestations</p>
              <p className="text-xs mt-0.5">10 jours suivant la transmission des pièces justificatives à NSIA Vie Assurances.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">4 — Participations aux bénéfices</p>
              <p className="text-xs mt-0.5">Ce contrat comporte des participations aux bénéfices déterminées à partir du compte de participations aux résultats défini à l&apos;article 82 du code CIMA. Elles sont affectées aux provisions mathématiques au cours des trois exercices suivants celui au titre duquel elles ont été portées à la provision pour participation aux excédents.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">5 — Faculté de rachat</p>
              <p className="text-xs mt-0.5">Ce contrat peut être résilié ou racheté partiellement lorsqu&apos;au moins 15% des cotisations prévues au contrat ou deux cotisations annuelles ont été versées. La valeur de rachat est versée par l&apos;assureur dans un délai de dix (10) jours suivant la réception du courrier de résiliation.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">6 — Frais</p>
              <ul className="text-xs mt-0.5 space-y-0.5">
                <li>Frais de gestion : <strong>5%</strong></li>
                <li>Frais accessoires : <strong>1 000 FCFA</strong></li>
                <li>Coût de police : <strong>10 000 FCFA</strong></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-800">7 — Pénalité de rachat</p>
              <p className="text-xs mt-0.5">5% de la provision mathématique si le rachat intervient avant deux (02) années effectives de cotisations et que les cotisations versées n&apos;atteignent pas 15% des cotisations prévues sur toute la durée du contrat ; 5% si le rachat intervient avant la douzième date d&apos;anniversaire du contrat et 0% au-delà.</p>
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

            {/* 1. Civilité */}
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wide">Civilité</Label>
              <div className="grid grid-cols-3 gap-3 mt-1">
                {["Madame", "Mademoiselle", "Monsieur"].map(c => (
                  <button key={c} type="button"
                    onClick={() => setId({ ...id, civilite: c })}
                    className={`border rounded-lg py-2 text-sm font-medium transition ${id.civilite === c ? "bg-purple-600 text-white border-purple-600" : "border-gray-300 hover:border-purple-400"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Nom */}
            <div><Label>Nom</Label><Input value={id.nom} onChange={e => setId({ ...id, nom: e.target.value })} /></div>

            {/* 3. Prénoms */}
            <div><Label>Prénoms</Label><Input value={id.prenoms} onChange={e => setId({ ...id, prenoms: e.target.value })} /></div>

            {/* 4. Si Marié(e) Nom de l'époux */}
            <div><Label>Si Marié(e) — Nom de l&apos;époux / épouse</Label><Input value={id.nom_epoux} onChange={e => setId({ ...id, nom_epoux: e.target.value })} placeholder="Laisser vide si non applicable" /></div>

            {/* 5. Date de naissance */}
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
                    className={`border rounded-lg py-2 text-sm font-medium transition ${id.type_piece === t.toLowerCase() ? "bg-purple-600 text-white border-purple-600" : "border-gray-300 hover:border-purple-400"}`}>
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
              <div className="grid grid-cols-3 gap-2 mt-1">
                {[
                  { val: "celibataire", label: "Célibataire" },
                  { val: "marie", label: "Marié(e)" },
                  { val: "divorce", label: "Divorcé(e)" },
                  { val: "veuf", label: "Veuf(ve)" },
                  { val: "concubin", label: "Concubin" },
                ].map(({ val, label }) => (
                  <button key={val} type="button"
                    onClick={() => setId({ ...id, situation_matrimoniale: val })}
                    className={`border rounded-lg py-2 text-xs font-medium transition ${id.situation_matrimoniale === val ? "bg-purple-600 text-white border-purple-600" : "border-gray-300 hover:border-purple-400"}`}>
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

            {/* 18. Statut professionnel */}
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Situation professionnelle</p>
            <div>
              <Label>Statut professionnel</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {[
                  { val: "salarie", label: "Salarié" },
                  { val: "non_salarie", label: "Non salarié" },
                  { val: "sans_activite", label: "Sans activité" },
                  { val: "retraite", label: "Retraité" },
                ].map(({ val, label }) => (
                  <button key={val} type="button"
                    onClick={() => setId({ ...id, statut_professionnel: val })}
                    className={`border rounded-lg py-2 text-xs font-medium transition ${id.statut_professionnel === val ? "bg-purple-600 text-white border-purple-600" : "border-gray-300 hover:border-purple-400"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 19. Estimation des revenus */}
            <div><Label>Estimation des revenus (mensuel) — FCFA</Label><Input type="number" value={id.revenu_mensuel} onChange={e => setId({ ...id, revenu_mensuel: e.target.value })} placeholder="FCFA" /></div>

            {/* 20. Origine des cotisations */}
            <div>
              <Label>Quel est l&apos;origine de vos cotisations ?</Label>
              <div className="grid grid-cols-1 gap-2 mt-1">
                {[
                  { val: "salaire", label: "Salaire / Pension / Rente" },
                  { val: "vente_actifs", label: "Vente d'actifs" },
                  { val: "activite_commerciale", label: "Activité commerciale" },
                ].map(({ val, label }) => (
                  <button key={val} type="button"
                    onClick={() => setId({ ...id, origine_revenu: val })}
                    className={`border rounded-lg py-2 text-xs font-medium transition text-left px-3 ${id.origine_revenu === val ? "bg-purple-600 text-white border-purple-600" : "border-gray-300 hover:border-purple-400"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 21. Profession */}
            <div><Label>Profession</Label><Input value={id.profession_detail} onChange={e => setId({ ...id, profession_detail: e.target.value })} /></div>

            {/* 22. Secteur d'activité */}
            <div><Label>Secteur d&apos;activité</Label><Input value={id.secteur_activite} onChange={e => setId({ ...id, secteur_activite: e.target.value })} /></div>

            {/* 23. Téléphone Bureau */}
            <div><Label>Téléphone Bureau</Label><Input value={id.telephone_bureau} onChange={e => setId({ ...id, telephone_bureau: e.target.value })} /></div>

            {/* 24. Email Professionnel */}
            <div><Label>Email Professionnel</Label><Input type="email" value={id.email_professionnel} onChange={e => setId({ ...id, email_professionnel: e.target.value })} /></div>

            {/* 25. Résidence principale */}
            <div><Label>Résidence principale (Ville-Commune-Quartier-Rue-Lot-Ilot)</Label><Input value={id.residence_principale} onChange={e => setId({ ...id, residence_principale: e.target.value })} /></div>

            {/* 26. Autre(s) résidence(s) */}
            <div><Label>Autre(s) résidence(s)</Label><Input value={id.autre_residence} onChange={e => setId({ ...id, autre_residence: e.target.value })} /></div>

            <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">
              <strong>NB :</strong> Joindre obligatoirement une copie lisible recto/verso de la pièce d&apos;identité officielle en cours de validité.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Étape 1 : Correspondants ── */}
      {step === 1 && (
        <div className="space-y-4">
          {([{ label: "Correspondant 1", data: corresp1, set: setCorresp1 }, { label: "Correspondant 2", data: corresp2, set: setCorresp2 }] as const).map(({ label, data, set }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">{label}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Nom</Label><Input value={data.nom} onChange={e => set({ ...data, nom: e.target.value })} /></div>
                  <div><Label>Prénom</Label><Input value={data.prenom} onChange={e => set({ ...data, prenom: e.target.value })} /></div>
                </div>
                <div><Label>Domicile (Ville-Commune-Quartier-Rue-Lot-Ilot)</Label><Input value={data.domicile} onChange={e => set({ ...data, domicile: e.target.value })} /></div>
                <div><Label>Adresse Postale</Label><Input value={data.adresse_postale} onChange={e => set({ ...data, adresse_postale: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Tél. / Cél.</Label><Input value={data.telephone} onChange={e => set({ ...data, telephone: e.target.value })} /></div>
                  <div><Label>E-mail</Label><Input type="email" value={data.email} onChange={e => set({ ...data, email: e.target.value })} /></div>
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Réf. Réseaux Sociaux</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>WhatsApp</Label><Input value={data.whatsapp} onChange={e => set({ ...data, whatsapp: e.target.value })} /></div>
                  <div><Label>Facebook</Label><Input value={data.facebook} onChange={e => set({ ...data, facebook: e.target.value })} /></div>
                  <div><Label>LinkedIn</Label><Input value={data.linkedin} onChange={e => set({ ...data, linkedin: e.target.value })} /></div>
                  <div><Label>* Autres à préciser</Label><Input value={data.autres_reseaux} onChange={e => set({ ...data, autres_reseaux: e.target.value })} /></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Étape 2 : Assuré ── */}
      {step === 2 && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">2. Assuré</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Checkbox checked={assureIdem} onCheckedChange={c => setAssureIdem(!!c)} id="idem" />
              <Label htmlFor="idem" className="cursor-pointer font-medium">Idem — Le souscripteur est l&apos;assuré</Label>
            </div>

            {!assureIdem && (
              <div className="space-y-4 pt-2">
                <p className="text-sm font-semibold text-gray-700">* Si autre, veuillez renseigner ci-dessous les informations sur l&apos;assuré</p>

                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Nom</Label><Input value={assure.assure_nom} onChange={e => setAssure({ ...assure, assure_nom: e.target.value })} /></div>
                  <div><Label>Prénom</Label><Input value={assure.assure_prenoms} onChange={e => setAssure({ ...assure, assure_prenoms: e.target.value })} /></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Date de naissance</Label><Input type="date" value={assure.assure_date_naissance} onChange={e => setAssure({ ...assure, assure_date_naissance: e.target.value })} /></div>
                  <div><Label>Lieu de naissance</Label><Input value={assure.assure_lieu_naissance} onChange={e => setAssure({ ...assure, assure_lieu_naissance: e.target.value })} /></div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Type de pièce</Label>
                    <Select value={assure.assure_type_piece} onValueChange={v => setAssure({ ...assure, assure_type_piece: v })}>
                      <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cni">CNI</SelectItem>
                        <SelectItem value="passeport">Passeport</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Validité pièce</Label><Input type="date" value={assure.assure_validite_piece} onChange={e => setAssure({ ...assure, assure_validite_piece: e.target.value })} /></div>
                  <div><Label>N° de la pièce</Label><Input value={assure.assure_numero_piece} onChange={e => setAssure({ ...assure, assure_numero_piece: e.target.value })} /></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><Label>NNI</Label><Input value={assure.assure_nni} onChange={e => setAssure({ ...assure, assure_nni: e.target.value })} /></div>
                  <div><Label>Tél. / Cél.</Label><Input value={assure.assure_telephone} onChange={e => setAssure({ ...assure, assure_telephone: e.target.value })} /></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Lien avec le souscripteur</Label><Input value={assure.assure_lien} onChange={e => setAssure({ ...assure, assure_lien: e.target.value })} /></div>
                  <div><Label>Adresse postale personnelle</Label><Input value={assure.assure_adresse_postale} onChange={e => setAssure({ ...assure, assure_adresse_postale: e.target.value })} /></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email personnel</Label><Input type="email" value={assure.assure_email} onChange={e => setAssure({ ...assure, assure_email: e.target.value })} /></div>
                  <div><Label>Profession</Label><Input value={assure.assure_profession} onChange={e => setAssure({ ...assure, assure_profession: e.target.value })} /></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Employeur</Label><Input value={assure.assure_employeur} onChange={e => setAssure({ ...assure, assure_employeur: e.target.value })} /></div>
                  <div><Label>Email professionnel</Label><Input type="email" value={assure.assure_email_pro} onChange={e => setAssure({ ...assure, assure_email_pro: e.target.value })} /></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Adresse employeur</Label><Input value={assure.assure_adresse_employeur} onChange={e => setAssure({ ...assure, assure_adresse_employeur: e.target.value })} /></div>
                  <div><Label>Téléphone Bureau</Label><Input value={assure.assure_telephone_bureau} onChange={e => setAssure({ ...assure, assure_telephone_bureau: e.target.value })} /></div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Checkbox checked={assure.assure_nsia_anterieur} onCheckedChange={c => setAssure({ ...assure, assure_nsia_anterieur: !!c })} id="nsia" />
                  <Label htmlFor="nsia" className="cursor-pointer">Avez-vous déjà souscrit à des contrats d&apos;assurances auprès de NSIA Vie Assurances ?</Label>
                </div>
                {assure.assure_nsia_anterieur && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Type de contrat</Label><Input value={assure.assure_nsia_type_contrat} onChange={e => setAssure({ ...assure, assure_nsia_type_contrat: e.target.value })} /></div>
                    <div><Label>N° de police</Label><Input value={assure.assure_nsia_num_police} onChange={e => setAssure({ ...assure, assure_nsia_num_police: e.target.value })} /></div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Étape 3 : Cotisation ── */}
      {step === 3 && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">3. Garanties souscrites &amp; Cotisations</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>1. Pendant combien d&apos;années souhaitez-vous cotiser ? *</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input type="number" min={1} className="w-24" value={cot.duree_annees} onChange={e => setCot({ ...cot, duree_annees: e.target.value })} />
                <span className="text-sm text-gray-500">ans</span>
              </div>
            </div>

            <div>
              <Label>2. À quelle périodicité voulez-vous cotiser ? *</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {Object.entries(PERIODICITE_LABELS).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setCot({ ...cot, periodicite: k })}
                    className={`border rounded-lg py-2 text-sm font-medium transition ${cot.periodicite === k ? "bg-purple-600 text-white border-purple-600" : "border-gray-300 hover:border-purple-400"}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>3. Date de la 1ère cotisation *</Label>
                <Input type="date" value={cot.date_premiere_cotisation} onChange={e => setCot({ ...cot, date_premiere_cotisation: e.target.value })} />
              </div>
              <div>
                <Label>Date d&apos;effet du contrat</Label>
                <Input type="date" value={cot.date_effet} onChange={e => setCot({ ...cot, date_effet: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>4. Quel montant périodique êtes-vous disposé à cotiser ? *</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input type="number" min={25000} step={5000} value={cot.montant_cotisation}
                  onChange={e => setCot({ ...cot, montant_cotisation: e.target.value })}
                  className="w-48" />
                <span className="text-sm text-gray-500">FCFA min. 25 000</span>
              </div>
            </div>

            {montant >= 25000 && (
              <div className="bg-purple-50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-semibold text-purple-800">5. Détail de votre cotisation ({periodeLabel})</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cotisation Épargne</span>
                  <span className="font-medium">{formatCFA(montant)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Frais accessoires</span>
                  <span className="font-medium">{formatCFA(1000)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-purple-200 pt-2">
                  <span>Montant total de la cotisation</span>
                  <span className="text-purple-700">{formatCFA(totalCotisation)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  NB : Il vous sera prélevé en sus de la première cotisation des frais fixes de <strong>10 000 FCFA</strong> au titre du Coût de Police.
                  <br />1ère cotisation totale : <strong>{formatCFA(totalCotisation + 10000)}</strong>
                </p>
              </div>
            )}

            <div>
              <Label>6. Comment allez-vous payer vos cotisations ?</Label>
              <Select value={cot.mode_paiement} onValueChange={v => setCot({ ...cot, mode_paiement: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir le mode de paiement" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prelevement">Prélèvement bancaire</SelectItem>
                  <SelectItem value="virement">Virement bancaire</SelectItem>
                  <SelectItem value="mobile_money">Mobile money</SelectItem>
                  <SelectItem value="especes">Espèces</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {cot.mode_paiement === "prelevement" && (
              <div>
                <Label>Prélèvement bancaire N° de compte</Label>
                <Input value={cot.numero_compte} onChange={e => setCot({ ...cot, numero_compte: e.target.value })} placeholder="Prière fournir une copie du RIB" />
              </div>
            )}

            <p className="text-xs text-gray-500 italic">
              Le contrat est valide sous réserve de l&apos;acceptation du risque par NSIA Vie Assurances et paiement de la première cotisation.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Étape 4 : Bénéficiaires ── */}
      {step === 4 && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">4. Bénéficiaires</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              * Le souscripteur désigne comme bénéficiaire(s) en cas de décès de l&apos;assuré avant le terme du contrat :
            </p>

            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Checkbox checked={benefConjoint} onCheckedChange={c => setBenefConjoint(!!c)} id="bc" />
                <Label htmlFor="bc" className="cursor-pointer">☐ Conjoint(e) du souscripteur non séparé(e) de corps</Label>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Checkbox checked={benefEnfants} onCheckedChange={c => setBenefEnfants(!!c)} id="be" />
                <Label htmlFor="be" className="cursor-pointer">☐ Enfants nés ou à naître du souscripteur</Label>
              </div>
            </div>

            <p className="text-sm font-semibold text-gray-700">* Autre(s) bénéficiaire(s) à désigner ci-dessous :</p>

            <div className="space-y-3">
              {autresBenef.map((b, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-3">
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
                    <div><Label className="text-xs">En qualité de</Label><Input className="h-8 text-sm" value={b.en_qualite_de} onChange={e => { const a = [...autresBenef]; a[i] = { ...a[i], en_qualite_de: e.target.value }; setAutresBenef(a); }} /></div>
                    <div><Label className="text-xs">Date de naissance</Label><Input className="h-8 text-sm" type="date" value={b.date_naissance} onChange={e => { const a = [...autresBenef]; a[i] = { ...a[i], date_naissance: e.target.value }; setAutresBenef(a); }} /></div>
                    <div><Label className="text-xs">Domicile</Label><Input className="h-8 text-sm" value={b.domicile} onChange={e => { const a = [...autresBenef]; a[i] = { ...a[i], domicile: e.target.value }; setAutresBenef(a); }} /></div>
                    <div><Label className="text-xs">Adresse Postale</Label><Input className="h-8 text-sm" value={b.adresse_postale} onChange={e => { const a = [...autresBenef]; a[i] = { ...a[i], adresse_postale: e.target.value }; setAutresBenef(a); }} /></div>
                    <div><Label className="text-xs">N° de téléphone</Label><Input className="h-8 text-sm" value={b.telephone} onChange={e => { const a = [...autresBenef]; a[i] = { ...a[i], telephone: e.target.value }; setAutresBenef(a); }} /></div>
                    <div><Label className="text-xs">Réf. Réseaux Sociaux (WhatsApp)</Label><Input className="h-8 text-sm" value={b.whatsapp} onChange={e => { const a = [...autresBenef]; a[i] = { ...a[i], whatsapp: e.target.value }; setAutresBenef(a); }} /></div>
                    <div><Label className="text-xs">Email</Label><Input className="h-8 text-sm" type="email" value={b.email} onChange={e => { const a = [...autresBenef]; a[i] = { ...a[i], email: e.target.value }; setAutresBenef(a); }} /></div>
                    <div><Label className="text-xs">Taux de répartition (%)</Label><Input className="h-8 text-sm" type="number" min={0} max={100} value={b.taux_repartition} onChange={e => { const a = [...autresBenef]; a[i] = { ...a[i], taux_repartition: e.target.value }; setAutresBenef(a); }} /></div>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={() => setAutresBenef([...autresBenef, emptyBenef()])}>
              <Plus className="h-3 w-3 mr-1" /> Ajouter un bénéficiaire
            </Button>

            {/* Consentement données personnelles */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-3 mt-2">
              <p className="text-xs text-gray-600">
                Permettez-vous une intégration de votre profil dans notre base de données de clients susceptibles de recevoir des communications et/ou visites dans le cadre de nos programmes de fidélisation, des messages (sms ou mail) portant sur les produits, services à forte valeur ajoutée et l&apos;actualité de NSIA Vie Assurances ?
              </p>
              <div className="flex gap-4">
                <button type="button"
                  onClick={() => setConsentementDonnees(true)}
                  className={`px-6 py-2 rounded-lg border text-sm font-semibold transition ${consentementDonnees === true ? "bg-purple-600 text-white border-purple-600" : "border-gray-300 hover:border-purple-400"}`}>
                  OUI
                </button>
                <button type="button"
                  onClick={() => setConsentementDonnees(false)}
                  className={`px-6 py-2 rounded-lg border text-sm font-semibold transition ${consentementDonnees === false ? "bg-gray-700 text-white border-gray-700" : "border-gray-300 hover:border-gray-500"}`}>
                  NON
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Vous avez la possibilité de retirer à tout moment votre consentement par courrier électronique à l&apos;adresse <span className="text-purple-600">ecoute.ci@nsiaassurances.com</span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Étape 5 : Récapitulatif ── */}
      {step === 5 && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Récapitulatif — MAGIST&apos;ASSUR ÉPARGNE</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="bg-purple-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between"><span className="text-gray-500">Souscripteur</span><span className="font-medium">{user?.nom} {user?.prenoms}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Assuré</span><span className="font-medium">{assureIdem ? "Idem souscripteur" : `${assure.assure_nom} ${assure.assure_prenoms}`}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Durée</span><span className="font-medium">{cot.duree_annees} ans</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Périodicité</span><span className="font-medium">{periodeLabel}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">1ère cotisation</span><span className="font-medium">{cot.date_premiere_cotisation || "—"}</span></div>
              <div className="flex justify-between border-t border-purple-200 pt-2">
                <span className="text-gray-500">Cotisation {periodeLabel.toLowerCase()}</span>
                <span className="font-bold text-purple-700">{formatCFA(montant)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Frais accessoires</span>
                <span className="font-medium">{formatCFA(1000)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Total (hors coût police)</span>
                <span className="font-bold text-purple-700">{formatCFA(totalCotisation)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">1ère cotisation (avec coût police)</span>
                <span className="font-bold">{formatCFA(totalCotisation + 10000)}</span>
              </div>
              <div className="flex justify-between"><span className="text-gray-500">Taux garanti</span><span className="font-medium">3,5% / an + participations bénéfices</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Correspondants</span><span className="font-medium">{[corresp1.nom, corresp2.nom].filter(Boolean).length}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Bénéficiaires</span><span className="font-medium">{(benefConjoint ? 1 : 0) + (benefEnfants ? 1 : 0) + autresBenef.filter(b => b.nom).length}</span></div>
            </div>

            <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-800">
              <strong>Lu et approuvé :</strong> Je soussigné(e) {user?.nom} {user?.prenoms}, certifie l&apos;exactitude des informations fournies et demande la souscription au contrat MAGIST&apos;ASSUR ÉPARGNE auprès de NSIA Vie Assurances.
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
          <Button className="bg-purple-600 hover:bg-purple-700" onClick={goNext}>
            Suivant <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Soumettre la demande
          </Button>
        )}
      </div>
    </div>
  );
}

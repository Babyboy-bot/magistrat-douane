"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Vault, ShieldCheck, Flower2, CheckCircle2, Users, CreditCard, User } from "lucide-react";
import { INDEMNITES, LIEN_LABELS, PERIODICITE_LABELS, formatCFA } from "./types";
import type {
  IdentiteState, CorrespondantState, CotisationState, AssureState,
  BeneficiaireEpargne, AssureAssocie, BeneficiairePrev,
} from "./types";

const MODE_LABELS: Record<string, string> = {
  prelevement: "Prélèvement bancaire",
  virement: "Virement bancaire",
  cheque: "Chèque",
  especes: "Espèces",
};

interface Props {
  id: IdentiteState;
  corresp1: CorrespondantState;
  corresp2: CorrespondantState;
  assureIdem: boolean; assure: AssureState;
  cot: CotisationState;
  benefConjoint_e: boolean; benefEnfants_e: boolean; autresBenef_e: BeneficiaireEpargne[];
  garantieDeces: boolean; garantieFuneraires: boolean;
  assuresAssocies: AssureAssocie[];
  benefConjoint_p: boolean; benefEnfants_p: boolean; autresBenef_p: BeneficiairePrev[];
  userName: string;
}

export function StepRecap(props: Props) {
  const {
    id, corresp1, corresp2, assureIdem, assure, cot,
    benefConjoint_e, benefEnfants_e, autresBenef_e,
    garantieDeces, garantieFuneraires, assuresAssocies,
    benefConjoint_p, benefEnfants_p, autresBenef_p,
    userName,
  } = props;

  const montant = Number(cot.montant_cotisation) || 0;
  const totalEpargne = montant + 1_000;
  const periodeLabel = PERIODICITE_LABELS[cot.periodicite] || cot.periodicite;
  const primePrevo = (garantieDeces ? 45_000 : 0) + (garantieFuneraires ? 58_000 : 0);
  const hasPrevoyance = garantieDeces || garantieFuneraires;
  const totalIndemnites = 1_000_000 + assuresAssocies.reduce((s, a) => s + INDEMNITES[a.lien_parente], 0);

  const benefEpargneList = [
    ...(benefConjoint_e ? [{ nom: "Conjoint(e)", taux: "" }] : []),
    ...(benefEnfants_e  ? [{ nom: "Enfants",     taux: "" }] : []),
    ...autresBenef_e.filter(b => b.nom).map(b => ({ nom: b.nom, taux: b.taux_repartition ? `${b.taux_repartition}%` : "" })),
  ];

  const benefPrevList = [
    ...(benefConjoint_p ? [{ nom: "Conjoint(e)" }] : []),
    ...(benefEnfants_p  ? [{ nom: "Enfants" }]     : []),
    ...autresBenef_p.filter(b => b.nom).map(b => ({ nom: b.nom })),
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-navy-500 text-center">Vérifiez vos informations avant de soumettre votre demande.</p>

      {/* ── SOUSCRIPTEUR ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-navy-600" />
            Souscripteur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm bg-navy-50/60 rounded-xl p-4">
          <Row label="Nom & Prénoms" value={`${id.civilite ? id.civilite + " " : ""}${id.nom} ${id.prenoms}`} />
          {id.nni && <Row label="NNI" value={id.nni} />}
          <Row label="Date de naissance" value={id.date_naissance || "—"} />
          <Row label="Téléphone" value={id.telephone || "—"} />
          {id.adresse_postale && <Row label="Adresse postale" value={id.adresse_postale} />}
          <Row label="Assuré" value={assureIdem ? "Idem souscripteur" : `${assure.assure_nom} ${assure.assure_prenoms}`} />
        </CardContent>
      </Card>

      {/* ── ÉPARGNE ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Vault className="h-4 w-4 text-amber-600" />
            Magist&apos;Assur Épargne
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm bg-amber-50/50 rounded-xl p-4">
          <Row label="Durée" value={`${cot.duree_annees} ans`} />
          <Row label="Périodicité" value={periodeLabel} />
          <Row label="Date d'effet" value={cot.date_effet || "—"} />
          <Row label="1ère cotisation" value={cot.date_premiere_cotisation || "—"} />
          <div className="border-t border-amber-200/70 pt-2 space-y-1">
            <Row label={`Cotisation ${periodeLabel.toLowerCase()}`} value={formatCFA(montant)} bold />
            <Row label="Frais accessoires" value={formatCFA(1_000)} />
            <Row label="Total / période" value={formatCFA(totalEpargne)} bold />
            <Row label="1ère cotisation (avec coût police)" value={formatCFA(totalEpargne + 10_000)} />
            <Row label="Taux garanti" value="3,5% / an + participations bénéfices" />
          </div>
          <div className="border-t border-amber-200/70 pt-2 space-y-1">
            <Row label="Mode de paiement" value={MODE_LABELS[cot.mode_paiement] || cot.mode_paiement || "—"} />
            {cot.numero_compte && <Row label="N° de compte (RIB)" value={cot.numero_compte} />}
          </div>
          {benefEpargneList.length > 0 && (
            <div className="border-t border-amber-200/70 pt-2 space-y-1">
              <p className="text-xs font-semibold text-navy-600 uppercase tracking-wide">Bénéficiaires Épargne</p>
              {benefEpargneList.map((b, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-navy-600">• {b.nom}</span>
                  {b.taux && <span className="font-medium">{b.taux}</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── PRÉVOYANCE ── */}
      {hasPrevoyance && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              Magist&apos;Assur Prévoyance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm bg-amber-50/70 rounded-xl p-4">
            {garantieDeces && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Prévoyance Décès — Capital <strong>{formatCFA(10_000_000)}</strong> · {formatCFA(45_000)}/an</span>
              </div>
            )}
            {garantieFuneraires && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Flower2 className="h-4 w-4 text-green-600" />
                  <span>Frais Funéraires — Total indemnités <strong>{formatCFA(totalIndemnites)}</strong> · {formatCFA(58_000)}/an</span>
                </div>
                {assuresAssocies.length > 0 && (
                  <div className="ml-6 space-y-0.5">
                    {assuresAssocies.map((a, i) => (
                      <p key={i} className="text-xs text-navy-600">• {LIEN_LABELS[a.lien_parente]} : {a.nom} ({a.date_naissance})</p>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="border-t border-amber-200 pt-2 space-y-1">
              <Row label="Prime annuelle prévoyance" value={formatCFA(primePrevo)} bold />
              <Row label="1ère prime (avec frais)" value={formatCFA(primePrevo + 3_500)} />
            </div>
            {benefPrevList.length > 0 && (
              <div className="border-t border-amber-200 pt-2 space-y-1">
                <p className="text-xs font-semibold text-navy-600 uppercase tracking-wide">Bénéficiaires Prévoyance</p>
                {benefPrevList.map((b, i) => (
                  <p key={i} className="text-xs text-navy-600">• {b.nom}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── CORRESPONDANTS ── */}
      {(corresp1.nom || corresp2.nom) && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-navy-600" />
              Correspondants
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {corresp1.nom && (
              <div className="bg-navy-50/60 rounded-xl p-3 space-y-1 ring-1 ring-navy-100">
                <p className="text-xs font-semibold text-navy-700 uppercase tracking-wide">Correspondant 1</p>
                <Row label="Nom & Prénom" value={`${corresp1.nom} ${corresp1.prenom}`} />
                {corresp1.telephone && <Row label="Téléphone" value={corresp1.telephone} />}
                {corresp1.domicile && <Row label="Domicile" value={corresp1.domicile} />}
              </div>
            )}
            {corresp2.nom && (
              <div className="bg-navy-50/60 rounded-xl p-3 space-y-1 ring-1 ring-navy-100">
                <p className="text-xs font-semibold text-navy-700 uppercase tracking-wide">Correspondant 2</p>
                <Row label="Nom & Prénom" value={`${corresp2.nom} ${corresp2.prenom}`} />
                {corresp2.telephone && <Row label="Téléphone" value={corresp2.telephone} />}
                {corresp2.domicile && <Row label="Domicile" value={corresp2.domicile} />}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── MODE DE PAIEMENT (résumé visuel) ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald-600" />
            Paiement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm bg-emerald-50/60 rounded-xl p-4">
          <Row label="Mode" value={MODE_LABELS[cot.mode_paiement] || cot.mode_paiement || "—"} bold />
          {cot.numero_compte && <Row label="N° de compte" value={cot.numero_compte} />}
          <Row label="1ère cotisation totale" value={formatCFA(totalEpargne + 10_000 + (hasPrevoyance ? primePrevo + 3_500 : 0))} bold />
          <p className="text-xs text-navy-500 pt-1">Cotisations suivantes : {formatCFA(totalEpargne)}{hasPrevoyance ? ` + ${formatCFA(primePrevo)} (prévoyance)` : ""}</p>
        </CardContent>
      </Card>

      {/* ── Déclaration ── */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4 space-y-3 text-xs text-navy-700">
          <div className="bg-navy-50/60 rounded-xl p-3 ring-1 ring-navy-100">
            <strong>Lu et approuvé :</strong> Je soussigné(e) {userName}, certifie l&apos;exactitude des informations fournies et demande la souscription au(x) contrat(s) MAGIST&apos;ASSUR auprès de NSIA Vie Assurances.
          </div>
          {hasPrevoyance && (
            <div className="bg-amber-50 rounded-xl p-3 ring-1 ring-amber-100">
              <strong>Déclaration médicale :</strong> Je certifie avoir répondu avec sincérité et exactitude au questionnaire médical, sans rien dissimuler sur mon état de santé passé ou actuel. Toute réticence ou fausse déclaration entraînera la nullité du contrat.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-navy-500 shrink-0">{label}</span>
      <span className={`text-right text-navy-800 ${bold ? "font-bold" : "font-medium"}`}>{value}</span>
    </div>
  );
}

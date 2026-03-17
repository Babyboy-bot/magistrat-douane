"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ShieldCheck, Heart, CheckCircle2 } from "lucide-react";
import { INDEMNITES, PERIODICITE_LABELS, formatCFA } from "./types";
import type {
  IdentiteState, CotisationState, AssureState,
  BeneficiaireEpargne, AssureAssocie, BeneficiairePrev,
} from "./types";

interface Props {
  id: IdentiteState;
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
    id, assureIdem, assure, cot,
    benefConjoint_e, benefEnfants_e, autresBenef_e,
    garantieDeces, garantieFuneraires, assuresAssocies,
    benefConjoint_p, benefEnfants_p, autresBenef_p,
    userName,
  } = props;

  const montant = Number(cot.montant_cotisation) || 0;
  const totalEpargne = montant + 1000;
  const periodeLabel = PERIODICITE_LABELS[cot.periodicite] || cot.periodicite;
  const primePrevo = (garantieDeces ? 45_000 : 0) + (garantieFuneraires ? 58_000 : 0);
  const hasPrevoyance = garantieDeces || garantieFuneraires;
  const totalIndemnites = 1_000_000 + assuresAssocies.reduce((s, a) => s + INDEMNITES[a.lien_parente], 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 text-center">Vérifiez vos informations avant de soumettre votre demande.</p>

      {/* ── ÉPARGNE ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            MAGIST&apos;ASSUR ÉPARGNE
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm bg-purple-50 rounded-lg p-4">
          <Row label="Souscripteur" value={`${id.nom} ${id.prenoms}`} />
          <Row label="Assuré" value={assureIdem ? "Idem souscripteur" : `${assure.assure_nom} ${assure.assure_prenoms}`} />
          <Row label="Durée" value={`${cot.duree_annees} ans`} />
          <Row label="Périodicité" value={periodeLabel} />
          <Row label="1ère cotisation" value={cot.date_premiere_cotisation || "—"} />
          <div className="border-t border-purple-200 pt-2 space-y-1">
            <Row label={`Cotisation ${periodeLabel.toLowerCase()}`} value={formatCFA(montant)} bold />
            <Row label="Frais accessoires" value={formatCFA(1_000)} />
            <Row label="Total / période" value={formatCFA(totalEpargne)} bold />
            <Row label="1ère cotisation (avec coût police)" value={formatCFA(totalEpargne + 10_000)} />
            <Row label="Taux garanti" value="3,5% / an + participations bénéfices" />
          </div>
          <Row label="Bénéficiaires Épargne" value={String((benefConjoint_e ? 1 : 0) + (benefEnfants_e ? 1 : 0) + autresBenef_e.filter(b => b.nom).length)} />
        </CardContent>
      </Card>

      {/* ── PRÉVOYANCE ── */}
      {hasPrevoyance && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              MAGIST&apos;ASSUR PRÉVOYANCE
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm bg-amber-50 rounded-lg p-4">
            {garantieDeces && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Prévoyance Décès — Capital <strong>{formatCFA(10_000_000)}</strong> · {formatCFA(45_000)}/an</span>
              </div>
            )}
            {garantieFuneraires && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-green-600" />
                  <span>Frais Funéraires — Total indemnités <strong>{formatCFA(totalIndemnites)}</strong> · {formatCFA(58_000)}/an</span>
                </div>
                {assuresAssocies.length > 0 && (
                  <p className="text-xs text-gray-500 ml-6">{assuresAssocies.length} assuré(s) associé(s)</p>
                )}
              </div>
            )}
            <div className="border-t border-amber-200 pt-2">
              <Row label="Prime annuelle prévoyance" value={formatCFA(primePrevo)} bold />
              <Row label="1ère prime (avec frais)" value={formatCFA(primePrevo + 3_500)} />
            </div>
            <Row label="Bénéficiaires Prévoyance" value={String((benefConjoint_p ? 1 : 0) + (benefEnfants_p ? 1 : 0) + autresBenef_p.filter(b => b.nom).length)} />
          </CardContent>
        </Card>
      )}

      {/* ── Déclaration ── */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4 space-y-3 text-xs text-gray-700">
          <div className="bg-gray-50 rounded-lg p-3">
            <strong>Lu et approuvé :</strong> Je soussigné(e) {userName}, certifie l&apos;exactitude des informations fournies et demande la souscription au(x) contrat(s) MAGIST&apos;ASSUR auprès de NSIA Vie Assurances.
          </div>
          {hasPrevoyance && (
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
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
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={bold ? "font-bold text-gray-900" : "font-medium"}>{value}</span>
    </div>
  );
}

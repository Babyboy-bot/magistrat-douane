"use client";
import { CheckCircle2, ShieldCheck, Heart, Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCFA } from "./types";
import type { CotisationState } from "./types";
import { PERIODICITE_LABELS } from "./types";

interface Props {
  garantieDeces: boolean; setGarantieDeces: (v: boolean) => void;
  garantieFuneraires: boolean; setGarantieFuneraires: (v: boolean) => void;
  cot: CotisationState;
  situationMatrimoniale?: string;
}

export function StepOptionsPrevoyance({ garantieDeces, setGarantieDeces, garantieFuneraires, setGarantieFuneraires, cot, situationMatrimoniale }: Props) {
  const hasConjoint = situationMatrimoniale === "marie" || situationMatrimoniale === "concubin";
  const montantEpargne = Number(cot.montant_cotisation) || 0;
  const primePrevoAnnuelle = (garantieDeces ? 45_000 : 0) + (garantieFuneraires ? 58_000 : 0);
  const periodeLabel = (PERIODICITE_LABELS[cot.periodicite] || "").toLowerCase();

  return (
    <div className="space-y-5">
      {/* Confirmation Épargne */}
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
        <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
        <div>
          <p className="font-semibold text-green-800 text-sm">Votre ÉPARGNE est enregistrée ✓</p>
          <p className="text-xs text-green-600 mt-0.5">
            {formatCFA(montantEpargne)} / {periodeLabel || "période"} · {cot.duree_annees} ans
          </p>
        </div>
      </div>

      {/* Invitation */}
      <div className="text-center space-y-1 py-1">
        <p className="font-bold text-gray-900 text-lg">Souhaitez-vous compléter votre contrat ?</p>
        <p className="text-sm text-gray-500">
          Vous pouvez ajouter une ou deux garanties de prévoyance à votre Épargne. Ce choix est <strong>facultatif</strong>.
        </p>
      </div>

      {/* Carte Prévoyance Décès */}
      <div
        onClick={() => setGarantieDeces(!garantieDeces)}
        className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${garantieDeces ? "border-amber-500 bg-amber-50 shadow-sm" : "border-gray-200 hover:border-amber-300 bg-white"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${garantieDeces ? "bg-amber-500" : "bg-gray-100"}`}>
              <ShieldCheck className={`h-5 w-5 ${garantieDeces ? "text-white" : "text-gray-400"}`} />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Prévoyance Décès — Magistrat uniquement</p>
              <div className="mt-1.5 space-y-0.5 text-xs text-gray-600">
                <p>Capital en cas de décès : <strong className="text-amber-700">{formatCFA(10_000_000)}</strong></p>
                <p>dont indemnité Magistrat : {formatCFA(1_000_000)}</p>
                {hasConjoint && <p>dont indemnité Conjoint : {formatCFA(1_000_000)}</p>}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-amber-700 text-base">{formatCFA(45_000)}</p>
            <p className="text-xs text-gray-400">/an</p>
            <div className={`mt-2 h-5 w-5 rounded border-2 flex items-center justify-center ml-auto ${garantieDeces ? "bg-amber-500 border-amber-500" : "border-gray-300"}`}>
              {garantieDeces && <CheckCircle2 className="h-3 w-3 text-white" />}
            </div>
          </div>
        </div>
      </div>

      {/* Carte Frais Funéraires */}
      <div
        onClick={() => setGarantieFuneraires(!garantieFuneraires)}
        className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${garantieFuneraires ? "border-amber-500 bg-amber-50 shadow-sm" : "border-gray-200 hover:border-amber-300 bg-white"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${garantieFuneraires ? "bg-amber-500" : "bg-gray-100"}`}>
              <Heart className={`h-5 w-5 ${garantieFuneraires ? "text-white" : "text-gray-400"}`} />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Frais Funéraires — Magistrat &amp; Famille</p>
              <div className="mt-1.5 space-y-0.5 text-xs text-gray-600">
                <p>Magistrat : <strong className="text-amber-700">{formatCFA(1_000_000)}</strong></p>
                {hasConjoint && <p>Conjoint(e) : {formatCFA(1_000_000)}</p>}
                <p>Enfants (max 4) : {formatCFA(500_000)} / enfant</p>
                <p>Père &amp; Mère : {formatCFA(750_000)} / ascendant</p>
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-amber-700 text-base">{formatCFA(58_000)}</p>
            <p className="text-xs text-gray-400">/an</p>
            <div className={`mt-2 h-5 w-5 rounded border-2 flex items-center justify-center ml-auto ${garantieFuneraires ? "bg-amber-500 border-amber-500" : "border-gray-300"}`}>
              {garantieFuneraires && <CheckCircle2 className="h-3 w-3 text-white" />}
            </div>
          </div>
        </div>
      </div>

      {/* Récapitulatif en temps réel */}
      {(garantieDeces || garantieFuneraires) && (
        <Card className="border-0 bg-amber-50">
          <CardContent className="p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-amber-600" />
              <span className="font-semibold text-amber-800 text-sm">Récapitulatif de votre sélection</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Épargne ({periodeLabel})</span>
              <span className="font-medium">{formatCFA(montantEpargne)}</span>
            </div>
            {garantieDeces && (
              <div className="flex justify-between">
                <span className="text-gray-600">Prévoyance Décès (annuel)</span>
                <span className="font-medium">{formatCFA(45_000)}</span>
              </div>
            )}
            {garantieFuneraires && (
              <div className="flex justify-between">
                <span className="text-gray-600">Frais Funéraires (annuel)</span>
                <span className="font-medium">{formatCFA(58_000)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-amber-200 pt-2 font-bold">
              <span>Total prévoyance / an</span>
              <span className="text-amber-700">{formatCFA(primePrevoAnnuelle)}</span>
            </div>
            <p className="text-xs text-gray-500">+ 2 500 FCFA coût de police + 1 000 FCFA frais accessoires sur la 1ère prime prévoyance</p>
          </CardContent>
        </Card>
      )}

      {/* Message si rien sélectionné */}
      {!garantieDeces && !garantieFuneraires && (
        <p className="text-center text-sm text-gray-400 py-2">
          Cliquez sur une garantie pour l&apos;activer, ou passez directement au récapitulatif.
        </p>
      )}
    </div>
  );
}

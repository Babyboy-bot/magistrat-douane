"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { INDEMNITES, MAX_ASSURES, LIEN_LABELS, formatCFA } from "./types";
import type { AssureAssocie, LienParente } from "./types";

interface Props {
  garantieDeces: boolean;
  garantieFuneraires: boolean;
  assuresAssocies: AssureAssocie[];
  setAssuresAssocies: (v: AssureAssocie[]) => void;
  situationMatrimoniale?: string;
}

export function StepGaranties({ garantieDeces, garantieFuneraires, assuresAssocies, setAssuresAssocies, situationMatrimoniale }: Props) {
  const hasConjoint = situationMatrimoniale === "marie" || situationMatrimoniale === "concubin";
  const countAssure = (lien: LienParente) => assuresAssocies.filter(a => a.lien_parente === lien).length;
  const addAssure = (lien: LienParente) => {
    if (countAssure(lien) >= MAX_ASSURES[lien]) return;
    setAssuresAssocies([...assuresAssocies, { lien_parente: lien, nom: "", date_naissance: "", contact: "" }]);
  };
  const removeAssure = (i: number) => setAssuresAssocies(assuresAssocies.filter((_, idx) => idx !== i));
  const updateAssure = (i: number, field: keyof AssureAssocie, val: string) => {
    const arr = [...assuresAssocies];
    arr[i] = { ...arr[i], [field]: val };
    setAssuresAssocies(arr);
  };
  const totalIndemnites = 1_000_000 + assuresAssocies.reduce((sum, a) => sum + INDEMNITES[a.lien_parente], 0);

  return (
    <div className="space-y-4">
      {/* Garanties sélectionnées */}
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-base">Garanties &amp; Capitaux souscrits</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {garantieDeces && (
            <div className="p-3 rounded-xl bg-amber-50 ring-1 ring-amber-100">
              <p className="font-semibold text-sm text-amber-800">Prévoyance Décès — Magistrat</p>
              <p className="text-xs text-navy-600 mt-1">Capital total : <strong>{formatCFA(10_000_000)}</strong> · Prime : <strong>{formatCFA(45_000)}/an</strong></p>
            </div>
          )}
          {garantieFuneraires && (
            <div className="p-3 rounded-xl bg-amber-50 ring-1 ring-amber-100">
              <p className="font-semibold text-sm text-amber-800">Frais Funéraires — Magistrat &amp; Famille</p>
              <p className="text-xs text-navy-600 mt-1">
                Magistrat {formatCFA(1_000_000)} · Conjoint {formatCFA(1_000_000)} · Enfants {formatCFA(500_000)} · Ascendants {formatCFA(750_000)}<br />
                Prime : <strong>{formatCFA(58_000)}/an</strong>
              </p>
            </div>
          )}
          <p className="text-xs text-navy-500">+ 2 500 FCFA coût de police + 1 000 FCFA frais accessoires sur la 1ère prime</p>
        </CardContent>
      </Card>

      {/* Assurés associés (Frais Funéraires uniquement) */}
      {garantieFuneraires && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Assurés associés — Frais funéraires</CardTitle>
            <p className="text-xs text-navy-500">{hasConjoint ? "Conjoint · " : ""} Enfants (max 4) · Père · Mère</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(["conjoint", "enfant", "pere", "mere"] as LienParente[]).filter(lien => lien !== "conjoint" || hasConjoint).map(lien => {
                const count = countAssure(lien);
                const max = MAX_ASSURES[lien];
                const full = count >= max;
                return (
                  <Button key={lien} variant="outline" size="sm" onClick={() => addAssure(lien)} disabled={full}
                    className={full ? "opacity-40 cursor-not-allowed" : ""}>
                    <Plus className="h-3 w-3 mr-1" />
                    {LIEN_LABELS[lien]}
                    <span className="ml-1 text-xs text-amber-700">({formatCFA(INDEMNITES[lien])})</span>
                    <span className="ml-1 text-xs text-navy-400">{count}/{max}</span>
                  </Button>
                );
              })}
            </div>

            {assuresAssocies.map((a, i) => (
              <div key={i} className="border border-navy-200 rounded-xl p-3 space-y-2" data-field={`assure_assoc_${i}`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-amber-700 uppercase">
                    {LIEN_LABELS[a.lien_parente]} — {formatCFA(INDEMNITES[a.lien_parente])}
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAssure(i)}>
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div><Label className="text-xs">Nom et Prénoms <span className="text-red-500">*</span></Label><Input className="h-8 text-sm" value={a.nom} onChange={e => updateAssure(i, "nom", e.target.value)} /></div>
                  <div><Label className="text-xs">Date de naissance</Label><Input className="h-8 text-sm" type="date" max={new Date().toISOString().slice(0, 10)} value={a.date_naissance} onChange={e => updateAssure(i, "date_naissance", e.target.value)} /></div>
                  <div><Label className="text-xs">Contact <span className="text-red-500">*</span></Label><Input className="h-8 text-sm" value={a.contact} onChange={e => updateAssure(i, "contact", e.target.value)} /></div>
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center border-t pt-3 mt-1">
              <span className="text-sm font-semibold text-navy-700">Total indemnités funérailles</span>
              <span className="text-sm font-bold text-amber-700">{formatCFA(totalIndemnites)}</span>
            </div>
            <p className="text-xs text-navy-400">dont Assuré principal : {formatCFA(1_000_000)} (inclus)</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

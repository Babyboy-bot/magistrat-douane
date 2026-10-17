"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import type { BeneficiairePrev, BeneficiaireEpargne } from "./types";

interface Props {
  benefConjoint: boolean; setBenefConjoint: (v: boolean) => void;
  benefEnfants: boolean; setBenefEnfants: (v: boolean) => void;
  autresBenef: BeneficiairePrev[]; setAutresBenef: (v: BeneficiairePrev[]) => void;
  epargneData?: { conjoint: boolean; enfants: boolean; autres: BeneficiaireEpargne[] };
}

const emptyBenef = (): BeneficiairePrev => ({
  nom: "", date_naissance: "", telephone: "", en_qualite_de: "", taux_repartition: "",
});

export function StepBeneficiairesPrev({ benefConjoint, setBenefConjoint, benefEnfants, setBenefEnfants, autresBenef, setAutresBenef, epargneData }: Props) {
  const [hasAutres, setHasAutres] = useState(autresBenef.some(b => b.nom !== ""));
  const totalTaux = autresBenef.filter(b => b.nom).reduce((s, b) => s + (Number(b.taux_repartition) || 0), 0);
  const taux100 = !hasAutres || totalTaux === 100;

  const update = (i: number, field: keyof BeneficiairePrev, val: string) => {
    const arr = [...autresBenef];
    arr[i] = { ...arr[i], [field]: val };
    setAutresBenef(arr);
  };

  const toggleAutres = (checked: boolean) => {
    setHasAutres(checked);
    if (!checked) setAutresBenef([emptyBenef()]);
  };

  const copyFromEpargne = () => {
    if (!epargneData) return;
    setBenefConjoint(epargneData.conjoint);
    setBenefEnfants(epargneData.enfants);
    const mapped = epargneData.autres
      .filter(b => b.nom)
      .map(b => ({ nom: b.nom, date_naissance: b.date_naissance, telephone: b.telephone, en_qualite_de: b.en_qualite_de, taux_repartition: b.taux_repartition }));
    setAutresBenef(mapped.length > 0 ? mapped : [emptyBenef()]);
    setHasAutres(mapped.length > 0);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader><CardTitle className="text-base">Bénéficiaires Prévoyance</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">L&apos;assuré désigne comme bénéficiaire(s) en cas de décès avant le terme du contrat :</p>

        {epargneData && (
          <Button type="button" variant="outline" size="sm" onClick={copyFromEpargne} className="text-xs">
            Mêmes bénéficiaires que l&apos;épargne
          </Button>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Checkbox checked={benefConjoint} onCheckedChange={c => setBenefConjoint(!!c)} id="bcp" />
            <Label htmlFor="bcp" className="cursor-pointer">Conjoint(e) non séparé(e) de corps</Label>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Checkbox checked={benefEnfants} onCheckedChange={c => setBenefEnfants(!!c)} id="bep" />
            <Label htmlFor="bep" className="cursor-pointer">Enfants nés ou à naître</Label>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <Checkbox checked={hasAutres} onCheckedChange={c => toggleAutres(!!c)} id="bap" />
          <Label htmlFor="bap" className="cursor-pointer">Autre(s) bénéficiaire(s)</Label>
        </div>

        {hasAutres && autresBenef.some(b => b.nom) && (
          <div className="space-y-1.5" data-field="benef_p_total">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-gray-600">Total répartition</span>
              <span className={`font-bold ${taux100 ? "text-emerald-600" : "text-orange-600"}`}>{totalTaux} % / 100 %</span>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${taux100 ? "bg-emerald-500" : "bg-orange-500"}`}
                style={{ width: `${Math.min(100, totalTaux)}%` }} />
            </div>
            {!taux100 && (
              <p className="text-xs text-orange-600 bg-orange-50 rounded px-3 py-1.5">⚠ La somme des taux de répartition doit être de 100% pour continuer.</p>
            )}
          </div>
        )}
        {hasAutres && (
          <div className="space-y-3">
            {autresBenef.map((b, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2" data-field={`benef_p_${i}`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-500">Bénéficiaire {i + 1}</span>
                  {autresBenef.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAutresBenef(autresBenef.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Nom &amp; Prénom(s)</Label><Input className="h-8 text-sm" value={b.nom} onChange={e => update(i, "nom", e.target.value)} /></div>
                  <div><Label className="text-xs">Date de naissance</Label><Input className="h-8 text-sm" type="date" max={new Date().toISOString().slice(0, 10)} value={b.date_naissance} onChange={e => update(i, "date_naissance", e.target.value)} /></div>
                  <div><Label className="text-xs">N° téléphone</Label><Input className="h-8 text-sm" value={b.telephone} onChange={e => update(i, "telephone", e.target.value)} /></div>
                  <div><Label className="text-xs">En qualité de</Label><Input className="h-8 text-sm" value={b.en_qualite_de} onChange={e => update(i, "en_qualite_de", e.target.value)} /></div>
                  <div><Label className="text-xs">Taux répartition (%)</Label><Input className="h-8 text-sm" type="number" min={0} max={100 - (totalTaux - (Number(b.taux_repartition) || 0))} value={b.taux_repartition} onChange={e => { const max = 100 - (totalTaux - (Number(b.taux_repartition) || 0)); update(i, "taux_repartition", String(Math.min(Number(e.target.value), max))); }} /></div>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setAutresBenef([...autresBenef, emptyBenef()])}>
              <Plus className="h-3 w-3 mr-1" /> Ajouter un bénéficiaire
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

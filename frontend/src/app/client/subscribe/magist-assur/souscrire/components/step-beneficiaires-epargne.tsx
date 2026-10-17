"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import type { BeneficiaireEpargne } from "./types";

interface Props {
  benefConjoint: boolean; setBenefConjoint: (v: boolean) => void;
  benefEnfants: boolean; setBenefEnfants: (v: boolean) => void;
  autresBenef: BeneficiaireEpargne[]; setAutresBenef: (v: BeneficiaireEpargne[]) => void;
  consentementDonnees: boolean | null; setConsentementDonnees: (v: boolean) => void;
  situationMatrimoniale?: string;
}

const emptyBenef = (): BeneficiaireEpargne => ({
  nom: "", en_qualite_de: "", date_naissance: "", domicile: "",
  adresse_postale: "", telephone: "", whatsapp: "", email: "", taux_repartition: "",
});

export function StepBeneficiairesEpargne({ benefConjoint, setBenefConjoint, benefEnfants, setBenefEnfants, autresBenef, setAutresBenef, consentementDonnees, setConsentementDonnees, situationMatrimoniale }: Props) {
  const hasConjoint = situationMatrimoniale === "marie" || situationMatrimoniale === "concubin";
  const [hasAutres, setHasAutres] = useState(autresBenef.some(b => b.nom !== ""));
  const totalTaux = autresBenef.filter(b => b.nom).reduce((s, b) => s + (Number(b.taux_repartition) || 0), 0);
  const taux100 = !hasAutres || totalTaux === 100;

  const update = (i: number, field: keyof BeneficiaireEpargne, val: string) => {
    const arr = [...autresBenef];
    arr[i] = { ...arr[i], [field]: val };
    setAutresBenef(arr);
  };

  const toggleAutres = (checked: boolean) => {
    setHasAutres(checked);
    if (!checked) setAutresBenef([emptyBenef()]);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader><CardTitle className="text-base">4. Bénéficiaires Épargne</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">Le souscripteur désigne comme bénéficiaire(s) en cas de décès de l&apos;assuré avant le terme du contrat :</p>

        <div className="space-y-2" data-field="benef_choix">
          {hasConjoint && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Checkbox checked={benefConjoint} onCheckedChange={c => setBenefConjoint(!!c)} id="bc" />
            <Label htmlFor="bc" className="cursor-pointer">Conjoint(e) du souscripteur non séparé(e) de corps</Label>
          </div>
          )}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Checkbox checked={benefEnfants} onCheckedChange={c => setBenefEnfants(!!c)} id="be" />
            <Label htmlFor="be" className="cursor-pointer">Enfants nés ou à naître du souscripteur</Label>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <Checkbox checked={hasAutres} onCheckedChange={c => toggleAutres(!!c)} id="ba" />
          <Label htmlFor="ba" className="cursor-pointer">Autre(s) bénéficiaire(s)</Label>
        </div>

        {hasAutres && autresBenef.some(b => b.nom) && (
          <div className="space-y-1.5" data-field="benef_e_total">
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
              <div key={i} className="border rounded-lg p-3 space-y-3" data-field={`benef_e_${i}`}>
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
                  <div><Label className="text-xs">En qualité de <span className="text-red-500">*</span></Label><Input className="h-8 text-sm" value={b.en_qualite_de} onChange={e => update(i, "en_qualite_de", e.target.value)} /></div>
                  <div><Label className="text-xs">Date de naissance</Label><Input className="h-8 text-sm" type="date" max={new Date().toISOString().slice(0, 10)} value={b.date_naissance} onChange={e => update(i, "date_naissance", e.target.value)} /></div>
                  <div><Label className="text-xs">Domicile <span className="text-red-500">*</span></Label><Input className="h-8 text-sm" value={b.domicile} onChange={e => update(i, "domicile", e.target.value)} /></div>
                  <div><Label className="text-xs">Adresse Postale <span className="text-red-500">*</span></Label><Input className="h-8 text-sm" value={b.adresse_postale} onChange={e => update(i, "adresse_postale", e.target.value)} /></div>
                  <div><Label className="text-xs">N° de téléphone <span className="text-red-500">*</span></Label><Input className="h-8 text-sm" value={b.telephone} onChange={e => update(i, "telephone", e.target.value)} /></div>
                  <div><Label className="text-xs">WhatsApp</Label><Input className="h-8 text-sm" value={b.whatsapp} onChange={e => update(i, "whatsapp", e.target.value)} /></div>
                  <div><Label className="text-xs">Email</Label><Input className="h-8 text-sm" type="email" value={b.email} onChange={e => update(i, "email", e.target.value)} /></div>
                  <div><Label className="text-xs">Taux répartition (%)</Label><Input className="h-8 text-sm" type="number" min={0} max={100 - (totalTaux - (Number(b.taux_repartition) || 0))} value={b.taux_repartition} onChange={e => { const max = 100 - (totalTaux - (Number(b.taux_repartition) || 0)); update(i, "taux_repartition", String(Math.min(Number(e.target.value), max))); }} /></div>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setAutresBenef([...autresBenef, emptyBenef()])}>
              <Plus className="h-3 w-3 mr-1" /> Ajouter un bénéficiaire
            </Button>
          </div>
        )}

        <div className="border border-gray-200 rounded-lg p-4 space-y-3 mt-2" data-field="consentement">
          <p className="text-xs text-gray-600">
            Permettez-vous une intégration de votre profil dans notre base de données de clients susceptibles de recevoir des communications dans le cadre de nos programmes de fidélisation et de l&apos;actualité de NSIA Vie Assurances ?
          </p>
          <div className="flex gap-4">
            <button type="button" onClick={() => setConsentementDonnees(true)}
              className={`px-6 py-2 rounded-lg border text-sm font-semibold transition ${consentementDonnees === true ? "bg-amber-600 text-white border-amber-600" : "border-gray-300 hover:border-amber-400"}`}>OUI</button>
            <button type="button" onClick={() => setConsentementDonnees(false)}
              className={`px-6 py-2 rounded-lg border text-sm font-semibold transition ${consentementDonnees === false ? "bg-gray-700 text-white border-gray-700" : "border-gray-300 hover:border-gray-500"}`}>NON</button>
          </div>
          <p className="text-xs text-gray-400">Vous pouvez retirer ce consentement à tout moment à : <span className="text-amber-600">ecoute.ci@nsiaassurances.com</span></p>
        </div>
      </CardContent>
    </Card>
  );
}

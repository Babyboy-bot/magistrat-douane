"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PERIODICITE_LABELS, formatCFA } from "./types";
import type { CotisationState } from "./types";

interface Props { cot: CotisationState; setCot: (v: CotisationState) => void; }

export function StepCotisation({ cot, setCot }: Props) {
  const s = (field: keyof CotisationState, val: string) => setCot({ ...cot, [field]: val });
  const montant = Number(cot.montant_cotisation) || 0;
  const total = montant + 1000;
  const periodeLabel = PERIODICITE_LABELS[cot.periodicite] || cot.periodicite;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader><CardTitle className="text-base">3. Cotisation ÉPARGNE</CardTitle></CardHeader>
      <CardContent className="space-y-4">

        <div>
          <Label>1. Durée de cotisation *</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input type="number" min={1} className="w-24" value={cot.duree_annees} onChange={e => s("duree_annees", e.target.value)} />
            <span className="text-sm text-gray-500">ans</span>
          </div>
        </div>

        <div>
          <Label>2. Périodicité *</Label>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {Object.entries(PERIODICITE_LABELS).map(([k, v]) => (
              <button key={k} type="button" onClick={() => s("periodicite", k)}
                className={`border rounded-lg py-2 text-sm font-medium transition ${cot.periodicite === k ? "bg-amber-600 text-white border-amber-600" : "border-gray-300 hover:border-amber-400"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label>3. Date 1ère cotisation *</Label><Input type="date" value={cot.date_premiere_cotisation} onChange={e => s("date_premiere_cotisation", e.target.value)} /></div>
          <div><Label>Date d&apos;effet du contrat</Label><Input type="date" value={cot.date_effet} onChange={e => s("date_effet", e.target.value)} /></div>
        </div>

        <div>
          <Label>4. Montant périodique *</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input type="number" min={25000} step={5000} className="w-48" value={cot.montant_cotisation} onChange={e => s("montant_cotisation", e.target.value)} />
            <span className="text-sm text-gray-500">FCFA (min. 25 000)</span>
          </div>
        </div>

        {montant >= 25000 && (
          <div className="bg-amber-50 rounded-lg p-4 space-y-2 border border-amber-200">
            <p className="text-sm font-semibold text-amber-800">Détail — cotisation {periodeLabel.toLowerCase()}</p>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Cotisation Épargne</span><span className="font-medium">{formatCFA(montant)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Frais accessoires</span><span className="font-medium">{formatCFA(1000)}</span></div>
            <div className="flex justify-between text-sm font-bold border-t border-amber-200 pt-2">
              <span>Total par période</span><span className="text-amber-700">{formatCFA(total)}</span>
            </div>
            <p className="text-xs text-gray-500">+ 10 000 FCFA coût de police sur la 1ère cotisation → <strong>{formatCFA(total + 10000)}</strong></p>
          </div>
        )}

        <div>
          <Label>5. Mode de paiement</Label>
          <Select value={cot.mode_paiement} onValueChange={v => s("mode_paiement", v)}>
            <SelectTrigger><SelectValue placeholder="Choisir le mode de paiement" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="prelevement">Prélèvement bancaire</SelectItem>
              <SelectItem value="virement">Virement bancaire</SelectItem>
              <SelectItem value="mobile_money">Mobile Money</SelectItem>
              <SelectItem value="especes">Espèces</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {cot.mode_paiement === "prelevement" && (
          <div><Label>N° de compte (joindre RIB)</Label><Input value={cot.numero_compte} onChange={e => s("numero_compte", e.target.value)} /></div>
        )}

        <p className="text-xs text-gray-400 italic">Contrat valide sous réserve d&apos;acceptation du risque par NSIA Vie et paiement de la 1ère cotisation.</p>
      </CardContent>
    </Card>
  );
}

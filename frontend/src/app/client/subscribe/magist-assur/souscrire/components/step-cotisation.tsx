"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PERIODICITE_LABELS, formatCFA } from "./types";
import type { CotisationState } from "./types";

interface Props {
  cot: CotisationState;
  setCot: (v: CotisationState) => void;
  dateNaissance?: string;
  ribFile?: File | null;
  setRibFile?: (f: File | null) => void;
}

function calcMaxAnnees(dateNaissance?: string): number | null {
  if (!dateNaissance) return null;
  const birth = new Date(dateNaissance);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear()
    - (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
  return Math.max(1, 65 - age);
}

export function StepCotisation({ cot, setCot, dateNaissance, ribFile, setRibFile }: Props) {
  const s = (field: keyof CotisationState, val: string) => setCot({ ...cot, [field]: val });
  const montant = Number(cot.montant_cotisation) || 0;
  const total = montant + 1000;
  const periodeLabel = PERIODICITE_LABELS[cot.periodicite] || cot.periodicite;
  const maxAnnees = calcMaxAnnees(dateNaissance);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader><CardTitle className="text-base">3. Cotisation ÉPARGNE</CardTitle></CardHeader>
      <CardContent className="space-y-4">

        <div>
          <Label>1. Durée de cotisation <span className="text-red-500">*</span></Label>
          {maxAnnees !== null && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1">
              Retraite à 65 ans — durée maximale : <strong>{maxAnnees} an{maxAnnees > 1 ? "s" : ""}</strong>
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="number" min={1} max={maxAnnees ?? undefined}
              className="w-24" value={cot.duree_annees}
              onChange={e => {
                const val = e.target.value;
                if (maxAnnees !== null && Number(val) > maxAnnees) return;
                s("duree_annees", val);
              }}
            />
            <span className="text-sm text-gray-500">ans{maxAnnees !== null ? ` (max ${maxAnnees})` : ""}</span>
          </div>
        </div>

        <div>
          <Label>2. Périodicité <span className="text-red-500">*</span></Label>
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
          <div><Label>3. Date 1ère cotisation <span className="text-red-500">*</span></Label><Input type="date" value={cot.date_premiere_cotisation} onChange={e => s("date_premiere_cotisation", e.target.value)} /></div>
          <div><Label>Date d&apos;effet du contrat</Label><Input type="date" value={cot.date_effet} onChange={e => s("date_effet", e.target.value)} /></div>
        </div>

        <div>
          <Label>4. Montant périodique <span className="text-red-500">*</span></Label>
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

        <div className="space-y-3">
          <div>
            <Label>5. Mode de paiement</Label>
            <div className="mt-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
              <span className="text-sm font-medium text-amber-800">Prélèvement bancaire</span>
              <span className="ml-auto text-xs bg-amber-200 text-amber-700 px-2 py-0.5 rounded-full">Uniquement disponible</span>
            </div>
          </div>
          <div>
            <Label>N° de compte (joindre RIB) <span className="text-red-500">*</span></Label>
            <Input className="mt-1" placeholder="ex: CI093 00001 000000000001 12" value={cot.numero_compte} onChange={e => s("numero_compte", e.target.value)} />
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-700 mb-1">Importer le RIB *</p>
              <label className="inline-flex items-center gap-2 cursor-pointer bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition">
                <span>Choisir un fichier</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={e => setRibFile?.(e.target.files?.[0] ?? null)}
                />
              </label>
              {ribFile
                ? <p className="text-xs text-green-700 mt-1">✓ {ribFile.name}</p>
                : <p className="text-xs text-gray-400 mt-1">Aucun fichier sélectionné</p>
              }
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400 italic">Contrat valide sous réserve d&apos;acceptation du risque par NSIA Vie et paiement de la 1ère cotisation.</p>
      </CardContent>
    </Card>
  );
}

"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDrop } from "@/components/brand";
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

  // Compteur RIB : « CIxx » (4 car.) + 20 caractères (format imprimé sur les chèques)
  // ou + 24 caractères (IBAN complet). Sinon n° local 8-24.
  const ribClean = cot.numero_compte.replace(/[^A-Z0-9]/g, "");
  const isIban = ribClean.startsWith("CI");
  const ibanRest = isIban ? Math.max(0, ribClean.length - 4) : 0;
  const ribStatus: "ok" | "court" | "long" | null = !ribClean || ribClean === "CI"
    ? null
    : isIban
      ? (ibanRest === 20 || ibanRest === 24 ? "ok" : ibanRest < 20 ? "court" : ibanRest > 24 ? "long" : "court")
      : (ribClean.length >= 8 && ribClean.length <= 24 ? "ok" : ribClean.length < 8 ? "court" : "long");

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader><CardTitle className="text-base">Cotisation Épargne retraite</CardTitle></CardHeader>
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
              data-field="duree_annees"
              type="number" min={1} max={maxAnnees ?? undefined}
              className="w-24" value={cot.duree_annees}
              onChange={e => {
                const val = e.target.value;
                if (maxAnnees !== null && Number(val) > maxAnnees) return;
                s("duree_annees", val);
              }}
            />
            <span className="text-sm text-navy-500">ans{maxAnnees !== null ? ` (max ${maxAnnees})` : ""}</span>
          </div>
        </div>

        <div>
          <Label>2. Périodicité <span className="text-red-500">*</span></Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2" data-field="periodicite">
            {Object.entries(PERIODICITE_LABELS).map(([k, v]) => (
              <button key={k} type="button" onClick={() => s("periodicite", k)}
                className={`border rounded-xl py-2.5 text-sm font-medium transition shadow-xs ${cot.periodicite === k ? "bg-navy-900 text-white border-navy-900 shadow-[0_6px_16px_-8px_rgb(16_28_52/0.6)]" : "bg-white border-navy-200 text-navy-700 hover:border-amber-400 hover:bg-amber-50/40"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label>3. Date 1ère cotisation <span className="text-red-500">*</span></Label><Input data-field="date_premiere_cotisation" type="date" min={new Date().toISOString().slice(0, 10)} value={cot.date_premiere_cotisation} onChange={e => s("date_premiere_cotisation", e.target.value)} /></div>
          <div><Label>Date d&apos;effet du contrat</Label><Input data-field="date_effet" type="date" min={new Date().toISOString().slice(0, 10)} value={cot.date_effet} onChange={e => s("date_effet", e.target.value)} /></div>
        </div>

        <div>
          <Label>4. Montant périodique <span className="text-red-500">*</span></Label>
          <div className="flex items-center gap-2 mt-1">
            <Input data-field="montant_cotisation" type="number" min={25000} step={5000} className="w-48" value={cot.montant_cotisation} onChange={e => s("montant_cotisation", e.target.value)} />
            <span className="text-sm text-navy-500">FCFA (min. 25 000)</span>
          </div>
        </div>

        {montant >= 25000 && (
          <div className="bg-amber-50 rounded-lg p-4 space-y-2 border border-amber-200">
            <p className="text-sm font-semibold text-amber-800">Détail — cotisation {periodeLabel.toLowerCase()}</p>
            <div className="flex justify-between text-sm"><span className="text-navy-600">Cotisation Épargne</span><span className="font-medium">{formatCFA(montant)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-navy-600">Frais accessoires</span><span className="font-medium">{formatCFA(1000)}</span></div>
            <div className="flex justify-between text-sm font-bold border-t border-amber-200 pt-2">
              <span>Total par période</span><span className="text-amber-700">{formatCFA(total)}</span>
            </div>
            <p className="text-xs text-navy-500">+ 10 000 FCFA coût de police sur la 1ère cotisation → <strong>{formatCFA(total + 10000)}</strong></p>
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
            <Input
              data-field="numero_compte"
              className="mt-1 font-mono"
              placeholder="CI93 XXXX XXXX XXXX XXXX XXXX XX"
              value={cot.numero_compte}
              onChange={e => {
                const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 34);
                s("numero_compte", raw.replace(/(.{4})(?=.)/g, "$1 "));
              }}
            />
            {ribStatus === null ? (
              <p className="text-xs text-navy-400 mt-1">Recopiez le RIB tel qu&apos;imprimé sur votre chèque : CIxx + code guichet + n° compte + clé (exemple fictif : CI05 1234 5678 9012 3456 7890). Ou n° de compte local — effacez « CI » si besoin.</p>
            ) : isIban ? (
              <p className={`text-xs mt-1 font-medium ${ribStatus === "ok" ? "text-emerald-600" : ribStatus === "court" ? "text-amber-600" : "text-red-600"}`}>
                {ribStatus === "ok"
                  ? `✓ RIB valide (${ibanRest}/20 caractères après « ${ribClean.slice(0, 4)} »${ibanRest === 24 ? " — IBAN complet" : ""})`
                  : ribStatus === "court"
                    ? `RIB incomplet — ${ibanRest}/20 caractères après « ${ribClean.slice(0, 4)} » (recopiez tout ce qui suit CIxx sur le chèque)`
                    : `RIB trop long — ${ibanRest} caractères après « ${ribClean.slice(0, 4)} » (24 max pour un IBAN)`}
              </p>
            ) : (
              <p className={`text-xs mt-1 font-medium ${ribStatus === "ok" ? "text-emerald-600" : "text-red-600"}`}>
                {ribStatus === "ok" ? `✓ N° de compte local (${ribClean.length} caractères)` : ribStatus === "court" ? `N° local incomplet — ${ribClean.length} caractère(s), min. 8` : `N° local trop long — ${ribClean.length} caractères, max. 24`}
              </p>
            )}
            <div className="mt-3">
              <FileDrop label="Relevé d'identité bancaire (RIB)" required file={ribFile} onChange={setRibFile}
                hint="Photo ou PDF de votre RIB" />
            </div>
          </div>
        </div>

        <p className="text-xs text-navy-400 italic">Contrat valide sous réserve d&apos;acceptation du risque par NSIA Vie et paiement de la 1ère cotisation.</p>
      </CardContent>
    </Card>
  );
}

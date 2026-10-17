"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AssureState } from "./types";

interface Props {
  assureIdem: boolean; setAssureIdem: (v: boolean) => void;
  assure: AssureState; setAssure: (v: AssureState) => void;
}

export function StepAssure({ assureIdem, setAssureIdem, assure, setAssure }: Props) {
  const s = (field: keyof AssureState, val: string | boolean) => setAssure({ ...assure, [field]: val });

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader><CardTitle className="text-base">2. Assuré</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <Checkbox checked={assureIdem} onCheckedChange={c => setAssureIdem(!!c)} id="idem" />
          <Label htmlFor="idem" className="cursor-pointer font-medium text-amber-800">
            Idem — Le souscripteur est l&apos;assuré
          </Label>
        </div>

        {!assureIdem && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-gray-500">Renseignez les informations sur l&apos;assuré si différent du souscripteur</p>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nom <span className="text-red-500">*</span></Label><Input data-field="assure_nom" value={assure.assure_nom} onChange={e => s("assure_nom", e.target.value)} /></div>
              <div><Label>Prénom(s) <span className="text-red-500">*</span></Label><Input data-field="assure_prenoms" value={assure.assure_prenoms} onChange={e => s("assure_prenoms", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date de naissance <span className="text-red-500">*</span></Label><Input data-field="assure_date_naissance" type="date" max={new Date().toISOString().slice(0, 10)} value={assure.assure_date_naissance} onChange={e => s("assure_date_naissance", e.target.value)} /></div>
              <div><Label>Lieu de naissance</Label><Input value={assure.assure_lieu_naissance} onChange={e => s("assure_lieu_naissance", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Type de pièce</Label>
                <Select value={assure.assure_type_piece} onValueChange={v => s("assure_type_piece", v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cni">CNI</SelectItem>
                    <SelectItem value="passeport">Passeport</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Validité pièce</Label><Input type="date" min={new Date().toISOString().slice(0, 10)} value={assure.assure_validite_piece} onChange={e => s("assure_validite_piece", e.target.value)} /></div>
              <div><Label>N° de la pièce</Label><Input value={assure.assure_numero_piece} onChange={e => s("assure_numero_piece", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>NNI</Label><Input value={assure.assure_nni} onChange={e => s("assure_nni", e.target.value)} /></div>
              <div><Label>Tél. / Cél.</Label><Input value={assure.assure_telephone} onChange={e => s("assure_telephone", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Lien avec le souscripteur</Label><Input value={assure.assure_lien} onChange={e => s("assure_lien", e.target.value)} /></div>
              <div><Label>Adresse postale</Label><Input value={assure.assure_adresse_postale} onChange={e => s("assure_adresse_postale", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email personnel</Label><Input type="email" value={assure.assure_email} onChange={e => s("assure_email", e.target.value)} /></div>
              <div><Label>Profession</Label><Input value={assure.assure_profession} onChange={e => s("assure_profession", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Employeur</Label><Input value={assure.assure_employeur} onChange={e => s("assure_employeur", e.target.value)} /></div>
              <div><Label>Email professionnel</Label><Input type="email" value={assure.assure_email_pro} onChange={e => s("assure_email_pro", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Adresse employeur</Label><Input value={assure.assure_adresse_employeur} onChange={e => s("assure_adresse_employeur", e.target.value)} /></div>
              <div><Label>Téléphone Bureau</Label><Input value={assure.assure_telephone_bureau} onChange={e => s("assure_telephone_bureau", e.target.value)} /></div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Checkbox checked={assure.assure_nsia_anterieur} onCheckedChange={c => s("assure_nsia_anterieur", !!c)} id="nsia" />
              <Label htmlFor="nsia" className="cursor-pointer text-sm">Avez-vous déjà souscrit à des contrats NSIA Vie Assurances ?</Label>
            </div>
            {assure.assure_nsia_anterieur && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type de contrat</Label><Input value={assure.assure_nsia_type_contrat} onChange={e => s("assure_nsia_type_contrat", e.target.value)} /></div>
                <div><Label>N° de police</Label><Input value={assure.assure_nsia_num_police} onChange={e => s("assure_nsia_num_police", e.target.value)} /></div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

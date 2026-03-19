"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CorrespondantState } from "./types";

interface Props {
  corresp1: CorrespondantState; setCorresp1: (v: CorrespondantState) => void;
  corresp2: CorrespondantState; setCorresp2: (v: CorrespondantState) => void;
}

function CorrespondantCard({ label, data, set }: { label: string; data: CorrespondantState; set: (v: CorrespondantState) => void }) {
  const s = (field: keyof CorrespondantState, val: string) => set({ ...data, [field]: val });
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader><CardTitle className="text-base">{label}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Nom</Label><Input value={data.nom} onChange={e => s("nom", e.target.value)} /></div>
          <div><Label>Prénom</Label><Input value={data.prenom} onChange={e => s("prenom", e.target.value)} /></div>
        </div>
        <div><Label>Domicile (Ville-Commune-Quartier-Rue-Lot-Ilot)</Label><Input value={data.domicile} onChange={e => s("domicile", e.target.value)} /></div>
        <div><Label>Adresse Postale</Label><Input value={data.adresse_postale} onChange={e => s("adresse_postale", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Tél. / Cél.</Label><Input value={data.telephone} onChange={e => s("telephone", e.target.value)} /></div>
          <div><Label>E-mail</Label><Input type="email" value={data.email} onChange={e => s("email", e.target.value)} /></div>
        </div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Réf. Réseaux Sociaux</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>WhatsApp</Label><Input value={data.whatsapp} onChange={e => s("whatsapp", e.target.value)} /></div>
          <div><Label>Facebook</Label><Input value={data.facebook} onChange={e => s("facebook", e.target.value)} /></div>
          <div><Label>LinkedIn</Label><Input value={data.linkedin} onChange={e => s("linkedin", e.target.value)} /></div>
          <div><Label>Autres à préciser</Label><Input value={data.autres_reseaux} onChange={e => s("autres_reseaux", e.target.value)} /></div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StepCorrespondants({ corresp1, setCorresp1, corresp2, setCorresp2 }: Props) {
  return (
    <div className="space-y-4">
      <CorrespondantCard label="Correspondant 1" data={corresp1} set={setCorresp1} />
      <CorrespondantCard label="Correspondant 2" data={corresp2} set={setCorresp2} />
    </div>
  );
}

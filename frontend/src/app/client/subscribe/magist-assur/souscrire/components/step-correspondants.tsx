"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth-store";
import type { CorrespondantState } from "./types";

interface Props {
  corresp1: CorrespondantState; setCorresp1: (v: CorrespondantState) => void;
  corresp2: CorrespondantState; setCorresp2: (v: CorrespondantState) => void;
  prevCorrespIdem: boolean | null; setPrevCorrespIdem: (v: boolean | null) => void;
  prevCorresp: CorrespondantState; setPrevCorresp: (v: CorrespondantState) => void;
}

function CorrespondantCard({ label, data, set }: { label: string; data: CorrespondantState; set: (v: CorrespondantState) => void }) {
  const s = (field: keyof CorrespondantState, val: string) => set({ ...data, [field]: val });
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader><CardTitle className="text-base">{label}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Nom {label.includes("1") ? <span className="text-red-500">*</span> : ""}</Label><Input value={data.nom} onChange={e => s("nom", e.target.value)} /></div>
          <div><Label>Prénom {label.includes("1") ? <span className="text-red-500">*</span> : ""}</Label><Input value={data.prenom} onChange={e => s("prenom", e.target.value)} /></div>
        </div>
        <div><Label>Domicile (Ville-Commune-Quartier-Rue-Lot-Ilot)</Label><Input value={data.domicile} onChange={e => s("domicile", e.target.value)} /></div>
        <div><Label>Adresse Postale</Label><Input value={data.adresse_postale} onChange={e => s("adresse_postale", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Tél. / Cél. {label.includes("1") ? <span className="text-red-500">*</span> : ""}</Label><Input value={data.telephone} onChange={e => s("telephone", e.target.value)} /></div>
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

const btn = (active: boolean, color: "amber" | "gray" = "amber") =>
  `flex-1 border rounded-lg py-2 text-sm font-medium transition ${
    active
      ? color === "amber" ? "bg-amber-600 text-white border-amber-600" : "bg-gray-700 text-white border-gray-700"
      : "border-gray-300 hover:border-amber-400"
  }`;

export function StepCorrespondants({ corresp1, setCorresp1, corresp2, setCorresp2, prevCorrespIdem, setPrevCorrespIdem, prevCorresp, setPrevCorresp }: Props) {
  const { user } = useAuthStore();
  const sp = (field: keyof CorrespondantState, val: string) => setPrevCorresp({ ...prevCorresp, [field]: val });

  const fillWithMe = () => {
    setCorresp1({
      ...corresp1,
      nom: user?.nom || "",
      prenom: user?.prenoms || "",
      telephone: user?.telephone || "",
      email: user?.email || "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={fillWithMe} className="text-xs">
          Identique à moi (m&apos;utiliser comme correspondant)
        </Button>
      </div>
      <CorrespondantCard label="2. Correspondant 1 *" data={corresp1} set={setCorresp1} />
      <CorrespondantCard label="Correspondant 2 (optionnel)" data={corresp2} set={setCorresp2} />

      {/* ── Correspondant Prévoyance ── */}
      <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
        <CardHeader>
          <CardTitle className="text-base text-amber-800">Correspondant — PRÉVOYANCE</CardTitle>
          <p className="text-xs text-gray-500">Utilisé uniquement si vous souscrivez à une garantie Prévoyance.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Prévoyez-vous souscrire à une garantie Prévoyance ?</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <button type="button" onClick={() => setPrevCorrespIdem(null)}
                className={`flex-1 border rounded-lg py-2 text-sm font-medium transition ${
                  prevCorrespIdem === null
                    ? "bg-gray-500 text-white border-gray-500"
                    : "border-gray-300 hover:border-gray-400"
                }`}>
                Non concerné
              </button>
              <button type="button" onClick={() => setPrevCorrespIdem(true)}
                className={btn(prevCorrespIdem === true)}>
                Oui — même correspondant
              </button>
              <button type="button" onClick={() => setPrevCorrespIdem(false)}
                className={btn(prevCorrespIdem === false, "gray")}>
                Oui — correspondant différent
              </button>
            </div>
          </div>

          {prevCorrespIdem === null && (
            <p className="text-xs text-gray-400 italic">Aucun correspondant prévoyance requis.</p>
          )}

          {prevCorrespIdem === true && (
            <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-800 space-y-1">
              <p className="font-semibold">{corresp1.nom} {corresp1.prenom}</p>
              {corresp1.domicile && <p className="text-xs text-gray-600">{corresp1.domicile}</p>}
              {corresp1.telephone && <p className="text-xs text-gray-600">Tél : {corresp1.telephone}</p>}
            </div>
          )}

          {prevCorrespIdem === false && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nom <span className="text-red-500">*</span></Label><Input value={prevCorresp.nom} onChange={e => sp("nom", e.target.value)} /></div>
                <div><Label>Prénom <span className="text-red-500">*</span></Label><Input value={prevCorresp.prenom} onChange={e => sp("prenom", e.target.value)} /></div>
              </div>
              <div><Label>Domicile <span className="text-red-500">*</span></Label><Input value={prevCorresp.domicile} onChange={e => sp("domicile", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Téléphone</Label><Input value={prevCorresp.telephone} onChange={e => sp("telephone", e.target.value)} /></div>
                <div><Label>E-mail</Label><Input type="email" value={prevCorresp.email} onChange={e => sp("email", e.target.value)} /></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

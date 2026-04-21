"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IdentiteState } from "./types";

interface Props {
  id: IdentiteState;
  setId: (v: IdentiteState) => void;
  pieceIdentiteFile?: File | null;
  setPieceIdentiteFile?: (f: File | null) => void;
}

export function StepIdentite({ id, setId, pieceIdentiteFile, setPieceIdentiteFile }: Props) {
  const s = (field: keyof IdentiteState, val: string) => setId({ ...id, [field]: val });
  const btn = (field: keyof IdentiteState, val: string) =>
    `border rounded-lg py-2 text-sm font-medium transition ${id[field] === val ? "bg-amber-600 text-white border-amber-600" : "border-gray-300 hover:border-amber-400"}`;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader><CardTitle className="text-base">1. Souscripteur — Identité</CardTitle></CardHeader>
      <CardContent className="space-y-4">

        <div>
          <Label className="text-xs text-gray-500 uppercase tracking-wide">Civilité <span className="text-red-500">*</span></Label>
          <div className="grid grid-cols-3 gap-3 mt-1">
            {["Madame", "Mademoiselle", "Monsieur"].map(c => (
              <button key={c} type="button" onClick={() => s("civilite", c)} className={btn("civilite", c)}>{c}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label>Nom <span className="text-red-500">*</span></Label><Input value={id.nom} onChange={e => s("nom", e.target.value)} /></div>
          <div><Label>Prénoms <span className="text-red-500">*</span></Label><Input value={id.prenoms} onChange={e => s("prenoms", e.target.value)} /></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label>Date de Naissance <span className="text-red-500">*</span></Label><Input type="date" value={id.date_naissance} onChange={e => s("date_naissance", e.target.value)} /></div>
          <div><Label>Pays / Ville de Naissance <span className="text-red-500">*</span></Label><Input value={id.pays_naissance} onChange={e => s("pays_naissance", e.target.value)} /></div>
        </div>

        <div>
          <Label>Type de pièce d&apos;identité <span className="text-red-500">*</span></Label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {[["cni","CNI"],["passeport","Passeport"],["autre","Autres"]].map(([v, l]) => (
              <button key={v} type="button" onClick={() => s("type_piece", v)} className={btn("type_piece", v)}>{l}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label>Validité de la pièce</Label><Input type="date" value={id.validite_piece} onChange={e => s("validite_piece", e.target.value)} /></div>
          <div><Label>Numéro de la pièce</Label><Input value={id.numero_piece} onChange={e => s("numero_piece", e.target.value)} /></div>
        </div>

        <div><Label>Numéro National d&apos;Identité (NNI) <span className="text-red-500">*</span></Label><Input value={id.nni} onChange={e => s("nni", e.target.value)} /></div>

        <div>
          <Label>Situation matrimoniale <span className="text-red-500">*</span></Label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {[["celibataire","Célibataire"],["marie","Marié(e)"],["divorce","Divorcé(e)"],["veuf","Veuf(ve)"],["concubin","Concubin"]].map(([v, l]) => (
              <button key={v} type="button" onClick={() => s("situation_matrimoniale", v)} className={btn("situation_matrimoniale", v) + " text-xs"}>{l}</button>
            ))}
          </div>
        </div>

        {(id.situation_matrimoniale === "marie" || id.situation_matrimoniale === "concubin") && (
          <div>
            <Label>{id.civilite === "Monsieur" ? "Nom de l'épouse" : "Nom de l'époux"}</Label>
            <Input value={id.nom_epoux} onChange={e => s("nom_epoux", e.target.value)} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div><Label>Adresse postale personnelle</Label><Input value={id.adresse_postale} onChange={e => s("adresse_postale", e.target.value)} /></div>
          <div><Label>Email personnel <span className="text-red-500">*</span></Label><Input type="email" value={id.email_personnel} onChange={e => s("email_personnel", e.target.value)} /></div>
        </div>

        <div><Label>Tél. / Cél. <span className="text-red-500">*</span></Label><Input value={id.telephone} onChange={e => s("telephone", e.target.value)} /></div>

        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Réf. Réseaux Sociaux</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>WhatsApp</Label><Input value={id.whatsapp} onChange={e => s("whatsapp", e.target.value)} /></div>
          <div><Label>Facebook</Label><Input value={id.facebook} onChange={e => s("facebook", e.target.value)} /></div>
          <div><Label>LinkedIn</Label><Input value={id.linkedin} onChange={e => s("linkedin", e.target.value)} /></div>
          <div><Label>Autres à préciser</Label><Input value={id.autres_reseaux} onChange={e => s("autres_reseaux", e.target.value)} /></div>
        </div>

        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Situation professionnelle</p>
        <div>
          <Label>Statut professionnel <span className="text-red-500">*</span></Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {[["salarie","Salarié"],["non_salarie","Non salarié"],["sans_activite","Sans activité"],["retraite","Retraité"]].map(([v, l]) => (
              <button key={v} type="button" onClick={() => s("statut_professionnel", v)} className={btn("statut_professionnel", v) + " text-xs"}>{l}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label>Revenus mensuels (FCFA)</Label><Input type="number" min={0} value={id.revenu_mensuel} onChange={e => s("revenu_mensuel", e.target.value)} /></div>
          <div><Label>Profession</Label><Input value={id.profession_detail} onChange={e => s("profession_detail", e.target.value)} /></div>
        </div>

        <div>
          <Label>Origine des cotisations <span className="text-red-500">*</span></Label>
          <div className="space-y-1 mt-1">
            {[["salaire","Salaire / Pension / Rente"],["vente_actifs","Vente d'actifs"],["activite_commerciale","Activité commerciale"]].map(([v, l]) => (
              <button key={v} type="button" onClick={() => s("origine_revenu", v)} className={btn("origine_revenu", v) + " w-full text-left px-3 text-xs"}>{l}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label>Secteur d&apos;activité</Label><Input value={id.secteur_activite} onChange={e => s("secteur_activite", e.target.value)} /></div>
          <div><Label>Téléphone Bureau</Label><Input value={id.telephone_bureau} onChange={e => s("telephone_bureau", e.target.value)} /></div>
        </div>
        <div><Label>Email Professionnel</Label><Input type="email" value={id.email_professionnel} onChange={e => s("email_professionnel", e.target.value)} /></div>
        <div><Label>Résidence principale (Ville-Commune-Quartier-Rue-Lot-Ilot)</Label><Input value={id.residence_principale} onChange={e => s("residence_principale", e.target.value)} /></div>
        <div><Label>Autre(s) résidence(s)</Label><Input value={id.autre_residence} onChange={e => s("autre_residence", e.target.value)} /></div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
          <p className="text-xs text-amber-800">
            <strong>NB :</strong> Joindre obligatoirement une copie lisible recto/verso de la pièce d&apos;identité officielle en cours de validité.
          </p>
          <div>
            <p className="text-xs font-medium text-amber-900 mb-1">Importer la pièce d&apos;identité (recto/verso) *</p>
            <label className="inline-flex items-center gap-2 cursor-pointer bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition">
              <span>Choisir un fichier</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={e => setPieceIdentiteFile?.(e.target.files?.[0] ?? null)}
              />
            </label>
            {pieceIdentiteFile
              ? <p className="text-xs text-green-700 mt-1">✓ {pieceIdentiteFile.name}</p>
              : <p className="text-xs text-gray-400 mt-1">Aucun fichier sélectionné</p>
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

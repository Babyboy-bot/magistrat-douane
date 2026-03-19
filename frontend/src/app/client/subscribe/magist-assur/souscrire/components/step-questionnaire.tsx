"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PATHOLOGIES, MEMBRES_LABELS, MEMBRES_KEYS } from "./types";
import type { QuestionnaireState } from "./types";

interface Props {
  q: QuestionnaireState; setQ: (v: QuestionnaireState) => void;
  antecedents: Record<string, Record<string, string>>;
  setAntecedents: (v: Record<string, Record<string, string>>) => void;
  situationMatrimoniale?: string;
}

export function StepQuestionnaire({ q, setQ, antecedents, setAntecedents, situationMatrimoniale }: Props) {
  const hasConjoint = situationMatrimoniale === "marie" || situationMatrimoniale === "concubin";
  const filteredLabels = MEMBRES_LABELS.filter((_, i) => {
    const key = MEMBRES_KEYS[i];
    if (!hasConjoint && (key === "conjoint" || key === "beau_pere" || key === "belle_mere")) return false;
    return true;
  });
  const filteredKeys = MEMBRES_KEYS.filter(k => hasConjoint || (k !== "conjoint" && k !== "beau_pere" && k !== "belle_mere"));
  const s = (field: keyof QuestionnaireState, val: string | boolean) => setQ({ ...q, [field]: val });
  const setAnt = (pathologie: string, membre: string, value: string) =>
    setAntecedents({ ...antecedents, [pathologie]: { ...(antecedents[pathologie] || {}), [membre]: value } });

  const btn = (active: boolean) =>
    `flex-1 border rounded-lg py-1.5 text-sm transition ${active ? "bg-amber-600 text-white border-amber-600" : "border-gray-300 hover:border-amber-400"}`;

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-base">Questionnaire médical sur l&apos;état de santé</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-800 space-y-1">
            <p>— Les déclarations de l&apos;assuré constituent la base du contrat d&apos;assurance.</p>
            <p>— Répondez avec sincérité et exactitude. Vos déclarations sont strictement confidentielles.</p>
            <p><strong>NB :</strong> Si vous ignorez votre taille, poids ou tension, rendez-vous dans un établissement médical.</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><Label>1. Taille (cm)</Label><Input type="number" value={q.taille_cm} onChange={e => s("taille_cm", e.target.value)} placeholder="ex: 175" /></div>
            <div><Label>2. Poids (kg)</Label><Input type="number" value={q.poids_kg} onChange={e => s("poids_kg", e.target.value)} placeholder="ex: 70" /></div>
            <div><Label>3. Tension artérielle</Label><Input value={q.tension_arterielle} onChange={e => s("tension_arterielle", e.target.value)} placeholder="ex: 12/8" /></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">4. Fumez-vous ?</Label>
              <div className="flex gap-3">
                <button type="button" onClick={() => s("fumeur", true)} className={btn(q.fumeur)}>Oui</button>
                <button type="button" onClick={() => { s("fumeur", false); s("cigarettes_par_jour", ""); }} className={btn(!q.fumeur)}>Non</button>
              </div>
              {q.fumeur && (
                <div className="mt-2">
                  <Label className="text-xs">Nb cigarettes/jour</Label>
                  <Input type="number" className="mt-1" value={q.cigarettes_par_jour} onChange={e => s("cigarettes_par_jour", e.target.value)} />
                </div>
              )}
            </div>

            <div>
              <Label className="mb-2 block">5. Alcool ?</Label>
              <div className="grid grid-cols-2 gap-1">
                {[["non","Non"],["pas_du_tout","Pas du tout"],["a_l_occasion","À l'occasion"],["regulierement","Régulièrement"]].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => s("alcool", v)}
                    className={`border rounded-lg py-1.5 text-xs transition ${q.alcool === v ? "bg-amber-600 text-white border-amber-600" : "border-gray-300 hover:border-amber-400"}`}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          <div><Label>6. Vos distractions / loisirs</Label><Input value={q.distractions} onChange={e => s("distractions", e.target.value)} /></div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">7. Pratiquez-vous un sport ?</Label>
              <div className="flex gap-3">
                <button type="button" onClick={() => s("sport", true)} className={btn(q.sport)}>Oui</button>
                <button type="button" onClick={() => { s("sport", false); s("sport_titre", ""); }} className={btn(!q.sport)}>Non</button>
              </div>
              {q.sport && (
                <div className="flex gap-2 mt-2">
                  {[["amateur","Amateur"],["professionnel","Professionnel"]].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => s("sport_titre", v)}
                      className={`flex-1 border rounded-lg py-1.5 text-xs ${q.sport_titre === v ? "bg-amber-600 text-white border-amber-600" : "border-gray-300"}`}>{l}</button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label className="mb-2 block">8. Infirmité ou invalidité ?</Label>
              <div className="flex gap-3">
                <button type="button" onClick={() => s("invalidite", true)} className={btn(q.invalidite)}>Oui</button>
                <button type="button" onClick={() => { s("invalidite", false); s("invalidite_nature", ""); s("invalidite_date", ""); }} className={btn(!q.invalidite)}>Non</button>
              </div>
              {q.invalidite && (
                <div className="mt-2 space-y-2">
                  <div><Label className="text-xs">Nature</Label><Input className="mt-1" value={q.invalidite_nature} onChange={e => s("invalidite_nature", e.target.value)} /></div>
                  <div><Label className="text-xs">Date de survenance</Label><Input type="date" className="mt-1" value={q.invalidite_date} onChange={e => s("invalidite_date", e.target.value)} /></div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-sm">Antécédents médicaux — Avez-vous été diagnostiqué et traité pour :</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs min-w-[600px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-2 font-semibold w-44">Affections</th>
                  {filteredLabels.map(m => <th key={m} className="p-1 text-center font-semibold text-[10px] leading-tight">{m}</th>)}
                </tr>
              </thead>
              <tbody>
                {PATHOLOGIES.map(cat => cat.items.map((item, idx) => (
                  <tr key={`${cat.categorie}-${item}`} className={idx === 0 ? "border-t-2 border-gray-200" : "border-t border-gray-100"}>
                    <td className="p-1.5 text-gray-700 align-top">
                      {idx === 0 && <span className="text-[9px] text-gray-400 block font-semibold">{cat.categorie}</span>}
                      {item}
                    </td>
                    {filteredKeys.map(mk => (
                      <td key={mk} className="p-1 text-center align-middle">
                        <select className="text-xs border rounded px-1 py-0.5 w-12"
                          value={antecedents[item]?.[mk] || ""}
                          onChange={e => setAnt(item, mk, e.target.value)}>
                          <option value="">—</option>
                          <option value="Oui">Oui</option>
                          <option value="Non">Non</option>
                        </select>
                      </td>
                    ))}
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

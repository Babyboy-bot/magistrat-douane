"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PATHOLOGIES, MEMBRES_LABELS, MEMBRES_KEYS } from "./types";
import type { QuestionnaireState } from "./types";

const isAutresItem = (item: string) =>
  item.toLowerCase().includes("autres") || item.toLowerCase().includes("préciser");

interface Props {
  q: QuestionnaireState; setQ: (v: QuestionnaireState) => void;
  antecedents: Record<string, Record<string, string>>;
  setAntecedents: (v: Record<string, Record<string, string>>) => void;
}

export function StepQuestionnaire({ q, setQ, antecedents, setAntecedents }: Props) {
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
            <div><Label>1. Taille (cm) <span className="text-red-500">*</span></Label><Input type="number" min={0} value={q.taille_cm} onChange={e => s("taille_cm", e.target.value)} placeholder="ex: 175" /></div>
            <div><Label>2. Poids (kg) <span className="text-red-500">*</span></Label><Input type="number" min={0} value={q.poids_kg} onChange={e => s("poids_kg", e.target.value)} placeholder="ex: 70" /></div>
            <div><Label>3. Tension artérielle <span className="text-red-500">*</span></Label><Input value={q.tension_arterielle} onChange={e => s("tension_arterielle", e.target.value)} placeholder="ex: 12/8" /></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">4. Fumez-vous ?</Label>
              <div className="flex gap-3">
                <button type="button" onClick={() => s("fumeur", true)} className={btn(q.fumeur)}>Oui</button>
                <button type="button" onClick={() => setQ({ ...q, fumeur: false, cigarettes_par_jour: "" })} className={btn(!q.fumeur)}>Non</button>
              </div>
              {q.fumeur && (
                <div className="mt-2">
                  <Label className="text-xs">Nb cigarettes/jour</Label>
                  <Input type="number" min={0} className="mt-1" value={q.cigarettes_par_jour} onChange={e => s("cigarettes_par_jour", e.target.value)} />
                </div>
              )}
            </div>

            <div>
              <Label className="mb-2 block">5. Alcool ? <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-2 gap-1">
                {[["non","Non"],["pas_du_tout","Pas du tout"],["a_l_occasion","À l'occasion"],["regulierement","Régulièrement"]].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => s("alcool", v)}
                    className={`border rounded-lg py-1.5 text-xs transition ${q.alcool === v ? "bg-amber-600 text-white border-amber-600" : "border-gray-300 hover:border-amber-400"}`}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          <div><Label>6. Vos distractions / loisirs <span className="text-red-500">*</span></Label><Input value={q.distractions} onChange={e => s("distractions", e.target.value)} /></div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">7. Pratiquez-vous un sport ?</Label>
              <div className="flex gap-3">
                <button type="button" onClick={() => s("sport", true)} className={btn(q.sport)}>Oui</button>
                <button type="button" onClick={() => setQ({ ...q, sport: false, sport_titre: "" })} className={btn(!q.sport)}>Non</button>
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
                <button type="button" onClick={() => setQ({ ...q, invalidite: false, invalidite_nature: "", invalidite_date: "" })} className={btn(!q.invalidite)}>Non</button>
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
        <CardHeader>
          <CardTitle className="text-sm">Antécédents médicaux — Avez-vous été diagnostiqué et traité pour :</CardTitle>
          <button
            type="button"
            onClick={() => {
              const next: Record<string, Record<string, string>> = { ...antecedents };
              PATHOLOGIES.forEach(cat => cat.items.forEach(item => {
                if (!isAutresItem(item)) {
                  next[item] = {};
                  MEMBRES_KEYS.forEach(mk => { next[item][mk] = "Non"; });
                }
              }));
              setAntecedents(next);
            }}
            className="mt-2 text-xs bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg px-3 py-1.5 font-medium text-gray-700 transition self-start"
          >
            ✗ Mettre &quot;Non&quot; partout
          </button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs min-w-[600px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-2 font-semibold w-44">Affections</th>
                  {MEMBRES_LABELS.map(m => <th key={m} className="p-1 text-center font-semibold text-[10px] leading-tight">{m}</th>)}
                </tr>
              </thead>
              <tbody>
                {PATHOLOGIES.map(cat => cat.items.map((item, idx) => (
                  <tr key={`${cat.categorie}-${item}`} className={idx === 0 ? "border-t-2 border-gray-200" : "border-t border-gray-100"}>
                    <td className="p-1.5 text-gray-700 align-top">
                      {idx === 0 && <span className="text-[9px] text-gray-400 block font-semibold">{cat.categorie}</span>}
                      {item}
                    </td>
                    {isAutresItem(item) ? (
                      <td colSpan={MEMBRES_KEYS.length} className="p-1 align-middle">
                        <input
                          type="text"
                          placeholder="Précisez si applicable…"
                          className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400"
                          value={antecedents[item]?.["texte"] || ""}
                          onChange={e => setAnt(item, "texte", e.target.value)}
                        />
                      </td>
                    ) : (
                      MEMBRES_KEYS.map(mk => (
                        <td key={mk} className="p-1 text-center align-middle">
                          <select
                            className={`text-xs border rounded px-1 py-0.5 w-12 ${!antecedents[item]?.[mk] ? "border-red-200 bg-red-50" : "border-gray-200"}`}
                            value={antecedents[item]?.[mk] || ""}
                            onChange={e => setAnt(item, mk, e.target.value)}
                          >
                            <option value="">—</option>
                            <option value="Oui">Oui</option>
                            <option value="Non">Non</option>
                          </select>
                        </td>
                      ))
                    )}
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">Les cellules en rouge doivent être remplies (Oui ou Non).</p>
        </CardContent>
      </Card>
    </div>
  );
}

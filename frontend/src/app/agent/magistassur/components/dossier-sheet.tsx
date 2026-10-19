"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  CheckCircle2, Circle, FileText, CreditCard, FileSpreadsheet, FileDown, Send, KeyRound,
  Lock as LockIcon, Loader2, UserCheck, AlertTriangle,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { magistassurApi } from "@/lib/api";
import { toast } from "sonner";
import {
  type Item, etapeOf, formatCFA, formatDate, montantLabel, produitLabel,
  STATUT_LABELS, STATUT_COLORS, STATUTS_DESTRUCTIFS,
} from "./dossier-utils";

interface Props {
  item: Item | null;
  userId: string;
  isAdmin: boolean;
  onClose: () => void;
  onChanged: () => Promise<void>;
}

const STEPS = ["Pris en charge", "Envoyé à NSIA", "N° police attribué"];

function Field({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-navy-400">{label}</p>
      <p className="text-sm font-medium text-navy-900 break-words">{value || "—"}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">{title}</h3>
      <div className="rounded-xl border border-navy-100 bg-white p-3 shadow-[0_1px_2px_rgb(16_28_52/0.04)]">{children}</div>
    </section>
  );
}

function DocLink({ href, label, icon }: { href?: string; label: string; icon: ReactNode }) {
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
      <CheckCircle2 className="h-3.5 w-3.5" />{icon}{label}
    </a>
  ) : (
    <span className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600">
      <AlertTriangle className="h-3.5 w-3.5" />{label} manquant(e)
    </span>
  );
}

export function DossierSheet({ item, userId, isAdmin, onClose, onChanged }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [verifie, setVerifie] = useState(false);
  const [showPolice, setShowPolice] = useState(false);
  const [police, setPolice] = useState({ numPolice: "", codeInspection: "", dateEffet: "" });
  const [statut, setStatut] = useState("");

  const key = item ? `${item.kind}-${item.c.id}` : "";
  useEffect(() => {
    setVerifie(false);
    setShowPolice(false);
    setPolice({ numPolice: "", codeInspection: "", dateEffet: "" });
    setStatut("");
  }, [key]);

  if (!item) return <Sheet open={false} />;

  const c = item.c;
  const etape = etapeOf(item);
  const stepsDone = { a_prendre: 0, a_traiter: 1, envoye: 2, actif: 3, archive: 3 }[etape];
  const isMine = isAdmin || c.prisEnChargeId === userId;
  const takenByOther = !!c.prisEnChargeId && c.prisEnChargeId !== userId && !c.numPolice;

  const run = async (name: string, fn: () => Promise<unknown>, success: string) => {
    setBusy(name);
    try {
      await fn();
      toast.success(success);
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setBusy(null);
    }
  };

  const prendre = () => run("prendre",
    () => item.kind === "epargne" ? magistassurApi.priseEnChargeEpargne(c.id) : magistassurApi.priseEnChargePrevoyance(c.id),
    "Dossier pris en charge — il est maintenant à votre nom.");

  const liberer = () => run("liberer",
    () => item.kind === "epargne" ? magistassurApi.libererEpargne(c.id) : magistassurApi.libererPrevoyance(c.id),
    "Dossier libéré — il est de nouveau disponible pour les autres agents.");

  const envoyer = () => run("envoyer", () => magistassurApi.marquerEnvoyeNsia(item.kind, c.id),
    "Dossier marqué comme envoyé à NSIA.");

  const exporter = (format: "excel" | "pdf") => run(`export-${format}`, () => {
    if (item.kind === "epargne") return format === "excel" ? magistassurApi.exportEpargneExcel(c.id) : magistassurApi.exportEpargnePdf(c.id);
    return format === "excel" ? magistassurApi.exportPrevoyanceExcel(c.id) : magistassurApi.exportPrevoyancePdf(c.id);
  }, "Export téléchargé.");

  const activer = () => {
    const num = police.numPolice.trim();
    if (!num) { toast.error("Saisissez le numéro de police reçu de NSIA."); return; }
    run("police", () => item.kind === "epargne"
      ? magistassurApi.assignPoliceEpargne(c.id, num, police.codeInspection.trim())
      : magistassurApi.assignPolicePrevoyance(c.id, num, police.codeInspection.trim(), police.dateEffet || undefined),
    `Contrat activé — police n° ${num}. Le client a été notifié.`);
  };

  const appliquerStatut = () => {
    if (!statut || statut === c.statut) return;
    const label = STATUT_LABELS[statut] || statut;
    if (STATUTS_DESTRUCTIFS.includes(statut) && !window.confirm(`Passer le contrat en « ${label} » ? Cette action est irréversible.`)) return;
    run("statut", () => item.kind === "epargne"
      ? magistassurApi.changeStatutEpargne(c.id, statut)
      : magistassurApi.changeStatutPrevoyance(c.id, statut),
    `Statut mis à jour : ${label}`);
  };

  const policeForm = (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">N° de police NSIA *</Label>
          <Input className="h-9 mt-1" placeholder={item.kind === "epargne" ? "ex : EP-2026-001234" : "ex : PR-2026-001234"}
            value={police.numPolice} onChange={e => setPolice(p => ({ ...p, numPolice: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Code inspection</Label>
          <Input className="h-9 mt-1" placeholder="optionnel"
            value={police.codeInspection} onChange={e => setPolice(p => ({ ...p, codeInspection: e.target.value }))} />
        </div>
        {item.kind === "prevoyance" && (
          <div className="col-span-2">
            <Label className="text-xs">Date d&apos;effet <span className="text-navy-400">(échéance calculée à +1 an)</span></Label>
            <Input type="date" className="h-9 mt-1" value={police.dateEffet}
              onChange={e => setPolice(p => ({ ...p, dateEffet: e.target.value }))} />
          </div>
        )}
      </div>
      <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={busy === "police"} onClick={activer}>
        {busy === "police" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
        Activer le contrat
      </Button>
    </div>
  );

  const exportButtons = (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" className="flex-1 border-navy-100" disabled={busy === "export-excel"} onClick={() => exporter("excel")}>
        <FileSpreadsheet className="h-4 w-4 mr-1 text-emerald-600" /> Excel NSIA
      </Button>
      <Button size="sm" variant="outline" className="flex-1 border-navy-100" disabled={busy === "export-pdf"} onClick={() => exporter("pdf")}>
        <FileDown className="h-4 w-4 mr-1 text-red-600" /> PDF NSIA
      </Button>
    </div>
  );

  const libererLink = isMine && !c.numPolice && !c.envoyeNsiaAt && (
    <button className="text-xs text-navy-400 underline hover:text-red-600" disabled={busy === "liberer"} onClick={liberer}>
      Libérer ce dossier (le rendre aux autres agents)
    </button>
  );

  const renderAction = () => {
    if (takenByOther && !isAdmin) {
      return (
        <div className="rounded-xl border border-navy-200 bg-navy-50 p-4 text-sm text-navy-700">
          <UserCheck className="mr-1 inline h-4 w-4" /> Ce dossier est en cours de traitement par <strong>{c.prisEnChargeNom}</strong>. Consultation seule.
        </div>
      );
    }
    switch (etape) {
      case "a_prendre":
        return (
          <div className="space-y-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
            <p className="font-semibold text-amber-900">Étape 1 — Prendre le dossier en charge</p>
            <p className="text-sm text-amber-800">Personne ne traite encore ce dossier. En le prenant en charge, il passe à votre nom et les autres agents ne peuvent plus le modifier.</p>
            <Button className="w-full rounded-xl bg-amber-500 font-semibold text-navy-950 hover:bg-amber-600" disabled={busy === "prendre"} onClick={prendre}>
              {busy === "prendre" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
              Prendre en charge
            </Button>
          </div>
        );
      case "a_traiter":
        return (
          <div className="space-y-3 rounded-2xl border-2 border-navy-300 bg-navy-50 p-4">
            <p className="font-semibold text-navy-900">Étape 2 — Vérifier les pièces et envoyer à NSIA</p>
            <ol className="ml-5 list-decimal space-y-0.5 text-sm text-navy-700">
              <li>Ouvrez et contrôlez les pièces ci-dessous.</li>
              <li>Téléchargez le dossier (Excel ou PDF) et transmettez-le à NSIA.</li>
              <li>Confirmez l&apos;envoi.</li>
            </ol>
            <div className="flex flex-wrap gap-2">
              {item.kind === "epargne" ? (
                <>
                  <DocLink href={item.c.pieceIdentiteUrl} label="CNI recto" icon={<FileText className="h-3.5 w-3.5" />} />
                  <DocLink href={item.c.pieceIdentiteVersoUrl} label="CNI verso" icon={<FileText className="h-3.5 w-3.5" />} />
                  <DocLink href={item.c.ribDocumentUrl} label="RIB" icon={<CreditCard className="h-3.5 w-3.5" />} />
                </>
              ) : item.c.questionnaireMedical ? (
                <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />Questionnaire médical rempli</span>
              ) : (
                <span className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" />Questionnaire médical manquant</span>
              )}
            </div>
            {exportButtons}
            <label className="flex cursor-pointer items-start gap-2 text-sm text-navy-800">
              <Checkbox checked={verifie} onCheckedChange={v => setVerifie(!!v)} className="mt-0.5" />
              J&apos;ai vérifié les pièces et transmis le dossier à NSIA.
            </label>
            <Button className="w-full rounded-xl bg-navy-800 font-semibold hover:bg-navy-700" disabled={!verifie || busy === "envoyer"} onClick={envoyer}>
              {busy === "envoyer" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Confirmer l&apos;envoi à NSIA
            </Button>
            <div className="flex items-center justify-between pt-1">
              <button className="text-xs text-navy-600 underline" onClick={() => setShowPolice(v => !v)}>
                {showPolice ? "Masquer" : "J'ai déjà reçu le N° de police"}
              </button>
              {libererLink}
            </div>
            {showPolice && <div className="border-t border-navy-200 pt-3">{policeForm}</div>}
          </div>
        );
      case "envoye":
        return (
          <div className="space-y-3 rounded-2xl border-2 border-navy-300 bg-navy-50 p-4">
            <p className="font-semibold text-navy-900">Étape 3 — Saisir le N° de police reçu de NSIA</p>
            <p className="text-sm text-navy-700">Dossier envoyé à NSIA le <strong>{formatDate(c.envoyeNsiaAt)}</strong>. Dès réception du numéro, saisissez-le : le contrat sera activé et le client notifié.</p>
            {policeForm}
            <div className="flex items-center justify-between pt-1">
              <button className="text-xs text-navy-600 underline" onClick={() => exporter("pdf")}>Re-télécharger le PDF</button>
              {libererLink}
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-emerald-900">Contrat actif — police n° {c.numPolice}</p>
              <Badge className={STATUT_COLORS[c.statut] || "bg-navy-50 text-navy-500"}>{STATUT_LABELS[c.statut] || c.statut}</Badge>
            </div>
            {item.kind === "epargne" && (
              <p className="text-sm text-emerald-800">Capital constitué : <strong>{formatCFA(item.c.capitalConstitue)}</strong> · {item.c.cotisations.length} cotisation(s) encaissée(s)</p>
            )}
            {c.statut === "cloture" ? (
              <p className="flex items-center gap-1 text-sm text-navy-500"><LockIcon className="h-4 w-4" /> Contrat clôturé — aucune modification possible.</p>
            ) : (
              <div className="flex gap-2">
                <Select value={statut || c.statut} onValueChange={setStatut}>
                  <SelectTrigger className="h-9 flex-1 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(item.kind === "epargne"
                      ? ["en_cours", "suspendu", "arrive_terme", "rachete", "cloture"]
                      : ["en_cours", "sinistre", "expire", "resilie", "cloture"]
                    ).map(s => <SelectItem key={s} value={s}>{STATUT_LABELS[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" className="h-9 border-navy-200" disabled={busy === "statut" || !statut || statut === c.statut} onClick={appliquerStatut}>
                  Changer le statut
                </Button>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <Sheet open onOpenChange={o => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0 gap-0">
        <SheetHeader className="border-b border-navy-100 bg-navy-50/50">
          <SheetTitle className="font-display text-lg font-semibold text-navy-900">{c.clientNom}</SheetTitle>
          <SheetDescription className="text-navy-400">
            {produitLabel(item)} · {montantLabel(item)} · souscrit le {formatDate(c.createdAt)}
          </SheetDescription>
          <div className="flex items-center gap-1 pt-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-1 items-center gap-1">
                {i < stepsDone
                  ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  : <Circle className={`h-4 w-4 shrink-0 ${i === stepsDone ? "text-amber-500" : "text-navy-200"}`} />}
                <span className={`text-xs ${i < stepsDone ? "text-emerald-700" : i === stepsDone ? "font-semibold text-amber-700" : "text-navy-300"}`}>{s}</span>
                {i < STEPS.length - 1 && <div className={`h-px flex-1 ${i < stepsDone ? "bg-emerald-400" : "bg-navy-100"}`} />}
              </div>
            ))}
          </div>
        </SheetHeader>

        <div className="p-4 space-y-5">
          {renderAction()}

          {item.kind === "epargne" && item.c.cotisations.length > 0 && (
            <Section title={`Cotisations (${item.c.cotisations.length})`}>
              <div className="divide-y text-sm">
                {[...item.c.cotisations].reverse().map(co => (
                  <div key={co.id} className="flex justify-between py-1.5">
                    <span>Échéance {formatDate(co.dateEcheance)}</span>
                    <span className="text-navy-400">payée le {formatDate(co.datePaiement)}</span>
                    <span className="font-medium">{formatCFA(co.montant)}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title="Souscripteur">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Nom complet" value={`${c.civilite || ""} ${c.clientNom}`.trim()} />
              <Field label="NNI" value={c.nni} />
              <Field label="N° pièce" value={c.numeroPiece} />
              <Field label="Téléphone" value={c.telephone} />
              <Field label="WhatsApp" value={c.whatsapp} />
              <Field label="Email" value={c.emailPersonnel} />
              <Field label="Adresse" value={c.adressePostale} />
              <Field label="Situation" value={c.situationMatrimoniale} />
              <Field label="Profession" value={c.professionDetail} />
            </div>
          </Section>

          {item.kind === "epargne" ? (
            <>
              <Section title="Contrat épargne">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Field label="Cotisation" value={montantLabel(item)} />
                  <Field label="Durée" value={`${item.c.dureeAnnees} ans`} />
                  <Field label="1ère cotisation" value={formatDate(item.c.datePremiereCotisation)} />
                  <Field label="Date d'effet" value={formatDate(item.c.dateEffet)} />
                  <Field label="Taux garanti" value={`${item.c.tauxInteret} % / an`} />
                  <Field label="N° compte (RIB)" value={<span className="font-mono text-xs">{item.c.numeroCompte}</span>} />
                </div>
              </Section>
              <Section title="Pièces jointes">
                <div className="flex flex-wrap gap-2">
                  <DocLink href={item.c.pieceIdentiteUrl} label="CNI recto" icon={<FileText className="h-3.5 w-3.5" />} />
                  <DocLink href={item.c.pieceIdentiteVersoUrl} label="CNI verso" icon={<FileText className="h-3.5 w-3.5" />} />
                  <DocLink href={item.c.ribDocumentUrl} label="RIB" icon={<CreditCard className="h-3.5 w-3.5" />} />
                </div>
              </Section>
              {item.c.correspondants.length > 0 && (
                <Section title="Correspondants">
                  <div className="divide-y text-sm">
                    {item.c.correspondants.map((co, i) => (
                      <div key={i} className="flex flex-wrap gap-x-4 py-1.5">
                        <span className="font-medium">{co.nom} {co.prenom}</span>
                        <span className="text-navy-400">{co.telephone}</span>
                        <span className="text-navy-400">{co.email}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
              {item.c.beneficiaires.length > 0 && (
                <Section title="Bénéficiaires">
                  <div className="divide-y text-sm">
                    {item.c.beneficiaires.map((b, i) => (
                      <div key={i} className="flex justify-between py-1.5">
                        <span className="font-medium">{b.conjointCorps ? "Conjoint(e)" : b.enfantsNes ? "Enfants nés ou à naître" : b.nom}</span>
                        <span className="text-navy-400">{b.enQualiteDe}</span>
                        {!b.conjointCorps && !b.enfantsNes && <span className="text-amber-700 font-medium">{b.tauxRepartition} %</span>}
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </>
          ) : (
            <>
              <Section title="Contrat prévoyance">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Field label="Garanties" value={produitLabel(item).replace("Prévoyance · ", "")} />
                  <Field label="Prime annuelle" value={formatCFA(item.c.primeAnnuelle)} />
                  <Field label="Date d'effet" value={formatDate(item.c.dateEffet)} />
                  <Field label="Échéance" value={formatDate(item.c.dateEcheance)} />
                  <Field label="Correspondant" value={item.c.correspNom ? `${item.c.correspNom} ${item.c.correspPrenom || ""} ${item.c.correspTelephone || ""}` : undefined} />
                </div>
              </Section>
              {item.c.assuresAssocies.length > 0 && (
                <Section title="Famille couverte">
                  <div className="divide-y text-sm">
                    {item.c.assuresAssocies.map((a, i) => (
                      <div key={i} className="flex justify-between gap-2 py-1.5">
                        <span className="font-medium">{a.nom || "—"} <span className="text-navy-300">({a.lienParente})</span></span>
                        <span className="text-navy-400 text-xs">
                          né(e) le {formatDate(a.dateNaissance)}{a.contact ? ` · ${a.contact}` : ""}
                        </span>
                        <span className="text-amber-700 font-medium shrink-0">{formatCFA(a.montantIndemnite)}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
              {item.c.beneficiaires.length > 0 && (
                <Section title="Bénéficiaires">
                  <div className="divide-y text-sm">
                    {item.c.beneficiaires.map((b, i) => (
                      <div key={i} className="flex justify-between py-1.5">
                        <span className="font-medium">{b.conjointCorps ? "Conjoint(e)" : b.enfantsNes ? "Enfants nés ou à naître" : b.nom}</span>
                        <span className="text-navy-400">{b.enQualiteDe}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
              <Section title="Questionnaire médical">
                {item.c.questionnaireMedical ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Field label="Taille" value={item.c.questionnaireMedical.tailleCm ? `${item.c.questionnaireMedical.tailleCm} cm` : undefined} />
                    <Field label="Poids" value={item.c.questionnaireMedical.poidsKg ? `${item.c.questionnaireMedical.poidsKg} kg` : undefined} />
                    <Field label="Tension" value={item.c.questionnaireMedical.tensionArterielle} />
                    <Field label="Fumeur" value={item.c.questionnaireMedical.fumeur ? "Oui" : "Non"} />
                    <Field label="Alcool" value={{ non: "Non", pas_du_tout: "Pas du tout", a_l_occasion: "À l'occasion", regulierement: "Régulièrement" }[item.c.questionnaireMedical.alcool] || item.c.questionnaireMedical.alcool} />
                    <Field label="Antécédents « Oui »" value={String(Object.values(item.c.questionnaireMedical.antecedents || {}).flatMap(r => Object.values(r)).filter(v => v === "Oui").length)} />
                  </div>
                ) : <p className="text-sm text-red-600">Non rempli</p>}
              </Section>
            </>
          )}

          {(etape === "actif" || etape === "archive") && (
            <Section title="Exports NSIA">{exportButtons}</Section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

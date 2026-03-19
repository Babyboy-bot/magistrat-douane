"use client";

import { useState, useEffect } from "react";
import { Shield, Search, TrendingUp, Heart, RefreshCw, ChevronDown, ChevronRight, Clock, CheckCircle2, KeyRound, Settings2, FileSpreadsheet, FileDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { magistassurApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { ContratEpargne, ContratPrevoyance } from "@/lib/types";
import { toast } from "sonner";

const formatCFA = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const STATUT_COLORS: Record<string, string> = {
  en_cours: "bg-green-100 text-green-700",
  rachete: "bg-orange-100 text-orange-700",
  arrive_terme: "bg-blue-100 text-blue-700",
  suspendu: "bg-yellow-100 text-yellow-700",
  sinistre: "bg-red-100 text-red-700",
  expire: "bg-gray-100 text-gray-600",
  resilie: "bg-red-100 text-red-700",
};

const STATUT_LABELS: Record<string, string> = {
  en_cours: "En cours",
  rachete: "Racheté",
  arrive_terme: "Arrivé à terme",
  suspendu: "Suspendu",
  sinistre: "Sinistre",
  expire: "Expiré",
  resilie: "Résilié",
};

const MODE_LABELS: Record<string, string> = {
  prelevement: "Prélèvement bancaire",
  virement: "Virement bancaire",
  cheque: "Chèque",
  especes: "Espèces",
};

type PoliceForm = { numPolice: string; codeInspection: string; dateEffet: string; loading: boolean };

export default function AgentMagistAssurPage() {
  const { isAuthenticated } = useAuthStore();
  const [tab, setTab] = useState<"attente" | "epargne" | "prevoyance">("attente");
  const [search, setSearch] = useState("");
  const [loadingEpargne, setLoadingEpargne] = useState(false);
  const [loadingPrevoyance, setLoadingPrevoyance] = useState(false);
  const [epargnes, setEpargnes] = useState<ContratEpargne[]>([]);
  const [prevoyances, setPrevoyances] = useState<ContratPrevoyance[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [policeForms, setPoliceForms] = useState<Record<string, PoliceForm>>({});
  const [pendingStatuts, setPendingStatuts] = useState<Record<string, string>>({});
  const [statutLoading, setStatutLoading] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  const handleExportEpargne = async (id: string, format: "excel" | "pdf") => {
    setExportLoading(`${id}-${format}`);
    try {
      if (format === "excel") await magistassurApi.exportEpargneExcel(id);
      else await magistassurApi.exportEpargnePdf(id);
    } catch { toast.error("Erreur lors de l'export"); }
    finally { setExportLoading(null); }
  };

  const handleExportPrevoyance = async (id: string, format: "excel" | "pdf") => {
    setExportLoading(`${id}-${format}`);
    try {
      if (format === "excel") await magistassurApi.exportPrevoyanceExcel(id);
      else await magistassurApi.exportPrevoyancePdf(id);
    } catch { toast.error("Erreur lors de l'export"); }
    finally { setExportLoading(null); }
  };

  const loadEpargne = async () => {
    setLoadingEpargne(true);
    try { setEpargnes(await magistassurApi.listEpargne()); }
    catch { toast.error("Erreur chargement contrats épargne"); }
    finally { setLoadingEpargne(false); }
  };

  const loadPrevoyance = async () => {
    setLoadingPrevoyance(true);
    try { setPrevoyances(await magistassurApi.listPrevoyance()); }
    catch { toast.error("Erreur chargement contrats prévoyance"); }
    finally { setLoadingPrevoyance(false); }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    loadEpargne();
    loadPrevoyance();
  }, [isAuthenticated]);

  const getForm = (id: string): PoliceForm =>
    policeForms[id] ?? { numPolice: "", codeInspection: "", dateEffet: "", loading: false };

  const setForm = (id: string, patch: Partial<PoliceForm>) =>
    setPoliceForms(f => ({ ...f, [id]: { ...getForm(id), ...patch } }));

  const handleChangeStatutEpargne = async (e: ContratEpargne) => {
    const newStatut = pendingStatuts[e.id];
    if (!newStatut || newStatut === e.statut) return;
    setStatutLoading(e.id);
    try {
      await magistassurApi.changeStatutEpargne(e.id, newStatut);
      toast.success(`Statut mis à jour : ${STATUT_LABELS[newStatut] || newStatut}`);
      await loadEpargne();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur changement statut");
    } finally {
      setStatutLoading(null);
    }
  };

  const handleChangeStatutPrevoyance = async (p: ContratPrevoyance) => {
    const newStatut = pendingStatuts[p.id];
    if (!newStatut || newStatut === p.statut) return;
    setStatutLoading(p.id);
    try {
      await magistassurApi.changeStatutPrevoyance(p.id, newStatut);
      toast.success(`Statut mis à jour : ${STATUT_LABELS[newStatut] || newStatut}`);
      await loadPrevoyance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur changement statut");
    } finally {
      setStatutLoading(null);
    }
  };

  const handleAssignEpargne = async (e: ContratEpargne) => {
    const form = getForm(e.id);
    if (!form.numPolice.trim()) { toast.error("Saisir le numéro de police"); return; }
    setForm(e.id, { loading: true });
    try {
      await magistassurApi.assignPoliceEpargne(e.id, form.numPolice.trim(), form.codeInspection.trim());
      toast.success(`N° police ${form.numPolice} assigné — contrat activé`);
      await loadEpargne();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur assignation");
    } finally {
      setForm(e.id, { loading: false });
    }
  };

  const handleAssignPrevoyance = async (p: ContratPrevoyance) => {
    const form = getForm(p.id);
    if (!form.numPolice.trim()) { toast.error("Saisir le numéro de police"); return; }
    setForm(p.id, { loading: true });
    try {
      await magistassurApi.assignPolicePrevoyance(p.id, form.numPolice.trim(), form.codeInspection.trim(), form.dateEffet.trim() || undefined);
      toast.success(`N° police ${form.numPolice} assigné — contrat activé`);
      await loadPrevoyance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur assignation");
    } finally {
      setForm(p.id, { loading: false });
    }
  };

  const match = (nom: string, police: string) =>
    !search || nom.toLowerCase().includes(search.toLowerCase()) || police.includes(search);

  const filteredEpargnes = epargnes.filter(e => match(e.clientNom, e.numPolice));
  const filteredPrevoyances = prevoyances.filter(p => match(p.clientNom, p.numPolice));
  const enAttenteE = filteredEpargnes.filter(e => !e.numPolice);
  const enAttenteP = filteredPrevoyances.filter(p => !p.numPolice);
  const totalAttente = enAttenteE.length + enAttenteP.length;

  const totalEpargne = epargnes.length;
  const totalPrevoyance = prevoyances.length;
  const capitalTotal = epargnes.reduce((s, e) => s + e.capitalConstitue, 0);
  const primesAnnuellesPrev = prevoyances.reduce((s, p) => s + p.primeAnnuelle, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-purple-600" />
            MAGIST&apos;ASSUR
          </h1>
          <p className="text-gray-500 mt-1">Gestion des contrats assurance vie magistrats</p>
        </div>
        <div className="flex gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button variant="outline" size="icon" onClick={() => { loadEpargne(); loadPrevoyance(); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`border-0 shadow-sm cursor-pointer transition ${totalAttente > 0 ? "ring-2 ring-orange-400" : ""}`} onClick={() => setTab("attente")}>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 flex items-center gap-1"><Clock className="h-3 w-3" /> En attente N° police</p>
            <p className={`text-2xl font-bold ${totalAttente > 0 ? "text-orange-600" : "text-gray-400"}`}>{totalAttente}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Contrats Épargne</p>
            <p className="text-2xl font-bold text-purple-700">{totalEpargne}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Capital épargne total</p>
            <p className="text-lg font-bold text-green-700">{formatCFA(capitalTotal)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Primes prévoyance/an</p>
            <p className="text-lg font-bold text-blue-700">{formatCFA(primesAnnuellesPrev)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + Liste */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Contrats</CardTitle>
            <Tabs value={tab} onValueChange={v => setTab(v as "attente" | "epargne" | "prevoyance")}>
              <TabsList>
                <TabsTrigger value="attente" className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  En attente
                  {totalAttente > 0 && <span className="ml-1 bg-orange-500 text-white text-[10px] rounded-full px-1.5">{totalAttente}</span>}
                </TabsTrigger>
                <TabsTrigger value="epargne" className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" /> Épargne ({totalEpargne})
                </TabsTrigger>
                <TabsTrigger value="prevoyance" className="flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" /> Prévoyance ({totalPrevoyance})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>

          {/* ── Onglet EN ATTENTE ── */}
          {tab === "attente" && (
            (loadingEpargne || loadingPrevoyance) ? <p className="text-center text-gray-400 py-8">Chargement...</p> :
            (enAttenteE.length === 0 && enAttenteP.length === 0) ? (
              <div className="flex flex-col items-center py-12 gap-2 text-gray-400">
                <CheckCircle2 className="h-10 w-10 text-green-400" />
                <p className="font-medium text-green-600">Tous les dossiers sont traités</p>
                <p className="text-sm">Aucun contrat en attente de N° police</p>
              </div>
            ) : (
              <div className="space-y-3">
                {enAttenteE.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Épargne — {enAttenteE.length} dossier(s)</p>
                    <div className="space-y-2">
                      {enAttenteE.map(e => (
                        <div key={e.id} className="border border-orange-200 rounded-lg overflow-hidden">
                          <button className="w-full text-left p-4 hover:bg-orange-50 transition flex items-center justify-between"
                            onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-orange-100 flex items-center justify-center">
                                <Clock className="h-4 w-4 text-orange-500" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{e.clientNom}</p>
                                <p className="text-xs text-gray-500">{formatCFA(e.montantCotisation)}/{e.periodicite.slice(0, 3)} · {e.dureeAnnees} ans</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="text-xs bg-orange-100 text-orange-700">N° police manquant</Badge>
                              {expandedId === e.id ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                            </div>
                          </button>
                          {expandedId === e.id && (
                            <div className="border-t bg-orange-50 p-4 space-y-4">
                              {/* Souscripteur */}
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Souscripteur</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm bg-white rounded-lg p-3 border">
                                  <div><p className="text-xs text-gray-400">Nom complet</p><p className="font-medium">{e.civilite} {e.clientNom}</p></div>
                                  <div><p className="text-xs text-gray-400">NNI</p><p className="font-medium">{e.nni || "—"}</p></div>
                                  <div><p className="text-xs text-gray-400">N° pièce</p><p className="font-medium">{e.numeroPiece || "—"}</p></div>
                                  <div><p className="text-xs text-gray-400">Téléphone</p><p className="font-medium">{e.telephone || "—"}</p></div>
                                  <div><p className="text-xs text-gray-400">WhatsApp</p><p className="font-medium">{e.whatsapp || "—"}</p></div>
                                  <div><p className="text-xs text-gray-400">Email</p><p className="font-medium">{e.emailPersonnel || "—"}</p></div>
                                  <div><p className="text-xs text-gray-400">Adresse</p><p className="font-medium">{e.adressePostale || "—"}</p></div>
                                  <div><p className="text-xs text-gray-400">Situation</p><p className="font-medium">{e.situationMatrimoniale || "—"}</p></div>
                                  <div><p className="text-xs text-gray-400">Profession</p><p className="font-medium">{e.professionDetail || "—"}</p></div>
                                </div>
                              </div>
                              {/* Contrat */}
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Contrat Épargne</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm bg-white rounded-lg p-3 border">
                                  <div><p className="text-xs text-gray-400">Durée</p><p className="font-medium">{e.dureeAnnees} ans</p></div>
                                  <div><p className="text-xs text-gray-400">Cotisation</p><p className="font-medium">{formatCFA(e.montantCotisation)}/{e.periodicite.slice(0,3)}</p></div>
                                  <div><p className="text-xs text-gray-400">1ère cotisation</p><p className="font-medium">{formatDate(e.datePremiereCotisation)}</p></div>
                                  <div><p className="text-xs text-gray-400">N° compte (RIB)</p><p className="font-medium">{e.numeroCompte || "—"}</p></div>
                                  <div><p className="text-xs text-gray-400">Taux intérêt</p><p className="font-medium">{e.tauxInteret}%/an</p></div>
                                  <div><p className="text-xs text-gray-400">Date d'effet</p><p className="font-medium">{formatDate(e.dateEffet)}</p></div>
                                </div>
                              </div>
                              {/* Correspondants */}
                              {e.correspondants.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Correspondants ({e.correspondants.length})</p>
                                  <div className="space-y-1">
                                    {e.correspondants.map((c, i) => (
                                      <div key={i} className="flex gap-4 text-xs bg-white rounded px-3 py-2 border">
                                        <span className="font-medium w-32">{c.nom} {c.prenom}</span>
                                        <span className="text-gray-500">{c.telephone}</span>
                                        <span className="text-gray-500">{c.email}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {/* Bénéficiaires */}
                              {e.beneficiaires.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Bénéficiaires ({e.beneficiaires.length})</p>
                                  <div className="space-y-1">
                                    {e.beneficiaires.map((b, i) => (
                                      <div key={i} className="flex gap-4 text-xs bg-white rounded px-3 py-2 border">
                                        <span className="font-medium w-40">{b.conjointCorps ? "Conjoint(e)" : b.enfantsNes ? "Enfants nés/à naître" : b.nom}</span>
                                        <span className="text-gray-500">{b.enQualiteDe}</span>
                                        {b.tauxRepartition > 0 && <span className="ml-auto text-amber-700 font-medium">{b.tauxRepartition}%</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {/* Export NSIA */}
                              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 space-y-2">
                                <p className="text-xs font-semibold text-blue-700 flex items-center gap-1"><FileDown className="h-3 w-3" /> Exporter pour envoi à NSIA</p>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-green-300 text-green-700 hover:bg-green-50" disabled={exportLoading === `${e.id}-excel`} onClick={() => handleExportEpargne(e.id, "excel")}>
                                    <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />{exportLoading === `${e.id}-excel` ? "..." : "Excel"}
                                  </Button>
                                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-red-300 text-red-700 hover:bg-red-50" disabled={exportLoading === `${e.id}-pdf`} onClick={() => handleExportEpargne(e.id, "pdf")}>
                                    <FileDown className="h-3.5 w-3.5 mr-1" />{exportLoading === `${e.id}-pdf` ? "..." : "PDF"}
                                  </Button>
                                </div>
                              </div>
                              {/* Assignation police */}
                              <div className="bg-white rounded-lg p-3 border space-y-2">
                                <p className="text-xs font-semibold text-gray-700 flex items-center gap-1"><KeyRound className="h-3 w-3" /> Assigner le N° de police NSIA</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <div><Label className="text-xs">N° Police *</Label><Input className="h-8 text-sm mt-1" placeholder="ex: EP-2026-001234" value={getForm(e.id).numPolice} onChange={ev => setForm(e.id, { numPolice: ev.target.value })} /></div>
                                  <div><Label className="text-xs">Code inspection</Label><Input className="h-8 text-sm mt-1" placeholder="optionnel" value={getForm(e.id).codeInspection} onChange={ev => setForm(e.id, { codeInspection: ev.target.value })} /></div>
                                </div>
                                <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" disabled={getForm(e.id).loading} onClick={() => handleAssignEpargne(e)}>
                                  {getForm(e.id).loading ? "Enregistrement..." : "✓ Valider et activer le contrat"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {enAttenteP.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1"><Heart className="h-3 w-3" /> Prévoyance — {enAttenteP.length} dossier(s)</p>
                    <div className="space-y-2">
                      {enAttenteP.map(p => (
                        <div key={p.id} className="border border-orange-200 rounded-lg overflow-hidden">
                          <button className="w-full text-left p-4 hover:bg-orange-50 transition flex items-center justify-between"
                            onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-orange-100 flex items-center justify-center">
                                <Clock className="h-4 w-4 text-orange-500" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{p.clientNom}</p>
                                <p className="text-xs text-gray-500 flex gap-1">
                                  {p.garantiePrevoyanceDeces && <span className="bg-purple-100 text-purple-700 rounded px-1">Décès</span>}
                                  {p.garantiefraisFuneraires && <span className="bg-orange-100 text-orange-700 rounded px-1">Funéraires</span>}
                                  · {formatCFA(p.primeAnnuelle)}/an
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="text-xs bg-orange-100 text-orange-700">N° police manquant</Badge>
                              {expandedId === p.id ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                            </div>
                          </button>
                          {expandedId === p.id && (
                            <div className="border-t bg-orange-50 p-4 space-y-4">
                              {/* Souscripteur */}
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Souscripteur</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm bg-white rounded-lg p-3 border">
                                  <div><p className="text-xs text-gray-400">Nom complet</p><p className="font-medium">{p.civilite} {p.clientNom}</p></div>
                                  <div><p className="text-xs text-gray-400">NNI</p><p className="font-medium">{p.nni || "—"}</p></div>
                                  <div><p className="text-xs text-gray-400">N° pièce</p><p className="font-medium">{p.numeroPiece || "—"}</p></div>
                                  <div><p className="text-xs text-gray-400">Téléphone</p><p className="font-medium">{p.telephone || "—"}</p></div>
                                  <div><p className="text-xs text-gray-400">WhatsApp</p><p className="font-medium">{p.whatsapp || "—"}</p></div>
                                  <div><p className="text-xs text-gray-400">Email</p><p className="font-medium">{p.emailPersonnel || "—"}</p></div>
                                  <div><p className="text-xs text-gray-400">Adresse</p><p className="font-medium">{p.adressePostale || "—"}</p></div>
                                  <div><p className="text-xs text-gray-400">Situation</p><p className="font-medium">{p.situationMatrimoniale || "—"}</p></div>
                                  <div><p className="text-xs text-gray-400">Profession</p><p className="font-medium">{p.professionDetail || "—"}</p></div>
                                </div>
                              </div>
                              {/* Garanties */}
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Garanties souscrites</p>
                                <div className="flex gap-2">
                                  {p.garantiePrevoyanceDeces && <span className="text-xs bg-purple-100 text-purple-700 rounded-full px-3 py-1 font-medium">Prévoyance Décès — 10 000 000 FCFA</span>}
                                  {p.garantiefraisFuneraires && <span className="text-xs bg-orange-100 text-orange-700 rounded-full px-3 py-1 font-medium">Frais Funéraires</span>}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Prime totale : <strong>{formatCFA(p.primeAnnuelle)}/an</strong></p>
                              </div>
                              {/* Assurés associés */}
                              {p.assuresAssocies.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Famille couverte ({p.assuresAssocies.length})</p>
                                  <div className="space-y-1">
                                    {p.assuresAssocies.map((a, i) => (
                                      <div key={i} className="flex justify-between text-xs bg-white rounded px-3 py-2 border">
                                        <span className="font-medium">{a.nom || "—"} <span className="text-gray-400">({a.lienParente})</span></span>
                                        <span className="text-amber-700 font-medium">{formatCFA(a.montantIndemnite)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {/* Questionnaire médical */}
                              <div className={`text-xs rounded px-3 py-2 ${p.questionnaireMedical ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                                {p.questionnaireMedical ? "✓ Questionnaire médical rempli" : "✗ Questionnaire médical non rempli — à vérifier"}
                              </div>
                              {/* Export NSIA */}
                              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 space-y-2">
                                <p className="text-xs font-semibold text-blue-700 flex items-center gap-1"><FileDown className="h-3 w-3" /> Exporter pour envoi à NSIA</p>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-green-300 text-green-700 hover:bg-green-50" disabled={exportLoading === `${p.id}-excel`} onClick={() => handleExportPrevoyance(p.id, "excel")}>
                                    <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />{exportLoading === `${p.id}-excel` ? "..." : "Excel"}
                                  </Button>
                                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-red-300 text-red-700 hover:bg-red-50" disabled={exportLoading === `${p.id}-pdf`} onClick={() => handleExportPrevoyance(p.id, "pdf")}>
                                    <FileDown className="h-3.5 w-3.5 mr-1" />{exportLoading === `${p.id}-pdf` ? "..." : "PDF"}
                                  </Button>
                                </div>
                              </div>
                              {/* Assignation police */}
                              <div className="bg-white rounded-lg p-3 border space-y-2">
                                <p className="text-xs font-semibold text-gray-700 flex items-center gap-1"><KeyRound className="h-3 w-3" /> Assigner le N° de police NSIA</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <div><Label className="text-xs">N° Police *</Label><Input className="h-8 text-sm mt-1" placeholder="ex: PR-2026-001234" value={getForm(p.id).numPolice} onChange={ev => setForm(p.id, { numPolice: ev.target.value })} /></div>
                                  <div><Label className="text-xs">Code inspection</Label><Input className="h-8 text-sm mt-1" placeholder="optionnel" value={getForm(p.id).codeInspection} onChange={ev => setForm(p.id, { codeInspection: ev.target.value })} /></div>
                                  <div className="col-span-2"><Label className="text-xs">Date d&apos;effet <span className="text-gray-400">(échéance = +1 an)</span></Label><Input type="date" className="h-8 text-sm mt-1" value={getForm(p.id).dateEffet} onChange={ev => setForm(p.id, { dateEffet: ev.target.value })} /></div>
                                </div>
                                <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" disabled={getForm(p.id).loading} onClick={() => handleAssignPrevoyance(p)}>
                                  {getForm(p.id).loading ? "Enregistrement..." : "✓ Valider et activer le contrat"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* ── Onglet ÉPARGNE ── */}
          {tab === "epargne" && (
            loadingEpargne ? <p className="text-center text-gray-400 py-8">Chargement...</p> :
            filteredEpargnes.length === 0 ? <p className="text-center text-gray-400 py-8">Aucun contrat épargne</p> :
            <div className="space-y-2">
              {filteredEpargnes.map(e => (
                <div key={e.id} className="border rounded-lg overflow-hidden">
                  <button className="w-full text-left p-4 hover:bg-gray-50 transition flex items-center justify-between"
                    onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{e.clientNom}</p>
                        <p className="text-xs text-gray-500">{e.numPolice || "N° police en attente"} · {e.periodicite}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold">{formatCFA(e.montantCotisation)}<span className="text-xs text-gray-400 font-normal">/{e.periodicite.slice(0, 3)}</span></p>
                        <p className="text-xs text-gray-500">Capital : {formatCFA(e.capitalConstitue)}</p>
                      </div>
                      <Badge className={`text-xs ${e.numPolice ? STATUT_COLORS[e.statut] || "bg-gray-100 text-gray-600" : "bg-orange-100 text-orange-700"}`}>
                        {e.numPolice ? (STATUT_LABELS[e.statut] || e.statut) : "En attente"}
                      </Badge>
                      {expandedId === e.id ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                    </div>
                  </button>
                  {expandedId === e.id && (
                    <div className="border-t bg-gray-50 p-4 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                        <div><p className="text-xs text-gray-400">Durée</p><p className="font-medium">{e.dureeAnnees} ans</p></div>
                        <div><p className="text-xs text-gray-400">1ère cotisation</p><p className="font-medium">{formatDate(e.datePremiereCotisation)}</p></div>
                        <div><p className="text-xs text-gray-400">Taux d&apos;intérêt</p><p className="font-medium">{e.tauxInteret}% / an</p></div>
                        <div><p className="text-xs text-gray-400">Mode paiement</p><p className="font-medium">{MODE_LABELS[e.modePaiement] || e.modePaiement || "—"}</p></div>
                        <div><p className="text-xs text-gray-400">N° compte (RIB)</p><p className="font-medium font-mono text-xs">{e.numeroCompte || "—"}</p></div>
                        <div><p className="text-xs text-gray-400">Correspondants</p><p className="font-medium">{e.correspondants.length}</p></div>
                        <div><p className="text-xs text-gray-400">Bénéficiaires</p><p className="font-medium">{e.beneficiaires.length}</p></div>
                      </div>
                      {!e.numPolice && (
                        <div className="bg-white rounded-lg p-3 border space-y-2">
                          <p className="text-xs font-semibold text-gray-700 flex items-center gap-1"><KeyRound className="h-3 w-3" /> Assigner le N° de police NSIA</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div><Label className="text-xs">N° Police *</Label><Input className="h-8 text-sm mt-1" placeholder="ex: EP-2026-001234" value={getForm(e.id).numPolice} onChange={ev => setForm(e.id, { numPolice: ev.target.value })} /></div>
                            <div><Label className="text-xs">Code inspection</Label><Input className="h-8 text-sm mt-1" placeholder="optionnel" value={getForm(e.id).codeInspection} onChange={ev => setForm(e.id, { codeInspection: ev.target.value })} /></div>
                          </div>
                          <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" disabled={getForm(e.id).loading} onClick={() => handleAssignEpargne(e)}>
                            {getForm(e.id).loading ? "Enregistrement..." : "✓ Valider et activer le contrat"}
                          </Button>
                        </div>
                      )}
                      {e.cotisations.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-2">Cotisations récentes</p>
                          <div className="space-y-1">
                            {e.cotisations.slice(-3).map(c => (
                              <div key={c.id} className="flex justify-between text-xs bg-white rounded px-2 py-1">
                                <span>{formatDate(c.dateEcheance)}</span>
                                <span className="font-medium">{formatCFA(c.montant)}</span>
                                <Badge className={`text-[10px] ${c.statut === "payee" ? "bg-green-100 text-green-700" : c.statut === "en_retard" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                                  {c.statut === "payee" ? "Payée" : c.statut === "en_retard" ? "En retard" : "En attente"}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 space-y-2">
                        <p className="text-xs font-semibold text-blue-700 flex items-center gap-1"><FileDown className="h-3 w-3" /> Exporter pour envoi à NSIA</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-green-300 text-green-700 hover:bg-green-50" disabled={exportLoading === `${e.id}-excel`} onClick={() => handleExportEpargne(e.id, "excel")}>
                            <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />{exportLoading === `${e.id}-excel` ? "..." : "Excel"}
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-red-300 text-red-700 hover:bg-red-50" disabled={exportLoading === `${e.id}-pdf`} onClick={() => handleExportEpargne(e.id, "pdf")}>
                            <FileDown className="h-3.5 w-3.5 mr-1" />{exportLoading === `${e.id}-pdf` ? "..." : "PDF"}
                          </Button>
                        </div>
                      </div>
                      {e.numPolice && (
                        <div className="bg-white rounded-lg p-3 border space-y-2">
                          <p className="text-xs font-semibold text-gray-700 flex items-center gap-1"><Settings2 className="h-3 w-3" /> Gérer le statut du contrat</p>
                          <div className="flex gap-2">
                            <Select
                              value={pendingStatuts[e.id] ?? e.statut}
                              onValueChange={v => setPendingStatuts(s => ({ ...s, [e.id]: v }))}
                            >
                              <SelectTrigger className="h-8 text-sm flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="en_cours">En cours</SelectItem>
                                <SelectItem value="arrive_terme">Arrivé à terme</SelectItem>
                                <SelectItem value="rachete">Racheté</SelectItem>
                                <SelectItem value="suspendu">Suspendu</SelectItem>
                                <SelectItem value="resilie">Résilié</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button size="sm" className="h-8 bg-gray-700 hover:bg-gray-800"
                              disabled={statutLoading === e.id || (pendingStatuts[e.id] ?? e.statut) === e.statut}
                              onClick={() => handleChangeStatutEpargne(e)}>
                              {statutLoading === e.id ? "..." : "Appliquer"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Onglet PRÉVOYANCE ── */}
          {tab === "prevoyance" && (
            loadingPrevoyance ? <p className="text-center text-gray-400 py-8">Chargement...</p> :
            filteredPrevoyances.length === 0 ? <p className="text-center text-gray-400 py-8">Aucun contrat prévoyance</p> :
            <div className="space-y-2">
              {filteredPrevoyances.map(p => (
                <div key={p.id} className="border rounded-lg overflow-hidden">
                  <button className="w-full text-left p-4 hover:bg-gray-50 transition flex items-center justify-between"
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Heart className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{p.clientNom}</p>
                        <p className="text-xs text-gray-500">{p.numPolice || "N° police en attente"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold">{formatCFA(p.primeAnnuelle)}<span className="text-xs text-gray-400 font-normal">/an</span></p>
                        <div className="flex gap-1 mt-0.5">
                          {p.garantiePrevoyanceDeces && <span className="text-[10px] bg-purple-100 text-purple-700 rounded px-1">Décès</span>}
                          {p.garantiefraisFuneraires && <span className="text-[10px] bg-orange-100 text-orange-700 rounded px-1">Funéraires</span>}
                        </div>
                      </div>
                      <Badge className={`text-xs ${p.numPolice ? STATUT_COLORS[p.statut] || "bg-gray-100 text-gray-600" : "bg-orange-100 text-orange-700"}`}>
                        {p.numPolice ? (STATUT_LABELS[p.statut] || p.statut) : "En attente"}
                      </Badge>
                      {expandedId === p.id ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                    </div>
                  </button>
                  {expandedId === p.id && (
                    <div className="border-t bg-gray-50 p-4 space-y-3 text-sm">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div><p className="text-xs text-gray-400">Date d&apos;effet</p><p className="font-medium">{formatDate(p.dateEffet)}</p></div>
                        <div><p className="text-xs text-gray-400">Date d&apos;échéance</p><p className="font-medium">{formatDate(p.dateEcheance)}</p></div>
                        <div><p className="text-xs text-gray-400">Assurés associés</p><p className="font-medium">{p.assuresAssocies.length} membre(s)</p></div>
                      </div>
                      {p.assuresAssocies.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-2">Famille couverte</p>
                          <div className="space-y-1">
                            {p.assuresAssocies.map((a, i) => (
                              <div key={i} className="flex justify-between text-xs bg-white rounded px-2 py-1">
                                <span>{a.nom || "—"} <span className="text-gray-400">({a.lienParente})</span></span>
                                <span className="font-medium text-amber-700">{formatCFA(a.montantIndemnite)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {(p.correspNom || p.correspTelephone) && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Correspondant</p>
                          <div className="flex gap-4 text-xs bg-white rounded px-3 py-2 border">
                            <span className="font-medium">{p.correspNom} {p.correspPrenom}</span>
                            {p.correspTelephone && <span className="text-gray-500">{p.correspTelephone}</span>}
                            {p.correspEmail && <span className="text-gray-500">{p.correspEmail}</span>}
                          </div>
                        </div>
                      )}
                      {p.questionnaireMedical && <div className="text-xs text-green-700 bg-green-50 rounded px-2 py-1">✓ Questionnaire médical rempli</div>}
                      {!p.numPolice && (
                        <div className="bg-white rounded-lg p-3 border space-y-2">
                          <p className="text-xs font-semibold text-gray-700 flex items-center gap-1"><KeyRound className="h-3 w-3" /> Assigner le N° de police NSIA</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div><Label className="text-xs">N° Police *</Label><Input className="h-8 text-sm mt-1" placeholder="ex: PR-2026-001234" value={getForm(p.id).numPolice} onChange={ev => setForm(p.id, { numPolice: ev.target.value })} /></div>
                            <div><Label className="text-xs">Code inspection</Label><Input className="h-8 text-sm mt-1" placeholder="optionnel" value={getForm(p.id).codeInspection} onChange={ev => setForm(p.id, { codeInspection: ev.target.value })} /></div>
                          </div>
                          <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" disabled={getForm(p.id).loading} onClick={() => handleAssignPrevoyance(p)}>
                            {getForm(p.id).loading ? "Enregistrement..." : "✓ Valider et activer le contrat"}
                          </Button>
                        </div>
                      )}
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 space-y-2">
                        <p className="text-xs font-semibold text-blue-700 flex items-center gap-1"><FileDown className="h-3 w-3" /> Exporter pour envoi à NSIA</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-green-300 text-green-700 hover:bg-green-50" disabled={exportLoading === `${p.id}-excel`} onClick={() => handleExportPrevoyance(p.id, "excel")}>
                            <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />{exportLoading === `${p.id}-excel` ? "..." : "Excel"}
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-red-300 text-red-700 hover:bg-red-50" disabled={exportLoading === `${p.id}-pdf`} onClick={() => handleExportPrevoyance(p.id, "pdf")}>
                            <FileDown className="h-3.5 w-3.5 mr-1" />{exportLoading === `${p.id}-pdf` ? "..." : "PDF"}
                          </Button>
                        </div>
                      </div>
                      {p.numPolice && (
                        <div className="bg-white rounded-lg p-3 border space-y-2">
                          <p className="text-xs font-semibold text-gray-700 flex items-center gap-1"><Settings2 className="h-3 w-3" /> Gérer le statut du contrat</p>
                          <div className="flex gap-2">
                            <Select
                              value={pendingStatuts[p.id] ?? p.statut}
                              onValueChange={v => setPendingStatuts(s => ({ ...s, [p.id]: v }))}
                            >
                              <SelectTrigger className="h-8 text-sm flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="en_cours">En cours</SelectItem>
                                <SelectItem value="sinistre">Sinistre</SelectItem>
                                <SelectItem value="expire">Expiré</SelectItem>
                                <SelectItem value="resilie">Résilié</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button size="sm" className="h-8 bg-gray-700 hover:bg-gray-800"
                              disabled={statutLoading === p.id || (pendingStatuts[p.id] ?? p.statut) === p.statut}
                              onClick={() => handleChangeStatutPrevoyance(p)}>
                              {statutLoading === p.id ? "..." : "Appliquer"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}

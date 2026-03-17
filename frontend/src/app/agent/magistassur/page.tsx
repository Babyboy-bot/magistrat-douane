"use client";

import { useState, useEffect } from "react";
import { Shield, Search, TrendingUp, Heart, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function AgentMagistAssurPage() {
  const { isAuthenticated } = useAuthStore();
  const [tab, setTab] = useState<"epargne" | "prevoyance">("epargne");
  const [search, setSearch] = useState("");
  const [loadingEpargne, setLoadingEpargne] = useState(false);
  const [loadingPrevoyance, setLoadingPrevoyance] = useState(false);
  const [epargnes, setEpargnes] = useState<ContratEpargne[]>([]);
  const [prevoyances, setPrevoyances] = useState<ContratPrevoyance[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadEpargne = async () => {
    setLoadingEpargne(true);
    try {
      const data = await magistassurApi.listEpargne();
      setEpargnes(data);
    } catch {
      toast.error("Erreur chargement contrats épargne");
    } finally {
      setLoadingEpargne(false);
    }
  };

  const loadPrevoyance = async () => {
    setLoadingPrevoyance(true);
    try {
      const data = await magistassurApi.listPrevoyance();
      setPrevoyances(data);
    } catch {
      toast.error("Erreur chargement contrats prévoyance");
    } finally {
      setLoadingPrevoyance(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    loadEpargne();
    loadPrevoyance();
  }, [isAuthenticated]);

  const filteredEpargnes = epargnes.filter(e =>
    !search || e.clientNom.toLowerCase().includes(search.toLowerCase()) || e.numPolice.includes(search)
  );

  const filteredPrevoyances = prevoyances.filter(p =>
    !search || p.clientNom.toLowerCase().includes(search.toLowerCase()) || p.numPolice.includes(search)
  );

  // Stats
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
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Contrats Épargne</p>
            <p className="text-2xl font-bold text-purple-700">{totalEpargne}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Contrats Prévoyance</p>
            <p className="text-2xl font-bold text-amber-700">{totalPrevoyance}</p>
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Contrats</CardTitle>
            <Tabs value={tab} onValueChange={v => setTab(v as "epargne" | "prevoyance")}>
              <TabsList>
                <TabsTrigger value="epargne" className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" /> Épargne ({totalEpargne})
                </TabsTrigger>
                <TabsTrigger value="prevoyance" className="flex items-center gap-1">
                  <Heart className="h-4 w-4" /> Prévoyance ({totalPrevoyance})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {tab === "epargne" && (
            loadingEpargne ? <p className="text-center text-gray-400 py-8">Chargement...</p> :
            filteredEpargnes.length === 0 ? <p className="text-center text-gray-400 py-8">Aucun contrat épargne</p> :
            <div className="space-y-2">
              {filteredEpargnes.map(e => (
                <div key={e.id} className="border rounded-lg overflow-hidden">
                  <button
                    className="w-full text-left p-4 hover:bg-gray-50 transition flex items-center justify-between"
                    onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{e.clientNom}</p>
                        <p className="text-xs text-gray-500">{e.numPolice || "N° police en attente"} • {e.periodicite}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold">{formatCFA(e.montantCotisation)}<span className="text-xs text-gray-400 font-normal">/{e.periodicite.slice(0, 3)}</span></p>
                        <p className="text-xs text-gray-500">Capital : {formatCFA(e.capitalConstitue)}</p>
                      </div>
                      <Badge className={`text-xs ${STATUT_COLORS[e.statut] || "bg-gray-100 text-gray-600"}`}>
                        {STATUT_LABELS[e.statut] || e.statut}
                      </Badge>
                      {expandedId === e.id ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                    </div>
                  </button>

                  {expandedId === e.id && (
                    <div className="border-t bg-gray-50 p-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">Durée</p>
                        <p className="font-medium">{e.dureeAnnees} ans</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">1ère cotisation</p>
                        <p className="font-medium">{formatDate(e.datePremiereCotisation)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Taux d&apos;intérêt</p>
                        <p className="font-medium">{e.tauxInteret}% / an</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Mode paiement</p>
                        <p className="font-medium">{e.modePaiement || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Correspondants</p>
                        <p className="font-medium">{e.correspondants.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Bénéficiaires</p>
                        <p className="font-medium">{e.beneficiaires.length}</p>
                      </div>
                      {e.cotisations.length > 0 && (
                        <div className="col-span-2 sm:col-span-3">
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === "prevoyance" && (
            loadingPrevoyance ? <p className="text-center text-gray-400 py-8">Chargement...</p> :
            filteredPrevoyances.length === 0 ? <p className="text-center text-gray-400 py-8">Aucun contrat prévoyance</p> :
            <div className="space-y-2">
              {filteredPrevoyances.map(p => (
                <div key={p.id} className="border rounded-lg overflow-hidden">
                  <button
                    className="w-full text-left p-4 hover:bg-gray-50 transition flex items-center justify-between"
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  >
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
                      <Badge className={`text-xs ${STATUT_COLORS[p.statut] || "bg-gray-100 text-gray-600"}`}>
                        {STATUT_LABELS[p.statut] || p.statut}
                      </Badge>
                      {expandedId === p.id ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                    </div>
                  </button>

                  {expandedId === p.id && (
                    <div className="border-t bg-gray-50 p-4 space-y-3 text-sm">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-gray-400">Date d&apos;effet</p>
                          <p className="font-medium">{formatDate(p.dateEffet)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Date d&apos;échéance</p>
                          <p className="font-medium">{formatDate(p.dateEcheance)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Assurés associés</p>
                          <p className="font-medium">{p.assuresAssocies.length} membre(s)</p>
                        </div>
                      </div>
                      {p.assuresAssocies.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-2">Famille couverte (frais funéraires)</p>
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
                      {p.questionnaireMedical && (
                        <div className="text-xs text-green-700 bg-green-50 rounded px-2 py-1">
                          ✓ Questionnaire médical rempli
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

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, RefreshCw, UserPlus, ClipboardCheck, Send, CheckCircle2, ChevronRight, Inbox, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { magistassurApi } from "@/lib/api";
import { PageHeader } from "@/components/brand";
import { useAuthStore } from "@/stores/auth-store";
import type { ContratEpargne, ContratPrevoyance } from "@/lib/types";
import { toast } from "sonner";
import { DossierSheet } from "./components/dossier-sheet";
import {
  type Item, type Etape, etapeOf, itemKey, formatDate, formatCFA, montantLabel, produitLabel, piecesStatus,
  STATUT_LABELS, STATUT_COLORS,
} from "./components/dossier-utils";

type Tab = "a_prendre" | "a_traiter" | "envoye" | "actif";
type FiltreActif = "actifs" | "archives" | "tous";

const TABS: { id: Tab; label: string; hint: string; icon: typeof Inbox; color: string }[] = [
  { id: "a_prendre", label: "À prendre en charge", hint: "Nouvelles souscriptions, traitées par personne", icon: UserPlus, color: "gold" },
  { id: "a_traiter", label: "À vérifier et envoyer", hint: "Mes dossiers : contrôler les pièces puis envoyer à NSIA", icon: ClipboardCheck, color: "navy" },
  { id: "envoye", label: "Envoyés à NSIA", hint: "En attente du N° de police", icon: Send, color: "steel" },
  { id: "actif", label: "Contrats actifs", hint: "Suivi, statuts et cotisations", icon: CheckCircle2, color: "emerald" },
];

const TAB_STYLES: Record<string, { text: string; bg: string }> = {
  gold: { text: "text-amber-600", bg: "bg-amber-50 ring-1 ring-amber-100" },
  navy: { text: "text-navy-700", bg: "bg-navy-50 ring-1 ring-navy-100" },
  steel: { text: "text-navy-500", bg: "bg-navy-50 ring-1 ring-navy-100" },
  emerald: { text: "text-emerald-700", bg: "bg-emerald-50 ring-1 ring-emerald-100" },
};

const ACTION_LABEL: Record<Tab, string> = {
  a_prendre: "Prendre en charge",
  a_traiter: "Traiter",
  envoye: "Saisir la police",
  actif: "Ouvrir",
};

const ETAPE_SHORT: Record<Etape, string> = {
  a_prendre: "À prendre",
  a_traiter: "À vérifier",
  envoye: "Envoyé à NSIA",
  actif: "Actif",
  archive: "Archivé",
};

export default function AgentMagistAssurPage() {
  const { isAuthenticated, user } = useAuthStore();
  const searchParams = useSearchParams();
  const [epargnes, setEpargnes] = useState<ContratEpargne[]>([]);
  const [prevoyances, setPrevoyances] = useState<ContratPrevoyance[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("a_prendre");
  const [filtreActif, setFiltreActif] = useState<FiltreActif>("actifs");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [takingKey, setTakingKey] = useState<string | null>(null);
  const deepLinkDone = useRef(false);

  const userId = String(user?.id ?? "");
  const isAdmin = user?.role === "admin";

  const load = async () => {
    setLoading(true);
    try {
      const [e, p] = await Promise.all([magistassurApi.listEpargne(), magistassurApi.listPrevoyance()]);
      setEpargnes(e);
      setPrevoyances(p);
    } catch {
      toast.error("Erreur lors du chargement des dossiers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated]);

  const items: Item[] = useMemo(() => [
    ...epargnes.map(c => ({ kind: "epargne" as const, c })),
    ...prevoyances.map(c => ({ kind: "prevoyance" as const, c })),
  ], [epargnes, prevoyances]);

  const isMine = (it: Item) => isAdmin || it.c.prisEnChargeId === userId;

  // Répartition des dossiers par étape. « À prendre » est commun à tous les agents ;
  // les étapes suivantes ne montrent que les dossiers de l'agent connecté (tous pour un admin).
  const parEtape = useMemo(() => {
    const groups: Record<Tab, Item[]> = { a_prendre: [], a_traiter: [], envoye: [], actif: [] };
    let chezAutres = 0;
    for (const it of items) {
      const e: Etape = etapeOf(it);
      if (e === "a_prendre") groups.a_prendre.push(it);
      else if (!isMine(it)) { if (!it.c.numPolice) chezAutres++; }
      else if (e === "archive") groups.actif.push(it);
      else groups[e].push(it);
    }
    return { groups, chezAutres };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, userId, isAdmin]);

  const counts: Record<Tab, number> = {
    a_prendre: parEtape.groups.a_prendre.length,
    a_traiter: parEtape.groups.a_traiter.length,
    envoye: parEtape.groups.envoye.length,
    actif: parEtape.groups.actif.filter(it => etapeOf(it) === "actif").length,
  };

  const searching = search.trim() !== "";
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Recherche globale : tous les dossiers, tous les onglets, tous les agents
    if (q) {
      return items
        .filter(it => it.c.clientNom.toLowerCase().includes(q) || (it.c.numPolice || "").toLowerCase().includes(q))
        .sort((a, b) => a.c.createdAt.localeCompare(b.c.createdAt));
    }
    return parEtape.groups[tab]
      .filter(it => tab !== "actif" || filtreActif === "tous" || (filtreActif === "archives") === (etapeOf(it) === "archive"))
      // Les plus anciens d'abord pour le traitement, les plus récents d'abord pour le portefeuille
      .sort((a, b) => tab === "actif"
        ? b.c.createdAt.localeCompare(a.c.createdAt)
        : a.c.createdAt.localeCompare(b.c.createdAt));
  }, [parEtape, items, tab, filtreActif, search]);

  const selectedItem = useMemo(
    () => items.find(it => itemKey(it) === selectedKey) ?? null,
    [items, selectedKey],
  );

  // Après une action, la liste suit le dossier ouvert vers sa nouvelle étape.
  const selectedEtape = selectedItem ? etapeOf(selectedItem) : null;
  useEffect(() => {
    if (!selectedEtape) return;
    setTab(selectedEtape === "archive" ? "actif" : selectedEtape);
  }, [selectedEtape]);

  // Lien profond depuis une notification : /agent/magistassur?contrat=ID&type=epargne|prevoyance
  useEffect(() => {
    if (deepLinkDone.current || items.length === 0) return;
    const id = searchParams.get("contrat");
    if (!id) return;
    const kind = searchParams.get("type") === "prevoyance" ? "prevoyance" : "epargne";
    const found = items.find(it => it.kind === kind && String(it.c.id) === id);
    deepLinkDone.current = true;
    if (!found) return;
    const e = etapeOf(found);
    setTab(e === "archive" ? "actif" : e);
    if (e === "archive") setFiltreActif("archives");
    setSelectedKey(itemKey(found));
  }, [items, searchParams]);

  const prendreEnCharge = async (it: Item) => {
    const key = itemKey(it);
    setTakingKey(key);
    try {
      if (it.kind === "epargne") await magistassurApi.priseEnChargeEpargne(it.c.id);
      else await magistassurApi.priseEnChargePrevoyance(it.c.id);
      toast.success(`Dossier de ${it.c.clientNom} pris en charge — retrouvez-le dans « À vérifier et envoyer ».`);
      await load();
      setTab("a_traiter");
      setSelectedKey(key);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la prise en charge");
      await load();
    } finally {
      setTakingKey(null);
    }
  };

  const current = TABS.find(t => t.id === tab)!;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Espace agent"
        title="Magist'Assur"
        description={<>Traitez chaque souscription de gauche à droite : <strong>prise en charge → envoi à NSIA → N° de police</strong>.</>}
        actions={
          <>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
              <Input placeholder="Nom du client ou N° police" value={search} onChange={e => setSearch(e.target.value)} className="h-10 rounded-xl border-navy-100 bg-white pl-9" />
            </div>
            <Button variant="outline" size="icon" onClick={load} disabled={loading} title="Actualiser" className="h-10 w-10 rounded-xl border-navy-100">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </>
        }
      />

      {/* Étapes = onglets */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TABS.map((t, i) => {
          const s = TAB_STYLES[t.color];
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`relative rounded-2xl border bg-white p-4 text-left transition ${
                active
                  ? "border-amber-300 shadow-[0_12px_32px_-16px_rgb(180_138_58/0.45)] ring-2 ring-amber-400/60"
                  : "border-navy-100 shadow-[0_1px_2px_rgb(16_28_52/0.04)] hover:border-amber-200 hover:shadow-[0_8px_24px_-16px_rgb(16_28_52/0.25)]"
              }`}>
              <div className="flex items-center justify-between">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.bg}`}><Icon className={`h-4 w-4 ${s.text}`} /></span>
                <span className={`font-display text-2xl font-semibold ${counts[t.id] > 0 ? s.text : "text-navy-100"}`}>{counts[t.id]}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-navy-900">{i + 1}. {t.label}</p>
              <p className="text-xs text-navy-400">{t.hint}</p>
              {i < TABS.length - 1 && <ChevronRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-amber-300 lg:block" />}
            </button>
          );
        })}
      </div>

      <Card className="rounded-2xl border-navy-100 shadow-[0_1px_2px_rgb(16_28_52/0.04)]">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy-50 px-4 py-3">
            <div>
              <p className="font-display font-semibold text-navy-900">{current.label}</p>
              <p className="text-xs text-navy-400">{current.hint}</p>
            </div>
            {tab === "actif" && (
              <Select value={filtreActif} onValueChange={v => setFiltreActif(v as FiltreActif)}>
                <SelectTrigger className="w-56 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="actifs">En cours / suspendus</SelectItem>
                  <SelectItem value="archives">Clôturés / terminés</SelectItem>
                  <SelectItem value="tous">Tous</SelectItem>
                </SelectContent>
              </Select>
            )}
            {tab === "a_prendre" && parEtape.chezAutres > 0 && !isAdmin && (
              <span className="text-xs text-navy-400">{parEtape.chezAutres} autre(s) dossier(s) en cours chez d&apos;autres agents</span>
            )}
          </div>

          {loading && items.length === 0 ? (
            <p className="py-12 text-center text-navy-400">Chargement…</p>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-navy-400">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-50">
                <Inbox className="h-6 w-6 text-navy-300" />
              </div>
              <p className="font-medium text-navy-700">{searching ? `Aucun dossier ne correspond à « ${search.trim()} »` : "Aucun dossier ici"}</p>
              {!searching && <p className="text-sm">{tab === "a_prendre" ? "Toutes les souscriptions sont prises en charge." : "Rien à traiter à cette étape pour le moment."}</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>{tab === "envoye" ? "Envoyé le" : tab === "actif" ? "N° police" : "Souscrit le"}</TableHead>
                    <TableHead>{tab === "actif" ? "Statut" : "Pièces"}</TableHead>
                    {isAdmin && tab !== "a_prendre" && <TableHead>Agent</TableHead>}
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(it => {
                    const key = itemKey(it);
                    const pieces = piecesStatus(it);
                    return (
                      <TableRow key={key} className="cursor-pointer" onClick={() => setSelectedKey(key)}>
                        <TableCell className="font-medium text-navy-900">
                          {it.c.clientNom}
                          {searching && (
                            <p className="text-xs font-normal text-navy-400">
                              {ETAPE_SHORT[etapeOf(it)]}
                              {!isMine(it) && it.c.prisEnChargeNom ? ` · chez ${it.c.prisEnChargeNom}` : ""}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={it.kind === "epargne" ? "border-navy-200 bg-navy-100 text-navy-700" : "border-amber-200 bg-amber-100 text-amber-700"}>
                            {produitLabel(it)}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {montantLabel(it)}
                          {it.kind === "epargne" && tab === "actif" && (
                            <p className="text-xs text-navy-400">Capital {formatCFA(it.c.capitalConstitue)}</p>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {tab === "envoye" ? formatDate(it.c.envoyeNsiaAt) : tab === "actif" ? <span className="font-mono text-xs">{it.c.numPolice}</span> : formatDate(it.c.createdAt)}
                        </TableCell>
                        <TableCell>
                          {tab === "actif" ? (
                            <Badge className={STATUT_COLORS[it.c.statut] || "bg-navy-50 text-navy-500"}>{STATUT_LABELS[it.c.statut] || it.c.statut}</Badge>
                          ) : (
                            <span className={`inline-flex items-center gap-1 text-xs ${pieces.ok ? "text-emerald-700" : "text-red-600"}`}>
                              {pieces.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                              {pieces.label}
                            </span>
                          )}
                        </TableCell>
                        {isAdmin && tab !== "a_prendre" && <TableCell className="text-xs text-navy-400">{it.c.prisEnChargeNom || "—"}</TableCell>}
                        <TableCell className="text-right">
                          {etapeOf(it) === "a_prendre" ? (
                            <Button size="sm" className="rounded-lg bg-amber-500 font-semibold text-navy-950 hover:bg-amber-600" disabled={takingKey === key}
                              onClick={e => { e.stopPropagation(); prendreEnCharge(it); }}>
                              {takingKey === key ? "…" : ACTION_LABEL.a_prendre}
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); setSelectedKey(key); }}>
                              {searching ? "Ouvrir" : ACTION_LABEL[tab]} <ChevronRight className="h-3.5 w-3.5 ml-1" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <DossierSheet
        item={selectedItem}
        userId={userId}
        isAdmin={isAdmin}
        onClose={() => setSelectedKey(null)}
        onChanged={load}
      />
    </div>
  );
}

"use client";

import {
  Shield,
  Vault,
  HeartHandshake,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatCard } from "@/components/brand";
import { useEffect, useState } from "react";
import { magistassurApi } from "@/lib/api";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AgentDashboard() {
  const [epargne, setEpargne] = useState<Record<string, unknown>[]>([]);
  const [prevoyance, setPrevoyance] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      magistassurApi.listEpargne().catch(() => []),
      magistassurApi.listPrevoyance().catch(() => []),
    ]).then(([e, p]) => {
      setEpargne(e as Record<string, unknown>[]);
      setPrevoyance(p as Record<string, unknown>[]);
      setLoading(false);
    });
  }, []);

  const totalContrats = epargne.length + prevoyance.length;
  const enAttente = [...epargne, ...prevoyance].filter((c) => !(c as Record<string, unknown>).numPolice).length;
  const actifs = [...epargne, ...prevoyance].filter((c) => (c as Record<string, unknown>).numPolice && (c as Record<string, unknown>).statut === "en_cours").length;
  const autres = [...epargne, ...prevoyance].filter((c) => (c as Record<string, unknown>).numPolice && (c as Record<string, unknown>).statut !== "en_cours").length;

  const statutBadge = (statut: string, hasPolice?: boolean) => {
    if (!hasPolice) return <Badge className="bg-amber-100 text-amber-800 border-amber-200">En attente</Badge>;
    switch (statut) {
      case "en_cours": return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">En cours</Badge>;
      case "rachete": return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Racheté</Badge>;
      case "arrive_terme": return <Badge className="bg-navy-100 text-navy-700 border-navy-200">Arrivé à terme</Badge>;
      case "suspendu": return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Suspendu</Badge>;
      case "sinistre": return <Badge className="bg-red-100 text-red-800 border-red-200">Sinistre</Badge>;
      case "expire": return <Badge className="bg-navy-50 text-navy-500 border-navy-100">Expiré</Badge>;
      case "resilie": return <Badge className="bg-red-100 text-red-800 border-red-200">Résilié</Badge>;
      case "cloture": return <Badge className="bg-navy-100 text-navy-700 border-navy-200">Clôturé</Badge>;
      default: return <Badge className="bg-navy-100 text-navy-700 border-navy-200">{statut}</Badge>;
    }
  };

  const DossierRow = ({ c, type }: { c: Record<string, unknown>; type: "epargne" | "prevoyance" }) => {
    const isEpargne = type === "epargne";
    const Icon = isEpargne ? Vault : HeartHandshake;
    return (
      <Link href="/agent/magistassur" className="block">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-navy-50 bg-navy-50/40 p-3 transition hover:border-amber-200 hover:bg-amber-50/40">
          <div className="flex min-w-0 items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              isEpargne ? "bg-navy-800 text-amber-300" : "bg-amber-500 text-white",
            )}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-navy-900">
                {isEpargne ? "Épargne" : "Prévoyance"} — {(c.numPolice as string) || `#${c.id}`}
              </p>
              <p className="text-xs text-navy-400">{(c.clientNom as string) || "Client"}</p>
            </div>
          </div>
          {statutBadge(c.statut as string, Boolean(c.numPolice))}
        </div>
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Espace agent"
        title="Tableau de bord"
        description="Vue d'ensemble des dossiers Magist'Assur"
        actions={
          <Link href="/agent/magistassur">
            <Button className="rounded-xl bg-navy-900 font-semibold text-white hover:bg-navy-800">
              <Shield className="mr-1.5 h-4 w-4" /> Gérer Magist&apos;Assur
            </Button>
          </Link>
        }
      />

      {/* Statistiques */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-navy-100 bg-white" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total dossiers" value={totalContrats} icon={Shield} tone="navy" />
          <StatCard label="En attente" value={enAttente} icon={Clock} tone="gold" hint="Police non attribuée" />
          <StatCard label="Contrats actifs" value={actifs} icon={CheckCircle} tone="emerald" />
          <StatCard label="Autres statuts" value={autres} icon={AlertCircle} tone="rose" />
        </div>
      )}

      {/* Répartition Épargne / Prévoyance */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Contrats Épargne" value={epargne.length} icon={Vault} tone="navy" />
        <StatCard label="Contrats Prévoyance" value={prevoyance.length} icon={HeartHandshake} tone="gold" />
      </div>

      {/* Dossiers récents */}
      {!loading && (
        <div className="rounded-2xl border border-navy-100 bg-white shadow-[0_1px_2px_rgb(16_28_52/0.04)]">
          <div className="flex items-center justify-between border-b border-navy-50 px-5 py-4">
            <h3 className="font-display text-lg font-semibold text-navy-900">Dossiers récents</h3>
            <Link href="/agent/magistassur">
              <Button variant="ghost" size="sm" className="text-xs text-navy-600 hover:text-amber-700">
                Voir tout <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2 p-4">
            {epargne.slice(0, 3).map((c) => <DossierRow key={c.id as string} c={c} type="epargne" />)}
            {prevoyance.slice(0, 3).map((c) => <DossierRow key={c.id as string} c={c} type="prevoyance" />)}
            {totalContrats === 0 && (
              <div className="py-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-50">
                  <FileText className="h-5 w-5 text-navy-300" />
                </div>
                <p className="text-sm text-navy-400">Aucun dossier Magist&apos;Assur pour le moment</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

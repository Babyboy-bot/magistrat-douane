"use client";

import {
  Users,
  FileText,
  ClipboardList,
  Wallet,
  TrendingUp,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatCard } from "@/components/brand";
import { useAgentDashboardStats, useUsers, useRequests } from "@/hooks/use-api-data";
import { REQUEST_TYPE_LABELS, REQUEST_STATUS_LABELS } from "@/lib/types";

export default function AdminDashboard() {
  const { stats } = useAgentDashboardStats();
  const { data: allUsers } = useUsers();
  const { data: allRequests } = useRequests();
  const agents = allUsers.filter((u) => u.role === "agent");
  const clients = allUsers.filter((u) => u.role === "client");
  const prospects = allUsers.filter((u) => u.role === "prospect");

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";

  const recentRequests = [...allRequests]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const statusColor = (status: string) => {
    switch (status) {
      case "en_attente": return "bg-amber-100 text-amber-800 border-amber-200";
      case "en_cours": return "bg-navy-100 text-navy-700 border-navy-200";
      case "traite": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      default: return "bg-navy-50 text-navy-500 border-navy-100";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Supervision générale"
        description="Vue d'ensemble de la plateforme"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Agents" value={agents.length} icon={Users} tone="navy" />
        <StatCard label="Clients assurés" value={clients.length} icon={UserCheck} tone="emerald" />
        <StatCard label="Prospects" value={prospects.length} icon={UserPlus} tone="gold" />
        <StatCard label="Total contrats" value={stats.totalContrats} icon={FileText} tone="navy" />
      </div>

      {/* Résumé financier */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StatCard label="Total primes" value={formatCurrency(stats.totalPrimes)} icon={Wallet} tone="navy" />
        <StatCard label="Primes encaissées" value={formatCurrency(stats.primesPayees)} icon={TrendingUp} tone="emerald" />
        <StatCard label="Impayés" value={formatCurrency(stats.primesImpayees)} icon={ClipboardList} tone="rose" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Agents actifs */}
        <div className="rounded-2xl border border-navy-100 bg-white shadow-[0_1px_2px_rgb(16_28_52/0.04)]">
          <div className="border-b border-navy-50 px-5 py-4">
            <h3 className="font-display text-lg font-semibold text-navy-900">Agents actifs</h3>
          </div>
          <div className="space-y-2 p-4">
            {agents.map((a) => {
              const agentRequests = allRequests.filter((r) => r.agentId === a.id);
              const treated = agentRequests.filter((r) => r.status === "traite").length;
              const pending = agentRequests.filter((r) => r.status !== "traite").length;
              return (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-navy-50 bg-navy-50/40 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-800 text-sm font-semibold text-amber-300">
                      {a.nom[0]}{a.prenoms[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-navy-900">{a.nom} {a.prenoms}</p>
                      <p className="truncate text-xs text-navy-400">{a.email}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    <p className="font-medium text-emerald-700">{treated} traités</p>
                    <p className="text-amber-600">{pending} en cours</p>
                  </div>
                </div>
              );
            })}
            {agents.length === 0 && (
              <p className="py-6 text-center text-sm text-navy-400">Aucun agent configuré</p>
            )}
          </div>
        </div>

        {/* Requêtes récentes */}
        <div className="rounded-2xl border border-navy-100 bg-white shadow-[0_1px_2px_rgb(16_28_52/0.04)]">
          <div className="border-b border-navy-50 px-5 py-4">
            <h3 className="font-display text-lg font-semibold text-navy-900">Requêtes récentes</h3>
          </div>
          <div className="space-y-2 p-4">
            {recentRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-navy-50 bg-navy-50/40 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy-900">{REQUEST_TYPE_LABELS[r.type]}</p>
                  <p className="truncate text-xs text-navy-400">{r.clientNom} • {r.createdAt}</p>
                </div>
                <Badge className={`shrink-0 ${statusColor(r.status)}`}>
                  {REQUEST_STATUS_LABELS[r.status]}
                </Badge>
              </div>
            ))}
            {recentRequests.length === 0 && (
              <p className="py-6 text-center text-sm text-navy-400">Aucune requête récente</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

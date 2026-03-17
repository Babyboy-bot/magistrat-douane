"use client";

import {
  Users,
  FileText,
  ClipboardList,
  Wallet,
  TrendingUp,
  Activity,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      case "en_attente": return "bg-yellow-100 text-yellow-800";
      case "en_cours": return "bg-blue-100 text-blue-800";
      case "traite": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="h-6 w-6 text-red-500" />
          Supervision Générale
        </h1>
        <p className="text-gray-500 mt-1">Vue d&apos;ensemble de la plateforme</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Agents</p>
                <p className="text-3xl font-bold mt-1">{agents.length}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Clients assurés</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{clients.length}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Prospects</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{prospects.length}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total contrats</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.totalContrats}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total primes</p>
                <p className="text-xl font-bold">{formatCurrency(stats.totalPrimes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Primes encaissées</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(stats.primesPayees)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Impayés</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(stats.primesImpayees)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agents list */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Agents actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {agents.map((a) => {
                const agentRequests = allRequests.filter((r) => r.agentId === a.id);
                const treated = agentRequests.filter((r) => r.status === "traite").length;
                const pending = agentRequests.filter((r) => r.status !== "traite").length;
                return (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[hsl(222,47%,20%)] flex items-center justify-center text-white font-semibold text-sm">
                        {a.nom[0]}{a.prenoms[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{a.nom} {a.prenoms}</p>
                        <p className="text-xs text-gray-500">{a.email}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-green-600 font-medium">{treated} traités</p>
                      <p className="text-amber-600">{pending} en cours</p>
                    </div>
                  </div>
                );
              })}
              {agents.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Aucun agent configuré</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent requests */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Requêtes récentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRequests.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-semibold">{REQUEST_TYPE_LABELS[r.type]}</p>
                    <p className="text-xs text-gray-500">{r.clientNom} • {r.createdAt}</p>
                  </div>
                  <Badge className={statusColor(r.status)} variant="secondary">
                    {REQUEST_STATUS_LABELS[r.status]}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

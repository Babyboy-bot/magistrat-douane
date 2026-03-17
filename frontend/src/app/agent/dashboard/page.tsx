"use client";

import {
  FileText,
  CheckCircle,
  XCircle,
  Wallet,
  CreditCard,
  AlertCircle,
  Download,
  Clock,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAgentDashboardStats, useEcheancesProches } from "@/hooks/use-api-data";
import { emissionsApi } from "@/lib/api";
import { toast } from "sonner";

export default function AgentDashboard() {
  const { stats } = useAgentDashboardStats();
  const { data: echeancesProches } = useEcheancesProches(45);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";

  const triggerExport = async (params: string, label: string) => {
    try {
      await emissionsApi.export(params);
      toast.success(`Export ${label} généré`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur export";
      toast.error(`Export ${label} impossible : ${message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-500 mt-1">Vue d&apos;ensemble de l&apos;activité</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerExport("echeance_within_days=60", "échéances < 60j")}
          >
            <Download className="h-4 w-4 mr-1" /> Export échéances
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerExport("impayes_only=true", "impayés")}
          >
            <Download className="h-4 w-4 mr-1" /> Export impayés
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => triggerExport("echeance_within_days=15&impayes_only=true", "rappels urgents")}
          >
            <AlertCircle className="h-4 w-4 mr-1" /> Rappels urgents
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total contrats</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalContrats}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Contrats actifs</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.contratsActifs}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Contrats expirés</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.contratsExpires}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total primes</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(stats.totalPrimes)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Primes payées</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(stats.primesPayees)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Primes impayées</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {formatCurrency(stats.primesImpayees)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats utilisateurs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Clients assurés</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.totalClients}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Prospects</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{stats.totalProspects}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Agents</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.totalAgents}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Échéances proches */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Avis d&apos;échéances — Contrats expirant dans les 45 jours
          </CardTitle>
        </CardHeader>
        <CardContent>
          {echeancesProches.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Client</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Risque</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Compagnie</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">N° Police</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Échéance</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">TTC</th>
                  </tr>
                </thead>
                <tbody>
                  {echeancesProches.map((e) => {
                    const daysLeft = Math.ceil(
                      (new Date(e.echeance).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    );
                    return (
                      <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-sm font-medium">{e.clientNom}</td>
                        <td className="px-4 py-3 text-sm">{e.risque}</td>
                        <td className="px-4 py-3 text-sm">{e.compagnie}</td>
                        <td className="px-4 py-3 text-sm font-mono text-xs">{e.numPolice}</td>
                        <td className="px-4 py-3">
                          <Badge
                            className={
                              daysLeft <= 15
                                ? "bg-red-100 text-red-800"
                                : daysLeft <= 30
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                            }
                            variant="secondary"
                          >
                            {e.echeance} ({daysLeft}j)
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold">
                          {formatCurrency(e.primeTTC)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">
              Aucune échéance dans les 45 prochains jours
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

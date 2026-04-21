"use client";

import { useState, useEffect } from "react";
import { Car, Home, Eye, EyeOff, Search, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-store";
import { useClientEmissions } from "@/hooks/use-api-data";
import { parseDisplayDate } from "@/lib/utils";

export default function PortfolioPage() {
  const { user } = useAuthStore();
  const { data: emissions, refetch } = useClientEmissions(user?.id || "");

  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener("emission_paiement_updated", handler);
    return () => window.removeEventListener("emission_paiement_updated", handler);
  }, [refetch]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"actifs" | "soldes">("actifs");

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";

  const actifs = emissions.filter((e) => (e.solde ?? (e.primeTTC - e.totalPaye)) > 0);
  const soldes = emissions.filter((e) => (e.solde ?? (e.primeTTC - e.totalPaye)) <= 0);
  const base = tab === "actifs" ? actifs : soldes;

  const filtered = base.filter(
    (e) =>
      e.risque.toLowerCase().includes(search.toLowerCase()) ||
      e.compagnie.toLowerCase().includes(search.toLowerCase()) ||
      e.numPolice.toLowerCase().includes(search.toLowerCase()) ||
      e.marque.toLowerCase().includes(search.toLowerCase()) ||
      e.immatriculation.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon Portefeuille</h1>
          <p className="text-gray-500 mt-1">
            {emissions.length} contrat{emissions.length > 1 ? "s" : ""} en portefeuille
          </p>
        </div>
      </div>

      {/* Onglets Actifs / Soldés */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab("actifs")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "actifs" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Clock className="h-4 w-4" />
          Contrats actifs
          <span className="ml-1 bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs">{actifs.length}</span>
        </button>
        <button
          onClick={() => setTab("soldes")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "soldes" ? "border-green-600 text-green-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          Contrats soldés
          <span className="ml-1 bg-green-100 text-green-700 rounded-full px-2 py-0.5 text-xs">{soldes.length}</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Desktop table */}
      <Card className="border-0 shadow-sm hidden lg:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Risque</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Compagnie</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">N° Facture</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">N° Police</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Marque</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Immat.</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Effet</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Échéance</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">TTC</th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Détails</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const isExpired = parseDisplayDate(e.echeance) < new Date();
                  const solde = e.solde ?? (e.primeTTC - e.totalPaye);
                  const isExpanded = expandedId === e.id;

                  return (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-sm">{e.date}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {e.risque.includes("Auto") ? (
                            <Car className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Home className="h-4 w-4 text-green-500" />
                          )}
                          <span className="text-sm font-medium">{e.risque}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{e.compagnie}</td>
                      <td className="px-4 py-3 text-sm font-mono text-xs">{e.numFacture}</td>
                      <td className="px-4 py-3 text-sm font-mono text-xs">{e.numPolice}</td>
                      <td className="px-4 py-3 text-sm">{e.marque}</td>
                      <td className="px-4 py-3 text-sm font-mono">{e.immatriculation}</td>
                      <td className="px-4 py-3 text-sm">{e.effet}</td>
                      <td className="px-4 py-3">
                        <Badge variant={isExpired ? "destructive" : "secondary"} className="text-xs">
                          {e.echeance}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold">
                        {formatCurrency(e.primeTTC)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedId(isExpanded ? null : e.id)}
                        >
                          {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </td>
                      {isExpanded && (
                        <td colSpan={11}>
                          <div className="bg-blue-50/50 px-6 py-4 border-t">
                            <p className="text-sm font-semibold text-gray-700 mb-3">Détails des paiements</p>
                            {e.paiements.length > 0 ? (
                              <div className="space-y-2">
                                {e.paiements.map((p) => (
                                  <div key={p.id} className="flex items-center justify-between text-sm bg-white rounded-lg px-4 py-2">
                                    <span className="text-gray-500">{p.dateReglement}</span>
                                    <span className="font-mono text-xs text-gray-400">{p.reference}</span>
                                    <span className="font-semibold text-green-600">{formatCurrency(p.montantRegle)}</span>
                                    <span className="text-gray-400 text-xs">{p.observations || "-"}</span>
                                  </div>
                                ))}
                                <div className="flex justify-between pt-2 border-t text-sm font-semibold">
                                  <span>Solde restant</span>
                                  <span className={solde > 0 ? "text-red-600" : "text-green-600"}>
                                    {formatCurrency(solde)}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400">Aucun paiement enregistré</p>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {filtered.map((e) => {
          const solde = e.solde ?? (e.primeTTC - e.totalPaye);
          const isExpanded = expandedId === e.id;
          const isExpired = new Date(e.echeance) < new Date();

          return (
            <Card key={e.id} className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {e.risque.includes("Auto") ? (
                      <Car className="h-5 w-5 text-blue-500" />
                    ) : (
                      <Home className="h-5 w-5 text-green-500" />
                    )}
                    <CardTitle className="text-base">{e.risque}</CardTitle>
                  </div>
                  <Badge variant={isExpired ? "destructive" : "secondary"} className="text-xs">
                    {isExpired ? "Expiré" : "Actif"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-400">Compagnie:</span> {e.compagnie}</div>
                  <div><span className="text-gray-400">Police:</span> {e.numPolice}</div>
                  <div><span className="text-gray-400">Marque:</span> {e.marque}</div>
                  <div><span className="text-gray-400">Immat:</span> {e.immatriculation}</div>
                  <div><span className="text-gray-400">Effet:</span> {e.effet}</div>
                  <div><span className="text-gray-400">Échéance:</span> {e.echeance}</div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-lg font-bold">{formatCurrency(e.primeTTC)}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedId(isExpanded ? null : e.id)}
                  >
                    {isExpanded ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                    {isExpanded ? "Masquer" : "Détails"}
                  </Button>
                </div>
                {isExpanded && (
                  <div className="bg-blue-50/50 rounded-lg p-3 mt-2">
                    <p className="text-sm font-semibold mb-2">Paiements</p>
                    {e.paiements.length > 0 ? (
                      e.paiements.map((p) => (
                        <div key={p.id} className="text-sm flex justify-between py-1">
                          <span>{p.dateReglement}</span>
                          <span className="font-semibold text-green-600">{formatCurrency(p.montantRegle)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400">Aucun paiement</p>
                    )}
                    <div className="flex justify-between pt-2 border-t mt-2 text-sm font-semibold">
                      <span>Solde</span>
                      <span className={solde > 0 ? "text-red-600" : "text-green-600"}>
                        {formatCurrency(solde)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">Aucun contrat trouvé</p>
        </div>
      )}
    </div>
  );
}

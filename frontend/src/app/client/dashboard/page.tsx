"use client";

import { Wallet, CreditCard, AlertCircle, FileText, Car, Home, Shield, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-store";
import { useClientStats, useClientRequests } from "@/hooks/use-api-data";
import { REQUEST_TYPE_LABELS, REQUEST_STATUS_LABELS, Emission, ClientRequest } from "@/lib/types";
import Link from "next/link";

export default function ClientDashboard() {
  const { user } = useAuthStore();
  const clientId = user?.id || "";
  const { stats, emissions } = useClientStats(clientId);
  const { data: requests } = useClientRequests(clientId);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";

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
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenue, {user?.prenoms || "Jean-Baptiste"} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {user?.verified 
            ? "Voici un résumé de votre situation d’assurance"
            : "Votre compte est en attente de validation"
          }
        </p>
      </div>

      {/* Message pour prospect */}
      {!user?.verified && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="h-8 w-8 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-amber-900">
                  Compte en attente de validation
                </h3>
                <p className="text-amber-700 mt-2">
                  Votre compte sera activé après validation par un agent ACS.
                </p>
                <p className="text-amber-600 text-sm mt-1">
                  Délai habituel : sous 24h
                </p>
              </div>
              <div className="bg-amber-100 rounded-lg p-4 text-left">
                <h4 className="font-medium text-amber-900 mb-2">Pendant l’attente :</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>✅ Vous pouvez demander des cotations</li>
                  <li>✅ Un agent ACS vous contactera pour validation</li>
                  <li>✅ Vos données sont sécurisées</li>
                </ul>
              </div>
              <Button 
                onClick={() => window.location.href = "/client/cotation/automobile"}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Demander une cotation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats cards - seulement pour les vérifiés */}
      {user?.verified && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Prime Totale</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(stats.primeTotale)}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Prime Payée</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {formatCurrency(stats.primePayee)}
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
                  <p className="text-sm text-gray-500 font-medium">Prime à Payer</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {formatCurrency(stats.primeAPayer)}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick actions - seulement pour les utilisateurs vérifiés */}
      {user?.verified && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link href="/client/payment">
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <span className="text-xs font-medium">Payer une prime</span>
                </Button>
              </Link>
              <Link href="/client/sinistre">
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-xs font-medium">Déclarer sinistre</span>
                </Button>
              </Link>
              <Link href="/client/incorporation">
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  <span className="text-xs font-medium">Incorporation</span>
                </Button>
              </Link>
              {(user.professionType === "magistrat" || user.professionType === "douanier") ? (
                <Link href="/client/subscribe/magist-assur">
                  <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                    <Shield className="h-5 w-5 text-purple-600" />
                    <span className="text-xs font-medium">Magist-Assur</span>
                  </Button>
                </Link>
              ) : (
                <Link href="/client/change">
                  <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                    <RefreshCw className="h-5 w-5 text-orange-600" />
                    <span className="text-xs font-medium">Changement</span>
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent contracts and requests - seulement pour les vérifiés */}
      {user?.verified && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent contracts */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Mes contrats récents</CardTitle>
              <Link href="/client/portfolio">
                <Button variant="ghost" size="sm" className="text-xs">
                  Voir tout
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {emissions.slice(0, 3).map((e: Emission) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-[hsl(222,47%,20%)] flex items-center justify-center">
                        {e.risque.includes("Auto") ? (
                          <Car className="h-5 w-5 text-white" />
                        ) : (
                          <Home className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{e.risque}</p>
                        <p className="text-xs text-gray-500">
                          {e.compagnie} • {e.numPolice}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(e.primeTTC)}</p>
                      <p className="text-xs text-gray-500">Éch. {e.echeance}</p>
                    </div>
                  </div>
                ))}
                {emissions.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">
                    Aucun contrat pour le moment
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent requests */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Mes requêtes récentes</CardTitle>
              <Link href="/client/history">
                <Button variant="ghost" size="sm" className="text-xs">
                  Voir tout
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {requests.slice(0, 3).map((r: ClientRequest) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <p className="text-sm font-medium">{REQUEST_TYPE_LABELS[r.type as keyof typeof REQUEST_TYPE_LABELS]}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{r.numero} • {r.createdAt}</p>
                    </div>
                    <Badge className={statusColor(r.status)} variant="secondary">
                      {REQUEST_STATUS_LABELS[r.status as keyof typeof REQUEST_STATUS_LABELS]}
                    </Badge>
                  </div>
                ))}
                {requests.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">
                    Aucune requête pour le moment
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

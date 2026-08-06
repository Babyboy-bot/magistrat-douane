"use client";

import { Wallet, AlertCircle, FileText, Shield, Download, Eye, Clock, CheckCircle, PiggyBank, Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useClientRequests } from "@/hooks/use-api-data";
import { REQUEST_TYPE_LABELS, REQUEST_STATUS_LABELS, ClientRequest } from "@/lib/types";
import { downloadFile, magistassurApi } from "@/lib/api";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
function buildUrl(f: string) {
  if (!f) return "";
  if (f.startsWith("http")) return f;
  return `${API_BASE}${f.startsWith("/") ? f : "/" + f}`;
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

function urgencyClass(days: number): string {
  if (days <= 0) return "border-l-4 border-gray-400 bg-gray-50";
  if (days <= 7) return "border-l-4 border-red-500 bg-red-50";
  if (days <= 15) return "border-l-4 border-orange-400 bg-orange-50";
  if (days <= 30) return "border-l-4 border-yellow-400 bg-yellow-50";
  return "border-l-4 border-green-400 bg-green-50";
}

function urgencyBadge(days: number) {
  if (days <= 0) return <Badge className="text-xs bg-gray-100 text-gray-600">Expiré</Badge>;
  if (days <= 7) return <Badge className="text-xs bg-red-100 text-red-700">J-{days}</Badge>;
  if (days <= 15) return <Badge className="text-xs bg-orange-100 text-orange-700">J-{days}</Badge>;
  if (days <= 30) return <Badge className="text-xs bg-yellow-100 text-yellow-700">J-{days}</Badge>;
  return null;
}

export default function ClientDashboard() {
  const { user } = useAuthStore();
  const clientId = user?.id || "";
  const { data: requests } = useClientRequests(clientId);

  const [epargne, setEpargne] = useState<Record<string, unknown>[]>([]);
  const [prevoyance, setPrevoyance] = useState<Record<string, unknown>[]>([]);
  const [loadingMagist, setLoadingMagist] = useState(true);

  useEffect(() => {
    if (!user?.verified) return;
    Promise.all([
      magistassurApi.listEpargne({ clientId }).catch(() => []),
      magistassurApi.listPrevoyance({ clientId }).catch(() => []),
    ]).then(([e, p]) => {
      setEpargne(e as Record<string, unknown>[]);
      setPrevoyance(p as Record<string, unknown>[]);
      setLoadingMagist(false);
    });
  }, [user?.verified, clientId]);

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

  // Livrables récents (toutes requêtes confondues)
  const livrablesRecents = requests
    .flatMap((r: ClientRequest) => r.livrables.map((d) => ({ ...d, requestNumero: r.numero, requestType: r.type })))
    .slice(0, 5);

  const totalContrats = epargne.length + prevoyance.length;
  const contratsEnAttente = [...epargne, ...prevoyance].filter((c) => c.statut === "en_attente").length;
  const contratsActifs = [...epargne, ...prevoyance].filter((c) => c.statut === "actif" || c.statut === "en_cours").length;

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
              <Link href="/client/subscribe/magist-assur">
                <Button className="bg-amber-600 hover:bg-amber-700">
                  Souscrire à Magist'Assur
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bannière contrats en attente */}
      {user?.verified && contratsEnAttente > 0 && (
        <Card className="border-orange-300 bg-orange-50 border-0 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-orange-900 text-sm">
                  {contratsEnAttente} dossier{contratsEnAttente > 1 ? "s" : ""} Magist'Assur en attente de traitement
                </p>
              </div>
              <Link href="/client/subscribe/magist-assur">
                <Button size="sm" variant="outline" className="text-xs border-orange-400 text-orange-700 hover:bg-orange-100">
                  Suivre mes dossiers
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sinistres en cours — masqué, fonctionnalité en développement */}

      {/* Stats cards Magist'Assur */}
      {user?.verified && loadingMagist && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-40" />
                </div>
                <Skeleton className="h-12 w-12 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      )}
      {user?.verified && !loadingMagist && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Contrats Magist'Assur</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{totalContrats}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Contrats Épargne</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{epargne.length}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <PiggyBank className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Contrats Prévoyance</p>
                  <p className="text-2xl font-bold text-rose-600 mt-1">{prevoyance.length}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center">
                  <Heart className="h-6 w-6 text-rose-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick actions - Magist'Assur uniquement */}
      {user?.verified && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Link href="/client/subscribe/magist-assur">
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                  <span className="text-xs font-medium">Magist'Assur</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contrats Magist'Assur */}
      {user?.verified && !loadingMagist && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Mes contrats Magist'Assur</CardTitle>
            <Link href="/client/subscribe/magist-assur">
              <Button variant="ghost" size="sm" className="text-xs">Souscrire</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {epargne.slice(0, 3).map((c) => (
              <div key={c.id as string} className="p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                      <PiggyBank className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">Épargne — {c.numPolice as string || `#${c.id}`}</p>
                      <p className="text-xs text-gray-500">Statut: {c.statut as string}</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 shrink-0" variant="secondary">
                    {c.statut as string}
                  </Badge>
                </div>
              </div>
            ))}
            {prevoyance.slice(0, 3).map((c) => (
              <div key={c.id as string} className="p-3 rounded-lg bg-rose-50 hover:bg-rose-100 transition">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-rose-600 flex items-center justify-center shrink-0">
                      <Heart className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">Prévoyance — {c.numPolice as string || `#${c.id}`}</p>
                      <p className="text-xs text-gray-500">Statut: {c.statut as string}</p>
                    </div>
                  </div>
                  <Badge className="bg-rose-100 text-rose-800 shrink-0" variant="secondary">
                    {c.statut as string}
                  </Badge>
                </div>
              </div>
            ))}
            {totalContrats === 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400 mb-3">Aucun contrat Magist'Assur pour le moment</p>
                <Link href="/client/subscribe/magist-assur">
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                    <Shield className="h-4 w-4 mr-1" /> Souscrire maintenant
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Livrables récents + Requêtes */}
      {user?.verified && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Livrables récents */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Documents disponibles</CardTitle>
              <Link href="/client/history">
                <Button variant="ghost" size="sm" className="text-xs">Voir tout</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {livrablesRecents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Aucun document disponible</p>
              ) : (
                <div className="space-y-2">
                  {livrablesRecents.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-2 rounded-lg bg-green-50 hover:bg-green-100 transition">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-green-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-green-800 truncate">{d.nom}</p>
                          <p className="text-xs text-green-600">{d.requestNumero} — {REQUEST_TYPE_LABELS[d.requestType as keyof typeof REQUEST_TYPE_LABELS]}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => window.open(buildUrl(d.fichier), "_blank")} className="text-green-600 hover:text-green-800 p-1">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => downloadFile(buildUrl(d.fichier), d.nom)} className="text-green-600 hover:text-green-800 p-1">
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Requêtes récentes */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Requêtes récentes</CardTitle>
              <Link href="/client/history">
                <Button variant="ghost" size="sm" className="text-xs">Voir tout</Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {requests.filter((r: ClientRequest) => r.type !== "declaration_sinistre").slice(0, 5).map((r: ClientRequest) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <p className="text-sm font-medium truncate">{REQUEST_TYPE_LABELS[r.type as keyof typeof REQUEST_TYPE_LABELS]}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{r.numero} • {r.createdAt}</p>
                    </div>
                    <Badge className={`${statusColor(r.status)} shrink-0`} variant="secondary">
                      {REQUEST_STATUS_LABELS[r.status as keyof typeof REQUEST_STATUS_LABELS]}
                    </Badge>
                  </div>
                ))}
                {requests.filter((r: ClientRequest) => r.type !== "declaration_sinistre").length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Aucune requête pour le moment</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

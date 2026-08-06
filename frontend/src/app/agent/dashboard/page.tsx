"use client";

import {
  Shield,
  PiggyBank,
  Heart,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { magistassurApi } from "@/lib/api";
import Link from "next/link";

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
  const enAttente = [...epargne, ...prevoyance].filter((c) => c.statut === "en_attente").length;
  const enCours = [...epargne, ...prevoyance].filter((c) => c.statut === "en_cours" || c.statut === "en_revision").length;
  const actifs = [...epargne, ...prevoyance].filter((c) => c.statut === "actif").length;

  const statutBadge = (statut: string) => {
    switch (statut) {
      case "en_attente": return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>;
      case "en_cours": return <Badge className="bg-blue-100 text-blue-800">En cours</Badge>;
      case "en_revision": return <Badge className="bg-orange-100 text-orange-800">En révision</Badge>;
      case "actif": return <Badge className="bg-green-100 text-green-800">Actif</Badge>;
      case "cloture": return <Badge className="bg-gray-100 text-gray-800">Clôturé</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-800">{statut}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-500 mt-1">Vue d&apos;ensemble Magist&apos;Assur</p>
        </div>
        <Link href="/agent/magistassur">
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Shield className="h-4 w-4 mr-1" /> Gérer Magist&apos;Assur
          </Button>
        </Link>
      </div>

      {/* Stats grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="h-16 animate-pulse bg-gray-100 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total dossiers</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{totalContrats}</p>
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
                  <p className="text-sm text-gray-500 font-medium">En attente</p>
                  <p className="text-3xl font-bold text-amber-600 mt-1">{enAttente}</p>
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
                  <p className="text-sm text-gray-500 font-medium">En traitement</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{enCours}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Contrats actifs</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{actifs}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Répartition Épargne / Prévoyance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Contrats Épargne</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{epargne.length}</p>
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
                <p className="text-3xl font-bold text-rose-600 mt-1">{prevoyance.length}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center">
                <Heart className="h-6 w-6 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dossiers récents */}
      {!loading && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Dossiers récents</CardTitle>
            <Link href="/agent/magistassur">
              <Button variant="ghost" size="sm" className="text-xs">Voir tout</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {epargne.slice(0, 3).map((c) => (
              <div key={c.id as string} className="flex items-center justify-between p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                    <PiggyBank className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">Épargne — {c.numPolice as string || `#${c.id}`}</p>
                    <p className="text-xs text-gray-500">{c.clientNom as string || "Client"}</p>
                  </div>
                </div>
                {statutBadge(c.statut as string)}
              </div>
            ))}
            {prevoyance.slice(0, 3).map((c) => (
              <div key={c.id as string} className="flex items-center justify-between p-3 rounded-lg bg-rose-50 hover:bg-rose-100 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-rose-600 flex items-center justify-center shrink-0">
                    <Heart className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">Prévoyance — {c.numPolice as string || `#${c.id}`}</p>
                    <p className="text-xs text-gray-500">{c.clientNom as string || "Client"}</p>
                  </div>
                </div>
                {statutBadge(c.statut as string)}
              </div>
            ))}
            {totalContrats === 0 && (
              <div className="text-center py-6">
                <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Aucun dossier Magist&apos;Assur pour le moment</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

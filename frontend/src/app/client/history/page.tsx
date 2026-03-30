"use client";

import { FileText, Clock, CheckCircle, AlertCircle, Search, Eye, Download, ThumbsUp } from "lucide-react";
import { downloadFile } from "@/lib/api";
import { requestsApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useClientRequests } from "@/hooks/use-api-data";
import { REQUEST_TYPE_LABELS, REQUEST_STATUS_LABELS } from "@/lib/types";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
function buildFileUrl(fichier: string): string {
  if (!fichier) return "";
  if (fichier.startsWith("http")) return fichier;
  return `${API_BASE}${fichier.startsWith("/") ? fichier : "/" + fichier}`;
}

export default function HistoryPage() {
  const { user } = useAuthStore();
  const { data: requests, refetch } = useClientRequests(user?.id || "");
  const [search, setSearch] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);

  const handleConfirm = async (documentId: string) => {
    setConfirming(documentId);
    try {
      await requestsApi.confirmLivrable(documentId);
      toast.success("Réception confirmée — l'agent a été notifié");
      refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setConfirming(null);
    }
  };

  const filtered = requests.filter(
    (r) =>
      r.numero.toLowerCase().includes(search.toLowerCase()) ||
      REQUEST_TYPE_LABELS[r.type].toLowerCase().includes(search.toLowerCase())
  );

  const statusIcon = (status: string) => {
    switch (status) {
      case "en_attente": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "en_cours": return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case "traite": return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historique des opérations</h1>
          <p className="text-gray-500 mt-1">Suivez l&apos;évolution de vos requêtes</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher une requête..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((r) => (
          <Card key={r.id} className="border-0 shadow-sm hover:shadow-md transition">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{statusIcon(r.status)}</div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold">{REQUEST_TYPE_LABELS[r.type]}</h3>
                      <Badge className={statusColor(r.status)} variant="secondary">
                        {REQUEST_STATUS_LABELS[r.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {r.numero} • Soumis le {r.createdAt}
                    </p>
                    {r.agentNom && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Agent en charge : {r.agentNom}
                      </p>
                    )}
                    {r.treatedAt && (
                      <p className="text-xs text-green-600 mt-0.5">
                        Traité le {r.treatedAt}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.documents.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <FileText className="h-3.5 w-3.5" />
                      {r.documents.length} doc{r.documents.length > 1 ? "s" : ""}
                    </div>
                  )}
                  {r.livrables.length > 0 && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                      {r.livrables.length} livrable{r.livrables.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Documents & Livrables */}
              {(r.documents.length > 0 || r.livrables.length > 0) && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  {r.documents.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Documents soumis</p>
                      <div className="flex flex-wrap gap-2">
                        {r.documents.map((d) => (
                          <span key={d.id} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {d.nom}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {r.livrables.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-green-600 mb-1">Livrables disponibles</p>
                      <div className="flex flex-col gap-1.5">
                        {r.livrables.map((d) => (
                          <div key={d.id} className="flex items-center justify-between gap-2 bg-green-50 rounded px-2 py-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <FileText className="h-3.5 w-3.5 text-green-600 shrink-0" />
                              <span className="text-xs text-green-700 truncate">{d.nom}</span>
                              {d.confirmedAt && (
                                <span className="text-xs text-green-500 flex items-center gap-0.5 shrink-0">
                                  <CheckCircle className="h-3 w-3" /> Reçu
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => window.open(buildFileUrl(d.fichier), "_blank")} className="text-green-600 hover:text-green-800 p-0.5" title="Voir">
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => downloadFile(buildFileUrl(d.fichier), d.nom)} className="text-green-600 hover:text-green-800 p-0.5" title="Télécharger">
                                <Download className="h-3.5 w-3.5" />
                              </button>
                              {!d.confirmedAt && (
                                <button
                                  onClick={() => handleConfirm(d.id)}
                                  disabled={confirming === d.id}
                                  className="flex items-center gap-0.5 text-xs bg-green-600 text-white px-1.5 py-0.5 rounded hover:bg-green-700 disabled:opacity-50"
                                  title="Confirmer réception"
                                >
                                  <ThumbsUp className="h-3 w-3" />
                                  {confirming === d.id ? "..." : "Confirmer"}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">Aucune requête trouvée</p>
          </div>
        )}
      </div>
    </div>
  );
}

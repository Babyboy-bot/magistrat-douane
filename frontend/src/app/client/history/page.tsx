"use client";

import { FileText, Clock, CheckCircle, AlertCircle, Search, Eye, Download, ThumbsUp, Phone, CheckCheck, XCircle, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadFile } from "@/lib/api";
import { requestsApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useClientRequests } from "@/hooks/use-api-data";
import { REQUEST_TYPE_LABELS, REQUEST_STATUS_LABELS, COTATION_TYPES } from "@/lib/types";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
function buildFileUrl(fichier: string): string {
  if (!fichier) return "";
  if (fichier.startsWith("http")) return fichier;
  return `${API_BASE}${fichier.startsWith("/") ? fichier : "/" + fichier}`;
}

export default function HistoryPage() {
  const { user } = useAuthStore();
  const { data: requests, loading, refetch } = useClientRequests(user?.id || "");
  const searchParams = useSearchParams();
  const targetId = searchParams.get("id");
  const [search, setSearch] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    if (!targetId || loading || requests.length === 0) return;
    setTimeout(() => {
      document.getElementById(`request-${targetId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
  }, [targetId, loading, requests]);
  const [cotationAction, setCotationAction] = useState<{ id: string; action: "valider" | "revision" | "refuser" } | null>(null);
  const [cotationNote, setCotationNote] = useState("");
  const [cotationLoading, setCotationLoading] = useState(false);

  const handleCotationAction = async () => {
    if (!cotationAction) return;
    setCotationLoading(true);
    try {
      if (cotationAction.action === "valider") {
        await requestsApi.validerCotation(cotationAction.id);
        toast.success("Devis validé — l'agent va préparer vos attestations");
      } else if (cotationAction.action === "revision") {
        await requestsApi.revisionCotation(cotationAction.id, cotationNote);
        toast.success("Révision demandée — l'agent va ajuster le devis");
      } else {
        await requestsApi.refuserCotation(cotationAction.id, cotationNote);
        toast.success("Devis refusé");
      }
      refetch();
      setCotationAction(null);
      setCotationNote("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setCotationLoading(false);
    }
  };

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
      case "devis_envoye": return <FileText className="h-4 w-4 text-purple-500" />;
      case "en_revision": return <RefreshCw className="h-4 w-4 text-orange-500" />;
      case "valide": return <CheckCheck className="h-4 w-4 text-emerald-500" />;
      case "refuse": return <XCircle className="h-4 w-4 text-red-500" />;
      case "traite": return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "en_attente": return "bg-yellow-100 text-yellow-800";
      case "en_cours": return "bg-blue-100 text-blue-800";
      case "devis_envoye": return "bg-purple-100 text-purple-800";
      case "en_revision": return "bg-orange-100 text-orange-800";
      case "valide": return "bg-emerald-100 text-emerald-800";
      case "refuse": return "bg-red-100 text-red-800";
      case "traite": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Modal action cotation */}
      {cotationAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">
              {cotationAction.action === "valider" && "Valider le devis"}
              {cotationAction.action === "revision" && "Demander une révision"}
              {cotationAction.action === "refuser" && "Refuser le devis"}
            </h3>
            {cotationAction.action !== "valider" && (
              <div className="space-y-1.5">
                <label className="text-sm text-gray-600">Motif (optionnel)</label>
                <textarea
                  className="w-full border rounded-lg p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                  rows={3}
                  placeholder={cotationAction.action === "revision" ? "Ex : Veuillez revoir la prime TTC..." : "Ex : Prix trop élevé..."}
                  value={cotationNote}
                  onChange={e => setCotationNote(e.target.value)}
                />
              </div>
            )}
            {cotationAction.action === "valider" && (
              <p className="text-sm text-gray-500">Vous confirmez accepter ce devis. L&apos;agent recevra une notification et vous enverra les attestations.</p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setCotationAction(null); setCotationNote(""); }}
                className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50"
                disabled={cotationLoading}
              >Annuler</button>
              <button
                onClick={handleCotationAction}
                disabled={cotationLoading}
                className={`flex-1 rounded-lg py-2 text-sm font-medium text-white ${
                  cotationAction.action === "valider" ? "bg-emerald-600 hover:bg-emerald-700" :
                  cotationAction.action === "revision" ? "bg-orange-500 hover:bg-orange-600" :
                  "bg-red-600 hover:bg-red-700"
                } disabled:opacity-50`}
              >
                {cotationLoading ? "..." :
                  cotationAction.action === "valider" ? "Confirmer" :
                  cotationAction.action === "revision" ? "Demander révision" : "Refuser"}
              </button>
            </div>
          </div>
        </div>
      )}
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
        {loading && (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-4 w-4 rounded-full mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-64" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </>
        )}
        {!loading && filtered.map((r) => (
          <Card key={r.id} id={`request-${r.id}`} className={`border-0 shadow-sm hover:shadow-md transition ${String(r.id) === String(targetId) ? "ring-2 ring-blue-400 bg-blue-50" : ""}`}>
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
                    {r.agentNom && r.status === "en_cours" && (
                      <div className="flex items-center gap-3 mt-1.5 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-blue-800">Agent en charge : {r.agentNom}</p>
                          {r.agentTelephone && (
                            <a
                              href={`tel:${r.agentTelephone}`}
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium mt-0.5"
                            >
                              <Phone className="h-3 w-3" />
                              {r.agentTelephone}
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                    {r.agentNom && r.status === "traite" && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Traité par : {r.agentNom}
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

              {/* Actions cotation — devis reçu */}
              {COTATION_TYPES.includes(r.type) && r.status === "devis_envoye" && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-purple-700 font-medium mb-2">📄 Votre devis est disponible ci-dessous. Quelle est votre décision ?</p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setCotationAction({ id: r.id, action: "valider" })}
                      className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-1.5 rounded-lg transition"
                    >
                      <CheckCheck className="h-3.5 w-3.5" /> Valider
                    </button>
                    <button
                      onClick={() => setCotationAction({ id: r.id, action: "revision" })}
                      className="flex items-center gap-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white font-medium px-3 py-1.5 rounded-lg transition"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Demander révision
                    </button>
                    <button
                      onClick={() => setCotationAction({ id: r.id, action: "refuser" })}
                      className="flex items-center gap-1.5 text-xs bg-red-600 hover:bg-red-700 text-white font-medium px-3 py-1.5 rounded-lg transition"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Refuser
                    </button>
                  </div>
                </div>
              )}

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

"use client";

import { Download, FileText, File, Eye } from "lucide-react";
import { downloadFile } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-store";
import { useClientRequests } from "@/hooks/use-api-data";
import { REQUEST_TYPE_LABELS } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

function buildFileUrl(fichier: string): string {
  if (!fichier) return "";
  if (fichier.startsWith("http")) return fichier;
  return `${API_BASE}${fichier.startsWith("/") ? fichier : "/" + fichier}`;
}

export default function DocumentsPage() {
  const { user } = useAuthStore();
  const { data: requests } = useClientRequests(user?.id || "");
  const requestsWithLivrables = requests.filter((r) => r.livrables.length > 0);

  const handleDownload = (fichier: string, nom: string) => {
    const url = buildFileUrl(fichier);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = nom;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes Documents</h1>
        <p className="text-gray-500 mt-1">
          Téléchargez vos attestations, contrats, avenants et autres documents
        </p>
      </div>

      {requestsWithLivrables.length > 0 ? (
        <div className="space-y-4">
          {requestsWithLivrables.map((r) => (
            <Card key={r.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold">{REQUEST_TYPE_LABELS[r.type]}</h3>
                    <p className="text-xs text-gray-500">
                      {r.numero}{r.treatedAt ? ` • Traité le ${r.treatedAt}` : ""}
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-800" variant="secondary">
                    {r.livrables.length} document{r.livrables.length > 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {r.livrables.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                          {doc.typeFichier.includes("pdf") ? (
                            <FileText className="h-5 w-5 text-red-500" />
                          ) : (
                            <File className="h-5 w-5 text-blue-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{doc.nom}</p>
                          <p className="text-xs text-gray-400">
                            Ajouté le {doc.createdAt}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(buildFileUrl(doc.fichier), "_blank")}
                          disabled={!doc.fichier}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Voir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadFile(buildFileUrl(doc.fichier), doc.nom)}
                          disabled={!doc.fichier}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Télécharger
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <FileText className="h-16 w-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400">Aucun document disponible</h3>
          <p className="text-sm text-gray-300 mt-1">
            Les documents seront disponibles une fois vos requêtes traitées par nos agents
          </p>
        </div>
      )}
    </div>
  );
}

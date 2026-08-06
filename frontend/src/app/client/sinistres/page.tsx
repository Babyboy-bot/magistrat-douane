"use client";

import { AlertTriangle, Clock, Loader2, CheckCircle, AlertCircle, FileText, Download, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { useClientRequests } from "@/hooks/use-api-data";
import { downloadFile } from "@/lib/api";
import { fmtDate } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
function buildUrl(f: string) {
  if (!f) return "";
  if (f.startsWith("http")) return f;
  return `${API_BASE}${f.startsWith("/") ? f : "/" + f}`;
}

const SINISTRE_STATUS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  en_attente: {
    label: "Ouvert — en attente",
    color: "bg-yellow-100 text-yellow-800",
    icon: <Clock className="h-4 w-4 text-yellow-500" />,
  },
  en_cours: {
    label: "En cours d'instruction",
    color: "bg-blue-100 text-blue-800",
    icon: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
  },
  traite: {
    label: "Clôturé",
    color: "bg-green-100 text-green-800",
    icon: <CheckCircle className="h-4 w-4 text-green-500" />,
  },
};

const NATURE_LABELS: Record<string, string> = {
  accident: "Accident de circulation",
  vol: "Vol",
  incendie: "Incendie",
  degats_eaux: "Dégâts des eaux",
  bris_glaces: "Bris de glaces",
  vandalisme: "Vandalisme",
  catastrophe_naturelle: "Catastrophe naturelle",
  autre: "Autre",
};

export default function SinistresPage() {
  const { user } = useAuthStore();
  const { data: requests } = useClientRequests(user?.id || "");

  const sinistres = requests.filter((r) => r.type === "declaration_sinistre");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            Mes sinistres
          </h1>
          <p className="text-gray-500 mt-1">Suivez l&apos;état de vos déclarations de sinistre</p>
        </div>
        <Link href="/client/sinistre">
          <Button className="bg-red-600 hover:bg-red-700 text-white text-sm">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Nouveau sinistre
          </Button>
        </Link>
      </div>

      {/* Légende des statuts */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(SINISTRE_STATUS).map(([, v]) => (
          <span key={v.label} className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${v.color}`}>
            {v.icon} {v.label}
          </span>
        ))}
      </div>

      <div className="space-y-3">
        {sinistres.length === 0 ? (
          <div className="text-center py-16">
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">Aucune déclaration de sinistre</p>
            <Link href="/client/sinistre">
              <Button variant="outline" className="mt-4 text-sm">Déclarer un sinistre</Button>
            </Link>
          </div>
        ) : (
          sinistres.map((s) => {
            const st = SINISTRE_STATUS[s.status] ?? SINISTRE_STATUS.en_attente;
            const details = s.details as Record<string, unknown> | null;
            const nature = details?.nature as string | undefined;
            const lieu = details?.lieu as string | undefined;
            const date = details?.date_sinistre as string | undefined;
            const note = (s as unknown as Record<string, unknown>).sinistre_note as string | undefined;

            return (
              <Card key={s.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{st.icon}</div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{s.numero}</span>
                          <Badge className={st.color} variant="secondary">{st.label}</Badge>
                          {nature && (
                            <Badge variant="outline" className="text-xs">
                              {NATURE_LABELS[nature] ?? nature}
                            </Badge>
                          )}
                        </div>
                        {date && <p className="text-xs text-gray-500">Date du sinistre : {date}</p>}
                        {lieu && <p className="text-xs text-gray-500">Lieu : {lieu}</p>}
                        <p className="text-xs text-gray-400">
                          Déclaré le {fmtDate(s.createdAt)}
                        </p>
                        {s.agentNom && (
                          <p className="text-xs text-blue-600">Agent en charge : {s.agentNom}</p>
                        )}
                        {note && (
                          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-xs font-semibold text-green-800 mb-1">Conclusion de l&apos;agent :</p>
                            <p className="text-xs text-green-700 whitespace-pre-line">{note}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Documents & livrables */}
                  {(s.documents.length > 0 || s.livrables.length > 0) && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      {s.documents.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Pièces jointes</p>
                          <div className="flex flex-wrap gap-2">
                            {s.documents.map((d) => (
                              <span key={d.id} className="text-xs bg-gray-100 px-2 py-1 rounded">{d.nom}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {s.livrables.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-green-600 mb-1">Documents de l&apos;assureur</p>
                          <div className="flex flex-wrap gap-2">
                            {s.livrables.map((d) => (
                              <div key={d.id} className="flex items-center gap-1 bg-green-50 rounded px-2 py-1">
                                <FileText className="h-3 w-3 text-green-600" />
                                <span className="text-xs text-green-700 mr-1">{d.nom}</span>
                                <button onClick={() => window.open(buildUrl(d.fichier), "_blank")} className="text-green-600 hover:text-green-800">
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => downloadFile(buildUrl(d.fichier), d.nom)} className="text-green-600 hover:text-green-800">
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

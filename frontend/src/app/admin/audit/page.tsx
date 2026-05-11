"use client";

import { useMemo, useState, useCallback } from "react";
import { Shield, RefreshCw, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuditLogs } from "@/hooks/use-api-data";
import { auditLogsApi } from "@/lib/api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const PAGE_SIZE = 25;

const ACTION_OPTIONS = [
  { value: "", label: "Toutes les actions" },
  { value: "login", label: "Connexion" },
  { value: "login_failed", label: "Connexion échouée" },
  { value: "logout", label: "Déconnexion" },
  { value: "creation", label: "Création de compte" },
  { value: "activation", label: "Activation" },
  { value: "deactivation", label: "Désactivation" },
  { value: "role_change", label: "Changement de rôle" },
  { value: "password_reset", label: "Mot de passe" },
];

export default function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const { data: paginatedLogs, loading, error, refetch } = useAuditLogs({
    page,
    pageSize: PAGE_SIZE,
    action: actionFilter || undefined,
  });

  const rows = useMemo(() => paginatedLogs.results ?? [], [paginatedLogs]);
  const totalCount = paginatedLogs.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  const handlePrev = useCallback(() => {
    if (canGoPrev) setPage((p) => Math.max(1, p - 1));
  }, [canGoPrev]);

  const handleNext = useCallback(() => {
    if (canGoNext) setPage((p) => p + 1);
  }, [canGoNext]);

  const handleFilterChange = useCallback((value: string) => {
    setActionFilter(value);
    setPage(1);
  }, []);

  const formatState = (value: unknown) => {
    if (typeof value === "boolean") {
      return value ? "Activé" : "Désactivé";
    }
    if (value === null || value === undefined) return "—";
    return String(value);
  };

  const renderMetadata = (action: string, metadata: Record<string, unknown>) => {
    if (metadata && typeof metadata === "object" && "from" in metadata && "to" in metadata) {
      return (
        <span>
          Statut :
          <span className="font-semibold mx-1">{formatState(metadata.from)}</span>
          →
          <span className="font-semibold mx-1">{formatState(metadata.to)}</span>
        </span>
      );
    }

    if (action === "creation" && metadata.role) {
      return (
        <span>
          Rôle attribué : <span className="font-semibold capitalize">{String(metadata.role)}</span>
        </span>
      );
    }

    if (metadata.reason) {
      return (
        <span>
          Motif : <span className="font-semibold">{String(metadata.reason)}</span>
        </span>
      );
    }

    if (Object.keys(metadata || {}).length === 0) {
      return <span className="text-gray-400">–</span>;
    }

    return (
      <pre className="bg-gray-50 rounded px-2 py-1 text-[11px] leading-snug overflow-x-auto">
        {JSON.stringify(metadata, null, 2)}
      </pre>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-red-500" />
            Journal d&apos;audit
          </h1>
          <p className="text-gray-500 mt-1">
            Historique des actions sensibles réalisées par les administrateurs et agents.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={actionFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <Button variant="outline" onClick={refetch} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <a href={auditLogsApi.exportCsvUrl(actionFilter || undefined)} download="audit_logs.csv">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </a>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dernières entrées</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 text-sm text-red-600">{error}</div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Action</th>
                  <th className="py-3 pr-4">Effectuée par</th>
                  <th className="py-3 pr-4">Cible</th>
                  <th className="py-3 pr-4">IP</th>
                  <th className="py-3">Détails</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-400">
                      Aucune entrée d&apos;audit disponible.
                    </td>
                  </tr>
                )}
                {rows.map((log) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 text-gray-600">
                      {format(new Date(log.createdAt), "dd MMM yyyy HH:mm", { locale: fr })}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant="secondary"
                        className={`capitalize ${
                          log.action === "login" ? "bg-green-100 text-green-800" :
                          log.action === "login_failed" ? "bg-red-100 text-red-800" :
                          log.action === "logout" ? "bg-gray-100 text-gray-700" : ""
                        }`}
                      >
                        {log.action.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      {log.performedBy ?? "Système"}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{log.targetUser}</td>
                    <td className="py-3 pr-4 text-gray-500 text-xs font-mono">
                      {log.ipAddress ?? "—"}
                    </td>
                    <td className="py-3 text-gray-600 text-xs">
                      {renderMetadata(log.action, log.metadata)}
                    </td>
                  </tr>
                ))}
                {loading && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-400">
                      Chargement...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <div>
              {totalCount > 0 ? (
                <span>
                  Page {page} / {totalPages} — {rows.length} éléments affichés sur {totalCount}
                </span>
              ) : (
                <span>0 entrée</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrev} disabled={!canGoPrev || loading}>
                Précédent
              </Button>
              <Button variant="outline" size="sm" onClick={handleNext} disabled={!canGoNext || loading}>
                Suivant
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

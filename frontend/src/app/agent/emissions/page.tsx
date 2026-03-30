"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Search, Download, RefreshCw, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmissions, useUsers } from "@/hooks/use-api-data";
import { compagniesApi, emissionsApi } from "@/lib/api";
import { EmissionFormDialog } from "./components/emission-form-dialog";
import { EmissionTable } from "./components/emission-table";
import { PaymentDialog } from "./components/payment-dialog";
import { toast } from "sonner";

const RISQUE_OPTIONS = [
  { label: "Tous", value: "all" },
  { label: "Auto", value: "auto" },
  { label: "Habitation", value: "habitation" },
  { label: "Santé", value: "sante" },
  { label: "Vie", value: "vie" },
  { label: "Pro", value: "pro" },
];

const SITUATION_OPTIONS = [
  { label: "Toutes", value: "all" },
  { label: "En cours", value: "en_cours" },
  { label: "Soldée", value: "soldee" },
  { label: "Annulée", value: "annulee" },
  { label: "Suspendue", value: "suspendue" },
];

const buildQueryString = (filters: { compagnie: string; risque: string; situation: string }) => {
  const params = new URLSearchParams();
  if (filters.compagnie) params.set("compagnie", filters.compagnie);
  if (filters.risque) params.set("risque", filters.risque);
  if (filters.situation) params.set("situation", filters.situation);
  return params.toString();
};

export default function AgentEmissionsPage() {
  const PAGE_SIZE = 20;
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [paymentDialogId, setPaymentDialogId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ compagnie: "", risque: "", situation: "" });
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number; skipped: number; errors: string[]; total_rows: number;
  } | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [compagnieSuggestions, setCompagnieSuggestions] = useState<string[]>([]);
  const [compagnieLoading, setCompagnieLoading] = useState(false);
  const [compagnieError, setCompagnieError] = useState<string | null>(null);
  const searchQuery = search.trim() || undefined;

  const {
    data: paginatedEmissions,
    loading,
    error,
    refetch: refetchEmissions,
  } = useEmissions({
    page,
    pageSize: PAGE_SIZE,
    search: searchQuery,
    compagnie: filters.compagnie || undefined,
    risque: filters.risque || undefined,
    situation: filters.situation || undefined,
  });
  const { data: allUsers } = useUsers();

  const emissions = useMemo(
    () => paginatedEmissions.results ?? [],
    [paginatedEmissions.results]
  );
  const totalCount = paginatedEmissions.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";

  const clients = useMemo(
    () => allUsers.filter((u) => u.role === "client" || u.role === "prospect"),
    [allUsers]
  );

  const selectedEmission = paymentDialogId
    ? emissions.find((emission) => emission.id === paymentDialogId) ?? null
    : null;

  const handleImportClick = () => importFileRef.current?.click();

  const handleDownloadTemplate = () => {
    const header = "num_police;num_facture;client_email;date;risque;compagnie;marque;immatriculation;effet;echeance;prime_nette;prime_ttc;situation";
    const example = "POL-2025-001;FAC-2025-001;client@exemple.com;2025-01-15;Automobile;NSIA;Toyota Corolla;AA-123-AB;2025-01-15;2026-01-14;150000;180000;Affaire nouvelle";
    const blob = new Blob([`${header}\n${example}`], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "modele_import_emissions.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setImportResult(null);
    try {
      const result = await emissionsApi.importPortfolio(file);
      setImportResult(result);
      if (result.created > 0) {
        toast.success(`${result.created} émission(s) importée(s)`);
        refetchEmissions();
      } else {
        toast.info("Aucune nouvelle émission importée");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'import");
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  const handleExport = async () => {
    const queryString = buildQueryString(filters);
    setIsExporting(true);
    try {
      await emissionsApi.export(queryString);
      toast.success("Export Excel généré avec succès");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'export";
      toast.error(`Erreur lors de l'export : ${message}`);
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [filters.compagnie, filters.risque, filters.situation]);

  useEffect(() => {
    const controller = setTimeout(async () => {
      if (!filters.compagnie) {
        setCompagnieSuggestions([]);
        setCompagnieError(null);
        return;
      }
      setCompagnieLoading(true);
      setCompagnieError(null);
      try {
        const results = await compagniesApi.search(filters.compagnie);
        setCompagnieSuggestions(results);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erreur lors de la recherche";
        setCompagnieError(message);
      } finally {
        setCompagnieLoading(false);
      }
    }, 300);

    return () => clearTimeout(controller);
  }, [filters.compagnie]);

  const handleResetFilters = () => {
    setFilters({ compagnie: "", risque: "", situation: "" });
  };

  const handleViewEmission = (id: string) => {
    router.push(`/agent/emissions/${id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" />
            Émissions
          </h1>
          <p className="text-gray-500 mt-1">
            {totalCount} émission
            {totalCount > 1 ? "s" : ""} en portefeuille
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <input
            ref={importFileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            title="Télécharger le modèle CSV"
          >
            <Download className="h-4 w-4 mr-1" />
            Modèle CSV
          </Button>
          <Button
            variant="outline"
            onClick={handleImportClick}
            disabled={isImporting}
          >
            {isImporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            Import
          </Button>
          <Button onClick={() => setShowAddDialog(true)} className="bg-primary text-white">
            Nouvelle émission
          </Button>
          <EmissionFormDialog
            clients={clients}
            open={showAddDialog}
            onOpenChange={setShowAddDialog}
            onCreated={refetchEmissions}
          />
        </div>
      </div>

      {importResult && (
        <div className={`rounded-lg p-4 text-sm border ${importResult.created > 0 ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <span className="text-green-700 font-semibold">{importResult.created} créée(s)</span>
              <span className="text-gray-500">{importResult.skipped} ignorée(s) (déjà existantes)</span>
              {importResult.errors.length > 0 && (
                <span className="text-red-600">{importResult.errors.length} erreur(s)</span>
              )}
            </div>
            <button className="text-gray-400 hover:text-gray-600 text-xs" onClick={() => setImportResult(null)}>✕</button>
          </div>
          {importResult.errors.length > 0 && (
            <ul className="mt-2 space-y-0.5 max-h-32 overflow-y-auto">
              {importResult.errors.map((e, i) => (
                <li key={i} className="text-red-600 text-xs">{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="compagnie">Compagnie</Label>
            <Input
              id="compagnie"
              placeholder="Tapez le nom de la compagnie"
              value={filters.compagnie}
              onChange={(event) => setFilters((prev) => ({ ...prev, compagnie: event.target.value }))}
              autoComplete="off"
            />
            {compagnieLoading && <p className="text-xs text-gray-500 mt-1">Recherche en cours...</p>}
            {compagnieError && <p className="text-xs text-red-500 mt-1">{compagnieError}</p>}
            {!compagnieLoading && compagnieSuggestions.length > 0 && (
              <div className="mt-1 border rounded-md bg-white max-h-32 overflow-auto text-sm">
                {compagnieSuggestions.map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion}
                    className="w-full text-left px-3 py-1 hover:bg-gray-100"
                    onClick={() => {
                      setFilters((prev) => ({ ...prev, compagnie: suggestion }));
                      setCompagnieSuggestions([]);
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-[180px]">
            <Label>Risque</Label>
            <Select
              value={filters.risque || "all"}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, risque: value === "all" ? "" : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tous les risques" />
              </SelectTrigger>
              <SelectContent>
                {RISQUE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <Label>Situation</Label>
            <Select
              value={filters.situation || "all"}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, situation: value === "all" ? "" : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Toutes les situations" />
              </SelectTrigger>
              <SelectContent>
                {SITUATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>{totalCount} résultat{totalCount > 1 ? "s" : ""}</span>
          <Button variant="ghost" size="sm" onClick={handleResetFilters}>
            <RefreshCw className="h-4 w-4 mr-2" /> Réinitialiser
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || emissions.length === 0}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Export...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" /> Exporter Excel
              </>
            )}
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-12">Chargement...</p>
      ) : error ? (
        <p className="text-center text-red-500 py-12">{error}</p>
      ) : emissions.length === 0 ? (
        <div className="text-center py-12">
          <FileSpreadsheet className="h-12 w-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 mb-2">Aucune émission ne correspond à vos filtres.</p>
          <p className="text-sm text-gray-400 mb-6">
            Ajustez la recherche ou créez votre première émission pour alimenter le portefeuille.
          </p>
          <Button onClick={() => setShowAddDialog(true)} className="bg-primary text-white">
            Créer la première émission
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <EmissionTable
            emissions={emissions}
            formatCurrency={formatCurrency}
            onRequestPayment={(id) => setPaymentDialogId(id)}
            onViewEmission={handleViewEmission}
          />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm text-gray-500">
            <span>
              Page {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!canGoPrev}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!canGoNext}
                onClick={() => setPage((current) => current + 1)}
              >
                Suivant
              </Button>
            </div>
          </div>
        </div>
      )}

      <PaymentDialog
        emission={selectedEmission}
        formatCurrency={formatCurrency}
        open={Boolean(paymentDialogId)}
        onClose={() => setPaymentDialogId(null)}
        onSuccess={refetchEmissions}
      />
    </div>
  );
}

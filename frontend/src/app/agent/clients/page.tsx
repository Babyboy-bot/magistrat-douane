"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Users,
  Search,
  Phone,
  Mail,
  Shield,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/brand";
import { toast } from "sonner";

import { usePaginatedUsers, useClientEmissions, useClientRequests, useUsers } from "@/hooks/use-api-data";
import { usersApi } from "@/lib/api";
import { EmissionFormDialog } from "@/app/agent/emissions/components/emission-form-dialog";
import { PROFESSION_LABELS, REQUEST_TYPE_LABELS } from "@/lib/types";

const PAGE_SIZE = 15;
type Segment = "magistrats" | "douaniers" | "autres";


const formatDate = (iso: string) => {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
};

export default function AgentClientsPage() {
  const [page, setPage] = useState(1);
  const [segment, setSegment] = useState<Segment>("magistrats");
  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [showEmission, setShowEmission] = useState(false);
  const { data: allUsers } = useUsers();

  const professionType = segment === "magistrats" ? "magistrat" : segment === "douaniers" ? "douanier" : segment === "autres" ? "autre" : undefined;

  const { data: paginatedUsers, loading, error, refetch } = usePaginatedUsers({
    page,
    pageSize: PAGE_SIZE,
    search: search.trim() || undefined,
    role: "client",
    profession_type: professionType,
  });

  const clients = useMemo(() => paginatedUsers.results ?? [], [paginatedUsers.results]);
  const totalCount = paginatedUsers.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    if (selectedClientId && !clients.some((c) => c.id === selectedClientId)) {
      setSelectedClientId(null);
    }
  }, [clients, selectedClientId]);

  const { data: emissions } = useClientEmissions(selectedClientId ?? undefined);
  const { data: selectedRequests } = useClientRequests(selectedClientId ?? undefined);
  const selectedClient = useMemo(() => clients.find((c) => c.id === selectedClientId) ?? null, [clients, selectedClientId]);
  const selectedEmissions = useMemo(() => emissions ?? [], [emissions]);

  const handleVerify = async (clientId: string) => {
    setVerifyingId(clientId);
    try {
      await usersApi.verify(Number(clientId));
      toast.success("Compte vérifié avec succès");
      await refetch();
      setSelectedClientId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la vérification");
    } finally {
      setVerifyingId(null);
    }
  };


  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Espace agent"
        title="Assurés & Prospects"
        description={`${totalCount} enregistrement${totalCount > 1 ? "s" : ""}`}
        actions={
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
            <Input placeholder="Rechercher..." value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} className="h-10 rounded-xl border-navy-100 bg-white pl-9" />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste */}
        <Card className="lg:col-span-2 rounded-2xl border-navy-100 shadow-[0_1px_2px_rgb(16_28_52/0.04)]">
          <CardHeader>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 font-display text-base font-semibold text-navy-900">
                  <Shield className="h-5 w-5 text-amber-600" />
                  Liste des clients
                </CardTitle>
                <Tabs value={segment} onValueChange={(v) => { setSegment(v as Segment); setPage(1); setSelectedClientId(null); }}>
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="magistrats">Magistrats</TabsTrigger>
                    <TabsTrigger value="douaniers">Douaniers</TabsTrigger>
                    <TabsTrigger value="autres">Autres</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {segment === "autres" ? (
              <div className="flex flex-col items-center gap-2 py-12 text-navy-400">
                <AlertTriangle className="h-10 w-10 text-amber-400" />
                <p className="font-medium text-navy-700">Bientôt disponible</p>
                <p className="max-w-xs text-center text-sm">La gestion des clients grand public arrive prochainement. Seuls les magistrats et douaniers sont actifs pour l&apos;instant.</p>
              </div>
            ) : loading ? (
              <p className="py-12 text-center text-navy-400">Chargement...</p>
            ) : error ? (
              <p className="py-12 text-center text-red-500">{error}</p>
            ) : clients.length === 0 ? (
              <p className="py-12 text-center text-navy-400">Aucun résultat</p>
            ) : (
              <div className="space-y-3">
                {clients.map((client) => (
                  <button key={client.id} onClick={() => setSelectedClientId(client.id)}
                    className={`w-full rounded-xl border p-4 text-left transition ${selectedClientId === client.id ? "border-amber-400 bg-amber-50/40 ring-1 ring-amber-300" : "border-navy-100 hover:border-amber-300 hover:bg-amber-50/30"}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-navy-900">{client.nom} {client.prenoms}</p>
                        <p className="text-sm text-navy-400">{client.profession || PROFESSION_LABELS[client.professionType]}</p>
                      </div>
                      <Badge
                        className={client.verified ? "border-emerald-200 bg-emerald-100 text-emerald-800" : "border-amber-200 bg-amber-100 text-amber-800"}>
                        {client.verified ? "Vérifié" : "En attente"}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-navy-500">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-navy-300" /> {client.telephone}</span>
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-navy-300" /> {client.email}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {segment !== "autres" && (
            <div className="mt-4 flex items-center justify-between text-sm text-navy-500">
              <span>Page {page} / {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
              </div>
            </div>
            )}
          </CardContent>
        </Card>

        {/* Détails */}
        <Card className="rounded-2xl border-navy-100 shadow-[0_1px_2px_rgb(16_28_52/0.04)]">
          <CardHeader>
            <CardTitle className="font-display text-base font-semibold text-navy-900">Détails</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedClient ? (
              <div className="space-y-4">
                <div>
                  <p className="font-display text-lg font-semibold text-navy-900">{selectedClient.nom} {selectedClient.prenoms}</p>
                  <p className="text-sm text-navy-400">{selectedClient.profession}</p>
                </div>

                <div className="space-y-2 rounded-xl bg-navy-50/60 p-3 text-sm ring-1 ring-navy-100">
                  <div className="flex justify-between">
                    <span className="text-navy-400">Catégorie</span>
                    <Badge className="border-navy-200 bg-navy-100 text-navy-700">{PROFESSION_LABELS[selectedClient.professionType]}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-navy-400">Email</span>
                    <span className="text-right text-xs font-medium text-navy-800">
                      {selectedClient.email}
                      {selectedClient.email && (
                        <span className={`block ${selectedClient.emailVerified ? "text-emerald-600" : "text-amber-600"}`}>
                          {selectedClient.emailVerified ? "✓ confirmé" : "non confirmé"}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-navy-400">Téléphone</span>
                    <span className="font-medium text-navy-800">{selectedClient.telephone}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {!selectedClient.verified && (
                    <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={verifyingId === selectedClient.id}
                      onClick={() => handleVerify(selectedClient.id)}
                    >
                      {verifyingId === selectedClient.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                      Vérifier
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="flex-1"
                    disabled title="Disponible prochainement"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Émission <span className="text-[10px] opacity-70">(bientôt)</span>
                  </Button>
                </div>

                {/* Stats primes masquées pour l'instant — réactiver avec le portefeuille émissions
                {selectedStats && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500">Prime totale</p>
                        <p className="text-sm font-semibold text-green-700">{formatCurrency(selectedStats.primeTotale)}</p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500">Prime payée</p>
                        <p className="text-sm font-semibold text-blue-700">{formatCurrency(selectedStats.primePayee)}</p>
                      </div>
                    </div>
                    <div className={`p-2 rounded-lg text-center text-white text-sm font-semibold ${selectedStats.primeAPayer > 0 ? "bg-red-500" : "bg-emerald-500"}`}>
                      Solde {formatCurrency(selectedStats.primeAPayer)}
                    </div>
                  </div>
                )}
                */}

                {selectedEmissions.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-navy-800">Contrats ({selectedEmissions.length})</p>
                    <div className="max-h-40 space-y-2 overflow-y-auto">
                      {selectedEmissions.map((emission) => (
                        <div key={emission.id} className="rounded-lg bg-navy-50/60 p-2 text-sm ring-1 ring-navy-100">
                          <div className="flex justify-between">
                            <span className="font-medium text-navy-900">{emission.risque}</span>
                            <span className="text-xs text-navy-400">{emission.numPolice}</span>
                          </div>
                          <p className="text-xs text-navy-400">{emission.compagnie} • Éch. {formatDate(emission.echeance)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(selectedRequests ?? []).length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-navy-800">Requêtes ({(selectedRequests ?? []).length})</p>
                    <div className="max-h-40 space-y-2 overflow-y-auto">
                      {(selectedRequests ?? []).map((req) => (
                        <div key={req.id} className="flex items-center justify-between rounded-lg bg-navy-50/60 p-2 text-sm ring-1 ring-navy-100">
                          <div>
                            <p className="font-medium text-navy-900">{REQUEST_TYPE_LABELS[req.type]}</p>
                            <p className="text-xs text-navy-400">N° {req.numero}</p>
                          </div>
                          <Badge className="border-navy-200 bg-navy-100 text-navy-700">{req.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-navy-400">
                <Users className="mx-auto mb-3 h-8 w-8 text-navy-200" />
                Sélectionnez un client pour afficher les détails.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <EmissionFormDialog
        clients={allUsers}
        open={showEmission}
        onOpenChange={setShowEmission}
        onCreated={() => setShowEmission(false)}
        preselectedClientId={selectedClient?.id}
      />
    </div>
  );
}

"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Users,
  Search,
  Plus,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import { usePaginatedUsers, useClientEmissions, useClientRequests, useUsers } from "@/hooks/use-api-data";
import { usersApi } from "@/lib/api";
import { EmissionFormDialog } from "@/app/agent/emissions/components/emission-form-dialog";
import { PROFESSION_LABELS, REQUEST_TYPE_LABELS, Emission } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";

const PAGE_SIZE = 15;
type Segment = "magistrats" | "douaniers" | "autres" | "prospects";


const initialFormState = { nom: "", prenoms: "", email: "", telephone: "", telephone2: "" };

const formatCurrency = (value: number) => `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;

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
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [form, setForm] = useState(initialFormState);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [showEmission, setShowEmission] = useState(false);
  const user = useAuthStore((state) => state.user);
  const { data: allUsers } = useUsers();
  const canCreate = user?.role === "admin";

  const professionType = segment === "magistrats" ? "magistrat" : segment === "douaniers" ? "douanier" : segment === "autres" ? "autre" : undefined;

  const { data: paginatedUsers, loading, error, refetch } = usePaginatedUsers({
    page,
    pageSize: PAGE_SIZE,
    search: search.trim() || undefined,
    role: segment === "prospects" ? "prospect" : "client",
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

  const selectedStats = useMemo(() => {
    if (!selectedClient) return null;
    const primeTotale = selectedEmissions.reduce((s: number, e: Emission) => s + e.primeTTC, 0);
    const primePayee = selectedEmissions.reduce((s: number, e: Emission) =>
      s + e.paiements.reduce((ps, p) => ps + p.montantRegle, 0), 0);
    return { primeTotale, primePayee, primeAPayer: primeTotale - primePayee };
  }, [selectedClient, selectedEmissions]);

  const handleCreateClient = async () => {
    if (!form.nom || !form.prenoms || !form.email || !form.telephone) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }
    try {
      const { temporaryPassword } = await usersApi.createClient({ nom: form.nom, prenoms: form.prenoms, email: form.email, telephone: form.telephone, telephone2: form.telephone2 });
      toast.success("Client créé avec succès", {
        description: `Mot de passe temporaire (à transmettre au client, affiché une seule fois) : ${temporaryPassword}`,
        duration: Infinity,
        closeButton: true,
      });
      setForm(initialFormState);
      setShowAddDialog(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création");
    }
  };

  const handleVerify = async (clientId: string) => {
    setVerifyingId(clientId);
    try {
      await usersApi.verify(Number(clientId));
      toast.success("Compte vérifié avec succès");
      refetch();
      setSelectedClientId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la vérification");
    } finally {
      setVerifyingId(null);
    }
  };


  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6" />
            Assurés & Prospects
          </h1>
          <p className="text-gray-500 mt-1">{totalCount} enregistrements</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Rechercher..." value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} className="pl-9" />
          </div>
          {canCreate && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[hsl(222,47%,20%)] hover:bg-[hsl(222,47%,25%)]">
                  <Plus className="h-4 w-4 mr-2" /> Ajouter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Ajouter un client</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Nom *</Label><Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></div>
                    <div><Label>Prénoms *</Label><Input value={form.prenoms} onChange={(e) => setForm({ ...form, prenoms: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Téléphone *</Label><Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></div>
                    <div><Label>Téléphone 2</Label><Input value={form.telephone2} onChange={(e) => setForm({ ...form, telephone2: e.target.value })} /></div>
                  </div>
                  <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <Button onClick={handleCreateClient} className="w-full">Enregistrer</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  Liste des clients
                </CardTitle>
                <Tabs value={segment} onValueChange={(v) => { setSegment(v as Segment); setPage(1); setSelectedClientId(null); }}>
                  <TabsList className="grid grid-cols-4">
                    <TabsTrigger value="magistrats">Magistrats</TabsTrigger>
                    <TabsTrigger value="douaniers">Douaniers</TabsTrigger>
                    <TabsTrigger value="autres">Autres</TabsTrigger>
                    <TabsTrigger value="prospects">Prospects</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-gray-400 py-12">Chargement...</p>
            ) : error ? (
              <p className="text-center text-red-500 py-12">{error}</p>
            ) : clients.length === 0 ? (
              <p className="text-center text-gray-400 py-12">Aucun résultat</p>
            ) : (
              <div className="space-y-3">
                {clients.map((client) => (
                  <button key={client.id} onClick={() => setSelectedClientId(client.id)}
                    className={`w-full text-left border rounded-lg p-4 transition hover:border-blue-400 ${selectedClientId === client.id ? "border-blue-500 bg-blue-50/30" : "border-gray-200"}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{client.nom} {client.prenoms}</p>
                        <p className="text-sm text-gray-500">{client.profession || PROFESSION_LABELS[client.professionType]}</p>
                      </div>
                      <Badge variant={client.verified ? "default" : "secondary"}>
                        {client.verified ? "Vérifié" : "Prospect"}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {client.telephone}</span>
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {client.email}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
              <span>Page {page} / {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Détails */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Détails</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedClient ? (
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-lg">{selectedClient.nom} {selectedClient.prenoms}</p>
                  <p className="text-sm text-gray-500">{selectedClient.profession}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Catégorie</span>
                    <Badge variant="secondary">{PROFESSION_LABELS[selectedClient.professionType]}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email</span>
                    <span className="font-medium text-xs">{selectedClient.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Téléphone</span>
                    <span className="font-medium">{selectedClient.telephone}</span>
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
                    onClick={() => setShowEmission(true)}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Émission
                  </Button>
                </div>

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

                {selectedEmissions.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Contrats ({selectedEmissions.length})</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedEmissions.map((emission) => (
                        <div key={emission.id} className="text-sm p-2 bg-gray-50 rounded">
                          <div className="flex justify-between">
                            <span className="font-medium">{emission.risque}</span>
                            <span className="text-xs text-gray-400">{emission.numPolice}</span>
                          </div>
                          <p className="text-xs text-gray-500">{emission.compagnie} • Éch. {formatDate(emission.echeance)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(selectedRequests ?? []).length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Requêtes ({(selectedRequests ?? []).length})</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {(selectedRequests ?? []).map((req) => (
                        <div key={req.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium">{REQUEST_TYPE_LABELS[req.type]}</p>
                            <p className="text-xs text-gray-400">N° {req.numero}</p>
                          </div>
                          <Badge variant="secondary">{req.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-10">
                <AlertTriangle className="h-6 w-6 mx-auto mb-3" />
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

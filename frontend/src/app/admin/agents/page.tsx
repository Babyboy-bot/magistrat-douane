"use client";

import { useState } from "react";
import {
  Users,
  Plus,
  Search,
  Power,
  Edit,
  Shield,
  Mail,
  Phone,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { usePaginatedUsers, useRequests } from "@/hooks/use-api-data";
import type { User } from "@/lib/types";
import { agentsApi } from "@/lib/api";
import { toast } from "sonner";

interface AgentForm {
  nom: string;
  prenoms: string;
  email: string;
  telephone: string;
  password: string;
  role: string;
  droits: {
    gererClients: boolean;
    gererEmissions: boolean;
    gererRequetes: boolean;
    exportDonnees: boolean;
  };
}

type AgentCreatePayload = Parameters<typeof agentsApi.create>[0];
type AgentUpdatePayload = Parameters<typeof agentsApi.update>[1];

const emptyForm: AgentForm = {
  nom: "",
  prenoms: "",
  email: "",
  telephone: "",
  password: "",
  role: "agent",
  droits: {
    gererClients: true,
    gererEmissions: true,
    gererRequetes: true,
    exportDonnees: false,
  },
};

export default function AdminAgentsPage() {
  const PAGE_SIZE = 12;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data: paginatedAgents, loading, error, refetch: refetchUsers } = usePaginatedUsers({
    role: "agent",
    search: search.trim() || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const { data: allRequests } = useRequests();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<User | null>(null);
  const [form, setForm] = useState<AgentForm>({ ...emptyForm });

  const agents = paginatedAgents.results ?? [];
  const totalCount = paginatedAgents.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  const handlePrev = () => {
    if (canGoPrev) setPage((p) => Math.max(1, p - 1));
  };

  const handleNext = () => {
    if (canGoNext) setPage((p) => p + 1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleCreate = async () => {
    if (!form.nom || !form.prenoms || !form.email || !form.password) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    try {
      // Créer l'objet de données sans le téléphone si vide
      const createData: AgentCreatePayload = {
        nom: form.nom,
        prenoms: form.prenoms,
        email: form.email,
        password: form.password,
      };
      
      // Ajouter le téléphone seulement s'il n'est pas vide
      if (form.telephone && form.telephone.trim() !== "") {
        createData.telephone = form.telephone;
      }
      
      await agentsApi.create(createData);
      toast.success(`Agent ${form.nom} ${form.prenoms} créé avec succès.`);
      setShowAddDialog(false);
      setForm({ ...emptyForm });
      refetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création");
    }
  };

  const handleEdit = (agent: User) => {
    setSelectedAgent(agent);
    setForm({
      nom: agent.nom,
      prenoms: agent.prenoms,
      email: agent.email,
      telephone: agent.telephone,
      password: "", // Empty for edit (user can change if needed)
      role: agent.role,
      droits: {
        gererClients: true,
        gererEmissions: true,
        gererRequetes: true,
        exportDonnees: false,
      },
    });
    setShowEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!selectedAgent || !form.nom || !form.prenoms || !form.email) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    
    // Skip password validation for inactive agents
    if (selectedAgent.is_active && form.password && form.password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    
    try {
      const updateData: AgentUpdatePayload = {
        nom: form.nom,
        prenoms: form.prenoms,
        email: form.email,
        telephone: form.telephone,
      };
      
      // Only include password if it's provided AND agent is active
      if (selectedAgent.is_active && form.password) {
        updateData.password = form.password;
      }
      
      await agentsApi.update(Number(selectedAgent.id), updateData);
      toast.success(`Agent ${form.nom} ${form.prenoms} mis à jour avec succès.`);
      setShowEditDialog(false);
      setSelectedAgent(null);
      setForm({ ...emptyForm });
      refetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    }
  };

  const handleToggle = async (agent: User) => {
    try {
      const newStatus = !agent.is_active;
      await agentsApi.update(Number(agent.id), {
        nom: agent.nom,
        prenoms: agent.prenoms,
        email: agent.email,
        telephone: agent.telephone,
        is_active: newStatus,
      });
      
      const action = newStatus ? "activé" : "désactivé";
      toast.success(`Agent ${agent.nom} ${agent.prenoms} ${action}`);
      refetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la modification");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6" />
            Gestion des Agents
          </h1>
          <p className="text-gray-500 mt-1">
            Créez, modifiez et gérez les accès des agents ACS
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher un agent..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-[hsl(222,47%,20%)] hover:bg-[hsl(222,47%,25%)]">
                <Plus className="h-4 w-4 mr-1" /> Nouvel agent
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Créer un agent</DialogTitle>
                <DialogDescription>
                  Remplissez les informations pour créer un nouvel agent.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Nom *</Label>
                    <Input
                      value={form.nom}
                      onChange={(e) => setForm({ ...form, nom: e.target.value })}
                      placeholder="Nom"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Prénoms *</Label>
                    <Input
                      value={form.prenoms}
                      onChange={(e) => setForm({ ...form, prenoms: e.target.value })}
                      placeholder="Prénoms"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="agent@acs.ci"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Téléphone</Label>
                  <Input
                    value={form.telephone}
                    onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                    placeholder="+225 XX XX XX XX XX"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Mot de passe *</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Minimum 8 caractères"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Rôle</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) => setForm({ ...form, role: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="admin">Administrateur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Droits d&apos;accès</Label>
                  <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={form.droits.gererClients}
                        onCheckedChange={(c) =>
                          setForm({
                            ...form,
                            droits: { ...form.droits, gererClients: !!c },
                          })
                        }
                      />
                      <span className="text-sm">Gérer les clients</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={form.droits.gererEmissions}
                        onCheckedChange={(c) =>
                          setForm({
                            ...form,
                            droits: { ...form.droits, gererEmissions: !!c },
                          })
                        }
                      />
                      <span className="text-sm">Gérer les émissions</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={form.droits.gererRequetes}
                        onCheckedChange={(c) =>
                          setForm({
                            ...form,
                            droits: { ...form.droits, gererRequetes: !!c },
                          })
                        }
                      />
                      <span className="text-sm">Gérer les requêtes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={form.droits.exportDonnees}
                        onCheckedChange={(c) =>
                          setForm({
                            ...form,
                            droits: { ...form.droits, exportDonnees: !!c },
                          })
                        }
                      />
                      <span className="text-sm">Exporter les données</span>
                    </label>
                  </div>
                </div>

                <Button
                  className="w-full bg-[hsl(222,47%,20%)] hover:bg-[hsl(222,47%,25%)]"
                  onClick={handleCreate}
                >
                  Créer l&apos;agent
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Modifier un agent</DialogTitle>
                <DialogDescription>
                  Modifiez les informations de l&apos;agent sélectionné.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Nom *</Label>
                    <Input
                      value={form.nom}
                      onChange={(e) => setForm({ ...form, nom: e.target.value })}
                      placeholder="Nom"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Prénoms *</Label>
                    <Input
                      value={form.prenoms}
                      onChange={(e) => setForm({ ...form, prenoms: e.target.value })}
                      placeholder="Prénoms"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="agent@acs.ci"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Téléphone</Label>
                  <Input
                    value={form.telephone}
                    onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                    placeholder="+225 XX XX XX XX XX"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Nouveau mot de passe (optionnel)</Label>
                  {selectedAgent && !selectedAgent.is_active && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
                      <p className="text-sm text-amber-800">
                        ⚠️ Cet agent est inactif. Réactivez-le d&apos;abord pour pouvoir modifier son mot de passe.
                      </p>
                    </div>
                  )}
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Laisser vide pour ne pas modifier"
                    disabled={!!selectedAgent && !selectedAgent.is_active}
                    className={!!selectedAgent && !selectedAgent.is_active ? "opacity-50 cursor-not-allowed" : ""}
                  />
                </div>

                <Button
                  className="w-full bg-[hsl(222,47%,20%)] hover:bg-[hsl(222,47%,25%)]"
                  onClick={handleUpdate}
                >
                  Mettre à jour l&apos;agent
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
          {error}
        </div>
      )}

      {/* Agents list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((a) => {
          const agentRequests = allRequests.filter((r) => r.agentId === a.id);
          const treated = agentRequests.filter((r) => r.status === "traite").length;
          const pending = agentRequests.filter((r) => r.status !== "traite").length;

          return (
            <Card key={a.id} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-[hsl(222,47%,20%)] flex items-center justify-center text-white font-bold text-sm">
                      {a.nom[0]}
                      {a.prenoms[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {a.nom} {a.prenoms}
                      </h3>
                      <div className="flex gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        Agent
                      </Badge>
                      <Badge 
                        variant={a.is_active ? "default" : "destructive"} 
                        className="text-xs"
                      >
                        {a.is_active ? "✅ Actif" : "⚠️ Inactif"}
                      </Badge>
                    </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleEdit(a)}
                    >
                      <Edit className="h-4 w-4 text-gray-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${a.is_active ? "text-green-600 hover:text-green-700" : "text-red-600 hover:text-red-700"}`}
                      onClick={() => handleToggle(a)}
                      title={a.is_active ? "Désactiver l'agent" : "Activer l'agent"}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Mail className="h-3.5 w-3.5" />
                    {a.email}
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Phone className="h-3.5 w-3.5" />
                    {a.telephone}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t flex justify-between text-sm">
                  <div>
                    <span className="text-gray-400">Requêtes traitées</span>
                    <p className="font-semibold text-green-600">{treated}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">En cours</span>
                    <p className="font-semibold text-amber-600">{pending}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Membre depuis</span>
                    <p className="font-semibold">
                      {a.createdAt ? new Date(a.createdAt).toLocaleDateString('fr-FR') : '—'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {agents.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">Aucun agent trouvé</p>
        </div>
      )}

      {loading && (
        <div className="text-center text-gray-400 py-4">Chargement...</div>
      )}

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-600">
        <div>
          {totalCount > 0 ? (
            <span>
              Page {page} / {totalPages} — {agents.length} agents affichés sur {totalCount}
            </span>
          ) : (
            <span>0 agent</span>
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
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import {
  ClipboardList,
  Search,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Eye,
  FileText,
  UserCheck,
  Unlock,
  Lock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRequests } from "@/hooks/use-api-data";
import { requestsApi, emissionsApi, downloadFile } from "@/lib/api";
import { REQUEST_TYPE_LABELS, REQUEST_STATUS_LABELS, RISQUES, COMPAGNIES } from "@/lib/types";
import type { ClientRequest } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import { PlusCircle } from "lucide-react";

const EMISSION_RISQUE: Partial<Record<string, string>> = {
  souscription_auto: "Automobile",
  cotation_auto: "Automobile",
  incorporation: "Automobile",
  souscription_mrh: "Multirisque Habitation",
  cotation_mrh: "Multirisque Habitation",
};

const EMISSION_TYPES = ["souscription_auto", "souscription_mrh", "incorporation", "cotation_auto"];

const today = new Date().toISOString().split("T")[0];

export default function AgentRequestsPage() {
  const { user } = useAuthStore();
  const { data: allRequests, refetch: refetchRequests } = useRequests();
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<ClientRequest | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showEmission, setShowEmission] = useState(false);
  const [emissionLoading, setEmissionLoading] = useState(false);
  const [emissionForm, setEmissionForm] = useState({
    date: today, risque: "", compagnie: "", numFacture: "", numPolice: "",
    marque: "", immatriculation: "", effet: today, echeance: "",
    primeNette: "", primeTtc: "", situation: "Affaire nouvelle",
  });

  const [claimLoading, setClaimLoading] = useState<string | null>(null);

  const filtered = allRequests.filter(
    (r) =>
      r.numero.toLowerCase().includes(search.toLowerCase()) ||
      r.clientNom.toLowerCase().includes(search.toLowerCase()) ||
      REQUEST_TYPE_LABELS[r.type].toLowerCase().includes(search.toLowerCase())
  );

  const disponibles = filtered.filter((r) => r.status === "en_attente");
  const mesRequetes = filtered.filter((r) => r.status === "en_cours" && r.agentId === String(user?.id));
  const enCoursTous = filtered.filter((r) => r.status === "en_cours");
  const traites = filtered.filter((r) => r.status === "traite");

  const handleClaim = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setClaimLoading(id);
    try {
      await requestsApi.claim(id);
      toast.success("Requête prise en charge — visible dans \"Mes requêtes\".");
      refetchRequests();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Cette requête a déjà été prise en charge.");
      refetchRequests();
    } finally {
      setClaimLoading(null);
    }
  };

  const handleRelease = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setClaimLoading(id);
    try {
      await requestsApi.release(id);
      toast.success("Requête libérée — de nouveau disponible pour les autres agents.");
      refetchRequests();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la libération.");
    } finally {
      setClaimLoading(null);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "en_attente":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "en_cours":
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case "traite":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "en_attente":
        return "bg-yellow-100 text-yellow-800";
      case "en_cours":
        return "bg-blue-100 text-blue-800";
      case "traite":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const openDetail = (r: ClientRequest) => {
    setSelectedRequest(r);
    setShowDetail(true);
  };

  const openEmissionForm = (r: ClientRequest) => {
    const details = (r.details || {}) as Record<string, unknown>;

    // Chercher récursivement marque et immatriculation dans toute la structure
    const findField = (obj: Record<string, unknown>, key: string): string => {
      if (typeof obj[key] === "string" && obj[key]) return obj[key] as string;
      for (const v of Object.values(obj)) {
        if (v && typeof v === "object" && !Array.isArray(v)) {
          const found = findField(v as Record<string, unknown>, key);
          if (found) return found;
        }
      }
      return "";
    };

    const marque = findField(details, "marque");
    const immatriculation = findField(details, "immatriculation");

    setEmissionForm({
      date: today,
      risque: EMISSION_RISQUE[r.type] || "",
      compagnie: "",
      numFacture: "",
      numPolice: "",
      marque,
      immatriculation,
      effet: today,
      echeance: "",
      primeNette: "",
      primeTtc: "",
      situation: "Affaire nouvelle",
    });
    setShowEmission(true);
  };

  const handleCreateEmission = async () => {
    if (!selectedRequest || !emissionForm.compagnie || !emissionForm.numFacture || !emissionForm.numPolice || !emissionForm.echeance || !emissionForm.primeTtc) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setEmissionLoading(true);
    try {
      await emissionsApi.create({
        clientId: selectedRequest.clientId,
        agentId: user?.id,
        date: emissionForm.date,
        risque: emissionForm.risque,
        compagnie: emissionForm.compagnie,
        numFacture: emissionForm.numFacture,
        numPolice: emissionForm.numPolice,
        marque: emissionForm.marque || "-",
        immatriculation: emissionForm.immatriculation || "-",
        effet: emissionForm.effet,
        echeance: emissionForm.echeance,
        primeNette: emissionForm.primeNette || emissionForm.primeTtc,
        primeTtc: emissionForm.primeTtc,
        situation: emissionForm.situation,
      });
      toast.success("Émission créée avec succès — visible dans le portefeuille client");
      setShowEmission(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création de l'émission");
    } finally {
      setEmissionLoading(false);
    }
  };

  const handleMarkAsTreated = async () => {
    if (!selectedRequest) return;
    try {
      await requestsApi.treat(Number(selectedRequest.id));
      toast.success("Requête marquée comme traitée.");
      setShowDetail(false);
      refetchRequests();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du traitement");
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadLivrable = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRequest) return;
    try {
      await requestsApi.uploadLivrable(selectedRequest.id, file, file.name);
      toast.success(`Livrable "${file.name}" téléversé avec succès`);
      refetchRequests();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du téléversement");
    }
    e.target.value = "";
  };

  const RequestCard = ({ request, showClaim = false, showRelease = false }: {
    request: ClientRequest;
    showClaim?: boolean;
    showRelease?: boolean;
  }) => {
    const isClaimedByOther = request.status === "en_cours" && request.agentId && request.agentId !== String(user?.id);
    return (
      <Card
        className={`border-0 shadow-sm hover:shadow-md transition cursor-pointer ${
          isClaimedByOther ? "opacity-70" : ""
        }`}
        onClick={() => openDetail(request)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {statusIcon(request.status)}
              <div className="min-w-0">
                <h3 className="text-sm font-semibold truncate">
                  {REQUEST_TYPE_LABELS[request.type]}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {request.numero} • {request.clientNom}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Soumis le {request.createdAt}
                </p>
                {request.agentNom && (
                  <p className="text-xs mt-1 flex items-center gap-1">
                    {isClaimedByOther
                      ? <><Lock className="h-3 w-3 text-orange-400" /><span className="text-orange-600 font-medium">Pris par {request.agentNom}</span></>
                      : <><UserCheck className="h-3 w-3 text-blue-400" /><span className="text-blue-600 font-medium">Vous</span></>
                    }
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {request.documents.length > 0 && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {request.documents.length}
                </span>
              )}
              <Badge className={statusColor(request.status)} variant="secondary">
                {REQUEST_STATUS_LABELS[request.status]}
              </Badge>
              {showClaim && !isClaimedByOther && (
                <Button
                  size="sm"
                  className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                  disabled={claimLoading === request.id}
                  onClick={(e) => handleClaim(e, request.id)}
                >
                  <UserCheck className="h-3 w-3 mr-1" />
                  {claimLoading === request.id ? "..." : "Prendre en charge"}
                </Button>
              )}
              {showRelease && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                  disabled={claimLoading === request.id}
                  onClick={(e) => handleRelease(e, request.id)}
                >
                  <Unlock className="h-3 w-3 mr-1" />
                  Libérer
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            Gestion des Requêtes
          </h1>
          <p className="text-gray-500 mt-1">
            {allRequests.length} requête{allRequests.length > 1 ? "s" : ""} au
            total
          </p>
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

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{disponibles.length}</p>
            <p className="text-xs text-gray-500">Disponibles</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{mesRequetes.length}</p>
            <p className="text-xs text-gray-500">Mes requêtes</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-orange-500">{enCoursTous.length - mesRequetes.length}</p>
            <p className="text-xs text-gray-500">Prises par autres</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-green-600">{traites.length}</p>
            <p className="text-xs text-gray-500">Traités</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs by status */}
      <Tabs defaultValue="disponibles">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="disponibles" className="text-xs">
            Disponibles ({disponibles.length})
          </TabsTrigger>
          <TabsTrigger value="mes" className="text-xs">
            Mes requêtes ({mesRequetes.length})
          </TabsTrigger>
          <TabsTrigger value="en_cours" className="text-xs">
            En cours ({enCoursTous.length})
          </TabsTrigger>
          <TabsTrigger value="traite" className="text-xs">Traités ({traites.length})</TabsTrigger>
        </TabsList>

        {/* Disponibles — toutes les en_attente avec bouton Prendre en charge */}
        <TabsContent value="disponibles" className="space-y-2 mt-4">
          {disponibles.length > 0 ? (
            <>
              <p className="text-xs text-gray-500 mb-2">Cliquez sur "Prendre en charge" pour vous assigner la requête. Elle disparaîtra de la liste des autres agents.</p>
              {disponibles.map((r) => <RequestCard key={r.id} request={r} showClaim />)}
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Aucune requête disponible</p>
          )}
        </TabsContent>

        {/* Mes requêtes — en_cours assignées à moi */}
        <TabsContent value="mes" className="space-y-2 mt-4">
          {mesRequetes.length > 0 ? (
            mesRequetes.map((r) => <RequestCard key={r.id} request={r} showRelease />)
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Vous n&apos;avez aucune requête en cours</p>
          )}
        </TabsContent>

        {/* En cours — toutes (visibilité globale) */}
        <TabsContent value="en_cours" className="space-y-2 mt-4">
          {enCoursTous.length > 0 ? (
            <>
              <p className="text-xs text-gray-500 mb-2">Requêtes déjà prises en charge par un agent.</p>
              {enCoursTous.map((r) => <RequestCard key={r.id} request={r} showRelease={r.agentId === String(user?.id)} />)}
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Aucune requête en cours</p>
          )}
        </TabsContent>

        <TabsContent value="traite" className="space-y-2 mt-4">
          {traites.length > 0 ? (
            traites.map((r) => <RequestCard key={r.id} request={r} />)
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Aucune requête traitée</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {statusIcon(selectedRequest.status)}
                  {REQUEST_TYPE_LABELS[selectedRequest.type]}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-400">N° Requête</span>
                    <p className="font-semibold">{selectedRequest.numero}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Statut</span>
                    <div className="mt-0.5">
                      <Badge
                        className={statusColor(selectedRequest.status)}
                        variant="secondary"
                      >
                        {REQUEST_STATUS_LABELS[selectedRequest.status]}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Client</span>
                    <p className="font-semibold">{selectedRequest.clientNom}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Date de soumission</span>
                    <p className="font-semibold">{selectedRequest.createdAt}</p>
                  </div>
                </div>

                {/* Documents joints */}
                {selectedRequest.documents.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Documents joints par le client
                    </p>
                    <div className="space-y-1">
                      {selectedRequest.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="text-xs">{doc.nom}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => window.open(doc.fichier, "_blank")} title="Voir">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => downloadFile(doc.fichier, doc.nom)} title="Télécharger">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Livrables */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Livrables (documents à remettre au client)
                  </p>
                  {selectedRequest.livrables.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {selectedRequest.livrables.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-2 bg-green-50 rounded-lg text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-green-500" />
                            <span className="text-xs text-green-700">{doc.nom}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => window.open(doc.fichier, "_blank")} title="Voir">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => downloadFile(doc.fichier, doc.nom)} title="Télécharger">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileSelected}
                  />
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-[hsl(222,47%,20%)] hover:bg-blue-50/50 transition cursor-pointer"
                    onClick={handleUploadLivrable}
                  >
                    <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                    <p className="text-xs font-medium text-gray-600">
                      Cliquez pour téléverser un document
                    </p>
                    <p className="text-xs text-gray-400">
                      Facture, reçu, contrat, attestation, etc.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedRequest.status !== "traite" && (
                    <Button
                      onClick={handleMarkAsTreated}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Marquer comme traité
                    </Button>
                  )}
                  {EMISSION_TYPES.includes(selectedRequest.type) && (
                    <Button
                      onClick={() => openEmissionForm(selectedRequest)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Créer l'émission
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowDetail(false)}
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog création d'émission */}
      <Dialog open={showEmission} onOpenChange={setShowEmission}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer une émission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Date de saisie *</Label>
              <Input type="date" value={emissionForm.date} onChange={e => setEmissionForm(f => ({...f, date: e.target.value}))} />
            </div>
            <div className="space-y-1.5">
              <Label>Situation *</Label>
              <Select value={emissionForm.situation} onValueChange={v => setEmissionForm(f => ({...f, situation: v}))}>
                <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Affaire nouvelle">Affaire nouvelle</SelectItem>
                  <SelectItem value="Incorporation">Incorporation</SelectItem>
                  <SelectItem value="Retrait">Retrait</SelectItem>
                  <SelectItem value="Renouvellement">Renouvellement</SelectItem>
                  <SelectItem value="Modification">Modification</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Risque *</Label>
              <Select value={emissionForm.risque} onValueChange={v => setEmissionForm(f => ({...f, risque: v}))}>
                <SelectTrigger><SelectValue placeholder="Sélectionnez un risque..." /></SelectTrigger>
                <SelectContent>
                  {RISQUES.map(r => (
                    <SelectItem key={r.nom} value={r.nom}>{r.nom} ({r.tauxCommission}%)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Compagnie *</Label>
              <Select value={emissionForm.compagnie} onValueChange={v => setEmissionForm(f => ({...f, compagnie: v}))}>
                <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                <SelectContent>
                  {COMPAGNIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>N° Facture *</Label>
                <Input placeholder="FA-2026-XXXX" value={emissionForm.numFacture} onChange={e => setEmissionForm(f => ({...f, numFacture: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label>N° Police *</Label>
                <Input placeholder="POL-XXXX-XXXXX" value={emissionForm.numPolice} onChange={e => setEmissionForm(f => ({...f, numPolice: e.target.value}))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date d&apos;effet *</Label>
                <Input type="date" value={emissionForm.effet} onChange={e => setEmissionForm(f => ({...f, effet: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label>Date d&apos;échéance *</Label>
                <Input type="date" value={emissionForm.echeance} onChange={e => setEmissionForm(f => ({...f, echeance: e.target.value}))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prime nette (FCFA) *</Label>
                <Input type="number" placeholder="0" value={emissionForm.primeNette} onChange={e => setEmissionForm(f => ({...f, primeNette: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label>Prime TTC (FCFA) *</Label>
                <Input type="number" placeholder="0" value={emissionForm.primeTtc} onChange={e => setEmissionForm(f => ({...f, primeTtc: e.target.value}))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Marque</Label>
                <Input placeholder="Marque du véhicule" value={emissionForm.marque} onChange={e => setEmissionForm(f => ({...f, marque: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label>Immatriculation</Label>
                <Input placeholder="XXXX XX XX" value={emissionForm.immatriculation} onChange={e => setEmissionForm(f => ({...f, immatriculation: e.target.value}))} />
              </div>
            </div>
            <Button className="w-full bg-[hsl(222,47%,20%)] hover:bg-[hsl(222,47%,25%)]" disabled={emissionLoading} onClick={handleCreateEmission}>
              {emissionLoading ? "Enregistrement..." : "Enregistrer l'émission"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

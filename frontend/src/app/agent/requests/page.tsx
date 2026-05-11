"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardList,
  Search,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  AlertTriangle,
  Download,
  Eye,
  FileText,
  UserCheck,
  Unlock,
  Lock,
  Shield,
  CheckCheck,
  XCircle,
  RefreshCw,
  Send,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRequests } from "@/hooks/use-api-data";
import { requestsApi, emissionsApi, downloadFile } from "@/lib/api";
import { REQUEST_TYPE_LABELS, REQUEST_STATUS_LABELS, RISQUES, COMPAGNIES, COTATION_TYPES } from "@/lib/types";
import type { ClientRequest } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import { PlusCircle, Car } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtDate } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
function buildFileUrl(fichier: string): string {
  if (!fichier) return "";
  if (fichier.startsWith("http")) return fichier;
  return `${API_BASE}${fichier.startsWith("/") ? fichier : "/" + fichier}`;
}

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = searchParams.get("id");
  const { user } = useAuthStore();
  const { data: allRequests, loading: requestsLoading, refetch: refetchRequests } = useRequests();
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<ClientRequest | null>(null);

  useEffect(() => {
    if (!targetId || requestsLoading || allRequests.length === 0) return;
    const target = allRequests.find((r) => String(r.id) === String(targetId));
    if (!target) return;
    if (["traite", "refuse"].includes(target.status)) setActiveTab("traite");
    else if (["en_cours", "devis_envoye", "en_revision", "valide"].includes(target.status)) setActiveTab("en_cours");
    else setActiveTab("disponibles");
    setTimeout(() => {
      document.getElementById(`request-${targetId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
  }, [targetId, requestsLoading, allRequests]);
  const [showDetail, setShowDetail] = useState(false);
  const [showEmission, setShowEmission] = useState(false);
  const [emissionLoading, setEmissionLoading] = useState(false);
  const [emissionForm, setEmissionForm] = useState({
    date: today, risque: "", compagnie: "", numFacture: "", numPolice: "",
    marque: "", immatriculation: "", effet: today, echeance: "",
    primeNette: "", primeTtc: "", situation: "Affaire nouvelle",
  });

  const [claimLoading, setClaimLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("disponibles");
  const [sinistreNote, setSinistreNote] = useState("");

  // Cotation devis
  const [showDevisDialog, setShowDevisDialog] = useState(false);
  const [devisFile, setDevisFile] = useState<File | null>(null);
  const [devisNom, setDevisNom] = useState("");
  const [devisLoading, setDevisLoading] = useState(false);
  const devisInputRef = useRef<HTMLInputElement>(null);

  // Cotation attestations
  const [showAttestationsDialog, setShowAttestationsDialog] = useState(false);
  const [attestationsFiles, setAttestationsFiles] = useState<File[]>([]);
  const [attestationsLoading, setAttestationsLoading] = useState(false);
  const attestationsInputRef = useRef<HTMLInputElement>(null);

  const filtered = allRequests.filter(
    (r) =>
      r.type !== "souscription_magist" && (
        r.numero.toLowerCase().includes(search.toLowerCase()) ||
        r.clientNom.toLowerCase().includes(search.toLowerCase()) ||
        REQUEST_TYPE_LABELS[r.type].toLowerCase().includes(search.toLowerCase())
      )
  );

  const ACTIFS_STATUTS = ["en_cours", "devis_envoye", "en_revision", "valide"];
  const disponibles = filtered.filter((r) => r.status === "en_attente");
  const enCours = filtered.filter((r) => ACTIFS_STATUTS.includes(r.status));
  const mesEnCours = enCours.filter((r) => r.agentId === String(user?.id));
  const traites = filtered.filter((r) => ["traite", "refuse"].includes(r.status) && r.agentId === String(user?.id));

  useEffect(() => {
    const handler = () => refetchRequests();
    window.addEventListener("new_request_created", handler);
    return () => window.removeEventListener("new_request_created", handler);
  }, [refetchRequests]);

  const handleClaim = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setClaimLoading(id);
    try {
      await requestsApi.claim(id);
      toast.success("Requête prise en charge.");
      refetchRequests();
      setActiveTab("en_cours");
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

  const handleEnvoyerDevis = async () => {
    if (!selectedRequest || !devisFile) { toast.error("Veuillez sélectionner un fichier devis"); return; }
    setDevisLoading(true);
    try {
      await requestsApi.envoyerDevis(selectedRequest.id, devisFile, devisNom || devisFile.name);
      toast.success("Devis envoyé au client");
      setShowDevisDialog(false);
      setDevisFile(null); setDevisNom("");
      setShowDetail(false);
      refetchRequests();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Erreur"); }
    finally { setDevisLoading(false); }
  };

  const handleEnvoyerAttestations = async () => {
    if (!selectedRequest || attestationsFiles.length === 0) { toast.error("Veuillez sélectionner au moins un fichier"); return; }
    setAttestationsLoading(true);
    try {
      await requestsApi.envoyerAttestations(selectedRequest.id, attestationsFiles);
      toast.success("Attestations envoyées — dossier clôturé");
      setShowAttestationsDialog(false);
      setAttestationsFiles([]);
      setShowDetail(false);
      refetchRequests();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Erreur"); }
    finally { setAttestationsLoading(false); }
  };

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
        date: emissionForm.date,
        risque: emissionForm.risque,
        compagnie: emissionForm.compagnie,
        numFacture: emissionForm.numFacture,
        numPolice: emissionForm.numPolice,
        marque: emissionForm.marque || "-",
        immatriculation: emissionForm.immatriculation || "-",
        effet: emissionForm.effet,
        echeance: emissionForm.echeance,
        primeNette: Number(emissionForm.primeNette) || Number(emissionForm.primeTtc),
        primeTtc: Number(emissionForm.primeTtc),
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
    const note = selectedRequest.type === "declaration_sinistre" ? sinistreNote.trim() : undefined;
    try {
      await requestsApi.treat(Number(selectedRequest.id), note);
      toast.success("Requête clôturée.");
      setSinistreNote("");
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

  const RequestCard = ({ request }: {
    request: ClientRequest;
  }) => {
    const isClaimedByOther = request.status === "en_cours" && request.agentId && request.agentId !== String(user?.id);
    const isHighlighted = String(request.id) === String(targetId);
    return (
      <Card
        id={`request-${request.id}`}
        className={`border-0 shadow-sm hover:shadow-md transition cursor-pointer ${
          isClaimedByOther ? "opacity-70" : ""
        } ${isHighlighted ? "ring-2 ring-blue-400 bg-blue-50" : ""}`}
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

      {/* Skeleton chargement */}
      {requestsLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-4 w-4 rounded-full mt-0.5" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats bar + Tabs */}
      {!requestsLoading && <>
      <div className="grid grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{disponibles.length}</p>
            <p className="text-xs text-gray-500">Disponibles</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{mesEnCours.length}</p>
            <p className="text-xs text-gray-500">Mes en cours</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-orange-500">{enCours.length - mesEnCours.length}</p>
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="disponibles" className="text-xs">
            Disponibles ({disponibles.length})
          </TabsTrigger>
          <TabsTrigger value="en_cours" className="text-xs">
            En cours ({enCours.length})
          </TabsTrigger>
          <TabsTrigger value="traite" className="text-xs">Traités ({traites.length})</TabsTrigger>
        </TabsList>

        {/* Disponibles — toutes les en_attente avec bouton Prendre en charge */}
        <TabsContent value="disponibles" className="space-y-2 mt-4">
          {disponibles.length > 0 ? (
            <>
              <p className="text-xs text-gray-500 mb-2">Cliquez sur "Prendre en charge" pour vous assigner la requête. Elle disparaîtra de la liste des autres agents.</p>
              {disponibles.map((r) => <RequestCard key={r.id} request={r} />)}
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Aucune requête disponible</p>
          )}
        </TabsContent>

        {/* En cours — toutes, avec distinction mine/autres */}
        <TabsContent value="en_cours" className="space-y-2 mt-4">
          {enCours.length > 0 ? (
            <>
              {mesEnCours.length > 0 && (
                <p className="text-xs text-blue-600 font-medium mb-1">{mesEnCours.length} assignée{mesEnCours.length > 1 ? "s" : ""} à vous</p>
              )}
              {enCours.map((r) => <RequestCard key={r.id} request={r} />)}
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
      </>}

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

                {/* Détails sinistre */}
                {selectedRequest.type === "declaration_sinistre" && selectedRequest.details && (() => {
                  const d = selectedRequest.details as Record<string, unknown>;
                  const rows: { label: string; value: unknown }[] = [
                    { label: "Date du sinistre", value: d.date_sinistre ? fmtDate(d.date_sinistre as string) : undefined },
                    { label: "Heure", value: d.heure_sinistre },
                    { label: "Lieu", value: d.lieu },
                    { label: "Nature", value: d.nature },
                    { label: "Circonstances", value: d.circonstances },
                    { label: "Dégâts matériels", value: d.degats_materiels },
                    { label: "Dégâts corporels", value: d.degats_corporels },
                    { label: "Témoins", value: d.temoins },
                    { label: "Constat amiable", value: d.constat_amiable },
                    { label: "N° PV police", value: d.pv_police },
                    { label: "Observations", value: d.observations },
                  ].filter((r) => r.value);
                  return (
                    <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 space-y-1.5">
                      <p className="text-xs font-semibold text-orange-700 flex items-center gap-1 mb-2">
                        <AlertTriangle className="h-3.5 w-3.5" /> Détails du sinistre
                      </p>
                      {rows.map((r) => (
                        <div key={r.label} className="grid grid-cols-2 gap-1 text-xs">
                          <span className="text-gray-500">{r.label}</span>
                          <span className="font-medium text-gray-800">{String(r.value)}</span>
                        </div>
                      ))}
                      {selectedRequest.sinistre_note && (
                        <div className="mt-2 pt-2 border-t border-orange-200">
                          <p className="text-xs text-orange-600 font-semibold mb-0.5">Note de clôture :</p>
                          <p className="text-xs text-gray-700">{selectedRequest.sinistre_note}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Détails changement immatriculation / nom */}
                {(selectedRequest.type === "changement_immatriculation" || selectedRequest.type === "changement_nom") && selectedRequest.details && (() => {
                  const d = selectedRequest.details as Record<string, unknown>;
                  const rows: { label: string; value: string }[] = [
                    { label: "Immatriculation", value: (d.immatriculation as string) || "" },
                    { label: "Marque / Modèle", value: (d.marque as string) || "" },
                    { label: "Compagnie", value: (d.compagnie as string) || "" },
                    { label: "N° Police", value: (d.num_police as string) || "" },
                  ].filter(r => r.value && r.value !== "-");
                  if (rows.length === 0) return null;
                  return (
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 space-y-1.5">
                      <p className="text-xs font-semibold text-blue-700 flex items-center gap-1 mb-2">
                        <Car className="h-3.5 w-3.5" /> Véhicule concerné
                      </p>
                      {rows.map((r) => (
                        <div key={r.label} className="grid grid-cols-2 gap-1 text-xs">
                          <span className="text-gray-500">{r.label}</span>
                          <span className="font-medium text-gray-800">{r.value}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}

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
                            <Button variant="ghost" size="sm" onClick={() => window.open(buildFileUrl(doc.fichier), "_blank")} title="Voir">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => downloadFile(buildFileUrl(doc.fichier), doc.nom)} title="Télécharger">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Motif client (révision / refus) */}
                {["en_revision", "refuse"].includes(selectedRequest.status) && selectedRequest.sinistre_note && (
                  <div className={`rounded-lg p-3 border text-sm space-y-1 ${selectedRequest.status === "refuse" ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200"}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${selectedRequest.status === "refuse" ? "text-red-600" : "text-orange-600"}`}>
                      {selectedRequest.status === "refuse" ? "Motif de refus du client" : "Motif de révision du client"}
                    </p>
                    <p className="text-gray-700">{selectedRequest.sinistre_note}</p>
                  </div>
                )}

                {/* Livrables */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Livrables (documents à remettre au client)
                  </p>
                  {selectedRequest.livrables.length > 0 ? (
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
                            <Button variant="ghost" size="sm" onClick={() => window.open(buildFileUrl(doc.fichier), "_blank")} title="Voir">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => downloadFile(buildFileUrl(doc.fichier), doc.nom)} title="Télécharger">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 mb-2">Aucun livrable pour l&apos;instant</p>
                  )}
                  {/* Upload livrable générique si en_cours (pas pour les cotations) */}
                  {selectedRequest.status === "en_cours" && !COTATION_TYPES.includes(selectedRequest.type) && selectedRequest.agentId === String(user?.id) && (
                    <>
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
                    </>
                  )}
                </div>

                {/* Actions selon statut */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {/* EN ATTENTE : Prendre en charge (tous types) */}
                  {selectedRequest.status === "en_attente" && (
                    <Button
                      onClick={async (e) => { await handleClaim(e as React.MouseEvent, selectedRequest.id); setShowDetail(false); }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={claimLoading === selectedRequest.id}
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      {claimLoading === selectedRequest.id ? "En cours..." : "Prendre en charge"}
                    </Button>
                  )}

                  {/* EN COURS — cotation : Envoyer le devis + Libérer */}
                  {selectedRequest.status === "en_cours" && COTATION_TYPES.includes(selectedRequest.type) && selectedRequest.agentId === String(user?.id) && (
                    <>
                      <Button onClick={() => setShowDevisDialog(true)} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">
                        <Send className="h-4 w-4 mr-2" /> Envoyer le devis
                      </Button>
                      <Button variant="outline" className="flex-1 text-orange-600 border-orange-300 hover:bg-orange-50" disabled={claimLoading === selectedRequest.id}
                        onClick={async (e) => { await handleRelease(e as React.MouseEvent, selectedRequest.id); setShowDetail(false); }}
                      >
                        <Unlock className="h-4 w-4 mr-2" /> Libérer
                      </Button>
                    </>
                  )}

                  {/* EN COURS — non-cotation : libérer, traiter, créer émission */}
                  {selectedRequest.status === "en_cours" && !COTATION_TYPES.includes(selectedRequest.type) && selectedRequest.agentId === String(user?.id) && (
                    <>
                      {selectedRequest.type === "declaration_sinistre" && (
                        <div className="w-full space-y-1">
                          <Label className="text-xs text-gray-500">Note de clôture (sinistre)</Label>
                          <Textarea rows={2} placeholder="Conclusion, décision, suite donnée au dossier..." value={sinistreNote} onChange={(e) => setSinistreNote(e.target.value)} className="text-xs" />
                        </div>
                      )}
                      <Button onClick={handleMarkAsTreated} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                        <CheckCircle className="h-4 w-4 mr-2" /> Clôturer
                      </Button>
                      {EMISSION_TYPES.includes(selectedRequest.type) && (
                        <Button onClick={() => openEmissionForm(selectedRequest)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                          <PlusCircle className="h-4 w-4 mr-2" /> Créer l&apos;émission
                        </Button>
                      )}
                      {selectedRequest.type === "souscription_magist" && (
                        <Button onClick={() => { setShowDetail(false); router.push("/agent/magistassur"); }} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white">
                          <Shield className="h-4 w-4 mr-2" /> Voir dans MAGIST&apos;ASSUR
                        </Button>
                      )}
                      <Button variant="outline" className="flex-1 text-orange-600 border-orange-300 hover:bg-orange-50" disabled={claimLoading === selectedRequest.id}
                        onClick={async (e) => { await handleRelease(e as React.MouseEvent, selectedRequest.id); setShowDetail(false); }}
                      >
                        <Unlock className="h-4 w-4 mr-2" /> Libérer
                      </Button>
                    </>
                  )}

                  {/* DEVIS_ENVOYE ou EN_REVISION : renvoyer un devis */}
                  {["devis_envoye", "en_revision"].includes(selectedRequest.status) && selectedRequest.agentId === String(user?.id) && (
                    <Button onClick={() => setShowDevisDialog(true)} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">
                      <Send className="h-4 w-4 mr-2" />
                      {selectedRequest.status === "en_revision" ? "Renvoyer le devis corrigé" : "Renvoyer le devis"}
                    </Button>
                  )}

                  {/* VALIDE : envoyer les attestations */}
                  {selectedRequest.status === "valide" && selectedRequest.agentId === String(user?.id) && (
                    <Button onClick={() => setShowAttestationsDialog(true)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                      <CheckCheck className="h-4 w-4 mr-2" /> Envoyer les attestations
                    </Button>
                  )}

                  {/* EN COURS — requête d'un autre agent : lecture seule */}
                  {selectedRequest.status === "en_cours" && selectedRequest.agentId !== String(user?.id) && (
                    <div className="flex-1 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 flex items-center gap-2">
                      <Lock className="h-4 w-4 shrink-0" />
                      Prise en charge par {selectedRequest.agentNom}
                    </div>
                  )}
                  {["devis_envoye", "en_revision", "valide"].includes(selectedRequest.status) && selectedRequest.agentId !== String(user?.id) && (
                    <div className="flex-1 text-xs text-purple-600 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 flex items-center gap-2">
                      <Lock className="h-4 w-4 shrink-0" />
                      Géré par {selectedRequest.agentNom}
                    </div>
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
              <Label>Date de saisie <span className="text-red-500">*</span></Label>
              <Input type="date" value={emissionForm.date} onChange={e => setEmissionForm(f => ({...f, date: e.target.value}))} />
            </div>
            <div className="space-y-1.5">
              <Label>Situation <span className="text-red-500">*</span></Label>
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
              <Label>Risque <span className="text-red-500">*</span></Label>
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
              <Label>Compagnie <span className="text-red-500">*</span></Label>
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
                <Label>N° Facture <span className="text-red-500">*</span></Label>
                <Input placeholder="FA-2026-XXXX" value={emissionForm.numFacture} onChange={e => setEmissionForm(f => ({...f, numFacture: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label>N° Police <span className="text-red-500">*</span></Label>
                <Input placeholder="POL-XXXX-XXXXX" value={emissionForm.numPolice} onChange={e => setEmissionForm(f => ({...f, numPolice: e.target.value}))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date d&apos;effet <span className="text-red-500">*</span></Label>
                <Input type="date" value={emissionForm.effet} onChange={e => setEmissionForm(f => ({...f, effet: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label>Date d&apos;échéance <span className="text-red-500">*</span></Label>
                <Input type="date" value={emissionForm.echeance} onChange={e => setEmissionForm(f => ({...f, echeance: e.target.value}))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prime nette (FCFA) <span className="text-red-500">*</span></Label>
                <Input type="number" min={0} placeholder="0" value={emissionForm.primeNette} onChange={e => setEmissionForm(f => ({...f, primeNette: e.target.value}))} />
              </div>
              <div className="space-y-1.5">
                <Label>Prime TTC (FCFA) <span className="text-red-500">*</span></Label>
                <Input type="number" min={0} placeholder="0" value={emissionForm.primeTtc} onChange={e => setEmissionForm(f => ({...f, primeTtc: e.target.value}))} />
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

      {/* Dialog envoyer devis */}
      <Dialog open={showDevisDialog} onOpenChange={setShowDevisDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Envoyer le devis</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Nom du document</Label>
              <Input placeholder={selectedRequest?.type === "cotation_mrh" ? "Ex : Devis Multirisque Habitation 2026" : "Ex : Devis Automobile 2026"} value={devisNom} onChange={e => setDevisNom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fichier devis <span className="text-red-500">*</span></Label>
              <input ref={devisInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden"
                onChange={e => setDevisFile(e.target.files?.[0] ?? null)} />
              <div
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${devisFile ? "border-green-300 bg-green-50" : "border-gray-300 hover:border-purple-400 hover:bg-purple-50/50"}`}
                onClick={() => devisInputRef.current?.click()}
              >
                <Upload className={`h-6 w-6 mx-auto mb-1 ${devisFile ? "text-green-500" : "text-gray-400"}`} />
                {devisFile
                  ? <p className="text-xs text-green-700 font-medium">✓ {devisFile.name}</p>
                  : <p className="text-xs text-gray-500">Cliquez pour sélectionner le devis</p>
                }
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowDevisDialog(false); setDevisFile(null); setDevisNom(""); }}>Annuler</Button>
              <Button className="flex-1 bg-purple-600 hover:bg-purple-700" disabled={devisLoading || !devisFile} onClick={handleEnvoyerDevis}>
                <Send className="h-4 w-4 mr-2" /> {devisLoading ? "Envoi..." : "Envoyer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog envoyer attestations */}
      <Dialog open={showAttestationsDialog} onOpenChange={setShowAttestationsDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Envoyer les attestations</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-gray-500">Le client a validé le devis. Envoyez les attestations pour clôturer le dossier.</p>
            <div className="space-y-1.5">
              <Label>Fichiers <span className="text-red-500">*</span></Label>
              <input ref={attestationsInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple className="hidden"
                onChange={e => setAttestationsFiles(Array.from(e.target.files ?? []))} />
              <div
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${attestationsFiles.length > 0 ? "border-green-300 bg-green-50" : "border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/50"}`}
                onClick={() => attestationsInputRef.current?.click()}
              >
                <Upload className={`h-6 w-6 mx-auto mb-1 ${attestationsFiles.length > 0 ? "text-green-500" : "text-gray-400"}`} />
                {attestationsFiles.length > 0
                  ? <p className="text-xs text-green-700 font-medium">✓ {attestationsFiles.length} fichier{attestationsFiles.length > 1 ? "s" : ""} sélectionné{attestationsFiles.length > 1 ? "s" : ""}</p>
                  : <p className="text-xs text-gray-500">Cliquez pour sélectionner (plusieurs fichiers possibles)</p>
                }
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowAttestationsDialog(false); setAttestationsFiles([]); }}>Annuler</Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={attestationsLoading || attestationsFiles.length === 0} onClick={handleEnvoyerAttestations}>
                <CheckCheck className="h-4 w-4 mr-2" /> {attestationsLoading ? "Envoi..." : "Envoyer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

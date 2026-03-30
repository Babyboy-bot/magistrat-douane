"use client";

import { useState } from "react";
import { AlertTriangle, Search, Clock, Loader2, CheckCircle, Lock, Unlock, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useRequests } from "@/hooks/use-api-data";
import { requestsApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import type { ClientRequest } from "@/lib/types";

const NATURE_LABELS: Record<string, string> = {
  collision: "Collision",
  vol: "Vol",
  incendie: "Incendie",
  bris_glace: "Bris de glace",
  catastrophe_naturelle: "Catastrophe naturelle",
  autre: "Autre",
};

function SinistreCard({
  s,
  agentId,
  onClaim,
  onRelease,
  onTreat,
}: {
  s: ClientRequest;
  agentId?: string;
  onClaim: (id: string) => void;
  onRelease: (id: string) => void;
  onTreat: (s: ClientRequest) => void;
}) {
  const details = s.details as Record<string, unknown> | null;
  const nature = details?.nature as string | undefined;
  const lieu = details?.lieu as string | undefined;
  const date = details?.date_sinistre as string | undefined;
  const circonstances = details?.circonstances as string | undefined;
  const isMine = s.agentId === agentId;

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{s.numero}</span>
              <Badge variant="secondary" className={
                s.status === "en_attente" ? "bg-yellow-100 text-yellow-800" :
                s.status === "en_cours" ? "bg-blue-100 text-blue-800" :
                "bg-green-100 text-green-800"
              }>
                {s.status === "en_attente" ? "Ouvert" : s.status === "en_cours" ? "En instruction" : "Clôturé"}
              </Badge>
              {nature && <Badge variant="outline" className="text-xs">{NATURE_LABELS[nature] ?? nature}</Badge>}
            </div>
            <p className="text-sm font-medium text-gray-700">{s.clientNom}</p>
            {date && <p className="text-xs text-gray-500">Sinistre du : {date}</p>}
            {lieu && <p className="text-xs text-gray-500">Lieu : {lieu}</p>}
            {circonstances && (
              <p className="text-xs text-gray-500 line-clamp-2">Circonstances : {circonstances}</p>
            )}
            <p className="text-xs text-gray-400">
              Déclaré le {new Date(s.createdAt).toLocaleDateString("fr-FR")}
            </p>
            {s.agentNom && (
              <p className="text-xs text-blue-600 flex items-center gap-1">
                <UserCheck className="h-3 w-3" /> {s.agentNom}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {s.status === "en_attente" && (
              <Button size="sm" onClick={() => onClaim(s.id)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
                <Lock className="h-3 w-3 mr-1" /> Prendre en charge
              </Button>
            )}
            {s.status === "en_cours" && isMine && (
              <>
                <Button size="sm" onClick={() => onTreat(s)} className="text-xs bg-green-600 hover:bg-green-700 text-white">
                  <CheckCircle className="h-3 w-3 mr-1" /> Clôturer
                </Button>
                <Button size="sm" variant="outline" onClick={() => onRelease(s.id)} className="text-xs">
                  <Unlock className="h-3 w-3 mr-1" /> Libérer
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Pièces jointes */}
        {s.documents.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-gray-500 mb-1">Pièces jointes ({s.documents.length})</p>
            <div className="flex flex-wrap gap-1">
              {s.documents.map((d) => (
                <span key={d.id} className="text-xs bg-gray-100 px-2 py-0.5 rounded">{d.nom}</span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AgentSinistresPage() {
  const { user } = useAuthStore();
  const { data: requests, refetch } = useRequests();
  const [search, setSearch] = useState("");
  const [treatTarget, setTreatTarget] = useState<ClientRequest | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const sinistres = requests
    .filter((r) => r.type === "declaration_sinistre")
    .filter(
      (r) =>
        !search ||
        r.numero.toLowerCase().includes(search.toLowerCase()) ||
        r.clientNom?.toLowerCase().includes(search.toLowerCase())
    );

  const ouverts = sinistres.filter((r) => r.status === "en_attente");
  const enCours = sinistres.filter((r) => r.status === "en_cours");
  const clotures = sinistres.filter((r) => r.status === "traite");

  const handleClaim = async (id: string) => {
    try {
      await requestsApi.claim(id);
      toast.success("Dossier pris en charge");
      refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  const handleRelease = async (id: string) => {
    try {
      await requestsApi.release(id);
      toast.success("Dossier libéré");
      refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  const handleTreat = async () => {
    if (!treatTarget) return;
    setLoading(true);
    try {
      await requestsApi.treat(treatTarget.id, note);
      toast.success("Dossier clôturé — le client a été notifié");
      setTreatTarget(null);
      setNote("");
      refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const count = (arr: ClientRequest[]) => arr.length > 0 ? ` (${arr.length})` : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            Dossiers sinistres
          </h1>
          <p className="text-gray-500 mt-1">{sinistres.length} dossier{sinistres.length !== 1 ? "s" : ""} au total</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Tabs defaultValue="ouverts">
        <TabsList>
          <TabsTrigger value="ouverts" className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> Ouverts{count(ouverts)}
          </TabsTrigger>
          <TabsTrigger value="en_cours" className="flex items-center gap-1">
            <Loader2 className="h-3.5 w-3.5" /> En instruction{count(enCours)}
          </TabsTrigger>
          <TabsTrigger value="clotures" className="flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5" /> Clôturés{count(clotures)}
          </TabsTrigger>
        </TabsList>

        {[
          { key: "ouverts", list: ouverts },
          { key: "en_cours", list: enCours },
          { key: "clotures", list: clotures },
        ].map(({ key, list }) => (
          <TabsContent key={key} value={key} className="space-y-3 mt-4">
            {list.length === 0 ? (
              <div className="text-center py-12 text-gray-400">Aucun dossier</div>
            ) : (
              list.map((s) => (
                <SinistreCard
                  key={s.id}
                  s={s}
                  agentId={user?.id}
                  onClaim={handleClaim}
                  onRelease={handleRelease}
                  onTreat={(s) => { setTreatTarget(s); setNote(""); }}
                />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Dialog clôture */}
      <Dialog open={!!treatTarget} onOpenChange={(o) => !o && setTreatTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Clôturer le dossier sinistre</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-gray-600">
              Dossier <strong>{treatTarget?.numero}</strong> — client : {treatTarget?.clientNom}
            </p>
            <div className="space-y-1.5">
              <Label>Conclusion / décision (envoyée au client)</Label>
              <Textarea
                placeholder="Ex : Dossier transmis à la compagnie. Indemnisation prévue sous 15 jours..."
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <p className="text-xs text-gray-400">Ce message sera affiché au client dans son suivi sinistre.</p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setTreatTarget(null)}>Annuler</Button>
              <Button onClick={handleTreat} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Clôturer et notifier
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

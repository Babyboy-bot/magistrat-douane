"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { emissionsApi } from "@/lib/api";
import { RISQUES, COMPAGNIES } from "@/lib/types";
import type { User } from "@/lib/types";
import { toast } from "sonner";

const defaultFormState = {
  date: new Date().toISOString().split("T")[0],
  situation: "",
  client: "",
  risque: "",
  compagnie: "",
  numFacture: "",
  numPolice: "",
  effet: "",
  echeance: "",
  primeNette: "",
  primeTtc: "",
  marque: "",
  immatriculation: "",
};

type EmissionFormDialogProps = {
  clients: User[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  preselectedClientId?: string;
};

export function EmissionFormDialog({ clients, open, onOpenChange, onCreated, preselectedClientId }: EmissionFormDialogProps) {
  const [form, setForm] = useState(defaultFormState);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm((prev) => ({ ...defaultFormState, date: prev.date, client: preselectedClientId ?? "" }));
    } else {
      setForm((prev) => ({ ...defaultFormState, date: prev.date }));
    }
  }, [open, preselectedClientId]);

  const isValid = useMemo(() => {
    return (
      Boolean(form.client && form.risque && form.compagnie && form.numPolice && form.primeNette && form.primeTtc && form.effet && form.echeance)
    );
  }, [form]);

  const handleSubmit = async () => {
    if (!isValid) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setLoading(true);
    try {
      await emissionsApi.create({
        date: form.date,
        situation: form.situation || "Affaire nouvelle",
        clientId: String(form.client),
        risque: form.risque,
        compagnie: form.compagnie,
        numFacture: form.numFacture,
        numPolice: form.numPolice,
        effet: form.effet,
        echeance: form.echeance,
        primeNette: Number(form.primeNette),
        primeTtc: Number(form.primeTtc),
        marque: form.marque || "-",
        immatriculation: form.immatriculation || "-",
        paiements: [],
      });
      toast.success("Émission créée avec succès");
      setForm(defaultFormState);
      onCreated();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle émission</DialogTitle>
          <DialogDescription>
            Complétez les informations obligatoires concernant le client, les dates et les montants pour enregistrer une nouvelle émission.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Date de saisie *</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Situation *</Label>
            <Select value={form.situation} onValueChange={(v) => setForm({ ...form, situation: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Affaire nouvelle">Affaire nouvelle</SelectItem>
                <SelectItem value="Incorporation">Incorporation</SelectItem>
                <SelectItem value="Retrait">Retrait</SelectItem>
                <SelectItem value="Renouvellement">Renouvellement</SelectItem>
                <SelectItem value="Modification">Modification</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!preselectedClientId && (
            <div className="space-y-1.5">
              <Label>Client *</Label>
              <Select value={form.client} onValueChange={(v) => setForm({ ...form, client: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nom} {c.prenoms} ({c.role === "prospect" ? "Prospect" : "Assuré"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Risque *</Label>
            <Select value={form.risque} onValueChange={(v) => setForm({ ...form, risque: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un risque..." />
              </SelectTrigger>
              <SelectContent>
                {RISQUES.map((r) => (
                  <SelectItem key={r.nom} value={r.nom}>
                    {r.nom} ({r.tauxCommission}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Compagnie *</Label>
            <Select value={form.compagnie} onValueChange={(v) => setForm({ ...form, compagnie: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez..." />
              </SelectTrigger>
              <SelectContent>
                {COMPAGNIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>N° Facture *</Label>
              <Input placeholder="FA-2025-XXXX" value={form.numFacture} onChange={(e) => setForm({ ...form, numFacture: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>N° Police *</Label>
              <Input placeholder="POL-XXXX-XXXXX" value={form.numPolice} onChange={(e) => setForm({ ...form, numPolice: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date d&apos;effet *</Label>
              <Input type="date" value={form.effet} onChange={(e) => setForm({ ...form, effet: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Date d&apos;échéance *</Label>
              <Input type="date" value={form.echeance} onChange={(e) => setForm({ ...form, echeance: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prime nette (FCFA) *</Label>
              <Input type="number" placeholder="0" value={form.primeNette} onChange={(e) => setForm({ ...form, primeNette: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Prime TTC (FCFA) *</Label>
              <Input type="number" placeholder="0" value={form.primeTtc} onChange={(e) => setForm({ ...form, primeTtc: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Marque</Label>
              <Input placeholder="Marque du véhicule" value={form.marque} onChange={(e) => setForm({ ...form, marque: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Immatriculation</Label>
              <Input placeholder="XXXX XX XX" value={form.immatriculation} onChange={(e) => setForm({ ...form, immatriculation: e.target.value })} />
            </div>
          </div>
          <Button className="w-full bg-[hsl(222,47%,20%)] hover:bg-[hsl(222,47%,25%)]" disabled={loading} onClick={handleSubmit}>
            {loading ? "Enregistrement..." : "Enregistrer l'émission"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

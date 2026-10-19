"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { emissionSchema, type EmissionValues } from "@/lib/validations";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-500 mt-1">{message}</p>;
}

type EmissionFormDialogProps = {
  clients: User[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  preselectedClientId?: string;
};

export function EmissionFormDialog({ clients, open, onOpenChange, onCreated, preselectedClientId }: EmissionFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [tauxCommission, setTauxCommission] = useState(0);

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<EmissionValues>({
    resolver: zodResolver(emissionSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      situation: "",
      client: preselectedClientId ?? "",
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
    },
  });

  const primeNetteVal = watch("primeNette");
  const primeTtcVal = watch("primeTtc");

  useEffect(() => {
    if (open) {
      reset({
        date: new Date().toISOString().split("T")[0],
        situation: "",
        client: preselectedClientId ?? "",
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
      });
      setTauxCommission(0);
    }
  }, [open, preselectedClientId, reset]);

  const onSubmit = async (values: EmissionValues) => {
    setLoading(true);
    try {
      await emissionsApi.create({
        date: values.date,
        situation: values.situation || "Affaire nouvelle",
        clientId: String(values.client),
        risque: values.risque,
        compagnie: values.compagnie,
        numFacture: values.numFacture ?? "",
        numPolice: values.numPolice,
        effet: values.effet,
        echeance: values.echeance,
        primeNette: Number(values.primeNette),
        primeTtc: Number(values.primeTtc),
        marque: values.marque || "-",
        immatriculation: values.immatriculation || "-",
        paiements: [],
      });
      toast.success("Émission créée avec succès");
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Date de saisie <span className="text-red-500">*</span></Label>
            <Input type="date" {...register("date")} className={errors.date ? "border-red-400" : ""} />
            <FieldError message={errors.date?.message} />
          </div>
          <div className="space-y-1.5">
            <Label>Situation</Label>
            <Controller
              name="situation"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Affaire nouvelle">Affaire nouvelle</SelectItem>
                    <SelectItem value="Incorporation">Incorporation</SelectItem>
                    <SelectItem value="Retrait">Retrait</SelectItem>
                    <SelectItem value="Renouvellement">Renouvellement</SelectItem>
                    <SelectItem value="Modification">Modification</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {!preselectedClientId && (
            <div className="space-y-1.5">
              <Label>Client <span className="text-red-500">*</span></Label>
              <Controller
                name="client"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={errors.client ? "border-red-400" : ""}>
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
                )}
              />
              <FieldError message={errors.client?.message} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Risque <span className="text-red-500">*</span></Label>
            <Controller
              name="risque"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    const taux = RISQUES.find((r) => r.nom === v)?.tauxCommission ?? 0;
                    setTauxCommission(taux);
                    const nette = Number(primeNetteVal);
                    if (taux > 0 && nette > 0) {
                      setValue("primeTtc", String(Math.round(nette / (1 - taux / 100))));
                    }
                  }}
                >
                  <SelectTrigger className={errors.risque ? "border-red-400" : ""}>
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
              )}
            />
            <FieldError message={errors.risque?.message} />
          </div>
          <div className="space-y-1.5">
            <Label>Compagnie <span className="text-red-500">*</span></Label>
            <Controller
              name="compagnie"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={errors.compagnie ? "border-red-400" : ""}>
                    <SelectValue placeholder="Sélectionnez..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPAGNIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.compagnie?.message} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>N° Facture</Label>
              <Input placeholder="FA-2025-XXXX" {...register("numFacture")} />
            </div>
            <div className="space-y-1.5">
              <Label>N° Police <span className="text-red-500">*</span></Label>
              <Input placeholder="POL-XXXX-XXXXX" {...register("numPolice")} className={errors.numPolice ? "border-red-400" : ""} />
              <FieldError message={errors.numPolice?.message} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date d&apos;effet <span className="text-red-500">*</span></Label>
              <Input type="date" {...register("effet")} className={errors.effet ? "border-red-400" : ""} />
              <FieldError message={errors.effet?.message} />
            </div>
            <div className="space-y-1.5">
              <Label>Date d&apos;échéance <span className="text-red-500">*</span></Label>
              <Input type="date" {...register("echeance")} className={errors.echeance ? "border-red-400" : ""} />
              <FieldError message={errors.echeance?.message} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prime nette (FCFA) <span className="text-red-500">*</span></Label>
              <Input
                type="number" min={0} placeholder="0"
                {...register("primeNette")}
                className={errors.primeNette ? "border-red-400" : ""}
                onChange={(e) => {
                  register("primeNette").onChange(e);
                  const nette = Number(e.target.value);
                  if (tauxCommission > 0 && nette > 0) {
                    setValue("primeTtc", String(Math.round(nette / (1 - tauxCommission / 100))));
                  }
                }}
              />
              <FieldError message={errors.primeNette?.message} />
            </div>
            <div className="space-y-1.5">
              <Label>Prime TTC (FCFA) <span className="text-red-500">*</span></Label>
              <Input type="number" min={0} placeholder="0" {...register("primeTtc")} className={errors.primeTtc ? "border-red-400" : ""} />
              <FieldError message={errors.primeTtc?.message} />
            </div>
          </div>
          {/* Aperçu commission */}
          {tauxCommission > 0 && Number(primeNetteVal) > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
              <span className="text-amber-800">
                Commission ACS ({tauxCommission}%) :{" "}
                <strong>
                  {new Intl.NumberFormat("fr-FR").format(
                    Math.round(Number(primeNetteVal) * tauxCommission / 100)
                  )}{" "}FCFA
                </strong>
              </span>
              {Number(primeTtcVal) > 0 && (
                <span className="ml-2 text-xs text-amber-700/70">
                  (prime nette insur. : {new Intl.NumberFormat("fr-FR").format(Number(primeTtcVal) - Math.round(Number(primeNetteVal) * tauxCommission / 100))} FCFA)
                </span>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Marque</Label>
              <Input placeholder="Marque du véhicule" {...register("marque")} />
            </div>
            <div className="space-y-1.5">
              <Label>Immatriculation</Label>
              <Input placeholder="XXXX XX XX" {...register("immatriculation")} />
            </div>
          </div>
          <Button type="submit" className="w-full rounded-xl bg-navy-900 font-semibold hover:bg-navy-800" disabled={loading}>
            {loading ? "Enregistrement..." : "Enregistrer l'émission"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

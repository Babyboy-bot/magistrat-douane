"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Home, ArrowLeft, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth-store";
import { requestsApi } from "@/lib/api";
import { toast } from "sonner";
import { cotationMRHSchema, type CotationMRHValues } from "@/lib/validations";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-500 mt-1">{message}</p>;
}

export default function CotationMRHPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const { register, control, handleSubmit, formState: { errors } } = useForm<CotationMRHValues>({
    resolver: zodResolver(cotationMRHSchema),
    defaultValues: {
      nom: user ? `${user.nom} ${user.prenoms}` : "",
      telephone: user?.telephone || "",
      email: user?.email || "",
      qualite: "",
      nature: "",
      situationGeographique: "",
      valeurBatiment: "",
      loyerMensuel: "",
      valeurContenu: "",
      nombrePieces: "",
    },
  });

  const qualite = useWatch({ control, name: "qualite" });

  const onSubmit = async (values: CotationMRHValues) => {
    setLoading(true);
    try {
      await requestsApi.create("cotation_mrh", { ...values });
      toast.success("Votre demande de cotation MRH a été envoyée. Vous recevrez un devis sous 24h.");
      router.push("/client/history");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la soumission");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/client/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Home className="h-6 w-6 text-green-600" />
            Cotation Habitation
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Demandez un devis MRH rapidement</p>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <p className="text-sm text-green-800">
          <strong>Cotation rapide :</strong> Renseignez les informations de base sur votre habitation
          et nous vous enverrons un devis personnalisé dans les 24 heures.
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Informations de l&apos;habitation</CardTitle>
          <CardDescription>Remplissez les champs ci-dessous pour recevoir votre devis.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nom & Prénoms</Label>
                <Input {...register("nom")} />
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone</Label>
                <Input {...register("telephone")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Qualité <span className="text-red-500">*</span></Label>
              <Controller
                name="qualite"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger className={errors.qualite ? "border-red-400" : ""}><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proprietaire">Propriétaire</SelectItem>
                      <SelectItem value="locataire">Locataire</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.qualite?.message} />
            </div>

            <div className="space-y-1.5">
              <Label>Nature du risque <span className="text-red-500">*</span></Label>
              <Controller
                name="nature"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger className={errors.nature ? "border-red-400" : ""}><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="villa">Villa</SelectItem>
                      <SelectItem value="appartement">Appartement</SelectItem>
                      <SelectItem value="niveau">Niveau (immeuble)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.nature?.message} />
            </div>

            <div className="space-y-1.5">
              <Label>Situation géographique <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Ex: Cocody Riviera 3, Abidjan"
                {...register("situationGeographique")}
                className={errors.situationGeographique ? "border-red-400" : ""}
              />
              <FieldError message={errors.situationGeographique?.message} />
            </div>

            {qualite === "proprietaire" && (
              <div className="space-y-1.5">
                <Label>Valeur du bâtiment (FCFA)</Label>
                <Input type="number" min={0} placeholder="Ex: 80 000 000" {...register("valeurBatiment")} />
              </div>
            )}
            {qualite === "locataire" && (
              <div className="space-y-1.5">
                <Label>Loyer mensuel (FCFA)</Label>
                <Input type="number" min={0} placeholder="Ex: 250 000" {...register("loyerMensuel")} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valeur du contenu (FCFA)</Label>
                <Input type="number" min={0} placeholder="Ex: 15 000 000" {...register("valeurContenu")} />
              </div>
              <div className="space-y-1.5">
                <Label>Nombre de pièces</Label>
                <Input type="number" min={1} {...register("nombrePieces")} />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
              <Send className="h-4 w-4 mr-2" /> {loading ? "Envoi en cours..." : "Demander la cotation"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

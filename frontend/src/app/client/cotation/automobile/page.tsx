"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Car, Upload, ArrowLeft, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth-store";
import { requestsApi, documentsApi } from "@/lib/api";
import { toast } from "sonner";
import { cotationAutoSchema, type CotationAutoValues } from "@/lib/validations";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-500 mt-1">{message}</p>;
}

export default function CotationAutoPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [carteGriseFile, setCarteGriseFile] = useState<File | null>(null);
  const [carteGriseError, setCarteGriseError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const { register, control, handleSubmit, formState: { errors } } = useForm<CotationAutoValues>({
    resolver: zodResolver(cotationAutoSchema),
    defaultValues: {
      nom: user ? `${user.nom} ${user.prenoms}` : "",
      telephone: user?.telephone || "",
      email: user?.email || "",
      marque: "",
      immatriculation: "",
      genre: "",
      energie: "",
      puissanceFiscale: "",
      placesAssises: "",
      dateMiseCirculation: "",
      usage: "",
      valeurNeuve: "",
      valeurVenale: "",
    },
  });

  const handleCarteGriseSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCarteGriseFile(file);
    setCarteGriseError("");
    toast.success(`Carte grise "${file.name}" sélectionnée`);
  };

  const onSubmit = async (values: CotationAutoValues) => {
    if (!carteGriseFile) {
      setCarteGriseError("Veuillez sélectionner votre carte grise");
      return;
    }
    setLoading(true);
    try {
      const created = await requestsApi.create("cotation_auto", { ...values });
      await documentsApi.upload(carteGriseFile, created.id, false);
      toast.success("Votre demande de cotation automobile a été envoyée. Vous recevrez un devis sous 24h.");
      router.push("/client/history");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la soumission");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Car className="h-6 w-6 text-blue-600" />
            Cotation Automobile
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Demandez un devis en quelques clics</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Cotation rapide :</strong> Uploadez simplement votre carte grise et nous vous
          enverrons un devis personnalisé dans les 24 heures.
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Informations du véhicule</CardTitle>
          <CardDescription>Uploadez votre carte grise (obligatoire) puis remplissez les informations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleCarteGriseSelected}
            className="hidden"
          />

          <div>
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
                carteGriseFile
                  ? "border-green-300 bg-green-50"
                  : carteGriseError
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className={`h-8 w-8 mx-auto mb-2 ${carteGriseFile ? "text-green-500" : "text-gray-400"}`} />
              {carteGriseFile ? (
                <p className="text-sm text-green-700 font-medium">✓ {carteGriseFile.name}</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-600">Cliquez pour uploader la carte grise</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, JPG ou PNG (max 5MB)</p>
                </>
              )}
            </div>
            {carteGriseError && <p className="text-xs text-red-500 mt-1">{carteGriseError}</p>}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nom & Prénoms</Label>
                <Input {...register("nom")} />
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone</Label>
                <Input {...register("telephone")} />
              </div>
              <div className="space-y-1.5">
                <Label>Marque / Modèle <span className="text-red-500">*</span></Label>
                <Input {...register("marque")} className={errors.marque ? "border-red-400" : ""} />
                <FieldError message={errors.marque?.message} />
              </div>
              <div className="space-y-1.5">
                <Label>Immatriculation <span className="text-red-500">*</span></Label>
                <Input {...register("immatriculation")} className={errors.immatriculation ? "border-red-400" : ""} />
                <FieldError message={errors.immatriculation?.message} />
              </div>
              <div className="space-y-1.5">
                <Label>Genre</Label>
                <Controller
                  name="genre"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Véhicule particulier">Véhicule particulier</SelectItem>
                        <SelectItem value="Camionnette">Camionnette</SelectItem>
                        <SelectItem value="Camion">Camion</SelectItem>
                        <SelectItem value="Transport en commun">Transport en commun</SelectItem>
                        <SelectItem value="2/3 roues motorisé">2/3 roues motorisé</SelectItem>
                        <SelectItem value="Tracteur agricole">Tracteur agricole</SelectItem>
                        <SelectItem value="Tracteur routier">Tracteur routier</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Énergie</Label>
                <Controller
                  name="energie"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Essence">Essence</SelectItem>
                        <SelectItem value="Diesel">Diesel</SelectItem>
                        <SelectItem value="Hybride">Hybride</SelectItem>
                        <SelectItem value="Électrique">Électrique</SelectItem>
                        <SelectItem value="GPL">GPL</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Puissance fiscale (CV)</Label>
                <Input {...register("puissanceFiscale")} />
              </div>
              <div className="space-y-1.5">
                <Label>Places assises</Label>
                <Input {...register("placesAssises")} />
              </div>
              <div className="space-y-1.5">
                <Label>Date mise en circulation</Label>
                <Input type="date" {...register("dateMiseCirculation")} />
              </div>
              <div className="space-y-1.5">
                <Label>Usage</Label>
                <Input placeholder="Ex : Promenade, Affaire…" {...register("usage")} />
              </div>
              <div className="space-y-1.5">
                <Label>Valeur neuve (FCFA)</Label>
                <Input type="number" min={0} {...register("valeurNeuve")} />
              </div>
              <div className="space-y-1.5">
                <Label>Valeur vénale (FCFA)</Label>
                <Input type="number" min={0} {...register("valeurVenale")} />
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

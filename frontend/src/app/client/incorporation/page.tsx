"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Upload, ArrowLeft, ArrowRight, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth-store";
import { requestsApi, documentsApi } from "@/lib/api";
import { toast } from "sonner";
import {
  incorporationSouscripteurSchema,
  incorporationVehiculeSchema,
  type IncorporationSouscripteurValues,
  type IncorporationVehiculeValues,
} from "@/lib/validations";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-500 mt-1">{message}</p>;
}

export default function IncorporationPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [carteGriseFile, setCarteGriseFile] = useState<File | null>(null);
  const [carteGriseError, setCarteGriseError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const step1Form = useForm<IncorporationSouscripteurValues>({
    resolver: zodResolver(incorporationSouscripteurSchema),
    defaultValues: {
      nom: user ? `${user.nom} ${user.prenoms}` : "",
      profession: user?.profession || "",
      adressePostale: "",
      telephone: user?.telephone || "",
    },
  });

  const step2Form = useForm<IncorporationVehiculeValues>({
    resolver: zodResolver(incorporationVehiculeSchema),
    defaultValues: {
      proprietaire: "", immatriculation: "", marque: "", genre: "",
      usage: "", energie: "", puissanceFiscale: "", placesAssises: "",
      ptac: "", pv: "", cu: "", dateMiseCirculation: "", valeurNeuve: "", valeurVenale: "",
    },
  });

  const genreValue = step2Form.watch("genre");
  const isHeavy = ["Camionnette", "Camion"].includes(genreValue ?? "");

  const onStep1Next = step1Form.handleSubmit(() => setStep(2));

  const onStep2Submit = step2Form.handleSubmit(async (vehicule) => {
    if (!carteGriseFile) {
      setCarteGriseError("Veuillez uploader la carte grise du véhicule");
      return;
    }
    setCarteGriseError("");
    setLoading(true);
    const souscripteur = step1Form.getValues();
    try {
      const created = await requestsApi.create("incorporation", { souscripteur, vehicule });
      await documentsApi.upload(carteGriseFile, created.id, false);
      toast.success("Votre demande d'incorporation a été soumise.");
      router.push("/client/history");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la soumission");
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/client/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Demande d&apos;Incorporation
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Étape {step} sur 2</p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-[hsl(222,47%,20%)]" : "bg-gray-200"}`} />
        <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-[hsl(222,47%,20%)]" : "bg-gray-200"}`} />
      </div>

      {step === 1 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">1 — Identification du souscripteur</CardTitle>
            <CardDescription>Informations pré-remplies, modifiables.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onStep1Next} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nom & Prénoms <span className="text-red-500">*</span></Label>
                <Input {...step1Form.register("nom")} className={step1Form.formState.errors.nom ? "border-red-400" : ""} />
                <FieldError message={step1Form.formState.errors.nom?.message} />
              </div>
              <div className="space-y-1.5">
                <Label>Profession <span className="text-red-500">*</span></Label>
                <Input {...step1Form.register("profession")} className={step1Form.formState.errors.profession ? "border-red-400" : ""} />
                <FieldError message={step1Form.formState.errors.profession?.message} />
              </div>
              <div className="space-y-1.5">
                <Label>Adresse postale <span className="text-red-500">*</span></Label>
                <Input placeholder="Votre adresse" {...step1Form.register("adressePostale")} className={step1Form.formState.errors.adressePostale ? "border-red-400" : ""} />
                <FieldError message={step1Form.formState.errors.adressePostale?.message} />
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone <span className="text-red-500">*</span></Label>
                <Input {...step1Form.register("telephone")} className={step1Form.formState.errors.telephone ? "border-red-400" : ""} />
                <FieldError message={step1Form.formState.errors.telephone?.message} />
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" className="bg-[hsl(222,47%,20%)] hover:bg-[hsl(222,47%,25%)]">
                  Suivant <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">2 — Véhicule à incorporer</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onStep2Submit} className="space-y-4">
              {/* Carte grise */}
              <div>
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
                    carteGriseFile ? "border-green-300 bg-green-50"
                    : carteGriseError ? "border-red-300 bg-red-50"
                    : "border-gray-300 hover:border-[hsl(222,47%,20%)] hover:bg-blue-50/50"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => { setCarteGriseFile(e.target.files?.[0] || null); setCarteGriseError(""); }}
                    className="hidden"
                  />
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

              {/* Champs obligatoires */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nom du propriétaire <span className="text-red-500">*</span></Label>
                  <Input {...step2Form.register("proprietaire")} className={step2Form.formState.errors.proprietaire ? "border-red-400" : ""} />
                  <FieldError message={step2Form.formState.errors.proprietaire?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label>Immatriculation <span className="text-red-500">*</span></Label>
                  <Input placeholder="Ex : AB-1234-CI" {...step2Form.register("immatriculation")} className={step2Form.formState.errors.immatriculation ? "border-red-400" : ""} />
                  <FieldError message={step2Form.formState.errors.immatriculation?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label>Marque <span className="text-red-500">*</span></Label>
                  <Input placeholder="Ex : Toyota, Renault…" {...step2Form.register("marque")} className={step2Form.formState.errors.marque ? "border-red-400" : ""} />
                  <FieldError message={step2Form.formState.errors.marque?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label>Genre <span className="text-red-500">*</span></Label>
                  <Controller
                    name="genre"
                    control={step2Form.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={(v) => { field.onChange(v); step2Form.setValue("ptac", ""); step2Form.setValue("pv", ""); step2Form.setValue("cu", ""); }}>
                        <SelectTrigger className={step2Form.formState.errors.genre ? "border-red-400" : ""}><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
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
                  <FieldError message={step2Form.formState.errors.genre?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label>Énergie <span className="text-red-500">*</span></Label>
                  <Controller
                    name="energie"
                    control={step2Form.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className={step2Form.formState.errors.energie ? "border-red-400" : ""}><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
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
                  <FieldError message={step2Form.formState.errors.energie?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label>Places assises <span className="text-red-500">*</span></Label>
                  <Input type="number" min="1" {...step2Form.register("placesAssises")} className={step2Form.formState.errors.placesAssises ? "border-red-400" : ""} />
                  <FieldError message={step2Form.formState.errors.placesAssises?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label>Date de mise en circulation <span className="text-red-500">*</span></Label>
                  <Input type="date" {...step2Form.register("dateMiseCirculation")} className={step2Form.formState.errors.dateMiseCirculation ? "border-red-400" : ""} />
                  <FieldError message={step2Form.formState.errors.dateMiseCirculation?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label>Usage</Label>
                  <Input placeholder="Ex : Promenade, Affaire…" {...step2Form.register("usage")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Puissance fiscale (CV)</Label>
                  <Input type="number" min="1" {...step2Form.register("puissanceFiscale")} />
                </div>
              </div>

              {/* PTAC / PV / CU — uniquement pour véhicules lourds */}
              {isHeavy && (
                <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                    Informations de charge — obligatoires pour ce type de véhicule
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label>P.T.A.C. (kg) <span className="text-red-500">*</span></Label>
                      <Input type="number" min="0" placeholder="kg" {...step2Form.register("ptac")} className={step2Form.formState.errors.ptac ? "border-red-400" : ""} />
                      <FieldError message={step2Form.formState.errors.ptac?.message} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>P.V. (kg) <span className="text-red-500">*</span></Label>
                      <Input type="number" min="0" placeholder="kg" {...step2Form.register("pv")} className={step2Form.formState.errors.pv ? "border-red-400" : ""} />
                      <FieldError message={step2Form.formState.errors.pv?.message} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>C.U. (kg) <span className="text-red-500">*</span></Label>
                      <Input type="number" min="0" placeholder="kg" {...step2Form.register("cu")} className={step2Form.formState.errors.cu ? "border-red-400" : ""} />
                      <FieldError message={step2Form.formState.errors.cu?.message} />
                    </div>
                  </div>
                </div>
              )}

              {/* Valeurs */}
              <div className="border-t pt-4 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Valeur neuve (FCFA) <span className="text-red-500">*</span></Label>
                  <Input type="number" min={0} {...step2Form.register("valeurNeuve")} className={step2Form.formState.errors.valeurNeuve ? "border-red-400" : ""} />
                  <FieldError message={step2Form.formState.errors.valeurNeuve?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label>Valeur vénale (FCFA) <span className="text-red-500">*</span></Label>
                  <Input type="number" min={0} {...step2Form.register("valeurVenale")} className={step2Form.formState.errors.valeurVenale ? "border-red-400" : ""} />
                  <FieldError message={step2Form.formState.errors.valeurVenale?.message} />
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={loading}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Précédent
                </Button>
                <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white" disabled={loading}>
                  <Send className="h-4 w-4 mr-2" /> {loading ? "Envoi..." : "Soumettre la demande"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

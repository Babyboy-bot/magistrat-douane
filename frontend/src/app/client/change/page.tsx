"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RefreshCw, Upload, ArrowLeft, Send, Car, PenLine } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { requestsApi, documentsApi, emissionsApi } from "@/lib/api";
import type { RequestType, Emission } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import { changeSchema, type ChangeValues } from "@/lib/validations";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-500 mt-1">{message}</p>;
}

export default function ChangePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [carteGriseFile, setCarteGriseFile] = useState<File | null>(null);
  const [carteGriseError, setCarteGriseError] = useState("");
  const [nouveauNom, setNouveauNom] = useState("");
  const [nouveauNomError, setNouveauNomError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [vehicles, setVehicles] = useState<Emission[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [autreImmat, setAutreImmat] = useState("");
  const [immatError, setImmatError] = useState("");

  const { control, handleSubmit, watch, formState: { errors } } = useForm<ChangeValues>({
    resolver: zodResolver(changeSchema),
    defaultValues: { changement: "" },
  });

  const changement = watch("changement");

  useEffect(() => {
    if (changement !== "immatriculation" || !user?.id) return;
    setVehiclesLoading(true);
    emissionsApi.list({ clientId: String(user.id), pageSize: 100 })
      .then(res => setVehicles(res.results))
      .finally(() => setVehiclesLoading(false));
  }, [changement, user?.id]);

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const selectedHasImmat = selectedVehicle && selectedVehicle.immatriculation && selectedVehicle.immatriculation !== "-";
  const immatriculationFinale =
    selectedVehicleId === "autre" ? autreImmat
    : selectedHasImmat ? selectedVehicle!.immatriculation
    : autreImmat;

  const onSubmit = async (values: ChangeValues) => {
    if (values.changement === "immatriculation" && !immatriculationFinale.trim()) {
      setImmatError("Veuillez sélectionner ou saisir l'immatriculation concernée");
      return;
    }
    if (values.changement === "nom" && !nouveauNom.trim()) {
      setNouveauNomError("Veuillez saisir le nouveau nom");
      return;
    }
    if (!carteGriseFile) {
      setCarteGriseError(values.changement === "nom" ? "Veuillez uploader le justificatif (acte civil, acte de mariage...)" : "Veuillez uploader la nouvelle carte grise");
      return;
    }
    setImmatError("");
    setNouveauNomError("");
    setCarteGriseError("");
    setLoading(true);
    try {
      const typeMap: Record<string, RequestType> = {
        nom: "changement_nom",
        immatriculation: "changement_immatriculation",
      };
      const details: Record<string, unknown> = {};
      if (values.changement === "nom") {
        details.nouveau_nom = nouveauNom.trim();
      }
      if (values.changement === "immatriculation") {
        details.immatriculation = immatriculationFinale.trim();
        if (selectedVehicle) {
          details.emission_id = selectedVehicle.id;
          details.marque = selectedVehicle.marque;
          details.compagnie = selectedVehicle.compagnie;
          details.num_police = selectedVehicle.numPolice;
        }
      }
      const created = await requestsApi.create(typeMap[values.changement] || "changement_nom", details);
      await documentsApi.upload(carteGriseFile, created.id, false);
      toast.success("Votre demande de changement a été soumise.");
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
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-orange-600" />
            Demande de Changement
          </h1>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Formulaire de changement</CardTitle>
          <CardDescription>Sélectionnez le type de changement et uploadez la nouvelle carte grise.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Type de changement <span className="text-red-500">*</span></Label>
              <Controller
                name="changement"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={errors.changement ? "border-red-400" : ""}>
                      <SelectValue placeholder="Sélectionnez..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nom">Changement de Nom</SelectItem>
                      <SelectItem value="immatriculation">Changement d&apos;Immatriculation</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.changement?.message} />
            </div>

            {changement === "immatriculation" && (
              <div className="space-y-1.5">
                <Label>Véhicule concerné <span className="text-red-500">*</span></Label>
                {vehiclesLoading ? (
                  <p className="text-sm text-gray-400 py-2">Chargement de vos véhicules...</p>
                ) : (
                  <div className="space-y-2">
                    {vehicles.length === 0 ? (
                      <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        Aucun véhicule enregistré — saisissez l&apos;immatriculation manuellement.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {vehicles.map(v => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setSelectedVehicleId(v.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition ${
                              selectedVehicleId === v.id
                                ? "border-amber-500 bg-amber-50"
                                : "border-gray-200 hover:border-amber-300 hover:bg-amber-50/40"
                            }`}
                          >
                            <Car className={`h-5 w-5 shrink-0 ${selectedVehicleId === v.id ? "text-amber-600" : "text-gray-400"}`} />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-gray-900">
                                {v.immatriculation && v.immatriculation !== "-" ? v.immatriculation : <span className="text-gray-400 italic font-normal">Immatriculation non renseignée</span>}
                              </p>
                              <p className="text-xs text-gray-500">{[v.marque !== "-" ? v.marque : null, v.compagnie, v.numPolice].filter(Boolean).join(" · ")}</p>
                            </div>
                            {selectedVehicleId === v.id && (
                              <span className="text-xs font-semibold text-amber-600 bg-amber-100 rounded-full px-2 py-0.5">Sélectionné</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedVehicleId("autre")}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition ${
                        selectedVehicleId === "autre"
                          ? "border-gray-700 bg-gray-50"
                          : "border-dashed border-gray-300 hover:border-gray-500"
                      }`}
                    >
                      <PenLine className={`h-5 w-5 shrink-0 ${selectedVehicleId === "autre" ? "text-gray-700" : "text-gray-400"}`} />
                      <span className="text-sm text-gray-600">Autre immatriculation</span>
                    </button>
                    {(selectedVehicleId === "autre" || (selectedVehicle && !selectedHasImmat)) && (
                      <Input
                        placeholder="Ex : AA-1234-CI"
                        value={autreImmat}
                        onChange={e => { setAutreImmat(e.target.value.toUpperCase()); setImmatError(""); }}
                        className="uppercase font-mono"
                        autoFocus
                      />
                    )}
                    {immatError && <p className="text-xs text-red-500">{immatError}</p>}
                  </div>
                )}
              </div>
            )}

            {changement === "nom" && (
              <div className="space-y-1.5">
                <Label>Nouveau nom complet <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Ex : KOUAMÉ Jean-Baptiste"
                  value={nouveauNom}
                  onChange={e => { setNouveauNom(e.target.value); setNouveauNomError(""); }}
                  className={nouveauNomError ? "border-red-400" : ""}
                />
                {nouveauNomError && <p className="text-xs text-red-500">{nouveauNomError}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>{changement === "nom" ? "Justificatif (acte civil, mariage…)" : "Nouvelle carte grise"} <span className="text-red-500">*</span></Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => { setCarteGriseFile(e.target.files?.[0] || null); setCarteGriseError(""); }}
              />
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
                  carteGriseFile ? "border-green-300 bg-green-50"
                  : carteGriseError ? "border-red-300 bg-red-50"
                  : "border-gray-300 hover:border-[hsl(222,47%,20%)] hover:bg-blue-50/50"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className={`h-8 w-8 mx-auto mb-2 ${carteGriseFile ? "text-green-500" : "text-gray-400"}`} />
                {carteGriseFile ? (
                  <p className="text-sm text-green-700 font-medium">✓ {carteGriseFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-600">Cliquez pour uploader la nouvelle carte grise</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, JPG ou PNG (max 5MB)</p>
                  </>
                )}
              </div>
              {carteGriseError && <p className="text-xs text-red-500 mt-1">{carteGriseError}</p>}
            </div>

            <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white" disabled={loading}>
              <Send className="h-4 w-4 mr-2" />
              {loading ? "Envoi en cours..." : "Soumettre la demande"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Upload, ArrowLeft, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth-store";
import { useClientEmissions } from "@/hooks/use-api-data";
import { requestsApi, documentsApi } from "@/lib/api";
import { parseDisplayDate } from "@/lib/utils";
import { toast } from "sonner";
import { sinistreSchema, type SinistreValues } from "@/lib/validations";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-500 mt-1">{message}</p>;
}

export default function SinistrePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: emissions } = useClientEmissions(user?.id || "");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, control, handleSubmit, formState: { errors } } = useForm<SinistreValues>({
    resolver: zodResolver(sinistreSchema),
    defaultValues: {
      contratId: "", dateSinistre: "", heureSinistre: "", lieuSinistre: "",
      natureSinistre: "", circonstances: "", degatsMateriels: "", degatsCorporels: "",
      temoins: "", constatAmiable: "", pvPolice: "", observations: "",
    },
  });

  const contratId = useWatch({ control, name: "contratId" });
  const dateSinistre = useWatch({ control, name: "dateSinistre" });
  const selectedEmission = emissions.find((e) => e.id === contratId) ?? null;

  const coverageStatus = (() => {
    if (!selectedEmission || !dateSinistre) return null;
    const sinDate = new Date(dateSinistre);
    const effet = parseDisplayDate(selectedEmission.effet);
    const echeance = parseDisplayDate(selectedEmission.echeance);
    const isExpired = new Date() > echeance;
    if (sinDate < effet) return { type: "error", msg: `Le sinistre est antérieur à la date d'effet du contrat (${selectedEmission.effet}). Ce sinistre ne sera probablement pas couvert.` };
    if (sinDate > echeance) return { type: "error", msg: `Le sinistre est postérieur à l'échéance du contrat (${selectedEmission.echeance}). Ce sinistre ne sera probablement pas couvert.` };
    if (isExpired) return { type: "warning", msg: `Le contrat est expiré depuis le ${selectedEmission.echeance}, mais le sinistre est survenu pendant la période de couverture.` };
    return { type: "ok", msg: `Sinistre dans la période de couverture (${selectedEmission.effet} → ${selectedEmission.echeance}).` };
  })();

  const onSubmit = async (values: SinistreValues) => {
    setLoading(true);
    try {
      const created = await requestsApi.create("declaration_sinistre", {
        contrat_id: values.contratId,
        date_sinistre: values.dateSinistre,
        heure_sinistre: values.heureSinistre,
        lieu: values.lieuSinistre,
        nature: values.natureSinistre,
        circonstances: values.circonstances,
        degats_materiels: values.degatsMateriels,
        degats_corporels: values.degatsCorporels,
        temoins: values.temoins,
        constat_amiable: values.constatAmiable,
        pv_police: values.pvPolice,
        observations: values.observations,
      });
      for (const file of selectedFiles) {
        await documentsApi.upload(file, created.id, false);
      }
      toast.success("Votre déclaration de sinistre a été soumise.");
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
        <Button variant="ghost" size="icon" onClick={() => router.back()} disabled={loading}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            Déclaration de Sinistre
          </h1>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-sm text-red-800">
          <strong>Important :</strong> Déclarez votre sinistre dans les 5 jours ouvrables suivant sa survenance.
          Joignez toutes les pièces justificatives disponibles.
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Fiche de déclaration</CardTitle>
          <CardDescription>Renseignez les informations relatives au sinistre.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Contrat concerné <span className="text-red-500">*</span></Label>
              <Controller
                name="contratId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger className={errors.contratId ? "border-red-400" : ""}>
                      <SelectValue placeholder="Sélectionnez le contrat..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(emissions || []).map((e) => {
                        const expired = parseDisplayDate(e.echeance) < new Date();
                        return (
                          <SelectItem key={e.id} value={e.id}>
                            {expired ? "⚠️ " : ""}{e.risque} — {e.numPolice} ({e.marque !== "-" ? e.marque : e.compagnie})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.contratId?.message} />
              {selectedEmission && (
                <p className="text-xs text-gray-500">
                  Couverture : <strong>{selectedEmission.effet}</strong> → <strong>{selectedEmission.echeance}</strong>
                  {parseDisplayDate(selectedEmission.echeance) < new Date() && (
                    <span className="ml-2 text-orange-600 font-semibold">Contrat expiré</span>
                  )}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date du sinistre <span className="text-red-500">*</span></Label>
                <Input type="date" {...register("dateSinistre")} className={errors.dateSinistre ? "border-red-400" : ""} />
                <FieldError message={errors.dateSinistre?.message} />
                {coverageStatus && (
                  <div className={`mt-1 text-xs rounded-lg px-3 py-2 flex items-start gap-1.5 ${
                    coverageStatus.type === "error" ? "bg-red-50 text-red-700 border border-red-200" :
                    coverageStatus.type === "warning" ? "bg-orange-50 text-orange-700 border border-orange-200" :
                    "bg-green-50 text-green-700 border border-green-200"
                  }`}>
                    <span className="shrink-0">{coverageStatus.type === "ok" ? "✅" : "⚠️"}</span>
                    <span>{coverageStatus.msg}</span>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Heure du sinistre</Label>
                <Input type="time" {...register("heureSinistre")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Lieu du sinistre <span className="text-red-500">*</span></Label>
              <Input placeholder="Adresse ou lieu précis" {...register("lieuSinistre")} className={errors.lieuSinistre ? "border-red-400" : ""} />
              <FieldError message={errors.lieuSinistre?.message} />
            </div>

            <div className="space-y-1.5">
              <Label>Nature du sinistre <span className="text-red-500">*</span></Label>
              <Controller
                name="natureSinistre"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger className={errors.natureSinistre ? "border-red-400" : ""}>
                      <SelectValue placeholder="Sélectionnez..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accident">Accident de circulation</SelectItem>
                      <SelectItem value="vol">Vol</SelectItem>
                      <SelectItem value="incendie">Incendie</SelectItem>
                      <SelectItem value="degats_eaux">Dégâts des eaux</SelectItem>
                      <SelectItem value="bris_glaces">Bris de glaces</SelectItem>
                      <SelectItem value="vandalisme">Vandalisme</SelectItem>
                      <SelectItem value="catastrophe_naturelle">Catastrophe naturelle</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.natureSinistre?.message} />
            </div>

            <div className="space-y-1.5">
              <Label>Circonstances détaillées <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="Décrivez les circonstances du sinistre..."
                rows={4}
                {...register("circonstances")}
                className={errors.circonstances ? "border-red-400" : ""}
              />
              <FieldError message={errors.circonstances?.message} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Dégâts matériels</Label>
                <Textarea placeholder="Décrivez les dégâts matériels..." rows={3} {...register("degatsMateriels")} />
              </div>
              <div className="space-y-1.5">
                <Label>Dégâts corporels</Label>
                <Textarea placeholder="Décrivez les dégâts corporels..." rows={3} {...register("degatsCorporels")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Témoins</Label>
              <Input placeholder="Nom et coordonnées des témoins éventuels" {...register("temoins")} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>N° constat amiable</Label>
                <Input {...register("constatAmiable")} />
              </div>
              <div className="space-y-1.5">
                <Label>N° PV de police</Label>
                <Input {...register("pvPolice")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Observations</Label>
              <Textarea placeholder="Toute information complémentaire..." rows={2} {...register("observations")} />
            </div>

            <div className="space-y-1.5">
              <Label>Photos / Documents justificatifs</Label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setSelectedFiles((prev) => [...prev, ...files]);
                }}
              />
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
                  selectedFiles.length > 0 ? "border-green-300 bg-green-50" : "border-gray-300 hover:border-[hsl(222,47%,20%)] hover:bg-blue-50/50"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className={`h-8 w-8 mx-auto mb-2 ${selectedFiles.length > 0 ? "text-green-500" : "text-gray-400"}`} />
                {selectedFiles.length > 0 ? (
                  <div className="space-y-1">
                    {selectedFiles.map((f, i) => (
                      <p key={i} className="text-sm text-green-700 font-medium">✓ {f.name}</p>
                    ))}
                    <p className="text-xs text-gray-500 mt-1">Cliquez pour ajouter d&apos;autres fichiers</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-600">Cliquez pour ajouter des photos ou documents</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF (max 10MB par fichier)</p>
                  </>
                )}
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white">
              <Send className="h-4 w-4 mr-2" />
              {loading ? "Envoi en cours..." : "Déclarer le sinistre"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

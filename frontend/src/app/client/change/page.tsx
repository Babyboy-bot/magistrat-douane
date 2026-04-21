"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Upload, ArrowLeft, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { requestsApi, documentsApi } from "@/lib/api";
import type { RequestType } from "@/lib/types";
import { toast } from "sonner";

export default function ChangePage() {
  const router = useRouter();
  const [changement, setChangement] = useState("");
  const [carteGriseFile, setCarteGriseFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!changement) {
      toast.error("Veuillez sélectionner le type de changement");
      return;
    }
    if (!carteGriseFile) {
      toast.error("Veuillez uploader la nouvelle carte grise");
      return;
    }
    setLoading(true);
    try {
      const typeMap: Record<string, RequestType> = {
        nom: "changement_nom",
        immatriculation: "changement_immatriculation",
      };
      const created = await requestsApi.create(typeMap[changement] || "changement_nom", {});
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
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Type de changement *</Label>
            <Select value={changement} onValueChange={setChangement}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nom">Changement de Nom</SelectItem>
                <SelectItem value="immatriculation">Changement d&apos;Immatriculation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Nouvelle carte grise *</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => setCarteGriseFile(e.target.files?.[0] || null)}
            />
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
                carteGriseFile
                  ? "border-green-300 bg-green-50"
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
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            disabled={loading}
          >
            <Send className="h-4 w-4 mr-2" />
            {loading ? "Envoi en cours..." : "Soumettre la demande"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

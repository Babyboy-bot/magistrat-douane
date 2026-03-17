"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Car, Upload, ArrowLeft, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth-store";
import { requestsApi, documentsApi } from "@/lib/api";
import { toast } from "sonner";

export default function CotationAutoPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [carteGriseFile, setCarteGriseFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
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
  });

  const handleCarteGriseUpload = () => {
    fileInputRef.current?.click();
  };

  const handleCarteGriseSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCarteGriseFile(file);
    toast.success(`Carte grise "${file.name}" sélectionnée`);
  };

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!carteGriseFile) {
      toast.error("Veuillez sélectionner votre carte grise");
      return;
    }
    if (!form.marque || !form.immatriculation) {
      toast.error("Veuillez renseigner au minimum la marque et l'immatriculation");
      return;
    }
    setLoading(true);
    try {
      const created = await requestsApi.create("cotation_auto", { ...form });
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
          {/* Input file caché pour la carte grise */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleCarteGriseSelected}
            className="hidden"
          />
          
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
              carteGriseFile
                ? "border-green-300 bg-green-50"
                : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"
            }`}
            onClick={handleCarteGriseUpload}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nom & Prénoms</Label>
              <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Marque / Modèle *</Label>
              <Input value={form.marque} onChange={(e) => setForm({ ...form, marque: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Immatriculation *</Label>
              <Input value={form.immatriculation} onChange={(e) => setForm({ ...form, immatriculation: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Genre</Label>
              <Input value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Énergie</Label>
              <Input value={form.energie} onChange={(e) => setForm({ ...form, energie: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Puissance fiscale (CV)</Label>
              <Input value={form.puissanceFiscale} onChange={(e) => setForm({ ...form, puissanceFiscale: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Places assises</Label>
              <Input value={form.placesAssises} onChange={(e) => setForm({ ...form, placesAssises: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Date mise en circulation</Label>
              <Input type="date" value={form.dateMiseCirculation} onChange={(e) => setForm({ ...form, dateMiseCirculation: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Usage</Label>
              <Input value={form.usage} onChange={(e) => setForm({ ...form, usage: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Valeur neuve (FCFA)</Label>
              <Input type="number" value={form.valeurNeuve} onChange={(e) => setForm({ ...form, valeurNeuve: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Valeur vénale (FCFA)</Label>
              <Input type="number" value={form.valeurVenale} onChange={(e) => setForm({ ...form, valeurVenale: e.target.value })} />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
            <Send className="h-4 w-4 mr-2" /> {loading ? "Envoi en cours..." : "Demander la cotation"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Home, ArrowLeft, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth-store";
import { requestsApi } from "@/lib/api";
import { toast } from "sonner";

export default function CotationMRHPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [form, setForm] = useState({
    nom: user ? `${user.nom} ${user.prenoms}` : "",
    telephone: user?.telephone || "",
    email: user?.email || "",
    qualite: "" as "proprietaire" | "locataire" | "",
    nature: "" as "villa" | "appartement" | "niveau" | "",
    situationGeographique: "",
    valeurBatiment: "",
    loyerMensuel: "",
    valeurContenu: "",
    nombrePieces: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.nature || !form.qualite || !form.situationGeographique) {
      toast.error("Veuillez renseigner les champs obligatoires");
      return;
    }
    setLoading(true);
    try {
      await requestsApi.create("cotation_mrh", { ...form });
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
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
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
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nom & Prénoms</Label>
              <Input value={form.nom} onChange={(e) => handleChange("nom", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input value={form.telephone} onChange={(e) => handleChange("telephone", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Qualité *</Label>
            <Select value={form.qualite} onValueChange={(v) => handleChange("qualite", v)}>
              <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="proprietaire">Propriétaire</SelectItem>
                <SelectItem value="locataire">Locataire</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Nature du risque *</Label>
            <Select value={form.nature} onValueChange={(v) => handleChange("nature", v)}>
              <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="villa">Villa</SelectItem>
                <SelectItem value="appartement">Appartement</SelectItem>
                <SelectItem value="niveau">Niveau (immeuble)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Situation géographique *</Label>
            <Input
              placeholder="Ex: Cocody Riviera 3, Abidjan"
              value={form.situationGeographique}
              onChange={(e) => handleChange("situationGeographique", e.target.value)}
            />
          </div>

          {form.qualite === "proprietaire" ? (
            <div className="space-y-1.5">
              <Label>Valeur du bâtiment (FCFA)</Label>
              <Input type="number" placeholder="Ex: 80 000 000" value={form.valeurBatiment} onChange={(e) => handleChange("valeurBatiment", e.target.value)} />
            </div>
          ) : form.qualite === "locataire" ? (
            <div className="space-y-1.5">
              <Label>Loyer mensuel (FCFA)</Label>
              <Input type="number" placeholder="Ex: 250 000" value={form.loyerMensuel} onChange={(e) => handleChange("loyerMensuel", e.target.value)} />
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valeur du contenu (FCFA)</Label>
              <Input type="number" placeholder="Ex: 15 000 000" value={form.valeurContenu} onChange={(e) => handleChange("valeurContenu", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Nombre de pièces</Label>
              <Input type="number" value={form.nombrePieces} onChange={(e) => handleChange("nombrePieces", e.target.value)} />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
            <Send className="h-4 w-4 mr-2" /> Demander la cotation
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

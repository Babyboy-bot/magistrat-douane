"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload, ArrowLeft, ArrowRight, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth-store";
import { requestsApi, documentsApi } from "@/lib/api";
import { toast } from "sonner";

export default function IncorporationPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [carteGriseFile, setCarteGriseFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [souscripteur, setSouscripteur] = useState({
    nom: user ? `${user.nom} ${user.prenoms}` : "",
    profession: user?.profession || "",
    adressePostale: "",
    telephone: user?.telephone || "",
  });

  const [vehicule, setVehicule] = useState({
    proprietaire: "",
    immatriculation: "",
    marque: "",
    genre: "",
    usage: "",
    energie: "",
    puissanceFiscale: "",
    placesAssises: "",
    ptac: "",
    pv: "",
    cu: "",
    dateMiseCirculation: "",
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
    toast.success(`Carte grise "${file.name}" sélectionnée — elle sera jointe à votre demande`);
  };

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const created = await requestsApi.create("incorporation", { souscripteur, vehicule });
      if (carteGriseFile) {
        await documentsApi.upload(carteGriseFile, created.id, false);
      }
      toast.success("Votre demande d'incorporation a été soumise.");
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
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nom & Prénoms *</Label>
              <Input value={souscripteur.nom} onChange={(e) => setSouscripteur({ ...souscripteur, nom: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Profession *</Label>
              <Input value={souscripteur.profession} onChange={(e) => setSouscripteur({ ...souscripteur, profession: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Adresse postale *</Label>
              <Input placeholder="Votre adresse" value={souscripteur.adressePostale} onChange={(e) => setSouscripteur({ ...souscripteur, adressePostale: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone *</Label>
              <Input value={souscripteur.telephone} onChange={(e) => setSouscripteur({ ...souscripteur, telephone: e.target.value })} />
            </div>
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => {
                  if (!souscripteur.nom.trim()) { toast.error("Le nom & prénoms est obligatoire"); return; }
                  if (!souscripteur.profession.trim()) { toast.error("La profession est obligatoire"); return; }
                  if (!souscripteur.adressePostale.trim()) { toast.error("L'adresse postale est obligatoire"); return; }
                  if (!souscripteur.telephone.trim()) { toast.error("Le téléphone est obligatoire"); return; }
                  setStep(2);
                }}
                className="bg-[hsl(222,47%,20%)] hover:bg-[hsl(222,47%,25%)]"
                disabled={loading}
              >
                Suivant <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">2 — Véhicule à incorporer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
                carteGriseFile ? "border-green-300 bg-green-50" : "border-gray-300 hover:border-[hsl(222,47%,20%)] hover:bg-blue-50/50"
              }`}
              onClick={handleCarteGriseUpload}
            >
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleCarteGriseSelected} className="hidden" />
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
              {Object.entries({
                proprietaire: "Nom du propriétaire",
                immatriculation: "Immatriculation",
                marque: "Marque",
                genre: "Genre",
                usage: "Usage",
                energie: "Énergie",
                puissanceFiscale: "Puissance fiscale (CV)",
                placesAssises: "Places assises",
                ptac: "P.T.A.C.",
                pv: "P.V.",
                cu: "C.U.",
                dateMiseCirculation: "Date de mise en circulation",
              }).map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Input
                    type={key === "dateMiseCirculation" ? "date" : "text"}
                    value={vehicule[key as keyof typeof vehicule]}
                    onChange={(e) => setVehicule({ ...vehicule, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>

            <div className="border-t pt-4 grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valeur neuve (FCFA)</Label>
                <Input type="number" value={vehicule.valeurNeuve} onChange={(e) => setVehicule({ ...vehicule, valeurNeuve: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Valeur vénale (FCFA)</Label>
                <Input type="number" value={vehicule.valeurVenale} onChange={(e) => setVehicule({ ...vehicule, valeurVenale: e.target.value })} />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Précédent
              </Button>
              <Button onClick={handleSubmit} className="bg-amber-500 hover:bg-amber-600 text-white" disabled={loading}>
                <Send className="h-4 w-4 mr-2" /> {loading ? "Envoi..." : "Soumettre la demande"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

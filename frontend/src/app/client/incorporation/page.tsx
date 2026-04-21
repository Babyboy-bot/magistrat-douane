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

const GENRES_VEHICULE = [
  { label: "Voiture particulière", value: "Voiture particulière" },
  { label: "Taxi", value: "Taxi" },
  { label: "Taxi compteur", value: "Taxi compteur" },
  { label: "Moto", value: "Moto" },
  { label: "Tricycle", value: "Tricycle" },
  { label: "Minibus (≤ 9 places)", value: "Minibus" },
  { label: "Autocar (> 9 places)", value: "Autocar" },
  { label: "Camionnette", value: "Camionnette" },
  { label: "Camion", value: "Camion" },
  { label: "Camion-citerne", value: "Camion-citerne" },
  { label: "Tracteur routier", value: "Tracteur routier" },
  { label: "Remorque", value: "Remorque" },
  { label: "Semi-remorque", value: "Semi-remorque" },
  { label: "Engin de chantier", value: "Engin de chantier" },
];

const GENRES_LOURDS = new Set([
  "Camionnette", "Camion", "Camion-citerne",
  "Tracteur routier", "Remorque", "Semi-remorque", "Engin de chantier",
]);

const needsPtac = (genre: string) => GENRES_LOURDS.has(genre);

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
            {/* Carte grise */}
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

            {/* Champs obligatoires */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nom du propriétaire *</Label>
                <Input value={vehicule.proprietaire} onChange={(e) => setVehicule({ ...vehicule, proprietaire: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Immatriculation *</Label>
                <Input placeholder="Ex : AB-1234-CI" value={vehicule.immatriculation} onChange={(e) => setVehicule({ ...vehicule, immatriculation: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Marque *</Label>
                <Input placeholder="Ex : Toyota, Renault…" value={vehicule.marque} onChange={(e) => setVehicule({ ...vehicule, marque: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Genre *</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={vehicule.genre}
                  onChange={(e) => setVehicule({ ...vehicule, genre: e.target.value, ptac: "", pv: "", cu: "" })}
                >
                  <option value="">— Sélectionner —</option>
                  {GENRES_VEHICULE.map(g => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Énergie *</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={vehicule.energie}
                  onChange={(e) => setVehicule({ ...vehicule, energie: e.target.value })}
                >
                  <option value="">— Sélectionner —</option>
                  <option value="Essence">Essence</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Électrique">Électrique</option>
                  <option value="Hybride">Hybride</option>
                  <option value="GPL">GPL</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Places assises *</Label>
                <Input type="number" min="1" value={vehicule.placesAssises} onChange={(e) => setVehicule({ ...vehicule, placesAssises: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Date de mise en circulation *</Label>
                <Input type="date" value={vehicule.dateMiseCirculation} onChange={(e) => setVehicule({ ...vehicule, dateMiseCirculation: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Usage</Label>
                <Input placeholder="Ex : Personnel, Commercial…" value={vehicule.usage} onChange={(e) => setVehicule({ ...vehicule, usage: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Puissance fiscale (CV)</Label>
                <Input type="number" min="1" value={vehicule.puissanceFiscale} onChange={(e) => setVehicule({ ...vehicule, puissanceFiscale: e.target.value })} />
              </div>
            </div>

            {/* PTAC / PV / CU — uniquement pour véhicules lourds */}
            {needsPtac(vehicule.genre) && (
              <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                  Informations de charge — obligatoires pour ce type de véhicule
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>P.T.A.C. (kg) *</Label>
                    <Input type="number" min="0" placeholder="kg" value={vehicule.ptac} onChange={(e) => setVehicule({ ...vehicule, ptac: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>P.V. (kg) *</Label>
                    <Input type="number" min="0" placeholder="kg" value={vehicule.pv} onChange={(e) => setVehicule({ ...vehicule, pv: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>C.U. (kg) *</Label>
                    <Input type="number" min="0" placeholder="kg" value={vehicule.cu} onChange={(e) => setVehicule({ ...vehicule, cu: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            {/* Valeurs */}
            <div className="border-t pt-4 grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valeur neuve (FCFA) *</Label>
                <Input type="number" value={vehicule.valeurNeuve} onChange={(e) => setVehicule({ ...vehicule, valeurNeuve: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Valeur vénale (FCFA) *</Label>
                <Input type="number" value={vehicule.valeurVenale} onChange={(e) => setVehicule({ ...vehicule, valeurVenale: e.target.value })} />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Précédent
              </Button>
              <Button
                onClick={() => {
                  if (!vehicule.proprietaire.trim()) { toast.error("Le nom du propriétaire est obligatoire."); return; }
                  if (!vehicule.immatriculation.trim()) { toast.error("L'immatriculation est obligatoire."); return; }
                  if (!vehicule.marque.trim()) { toast.error("La marque est obligatoire."); return; }
                  if (!vehicule.genre) { toast.error("Le genre du véhicule est obligatoire."); return; }
                  if (!vehicule.energie) { toast.error("L'énergie est obligatoire."); return; }
                  if (!vehicule.placesAssises) { toast.error("Le nombre de places assises est obligatoire."); return; }
                  if (!vehicule.dateMiseCirculation) { toast.error("La date de mise en circulation est obligatoire."); return; }
                  if (needsPtac(vehicule.genre)) {
                    if (!vehicule.ptac) { toast.error("Le P.T.A.C. est obligatoire pour ce type de véhicule."); return; }
                    if (!vehicule.pv) { toast.error("Le P.V. est obligatoire pour ce type de véhicule."); return; }
                    if (!vehicule.cu) { toast.error("La C.U. est obligatoire pour ce type de véhicule."); return; }
                  }
                  if (!vehicule.valeurNeuve) { toast.error("La valeur neuve est obligatoire."); return; }
                  if (!vehicule.valeurVenale) { toast.error("La valeur vénale est obligatoire."); return; }
                  handleSubmit();
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white"
                disabled={loading}
              >
                <Send className="h-4 w-4 mr-2" /> {loading ? "Envoi..." : "Soumettre la demande"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Home, ArrowLeft, ArrowRight, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth-store";
import { requestsApi } from "@/lib/api";
import { toast } from "sonner";
import {
  mrhSouscripteurSchema,
  mrhRisqueSchema,
  type MRHSouscripteurValues,
  type MRHRisqueValues,
} from "@/lib/validations";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-500 mt-1">{message}</p>;
}

export default function HabitationSubscriptionPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);

  const step1Form = useForm<MRHSouscripteurValues>({
    resolver: zodResolver(mrhSouscripteurSchema),
    defaultValues: { nom: "", profession: "", adressePostale: "", telephone: "", qualite: "" },
  });

  const step2Form = useForm<MRHRisqueValues>({
    resolver: zodResolver(mrhRisqueSchema),
    defaultValues: {
      qualite: "",
      nature: "",
      nombreNiveaux: "",
      situationGeographique: "",
      valeurBatiment: "",
      loyerMensuel: "",
      valeurContenu: "",
      nombrePieces: "",
      superficieDeveloppee: "",
    },
  });

  useEffect(() => {
    if (!user) return;
    step1Form.reset({
      nom: `${user.nom || ""} ${user.prenoms || ""}`.trim(),
      profession: user.profession || "",
      adressePostale: "",
      telephone: user.telephone || "",
      qualite: "",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const qualiteValue = step1Form.watch("qualite");
  const natureValue = step2Form.watch("nature");

  const [securite, setSecurite] = useState({
    moyensIncendie: "Néant",
    moyensVol: "non" as "oui" | "non",
    detailsSysteme: "",
    naturePortesFenetres: "",
    antiVol: false,
    domestiques: false,
    gardien: false,
    chienDeGarde: false,
  });

  const [garanties, setGaranties] = useState({
    incendie: true,
    degatsEaux: false,
    vol: false,
    brisGlaces: false,
    dommagesElectriques: false,
    rcChefFamille: false,
    autres: "",
  });

  const [loading, setLoading] = useState(false);

  const onStep1Next = step1Form.handleSubmit((data) => {
    step2Form.setValue("qualite", data.qualite);
    setStep(2);
  });

  const onStep2Next = step2Form.handleSubmit(() => setStep(3));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const souscripteur = step1Form.getValues();
      const risque = step2Form.getValues();
      await requestsApi.create("souscription_mrh", {
        souscripteur,
        risque,
        securite,
        garanties,
      });
      toast.success("Votre demande de souscription MRH a été soumise.");
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
            <Home className="h-6 w-6 text-green-600" />
            Multirisque Habitation
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Étape {step} sur 4</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${step >= s ? "bg-[hsl(222,47%,20%)]" : "bg-gray-200"}`}
          />
        ))}
      </div>

      {/* Step 1: Souscripteur */}
      {step === 1 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">1 — Identification du souscripteur</CardTitle>
            <CardDescription>Informations pré-remplies, modifiables si nécessaire.</CardDescription>
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
              <div className="space-y-1.5">
                <Label>Qualité par rapport au bâtiment <span className="text-red-500">*</span></Label>
                <div className="flex gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="proprietaire"
                      {...step1Form.register("qualite")}
                      className="accent-[hsl(222,47%,20%)]"
                    />
                    <span className="text-sm">Propriétaire</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="locataire"
                      {...step1Form.register("qualite")}
                      className="accent-[hsl(222,47%,20%)]"
                    />
                    <span className="text-sm">Locataire</span>
                  </label>
                </div>
                <FieldError message={step1Form.formState.errors.qualite?.message} />
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

      {/* Step 2: Risque */}
      {step === 2 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">2 — Identification du risque</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onStep2Next} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nature du risque <span className="text-red-500">*</span></Label>
                <div className="flex gap-4 pt-1 flex-wrap">
                  {(["villa", "appartement", "niveau"] as const).map((n) => (
                    <label key={n} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value={n}
                        {...step2Form.register("nature")}
                        className="accent-[hsl(222,47%,20%)]"
                      />
                      <span className="text-sm capitalize">{n === "niveau" ? "Niveau (immeuble)" : n}</span>
                    </label>
                  ))}
                </div>
                <FieldError message={step2Form.formState.errors.nature?.message} />
              </div>
              {natureValue === "niveau" && (
                <div className="space-y-1.5">
                  <Label>Nombre de niveaux <span className="text-red-500">*</span></Label>
                  <Input type="number" min={1} {...step2Form.register("nombreNiveaux")} className={step2Form.formState.errors.nombreNiveaux ? "border-red-400" : ""} />
                  <FieldError message={step2Form.formState.errors.nombreNiveaux?.message} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Situation géographique <span className="text-red-500">*</span></Label>
                <Input placeholder="Ex: Cocody Riviera 3, Abidjan" {...step2Form.register("situationGeographique")} className={step2Form.formState.errors.situationGeographique ? "border-red-400" : ""} />
                <FieldError message={step2Form.formState.errors.situationGeographique?.message} />
              </div>
              {qualiteValue === "proprietaire" ? (
                <div className="space-y-1.5">
                  <Label>Valeur du bâtiment (FCFA) <span className="text-red-500">*</span></Label>
                  <Input type="number" min={0} placeholder="Ex: 80 000 000" {...step2Form.register("valeurBatiment")} className={step2Form.formState.errors.valeurBatiment ? "border-red-400" : ""} />
                  <FieldError message={step2Form.formState.errors.valeurBatiment?.message} />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Loyer mensuel (FCFA) <span className="text-red-500">*</span></Label>
                  <Input type="number" min={0} placeholder="Ex: 250 000" {...step2Form.register("loyerMensuel")} className={step2Form.formState.errors.loyerMensuel ? "border-red-400" : ""} />
                  <FieldError message={step2Form.formState.errors.loyerMensuel?.message} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Valeur du contenu (mobilier, appareils, effets personnels) <span className="text-red-500">*</span></Label>
                <Input type="number" min={0} placeholder="Ex: 15 000 000" {...step2Form.register("valeurContenu")} className={step2Form.formState.errors.valeurContenu ? "border-red-400" : ""} />
                <FieldError message={step2Form.formState.errors.valeurContenu?.message} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nombre de pièces <span className="text-red-500">*</span></Label>
                  <Input type="number" min={1} {...step2Form.register("nombrePieces")} className={step2Form.formState.errors.nombrePieces ? "border-red-400" : ""} />
                  <FieldError message={step2Form.formState.errors.nombrePieces?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label>Superficie développée (m²)</Label>
                  <Input type="number" min={0} placeholder="Optionnel" {...step2Form.register("superficieDeveloppee")} />
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={loading}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Précédent
                </Button>
                <Button type="submit" className="bg-[hsl(222,47%,20%)] hover:bg-[hsl(222,47%,25%)]" disabled={loading}>
                  Suivant <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Sécurité */}
      {step === 3 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">3 — Système de sécurité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Moyens de sécurité contre l&apos;incendie</Label>
              <Input value="Néant" disabled className="bg-gray-50" />
            </div>
            <div className="space-y-1.5">
              <Label>Moyens de sécurité contre le vol <span className="text-red-500">*</span></Label>
              <Select
                value={securite.moyensVol}
                onValueChange={(v) => setSecurite({ ...securite, moyensVol: v as "oui" | "non" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oui">Oui</SelectItem>
                  <SelectItem value="non">Non</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {securite.moyensVol === "oui" && (
              <>
                <div className="space-y-1.5">
                  <Label>Détails du système</Label>
                  <Input
                    placeholder="Décrivez votre système de sécurité"
                    value={securite.detailsSysteme}
                    onChange={(e) => setSecurite({ ...securite, detailsSysteme: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Nature des portes et fenêtres</Label>
                  <Input
                    placeholder="Ex: Portes blindées, fenêtres à barreaux"
                    value={securite.naturePortesFenetres}
                    onChange={(e) => setSecurite({ ...securite, naturePortesFenetres: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dispositifs de sécurité</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={securite.antiVol}
                        onCheckedChange={(c) => setSecurite({ ...securite, antiVol: !!c })}
                      />
                      <span className="text-sm">Anti-vol</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={securite.domestiques}
                        onCheckedChange={(c) => setSecurite({ ...securite, domestiques: !!c })}
                      />
                      <span className="text-sm">Domestiques</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={securite.gardien}
                        onCheckedChange={(c) => setSecurite({ ...securite, gardien: !!c })}
                      />
                      <span className="text-sm">Gardien de jour ou de nuit</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={securite.chienDeGarde}
                        onCheckedChange={(c) => setSecurite({ ...securite, chienDeGarde: !!c })}
                      />
                      <span className="text-sm">Chien de garde</span>
                    </label>
                  </div>
                </div>
              </>
            )}
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)} disabled={loading}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Précédent
              </Button>
              <Button onClick={() => setStep(4)} className="bg-[hsl(222,47%,20%)] hover:bg-[hsl(222,47%,25%)]" disabled={loading}>
                Suivant <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Garanties */}
      {step === 4 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">4 — Garanties souhaitées</CardTitle>
            <CardDescription>Sélectionnez les garanties que vous souhaitez inclure.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Checkbox checked={true} disabled />
                <div>
                  <span className="text-sm font-medium">Incendie et risques assimilés</span>
                  <span className="text-xs text-blue-600 ml-2">(obligatoire)</span>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition">
                <Checkbox
                  checked={garanties.degatsEaux}
                  onCheckedChange={(c) => setGaranties({ ...garanties, degatsEaux: !!c })}
                />
                <span className="text-sm">Dégâts des eaux</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition">
                <Checkbox
                  checked={garanties.vol}
                  onCheckedChange={(c) => setGaranties({ ...garanties, vol: !!c })}
                />
                <span className="text-sm">Vol</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition">
                <Checkbox
                  checked={garanties.brisGlaces}
                  onCheckedChange={(c) => setGaranties({ ...garanties, brisGlaces: !!c })}
                />
                <span className="text-sm">Bris de glaces</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition">
                <Checkbox
                  checked={garanties.dommagesElectriques}
                  onCheckedChange={(c) => setGaranties({ ...garanties, dommagesElectriques: !!c })}
                />
                <span className="text-sm">Dommages électriques</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition">
                <Checkbox
                  checked={garanties.rcChefFamille}
                  onCheckedChange={(c) => setGaranties({ ...garanties, rcChefFamille: !!c })}
                />
                <span className="text-sm">RC chef de famille</span>
              </label>
              <div className="space-y-1.5">
                <Label>Autres (à préciser)</Label>
                <Input
                  placeholder="Précisez les garanties supplémentaires souhaitées"
                  value={garanties.autres}
                  onChange={(e) => setGaranties({ ...garanties, autres: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(3)} disabled={loading}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Précédent
              </Button>
              <Button onClick={handleSubmit} className="bg-amber-500 hover:bg-amber-600 text-white" disabled={loading}>
                <Send className="h-4 w-4 mr-2" /> {loading ? "Envoi..." : "Souscrire"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

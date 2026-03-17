"use client";

import { useState } from "react";
import { Camera, Save, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/auth-store";
import { authApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { PROFESSION_LABELS } from "@/lib/types";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user, updateProfile } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    nom: user?.nom || "",
    prenoms: user?.prenoms || "",
    profession: user?.profession || "",
    telephone: user?.telephone || "",
    telephone2: user?.telephone2 || "",
    email: user?.email || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    newPassword: "",
    confirm: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      const updated = await authApi.updateProfile({
        nom: form.nom,
        prenoms: form.prenoms,
        profession: form.profession,
        telephone: form.telephone,
        telephone2: form.telephone2,
      });
      updateProfile(updated);
      toast.success("Profil mis à jour avec succès");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current || !passwordForm.newPassword || !passwordForm.confirm) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    try {
      await authApi.changePassword(passwordForm.current, passwordForm.newPassword);
      toast.success("Mot de passe modifié avec succès");
      setPasswordForm({ current: "", newPassword: "", confirm: "" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du changement de mot de passe");
    }
  };

  const initials = user ? `${user.nom[0]}${user.prenoms[0]}` : "U";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon Profil</h1>
        <p className="text-gray-500 mt-1">Gérez vos informations personnelles</p>
      </div>

      {/* Photo */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-[hsl(222,47%,20%)] text-white text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-amber-400 flex items-center justify-center text-white shadow-lg hover:bg-amber-500 transition">
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div>
              <p className="font-semibold text-lg">{user?.nom} {user?.prenoms}</p>
              <p className="text-sm text-gray-500">{user?.profession}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">{user?.professionType ? PROFESSION_LABELS[user.professionType] : ""}</Badge>
                {user?.verified ? (
                  <Badge className="text-xs bg-green-100 text-green-700">Vérifié</Badge>
                ) : (
                  <Badge className="text-xs bg-amber-100 text-amber-700">En attente de vérification</Badge>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">Membre depuis {user?.createdAt}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal info */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nom</Label>
              <Input value={form.nom} onChange={(e) => handleChange("nom", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Prénoms</Label>
              <Input value={form.prenoms} onChange={(e) => handleChange("prenoms", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Fonction</Label>
            <Input value={form.profession} onChange={(e) => handleChange("profession", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Catégorie</Label>
            <Input value={user?.professionType ? PROFESSION_LABELS[user.professionType] : ""} disabled className="bg-gray-50" />
            <p className="text-xs text-gray-400">La catégorie est définie lors de l&apos;inscription et ne peut être modifiée ici.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Téléphone principal</Label>
              <Input value={form.telephone} onChange={(e) => handleChange("telephone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone secondaire</Label>
              <Input
                value={form.telephone2}
                onChange={(e) => handleChange("telephone2", e.target.value)}
                placeholder="Optionnel"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
          </div>
          <Button onClick={handleSaveProfile} className="bg-[hsl(222,47%,20%)] hover:bg-[hsl(222,47%,25%)]">
            <Save className="h-4 w-4 mr-2" />
            Enregistrer les modifications
          </Button>
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Modifier le mot de passe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Mot de passe actuel</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={passwordForm.current}
                onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nouveau mot de passe</Label>
              <Input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmer</Label>
              <Input
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={handleChangePassword} variant="outline">
            Changer le mot de passe
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

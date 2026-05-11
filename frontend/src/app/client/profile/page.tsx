"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Save, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/auth-store";
import { authApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { PROFESSION_LABELS } from "@/lib/types";
import { toast } from "sonner";
import { profileSchema, passwordSchema, type ProfileValues, type PasswordValues } from "@/lib/validations";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-500 mt-1">{message}</p>;
}

export default function ProfilePage() {
  const { user, updateProfile, patchUser } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nom: user?.nom || "",
      prenoms: user?.prenoms || "",
      profession: user?.profession || "",
      telephone: user?.telephone || "",
      telephone2: user?.telephone2 || "",
    },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: "", newPassword: "", confirm: "" },
  });

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoInputRef.current) photoInputRef.current.value = "";
    try {
      const updatedUser = await authApi.uploadPhoto(file);
      patchUser(updatedUser);
      toast.success("Photo de profil mise à jour");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'upload");
    }
  };

  const onSaveProfile = profileForm.handleSubmit(async (data) => {
    try {
      const updated = await authApi.updateProfile({
        nom: data.nom,
        prenoms: data.prenoms,
        profession: data.profession,
        telephone: data.telephone,
        telephone2: data.telephone2,
      });
      updateProfile(updated);
      toast.success("Profil mis à jour avec succès");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    }
  });

  const onChangePassword = passwordForm.handleSubmit(async (data) => {
    try {
      await authApi.changePassword(data.current, data.newPassword);
      toast.success("Mot de passe modifié avec succès");
      passwordForm.reset();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du changement de mot de passe");
    }
  });

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
                {user?.photo && <AvatarImage src={user.photo} alt="Photo de profil" className="object-cover" />}
                <AvatarFallback className="bg-[hsl(222,47%,20%)] text-white text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-amber-400 flex items-center justify-center text-white shadow-lg hover:bg-amber-500 transition"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
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
        <CardContent>
          <form onSubmit={onSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nom <span className="text-red-500">*</span></Label>
                <Input {...profileForm.register("nom")} className={profileForm.formState.errors.nom ? "border-red-400" : ""} />
                <FieldError message={profileForm.formState.errors.nom?.message} />
              </div>
              <div className="space-y-1.5">
                <Label>Prénoms <span className="text-red-500">*</span></Label>
                <Input {...profileForm.register("prenoms")} className={profileForm.formState.errors.prenoms ? "border-red-400" : ""} />
                <FieldError message={profileForm.formState.errors.prenoms?.message} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Fonction</Label>
              <Input {...profileForm.register("profession")} />
            </div>
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <Input value={user?.professionType ? PROFESSION_LABELS[user.professionType] : ""} disabled className="bg-gray-50" />
              <p className="text-xs text-gray-400">La catégorie est définie lors de l&apos;inscription et ne peut être modifiée ici.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Téléphone principal <span className="text-red-500">*</span></Label>
                <Input {...profileForm.register("telephone")} className={profileForm.formState.errors.telephone ? "border-red-400" : ""} />
                <FieldError message={profileForm.formState.errors.telephone?.message} />
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone secondaire</Label>
                <Input {...profileForm.register("telephone2")} placeholder="Optionnel" />
              </div>
            </div>
            <Button type="submit" className="bg-[hsl(222,47%,20%)] hover:bg-[hsl(222,47%,25%)]">
              <Save className="h-4 w-4 mr-2" />
              Enregistrer les modifications
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Modifier le mot de passe</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Mot de passe actuel <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  {...passwordForm.register("current")}
                  className={`pr-10 ${passwordForm.formState.errors.current ? "border-red-400" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FieldError message={passwordForm.formState.errors.current?.message} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nouveau mot de passe <span className="text-red-500">*</span></Label>
                <Input
                  type="password"
                  {...passwordForm.register("newPassword")}
                  className={passwordForm.formState.errors.newPassword ? "border-red-400" : ""}
                />
                <FieldError message={passwordForm.formState.errors.newPassword?.message} />
              </div>
              <div className="space-y-1.5">
                <Label>Confirmer <span className="text-red-500">*</span></Label>
                <Input
                  type="password"
                  {...passwordForm.register("confirm")}
                  className={passwordForm.formState.errors.confirm ? "border-red-400" : ""}
                />
                <FieldError message={passwordForm.formState.errors.confirm?.message} />
              </div>
            </div>
            <Button type="submit" variant="outline">
              Changer le mot de passe
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Save, Eye, EyeOff, Mail, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/auth-store";
import { authApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/brand";
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
  const [resending, setResending] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    authApi.me().then(patchUser).catch(() => {});
  }, [patchUser]);

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await authApi.resendVerificationEmail();
      toast.success(res.detail);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Envoi impossible, réessayez plus tard");
    } finally {
      setResending(false);
    }
  };

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
      <PageHeader
        eyebrow="Mon espace"
        title="Mon profil"
        description="Gérez vos informations personnelles"
      />

      {/* Photo */}
      <Card className="rounded-2xl border-navy-100 shadow-[0_1px_2px_rgb(16_28_52/0.04)]">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20 ring-2 ring-amber-300/50">
                {user?.photo && <AvatarImage src={user.photo} alt="Photo de profil" className="object-cover" />}
                <AvatarFallback className="bg-navy-800 text-amber-300 text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center text-navy-950 shadow-lg hover:bg-amber-600 transition"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
            <div>
              <p className="font-display font-semibold text-lg text-navy-900">{user?.nom} {user?.prenoms}</p>
              <p className="text-sm text-navy-400">{user?.profession}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="border-navy-200 bg-navy-100 text-xs text-navy-700">{user?.professionType ? PROFESSION_LABELS[user.professionType] : ""}</Badge>
                {user?.verified ? (
                  <Badge className="border-emerald-200 bg-emerald-100 text-xs text-emerald-800">Vérifié</Badge>
                ) : (
                  <Badge className="border-amber-200 bg-amber-100 text-xs text-amber-800">En attente de vérification</Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-navy-300">Membre depuis {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email */}
      {user?.email && (
        <Card className="rounded-2xl border-navy-100 shadow-[0_1px_2px_rgb(16_28_52/0.04)]">
          <CardContent className="pt-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="h-4 w-4 shrink-0 text-navy-300" />
                <span className="truncate text-sm font-medium text-navy-900">{user.email}</span>
              </div>
              {user.emailVerified ? (
                <Badge className="border-emerald-200 bg-emerald-100 text-xs text-emerald-800">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Email confirmé
                </Badge>
              ) : (
                <Badge className="border-amber-200 bg-amber-100 text-xs text-amber-800">
                  <AlertTriangle className="mr-1 h-3 w-3" /> Email non confirmé
                </Badge>
              )}
            </div>
            {!user.emailVerified && (
              <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p>
                  Confirmez votre adresse pour recevoir les informations importantes sur vos contrats
                  et pouvoir récupérer votre compte en cas d&apos;oubli du mot de passe.
                </p>
                <Button type="button" size="sm" variant="outline" onClick={handleResend} disabled={resending}
                  className="rounded-lg border-amber-300 bg-white hover:bg-amber-100">
                  {resending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Mail className="mr-1 h-3.5 w-3.5" />}
                  Renvoyer l&apos;email de confirmation
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Personal info */}
      <Card className="rounded-2xl border-navy-100 shadow-[0_1px_2px_rgb(16_28_52/0.04)]">
        <CardHeader>
          <CardTitle className="font-display text-lg font-semibold text-navy-900">Informations personnelles</CardTitle>
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
              <Input value={user?.professionType ? PROFESSION_LABELS[user.professionType] : ""} disabled className="bg-navy-50/60" />
              <p className="text-xs text-navy-400">La catégorie est définie lors de l&apos;inscription et ne peut être modifiée ici.</p>
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
            <Button type="submit" className="rounded-xl bg-navy-900 font-semibold hover:bg-navy-800">
              <Save className="mr-2 h-4 w-4" />
              Enregistrer les modifications
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="rounded-2xl border-navy-100 shadow-[0_1px_2px_rgb(16_28_52/0.04)]">
        <CardHeader>
          <CardTitle className="font-display text-lg font-semibold text-navy-900">Modifier le mot de passe</CardTitle>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-300 hover:text-navy-700"
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
            <Button type="submit" variant="outline" className="rounded-xl border-navy-200">
              Changer le mot de passe
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

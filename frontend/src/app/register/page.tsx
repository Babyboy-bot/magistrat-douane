"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/brand";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import Link from "next/link";
import type { Profession } from "@/lib/types";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

const getDashboardUrl = (role: string): string => {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "agent":
      return "/agent/dashboard";
    case "client":
    case "prospect":
      return "/client/dashboard";
    default:
      return "/client/dashboard";
  }
};

export default function RegisterPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    prenoms: "",
    professionType: "" as Profession | "",
    professionDetail: "",
    telephone: "+225 ",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { nom, prenoms, professionType, telephone, email, password, confirmPassword } = form;

    // « +225 » seul compte comme un champ vide
    if (!nom || !prenoms || !professionType || !telephone.replace(/^\+225\s*$/, "").trim() || !email || !password || !confirmPassword) {
      toast.error("Tous les champs obligatoires doivent être remplis");
      return;
    }

    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);
    try {
      await authApi.register({
        nom,
        prenoms,
        profession: form.professionDetail,
        profession_type: professionType,
        telephone,
        email,
        password,
      });
      
      // Connecter automatiquement l'utilisateur après l'inscription
      const loginSuccess = await login(email, password);
      
      if (loginSuccess) {
        toast.success(
          "Inscription réussie ! Vous êtes maintenant connecté."
        );
        const latestUser = useAuthStore.getState().user;
        const dashboardUrl = getDashboardUrl(latestUser?.role || "prospect");
        setTimeout(() => {
          window.location.href = dashboardUrl;
        }, 800);
      } else {
        toast.success(
          "Inscription réussie ! Veuillez vous connecter."
        );
        router.push("/login");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'inscription";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Inscription"
      description="Créez votre compte pour accéder à la plateforme"
      heroTitle={<>Créez votre compte <span className="text-amber-300">en quelques minutes</span></>}
      heroLead="Rejoignez la plateforme réservée aux magistrats et douaniers et gérez vos contrats d'assurance en ligne."
    >
      <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="nom">Nom *</Label>
                    <Input
                      id="nom"
                      placeholder="KOUASSI"
                      value={form.nom}
                      onChange={(e) => handleChange("nom", e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="prenoms">Prénoms *</Label>
                    <Input
                      id="prenoms"
                      placeholder="Jean-Baptiste"
                      value={form.prenoms}
                      onChange={(e) => handleChange("prenoms", e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Vous êtes <span className="text-red-500">*</span></Label>
                  <Select
                    value={form.professionType}
                    onValueChange={(v) => handleChange("professionType", v)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Sélectionnez votre catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="magistrat">Magistrat</SelectItem>
                      <SelectItem value="douanier">Douanier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="professionDetail">Précisez votre fonction *</Label>
                  <Input
                    id="professionDetail"
                    placeholder={form.professionType === "magistrat" ? "Ex: Juge d'instruction, Procureur..." : form.professionType === "douanier" ? "Ex: Inspecteur des douanes, Contrôleur..." : "Votre profession"}
                    value={form.professionDetail}
                    onChange={(e) => handleChange("professionDetail", e.target.value)}
                    className="h-10"
                  />
                </div>

                {(form.professionType === "magistrat" || form.professionType === "douanier") && (
                  <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <p className="text-xs leading-relaxed text-amber-800">
                      <strong>Note :</strong> En tant que {form.professionType === "magistrat" ? "magistrat" : "douanier"}, votre compte devra être vérifié par un agent ACS. Aucun accès ne sera actif tant que votre identité professionnelle n&apos;aura pas été validée (sous 24h ouvrées).
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="telephone">Téléphone *</Label>
                  <Input
                    id="telephone"
                    type="tel"
                    placeholder="+225 XX XX XX XX XX"
                    value={form.telephone}
                    onChange={(e) => handleChange("telephone", e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemple@email.com"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="h-10"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Mot de passe *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 8 caractères"
                      value={form.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      className="h-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Retapez votre mot de passe"
                    value={form.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    className="h-10"
                  />
                </div>

                <Button
                  type="submit"
                  className="mt-2 h-11 w-full rounded-xl bg-navy-900 font-semibold text-white hover:bg-navy-800"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Inscription...
                    </span>
                  ) : (
                    "M'inscrire"
                  )}
                </Button>
              </form>

              <div className="mt-5 border-t border-navy-50 pt-4 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Retour à la connexion
                </Link>
              </div>
    </AuthShell>
  );
}

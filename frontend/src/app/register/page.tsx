"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const user = useAuthStore((state) => state.user);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    prenoms: "",
    professionType: "" as Profession | "",
    professionDetail: "",
    telephone: "",
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

    if (!nom || !prenoms || !professionType || !telephone || !email || !password || !confirmPassword) {
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
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[hsl(222,47%,15%)] text-white flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-10 w-10 text-amber-400" />
            <h1 className="text-3xl font-bold tracking-tight">ACS</h1>
          </div>
          <p className="text-amber-400 font-medium text-lg">Magistrat & Douane</p>
        </div>
        <div className="space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            Créez votre<br />
            compte en<br />
            <span className="text-amber-400">quelques minutes</span>
          </h2>
          <p className="text-white/70 text-lg max-w-md">
            Rejoignez notre plateforme et bénéficiez d&apos;un accès complet
            à la gestion de vos contrats d&apos;assurance.
          </p>
        </div>
        <p className="text-white/30 text-sm">
          © {new Date().getFullYear()} ACS — Assurances Conseils & Services
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center gap-3 justify-center mb-6">
            <Shield className="h-8 w-8 text-[hsl(222,47%,20%)]" />
            <div>
              <h1 className="text-2xl font-bold text-[hsl(222,47%,20%)]">ACS</h1>
              <p className="text-amber-600 text-sm font-medium">Magistrat & Douane</p>
            </div>
          </div>

          <Card className="shadow-xl border-0">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold">Inscription</CardTitle>
              <CardDescription>Créez votre compte pour accéder à la plateforme</CardDescription>
            </CardHeader>
            <CardContent>
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
                  <Label>Vous êtes *</Label>
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
                      <SelectItem value="autre">Autre profession</SelectItem>
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
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs text-amber-800">
                      <strong>Note :</strong> En tant que {form.professionType === "magistrat" ? "magistrat" : "douanier"}, votre compte est activé immédiatement après inscription.
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                  className="w-full h-11 bg-[hsl(222,47%,20%)] hover:bg-[hsl(222,47%,25%)] text-white font-semibold mt-2"
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

              <div className="mt-4 text-center">
                <Link
                  href="/login"
                  className="text-sm text-gray-500 hover:text-[hsl(222,47%,20%)] inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Retour à la connexion
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

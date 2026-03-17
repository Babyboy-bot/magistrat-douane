"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff, UserPlus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const doLogin = async (identifier: string, pwd: string) => {
    setLoading(true);
    const success = await login(identifier, pwd);
    if (success) {
      toast.success("Connexion réussie");
      const user = useAuthStore.getState().user;
      if (user?.role === "agent") router.push("/agent/dashboard");
      else if (user?.role === "admin") router.push("/admin/dashboard");
      else router.push("/client/dashboard");
    } else {
      toast.error("Identifiants incorrects");
    }
    setLoading(false);
    return success;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    await doLogin(identifier, password);
  };

  const handleDemoLogin = (role: "client" | "agent" | "admin") => {
    const creds: Record<string, { identifier: string; pwd: string }> = {
      client: { identifier: "client@acs.ci", pwd: "client123" },
      agent: { identifier: "agent@acs.ci", pwd: "agent123" },
      admin: { identifier: "admin@acs.ci", pwd: "admin123" },
    };
    const c = creds[role];
    doLogin(c.identifier, c.pwd);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[hsl(222,47%,15%)] text-white flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-10 w-10 text-amber-400" />
            <h1 className="text-3xl font-bold tracking-tight">ACS</h1>
          </div>
          <p className="text-amber-400 font-medium text-lg">Magistrat & Douane</p>
        </div>

        <div className="space-y-8">
          <h2 className="text-4xl font-bold leading-tight">
            Votre plateforme<br />
            d&apos;assurance<br />
            <span className="text-amber-400">sécurisée</span>
          </h2>
          <p className="text-white/70 text-lg max-w-md">
            Gérez vos contrats, souscrivez en ligne et suivez vos demandes
            en toute simplicité depuis votre espace personnel.
          </p>
          <div className="flex gap-8 text-sm text-white/50">
            <div>
              <p className="text-2xl font-bold text-white">500+</p>
              <p>Contrats gérés</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">14</p>
              <p>Compagnies partenaires</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">24/7</p>
              <p>Accès en ligne</p>
            </div>
          </div>
        </div>

        <p className="text-white/30 text-sm">
          © {new Date().getFullYear()} ACS — Assurances Conseils & Services. Tous droits réservés.
        </p>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
            <Shield className="h-8 w-8 text-[hsl(222,47%,20%)]" />
            <div>
              <h1 className="text-2xl font-bold text-[hsl(222,47%,20%)]">ACS</h1>
              <p className="text-amber-600 text-sm font-medium">Magistrat & Douane</p>
            </div>
          </div>

          <Card className="shadow-xl border-0">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold">Connexion</CardTitle>
              <CardDescription>
                Accédez à votre espace personnel sécurisé
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">Email ou numéro de téléphone</Label>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="Votre email ou numéro de téléphone"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="h-11"
                    autoComplete="username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Votre mot de passe"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pr-10"
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

                <div className="flex justify-end">
                  <Link
                    href="/reset-password"
                    className="text-sm text-[hsl(222,47%,20%)] hover:underline font-medium"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-[hsl(222,47%,20%)] hover:bg-[hsl(222,47%,25%)] text-white font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Connexion...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <LogIn className="h-4 w-4" />
                      Se connecter
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                  Pas encore de compte ?{" "}
                  <Link href="/register" className="text-[hsl(222,47%,20%)] hover:underline font-semibold">
                    <UserPlus className="h-3.5 w-3.5 inline mr-1" />
                    S&apos;inscrire
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Demo access buttons */}
          <Card className="border-dashed border-2 bg-white/50">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-gray-400 text-center mb-3 uppercase tracking-wider font-medium">
                Accès démo — Choisir un profil
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => handleDemoLogin("client")}
                >
                  Client
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => handleDemoLogin("agent")}
                >
                  Agent ACS
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => handleDemoLogin("admin")}
                >
                  Admin
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

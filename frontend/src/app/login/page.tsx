"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, UserPlus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/brand";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "agent") router.replace("/agent/dashboard");
      else if (user.role === "admin") router.replace("/admin/dashboard");
      else router.replace("/client/dashboard");
    }
  }, [isAuthenticated, user, router]);
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
      if (user?.role === "agent") router.replace("/agent/dashboard");
      else if (user?.role === "admin") router.replace("/admin/dashboard");
      else router.replace("/client/dashboard");
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

  return (
    <AuthShell
      title="Connexion"
      description="Accédez à votre espace personnel sécurisé"
    >
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-700"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <Link
            href="/reset-password"
            className="text-sm font-medium text-navy-700 hover:text-amber-700 hover:underline"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        <Button
          type="submit"
          className="h-11 w-full rounded-xl bg-navy-900 font-semibold text-white hover:bg-navy-800"
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

      <div className="mt-6 border-t border-navy-50 pt-5 text-center">
        <p className="text-sm text-navy-500">
          Pas encore de compte ?{" "}
          <Link href="/register" className="font-semibold text-navy-800 hover:text-amber-700 hover:underline">
            <UserPlus className="mr-1 inline h-3.5 w-3.5" />
            S&apos;inscrire
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

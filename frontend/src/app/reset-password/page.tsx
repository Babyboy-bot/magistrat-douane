"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Shield, ArrowLeft, Send, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";

const PRIMARY_BUTTON = "w-full h-11 bg-[hsl(222,47%,20%)] hover:bg-[hsl(222,47%,25%)] text-white font-semibold";

function Spinner({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      {label}
    </span>
  );
}

function BackToLogin() {
  return (
    <Link href="/login">
      <Button className={PRIMARY_BUTTON}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour à la connexion
      </Button>
    </Link>
  );
}

function RequestResetForm() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) {
      toast.error("Veuillez saisir votre email ou numéro de téléphone");
      return;
    }
    setLoading(true);
    try {
      const { message } = await authApi.resetPassword(identifier);
      setSent(true);
      toast.success(message);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la réinitialisation");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-green-800 text-sm">
            Si un compte correspond à <strong>{identifier}</strong>, un lien de réinitialisation
            a été envoyé par email. Il est valable une heure.
          </p>
        </div>
        <BackToLogin />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="identifier">Email ou Téléphone</Label>
        <Input
          id="identifier"
          type="text"
          placeholder="exemple@email.com ou +225 XX XX XX XX"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="h-11"
        />
      </div>
      <Button type="submit" className={PRIMARY_BUTTON} disabled={loading}>
        {loading ? <Spinner label="Envoi..." /> : (
          <span className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Recevoir un lien de réinitialisation
          </span>
        )}
      </Button>
    </form>
  );
}

function ConfirmResetForm({ uid, token }: { uid: string; token: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (password !== confirmation) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    try {
      const { message } = await authApi.confirmResetPassword(uid, token, password);
      toast.success(message);
      setDone(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lien invalide ou expiré");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-green-800 text-sm">
            Votre mot de passe a été modifié. Vous pouvez vous connecter.
          </p>
        </div>
        <BackToLogin />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">Nouveau mot de passe</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          className="h-11"
        />
      </div>
      <Button type="submit" className={PRIMARY_BUTTON} disabled={loading}>
        {loading ? <Spinner label="Enregistrement..." /> : (
          <span className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Enregistrer le nouveau mot de passe
          </span>
        )}
      </Button>
    </form>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");
  const isConfirmStep = Boolean(uid && token);

  return (
    <Card className="shadow-xl border-0">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl font-bold">Réinitialisation</CardTitle>
        <CardDescription>
          {isConfirmStep
            ? "Choisissez votre nouveau mot de passe"
            : "Saisissez votre email ou numéro de téléphone pour recevoir un lien de réinitialisation"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isConfirmStep ? <ConfirmResetForm uid={uid!} token={token!} /> : <RequestResetForm />}
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
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-3 justify-center mb-6">
          <Shield className="h-8 w-8 text-[hsl(222,47%,20%)]" />
          <div>
            <h1 className="text-2xl font-bold text-[hsl(222,47%,20%)]">ACS</h1>
            <p className="text-amber-600 text-sm font-medium">Magistrat & Douane</p>
          </div>
        </div>
        <Suspense fallback={null}>
          <ResetPasswordContent />
        </Suspense>
      </div>
    </div>
  );
}

"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Send, KeyRound, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/brand";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";

const PRIMARY_BUTTON = "h-11 w-full rounded-xl bg-navy-900 font-semibold text-white hover:bg-navy-800";

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
        <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <MailCheck className="mx-auto h-8 w-8 text-emerald-600" />
          <p className="text-sm text-emerald-800">
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
        <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <MailCheck className="mx-auto h-8 w-8 text-emerald-600" />
          <p className="text-sm text-emerald-800">
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
    <>
      <p className="mb-5 -mt-3 text-sm text-navy-400">
        {isConfirmStep
          ? "Choisissez votre nouveau mot de passe"
          : "Saisissez votre email ou numéro de téléphone pour recevoir un lien de réinitialisation"}
      </p>
      {isConfirmStep ? <ConfirmResetForm uid={uid!} token={token!} /> : <RequestResetForm />}
      <div className="mt-5 border-t border-navy-50 pt-4 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à la connexion
        </Link>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Réinitialisation"
      heroTitle={<>Retrouvez l&apos;accès à <span className="text-amber-300">votre espace</span></>}
      heroLead="Recevez un lien sécurisé pour définir un nouveau mot de passe et retrouver l'accès à vos contrats."
    >
      <Suspense fallback={null}>
        <ResetPasswordContent />
      </Suspense>
    </AuthShell>
  );
}

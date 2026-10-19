"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, MailCheck, MailX, MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/brand";
import { authApi } from "@/lib/api";
import Link from "next/link";

const PRIMARY_BUTTON = "h-11 w-full rounded-xl bg-navy-900 font-semibold text-white hover:bg-navy-800";

type Status = "loading" | "success" | "error" | "missing";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!uid || !token) {
      setStatus("missing");
      return;
    }
    authApi.verifyEmail(uid, token)
      .then((res) => {
        setMessage(res.message || "Adresse email confirmée avec succès.");
        setStatus("success");
      })
      .catch((err: unknown) => {
        setMessage(err instanceof Error ? err.message : "Lien invalide ou expiré.");
        setStatus("error");
      });
  }, [uid, token]);

  return (
    <div className="space-y-4">
      {status === "loading" && (
        <div className="flex items-center justify-center gap-2 py-8 text-navy-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-navy-200 border-t-navy-800" />
          Vérification en cours…
        </div>
      )}

      {status === "success" && (
        <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <MailCheck className="mx-auto h-8 w-8 text-emerald-600" />
          <p className="text-sm text-emerald-800">{message}</p>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <MailX className="mx-auto h-8 w-8 text-red-500" />
          <p className="text-sm text-red-700">{message}</p>
        </div>
      )}

      {status === "missing" && (
        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
          <MailWarning className="mx-auto h-8 w-8 text-amber-700" />
          <p className="text-sm text-amber-800">
            Ce lien de vérification est incomplet. Ouvrez le lien reçu par email.
          </p>
        </div>
      )}

      <Link href="/login">
        <Button className={PRIMARY_BUTTON}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à la connexion
        </Button>
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthShell
      title="Vérification de l'email"
      heroTitle={<>Confirmation de votre <span className="text-amber-300">adresse email</span></>}
      heroLead="Une dernière étape pour sécuriser votre compte et activer l'accès à votre espace personnel."
    >
      <Suspense fallback={null}>
        <VerifyEmailContent />
      </Suspense>
    </AuthShell>
  );
}

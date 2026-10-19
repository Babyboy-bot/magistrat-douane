"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Shield, ArrowLeft, MailCheck, MailX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authApi } from "@/lib/api";
import Link from "next/link";

const PRIMARY_BUTTON = "w-full h-11 bg-[hsl(222,47%,20%)] hover:bg-[hsl(222,47%,25%)] text-white font-semibold";

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
    <Card className="shadow-xl border-0">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl font-bold">Vérification de l&apos;email</CardTitle>
        <CardDescription>Confirmation de votre adresse email</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "loading" && (
          <div className="flex items-center justify-center gap-2 py-6 text-gray-500">
            <span className="h-5 w-5 border-2 border-gray-300 border-t-[hsl(222,47%,20%)] rounded-full animate-spin" />
            Vérification en cours…
          </div>
        )}

        {status === "success" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center space-y-2">
            <MailCheck className="h-8 w-8 text-green-600 mx-auto" />
            <p className="text-green-800 text-sm">{message}</p>
          </div>
        )}

        {status === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center space-y-2">
            <MailX className="h-8 w-8 text-red-500 mx-auto" />
            <p className="text-red-700 text-sm">{message}</p>
          </div>
        )}

        {status === "missing" && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <p className="text-amber-800 text-sm">
              Ce lien de vérification est incomplet. Ouvrez le lien reçu par email.
            </p>
          </div>
        )}

        <Link href="/login">
          <Button className={PRIMARY_BUTTON}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la connexion
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
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
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory">
      <div className="w-full max-w-md space-y-4 rounded-3xl border border-navy-100 bg-white p-8 text-center shadow-[0_24px_60px_-32px_rgb(16_28_52/0.35)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <h1 className="font-display text-xl font-semibold text-navy-900">Une erreur est survenue</h1>
        <p className="text-sm text-navy-400">
          {error.message || "Erreur inattendue. Veuillez réessayer."}
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-navy-300">ref: {error.digest}</p>
        )}
        <div className="flex justify-center gap-3 pt-2">
          <Button variant="outline" className="rounded-xl border-navy-200" onClick={() => window.location.href = "/"}>
            Accueil
          </Button>
          <Button className="rounded-xl bg-navy-900 font-semibold hover:bg-navy-800" onClick={reset}>Réessayer</Button>
        </div>
      </div>
    </div>
  );
}

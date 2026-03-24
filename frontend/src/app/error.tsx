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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-4">
        <div className="flex justify-center">
          <AlertTriangle className="h-14 w-14 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Une erreur est survenue</h1>
        <p className="text-sm text-gray-500">
          {error.message || "Erreur inattendue. Veuillez réessayer."}
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 font-mono">ref: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center pt-2">
          <Button variant="outline" onClick={() => window.location.href = "/"}>
            Accueil
          </Button>
          <Button onClick={reset}>Réessayer</Button>
        </div>
      </div>
    </div>
  );
}

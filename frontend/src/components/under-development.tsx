"use client";

import { Construction, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface UnderDevelopmentProps {
  featureName?: string;
  backHref?: string;
}

export function UnderDevelopment({
  featureName = "Cette fonctionnalité",
  backHref = "/client/dashboard",
}: UnderDevelopmentProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-amber-400/20 blur-3xl rounded-full" />
        <Construction className="h-20 w-20 text-amber-500 relative z-10" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        En cours de développement
      </h1>
      <p className="text-gray-500 max-w-md mb-6">
        {featureName} est actuellement en cours de développement par notre équipe.
        Elle sera disponible prochainement.
      </p>
      <Link href={backHref}>
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour au tableau de bord
        </Button>
      </Link>
    </div>
  );
}

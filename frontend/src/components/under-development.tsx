"use client";

import { ArrowLeft, Hourglass } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface UnderDevelopmentProps {
  featureName?: string;
  backHref?: string;
  description?: string;
}

export function UnderDevelopment({
  featureName = "Cette fonctionnalité",
  backHref = "/client/dashboard",
  description,
}: UnderDevelopmentProps) {
  return (
    <div className="flex min-h-[65vh] items-center justify-center px-2 py-6">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-navy-100 bg-white shadow-[0_30px_70px_-40px_rgb(16_28_52/0.45)]">
        {/* Bandeau */}
        <div className="relative overflow-hidden bg-[radial-gradient(130%_140%_at_50%_0%,var(--color-navy-700)_0%,var(--color-navy-900)_55%,var(--color-navy-950)_100%)] px-8 pb-14 pt-10 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_24px,rgb(255_255_255/0.03)_24px_25px)]" />
          <div className="pointer-events-none absolute left-1/2 top-6 h-40 w-40 -translate-x-1/2 rounded-full bg-amber-400/20 blur-3xl" />
          <p className="relative text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300">Bientôt disponible</p>
          <h1 className="relative mt-3 font-display text-3xl font-semibold text-white">{featureName}</h1>
        </div>

        {/* Médaillon */}
        <div className="relative -mt-9 flex justify-center">
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-3xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 shadow-[0_14px_30px_-12px_rgb(180_138_58/0.8)] ring-8 ring-white">
            <Hourglass className="h-8 w-8 text-navy-950" strokeWidth={2} />
          </div>
        </div>

        <div className="px-8 pb-8 pt-5 text-center">
          <p className="mx-auto max-w-md text-sm leading-relaxed text-navy-500">
            Nos équipes préparent ce service avec le même soin que le reste de votre espace.
            Il sera disponible très prochainement.
          </p>

          {description && (
            <div className="mx-auto mt-5 max-w-md rounded-2xl bg-amber-50/70 p-4 text-left ring-1 ring-amber-100">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Ce qui vous attend</p>
              <p className="mt-1 text-sm text-navy-700 first-letter:uppercase">{description}</p>
            </div>
          )}

          <Link href={backHref} className="mt-6 inline-block">
            <Button variant="outline" className="h-11 gap-2 rounded-xl border-navy-200 px-5 text-navy-800 hover:bg-navy-50">
              <ArrowLeft className="h-4 w-4" />
              Retour au tableau de bord
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

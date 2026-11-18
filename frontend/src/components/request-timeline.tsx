"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RequestStatus } from "@/lib/types";

const STEPS = ["Soumise", "Prise en charge", "Décision", "Clôturée"] as const;

const INDEX: Record<RequestStatus, number> = {
  en_attente: 0,
  en_cours: 1,
  devis_envoye: 2,
  en_revision: 2,
  valide: 3,
  traite: 3,
  refuse: 3,
};

/** Frise horizontale de suivi d'une demande (reçue → traitée). */
export function RequestTimeline({ status, className }: { status: RequestStatus; className?: string }) {
  const idx = INDEX[status];
  const refused = status === "refuse";
  const closed = status === "traite";

  return (
    <div className={cn("flex items-center", className)} role="list" aria-label="Progression de la demande">
      {STEPS.map((label, i) => {
        const done = i < idx || (closed && i === idx);
        const current = i === idx && !done;
        const terminalRefused = refused && i === idx;
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none" role="listitem">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
                  terminalRefused
                    ? "bg-red-100 text-red-600 ring-1 ring-red-200"
                    : done
                      ? "bg-emerald-500 text-white"
                      : current
                        ? "bg-amber-400 text-navy-950 ring-2 ring-amber-200"
                        : "bg-navy-50 text-navy-300 ring-1 ring-navy-100",
                )}
              >
                {terminalRefused ? <X className="h-3 w-3" /> : done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  terminalRefused ? "text-red-600"
                    : done ? "text-emerald-700"
                    : current ? "text-amber-700"
                    : "text-navy-300",
                )}
              >
                {terminalRefused ? "Refusée" : label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="mx-1.5 mb-5 h-px flex-1 bg-navy-100">
                <div
                  className={cn("h-full transition-all duration-700", i < idx ? "w-full bg-emerald-400" : "w-0")}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

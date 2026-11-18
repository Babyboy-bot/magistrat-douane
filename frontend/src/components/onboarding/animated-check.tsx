"use client";

import { cn } from "@/lib/utils";

/** Pastille d'état : coche SVG dessinée en fondu si `done`, point pulsé sinon. */
export function AnimatedCheck({ done, delay = 0 }: { done: boolean; delay?: number }) {
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 transition-colors duration-500",
        done ? "bg-emerald-500/15 text-emerald-400 ring-emerald-400/40" : "bg-amber-400/10 ring-amber-400/30",
      )}
    >
      {done ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="26"
            strokeDashoffset="26"
            style={{ animation: `acs-draw-check 0.55s ease-out ${delay}ms forwards` }}
          />
        </svg>
      ) : (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
      )}
    </span>
  );
}

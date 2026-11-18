"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Shield, Sparkles, X, ChevronLeft, ChevronRight, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GlobeScene } from "./globe-scene";

export const OPEN_ONBOARDING_EVENT = "acs:open-onboarding";

declare global {
  interface Window {
    __acsOnboardingOpen?: boolean;
  }
}

/* ── Confettis ─────────────────────────────────────────────────────────── */

export function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;

    const COLORS = ["#fbbf24", "#f59e0b", "#34d399", "#e2e8f0", "#f97316"];
    const parts = Array.from({ length: 140 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * 120,
      y: H * 0.62,
      vx: (Math.random() - 0.5) * 14,
      vy: -7 - Math.random() * 9,
      s: 3 + Math.random() * 4,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.25,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 1,
    }));

    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      let alive = false;
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.28;
        p.vx *= 0.985;
        p.r += p.vr;
        p.life -= 0.011;
        if (p.life <= 0 || p.y > H + 20) continue;
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      }
      if (alive) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
}

/* ── Étapes réutilisables ──────────────────────────────────────────────── */

export function StepWelcome({ eyebrow, name, tagline }: { eyebrow: string; name?: string; tagline: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative mb-8 flex h-28 w-28 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-amber-400/10 blur-2xl" />
        <span className="absolute inset-0 animate-[spin_14s_linear_infinite] rounded-full border border-dashed border-amber-400/40" />
        <span className="absolute inset-3 animate-[spin_20s_linear_infinite_reverse] rounded-full border border-amber-300/20" />
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_10px_40px_-8px_rgba(251,191,36,0.6)]">
          <Shield className="h-8 w-8 text-navy-950" strokeWidth={2.2} />
        </span>
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400/80">{eyebrow}</p>
      <h2 className="mt-3 font-display text-4xl font-semibold text-white sm:text-5xl">
        Bienvenue{name ? `, ${name}` : ""}
      </h2>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300 sm:text-base">{tagline}</p>
    </div>
  );
}

export function StepFinal({ title, desc, cta, onFinish }: { title: string; desc: string; cta: string; onFinish: () => void }) {
  return (
    <div className="relative flex flex-col items-center text-center">
      <Confetti />
      <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_10px_40px_-8px_rgba(52,211,153,0.5)]">
        <Sparkles className="h-8 w-8 text-white" />
      </span>
      <h2 className="font-display text-4xl font-semibold text-white">{title}</h2>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300">{desc}</p>
      <Button
        onClick={onFinish}
        className="mt-8 h-12 rounded-xl bg-amber-400 px-8 font-semibold text-navy-950 shadow-[0_10px_30px_-8px_rgba(251,191,36,0.5)] transition hover:bg-amber-300 hover:shadow-[0_14px_40px_-8px_rgba(251,191,36,0.6)]"
      >
        {cta}
      </Button>
    </div>
  );
}

export function InfoRow({ icon: Icon, title, desc, delay = 0 }: { icon: React.ElementType; title: string; desc: string; delay?: number }) {
  return (
    <div
      className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
      style={{ animation: `acs-rise 0.5s ease-out ${delay}ms both` }}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/25">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{desc}</p>
      </div>
    </div>
  );
}

export function StepTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <>
      <h2 className="text-center font-display text-3xl font-semibold text-white">{title}</h2>
      {sub && <p className="mt-2 text-center text-sm text-slate-400">{sub}</p>}
    </>
  );
}

/* ── Shell : overlay + globe + navigation ──────────────────────────────── */

export function OnboardingShell({ steps, onClose }: { steps: React.ReactNode[]; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const last = steps.length - 1;

  const go = useCallback(
    (n: number) => {
      setDir(n > step ? 1 : -1);
      setStep(Math.max(0, Math.min(last, n)));
    },
    [step, last],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(step + 1);
      if (e.key === "ArrowLeft") go(step - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, step, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Guide de démarrage"
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_center,#16244a_0%,#0b1530_55%,#070d1f_100%)]"
    >
      <style>{`
        @keyframes acs-draw-check { to { stroke-dashoffset: 0; } }
        @keyframes acs-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <GlobeScene className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-amber-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-sky-500/10 blur-[120px]" />

      <button
        onClick={() => onClose()}
        className="absolute right-5 top-5 z-10 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-300 backdrop-blur transition hover:border-white/25 hover:text-white"
      >
        Passer <X className="h-3.5 w-3.5" />
      </button>

      <div className="relative flex flex-1 items-center justify-center overflow-y-auto p-6">
        <div
          key={step}
          className={cn(
            "flex w-full justify-center animate-in fade-in duration-500",
            dir === 1 ? "slide-in-from-right-10" : "slide-in-from-left-10",
          )}
        >
          {steps[step]}
        </div>
      </div>

      <div className="relative flex items-center justify-between gap-4 px-6 pb-8 sm:px-10">
        <Button
          variant="ghost"
          onClick={() => go(step - 1)}
          disabled={step === 0}
          className="gap-1 text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" /> Précédent
        </Button>

        <div className="flex items-center gap-2">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              aria-label={`Étape ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-400",
                i === step ? "w-8 bg-amber-400" : i < step ? "w-3 bg-amber-400/50" : "w-3 bg-white/15 hover:bg-white/30",
              )}
            />
          ))}
        </div>

        {step < last ? (
          <Button onClick={() => go(step + 1)} className="gap-1 bg-white/10 text-white hover:bg-white/20">
            Suivant <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <span className="w-24" />
        )}
      </div>
    </div>
  );
}

/* ── Gate : ouverture auto + bouton bouée + événement ──────────────────── */

export function useOnboardingGate(key: string | null) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!key) return;
    if (!localStorage.getItem(key)) {
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [key]);

  useEffect(() => {
    const onEvent = () => setOpen(true);
    window.addEventListener(OPEN_ONBOARDING_EVENT, onEvent);
    return () => window.removeEventListener(OPEN_ONBOARDING_EVENT, onEvent);
  }, []);

  useEffect(() => {
    window.__acsOnboardingOpen = open;
    return () => {
      window.__acsOnboardingOpen = false;
    };
  }, [open]);

  const close = useCallback(() => {
    if (key) localStorage.setItem(key, "1");
    setOpen(false);
  }, [key]);

  return { open, setOpen, close };
}

export function OnboardingHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Revoir le guide de démarrage"
      aria-label="Revoir le guide de démarrage"
      className="fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-navy-900 text-amber-400 shadow-[0_8px_24px_-6px_rgb(16_28_52/0.5)] ring-1 ring-amber-400/30 transition hover:scale-105 hover:text-amber-300"
    >
      <LifeBuoy className="h-5 w-5" />
    </button>
  );
}

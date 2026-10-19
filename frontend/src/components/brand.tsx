"use client";

import { useEffect, useMemo, useState } from "react";
import { Scale, UploadCloud, FileText, X, RefreshCw, ShieldCheck, Users, Lock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Logo : balance de la justice sur écusson marine ── */
export function BrandMark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const dims = { sm: "h-8 w-8 rounded-lg", md: "h-10 w-10 rounded-xl", lg: "h-14 w-14 rounded-2xl" }[size];
  const icon = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-7 w-7" }[size];
  return (
    <div
      className={cn(
        "relative flex items-center justify-center bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 shadow-[0_6px_20px_-6px_rgb(180_138_58/0.6)]",
        dims,
        className,
      )}
    >
      <Scale className={cn("text-navy-950", icon)} strokeWidth={2.2} />
    </div>
  );
}

/* ── En-tête de page ── */
export function PageHeader({
  eyebrow, title, description, actions, className,
}: {
  eyebrow?: string; title: React.ReactNode; description?: React.ReactNode;
  actions?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-600">{eyebrow}</p>
        )}
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-navy-900 mt-1">{title}</h1>
        {description && <p className="text-sm text-navy-400 mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

/* ── Carte statistique ── */
const TONES = {
  navy: "bg-navy-50 text-navy-700 ring-navy-100",
  gold: "bg-amber-50 text-amber-700 ring-amber-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  rose: "bg-rose-50 text-rose-700 ring-rose-100",
} as const;

export function StatCard({
  label, value, icon: Icon, tone = "navy", hint,
}: {
  label: string; value: React.ReactNode; icon: LucideIcon; tone?: keyof typeof TONES; hint?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-navy-100 bg-white p-5 shadow-[0_1px_2px_rgb(16_28_52/0.04)] transition hover:shadow-[0_12px_32px_-16px_rgb(16_28_52/0.25)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-navy-400">{label}</p>
          <p className="font-display text-3xl font-semibold text-navy-900 mt-2 leading-none">{value}</p>
          {hint && <p className="text-xs text-navy-400 mt-2">{hint}</p>}
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1", TONES[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

/* ── Gabarit des pages d'authentification (connexion, inscription, reset, vérification) ── */
const AUTH_TRUST = [
  { icon: ShieldCheck, label: "Données chiffrées" },
  { icon: Users, label: "Espace dédié magistrats & douaniers" },
  { icon: Lock, label: "Accès sécurisé" },
];

export function AuthShell({
  title,
  description,
  heroTitle,
  heroLead,
  children,
  footer,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  heroTitle?: React.ReactNode;
  heroLead?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:flex">
      {/* ── Panneau marque (desktop) ── */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[radial-gradient(130%_130%_at_20%_0%,var(--color-navy-700)_0%,var(--color-navy-900)_50%,var(--color-navy-950)_100%)] p-12 text-white lg:flex lg:w-[46%]">
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_26px,rgb(255_255_255/0.025)_26px_27px)]" />
        <div className="pointer-events-none absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative flex items-center gap-3.5">
          <BrandMark size="lg" />
          <div>
            <p className="font-display text-2xl font-semibold tracking-tight">ACS</p>
            <p className="text-sm font-medium text-amber-300">Magistrat &amp; Douane</p>
          </div>
        </div>
        <div className="relative space-y-7">
          <h2 className="font-display text-4xl font-semibold leading-tight xl:text-[2.75rem]">
            {heroTitle ?? (
              <>Votre plateforme d&apos;assurance <span className="text-amber-300">sécurisée</span></>
            )}
          </h2>
          <p className="max-w-md text-base leading-relaxed text-white/65">
            {heroLead ??
              "Gérez vos contrats, souscrivez en ligne et suivez vos demandes en toute simplicité depuis votre espace personnel."}
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {AUTH_TRUST.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-white/55">
                <Icon className="h-4 w-4 text-amber-300" />
                {label}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-white/35">
          © {new Date().getFullYear()} ACS — Assurances Conseils &amp; Services. Tous droits réservés.
        </p>
      </div>

      {/* ── Formulaire ── */}
      <div className="flex flex-1 items-center justify-center bg-ivory p-5 sm:p-8">
        <div className="w-full max-w-md">
          <div className="mb-7 flex items-center justify-center gap-3 lg:hidden">
            <BrandMark size="md" />
            <div>
              <p className="font-display text-xl font-semibold text-navy-900">ACS</p>
              <p className="text-xs font-medium text-amber-700">Magistrat &amp; Douane</p>
            </div>
          </div>
          <div className="rounded-3xl border border-navy-100 bg-white p-6 shadow-[0_24px_60px_-32px_rgb(16_28_52/0.35)] sm:p-8">
            <h1 className="font-display text-2xl font-semibold text-navy-900">{title}</h1>
            {description && <p className="mt-1.5 text-sm text-navy-400">{description}</p>}
            <div className="mt-6">{children}</div>
          </div>
          {footer}
        </div>
      </div>
    </div>
  );
}

/* ── Zone de dépôt de fichier avec aperçu ── */
function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

export function FileDrop({
  label, required, file, onChange, accept = "image/*,application/pdf", hint, dataField,
}: {
  label: string; required?: boolean; file?: File | null; onChange?: (f: File | null) => void;
  accept?: string; hint?: string; dataField?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const preview = useMemo(
    () => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (f: File | undefined | null) => { if (f) onChange?.(f); };

  if (file) {
    return (
      <div data-field={dataField} className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-emerald-100 bg-white flex items-center justify-center">
          {preview
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={preview} alt={label} className="h-full w-full object-cover" />
            : <FileText className="h-6 w-6 text-emerald-600" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-emerald-800">{label}</p>
          <p className="truncate text-sm text-navy-900">{file.name}</p>
          <p className="text-xs text-navy-400">{formatSize(file.size)}</p>
        </div>
        <label className="cursor-pointer rounded-lg p-2 text-navy-500 hover:bg-white hover:text-navy-800" title="Remplacer">
          <RefreshCw className="h-4 w-4" />
          <input type="file" accept={accept} className="hidden" onChange={e => pick(e.target.files?.[0])} />
        </label>
        <button type="button" onClick={() => onChange?.(null)} title="Retirer"
          className="rounded-lg p-2 text-navy-400 hover:bg-white hover:text-red-600">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <label
      data-field={dataField}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-4 transition",
        dragging ? "border-amber-500 bg-amber-50" : "border-navy-200 bg-navy-50/40 hover:border-amber-400 hover:bg-amber-50/50",
      )}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 ring-1 ring-navy-100">
        <UploadCloud className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-navy-900">
          {label} {required && <span className="text-red-500">*</span>}
        </p>
        <p className="text-xs text-navy-400">{hint ?? "Photo ou PDF — touchez pour photographier ou choisir un fichier"}</p>
      </div>
      <input type="file" accept={accept} className="hidden" onChange={e => pick(e.target.files?.[0])} />
    </label>
  );
}

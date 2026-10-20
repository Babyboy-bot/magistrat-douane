"use client";

import { useEffect, useMemo, useState } from "react";
import { UploadCloud, FileText, X, RefreshCw, ShieldCheck, Users, Lock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Logo : écusson marine + balance de la justice ── */
export function BrandMark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const dims = { sm: "h-8", md: "h-10", lg: "h-14" }[size];
  return (
    <svg viewBox="60 40 200 265" role="img" aria-label="ACS" className={cn("w-auto shrink-0", dims, className)}>
      <defs>
        <linearGradient id="bmShield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f3459" />
          <stop offset="1" stopColor="#0a1224" />
        </linearGradient>
        <linearGradient id="bmGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9bb78" />
          <stop offset="1" stopColor="#b48a3a" />
        </linearGradient>
      </defs>
      <path d="M80,50 H240 V170 C240,238 204,276 160,296 C116,276 80,238 80,170 Z"
        fill="url(#bmShield)" stroke="url(#bmGold)" strokeWidth="6" />
      <path d="M88,58 H232 V170 C232,232 200,268 160,286 C120,268 88,232 88,170 Z"
        fill="none" stroke="#d9bb78" strokeWidth="2" opacity="0.65" />
      <g strokeLinecap="round">
        <circle cx="160" cy="98" r="6" fill="url(#bmGold)" />
        <rect x="156" y="104" width="8" height="92" rx="3.5" fill="url(#bmGold)" />
        <rect x="108" y="114" width="104" height="6" rx="3" fill="url(#bmGold)" />
        <circle cx="108" cy="117" r="5" fill="#c9a24f" />
        <circle cx="212" cy="117" r="5" fill="#c9a24f" />
        <path d="M108,120 L94,152 M108,120 L122,152" stroke="#c9a24f" strokeWidth="2.5" fill="none" />
        <path d="M212,120 L198,152 M212,120 L226,152" stroke="#c9a24f" strokeWidth="2.5" fill="none" />
        <path d="M90,152 C94,167 122,167 126,152 Z" fill="#d9bb78" stroke="#b48a3a" strokeWidth="1" />
        <path d="M194,152 C198,167 226,167 230,152 Z" fill="#d9bb78" stroke="#b48a3a" strokeWidth="1" />
        <path d="M136,214 L150,198 H170 L184,214 Z" fill="url(#bmGold)" />
        <rect x="132" y="214" width="56" height="7" rx="2" fill="#8f6b22" />
      </g>
    </svg>
  );
}

/* ── Emblème complet : écusson + lauriers + ruban (page de connexion) ── */
export function BrandEmblem({ className, variant = "light" }: { className?: string; variant?: "light" | "dark" }) {
  const subtitle = variant === "dark" ? "#d9bb78" : "#1f3459";
  return (
    <svg viewBox="0 0 340 380" role="img" aria-label="ACS Magistrats & Douanes" className={className}>
      <defs>
        <linearGradient id="beShield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f3459" />
          <stop offset="1" stopColor="#0a1224" />
        </linearGradient>
        <linearGradient id="beGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9bb78" />
          <stop offset="1" stopColor="#b48a3a" />
        </linearGradient>
        <path id="beLeaf" d="M0,0 C10,-7 22,-7 28,0 C22,7 10,7 0,0 Z" fill="#b48a3a" />
      </defs>
      <g id="beLaurel">
        <path d="M160,318 C100,308 50,262 42,192" fill="none" stroke="#8f6b22" strokeWidth="3" />
        <use href="#beLeaf" transform="translate(146,315) rotate(152)" />
        <use href="#beLeaf" transform="translate(118,309) rotate(138)" />
        <use href="#beLeaf" transform="translate(92,297) rotate(124)" />
        <use href="#beLeaf" transform="translate(70,281) rotate(110)" />
        <use href="#beLeaf" transform="translate(54,261) rotate(96)" />
        <use href="#beLeaf" transform="translate(44,239) rotate(82)" />
        <use href="#beLeaf" transform="translate(40,215) rotate(68)" />
        <use href="#beLeaf" transform="translate(42,191) rotate(52)" />
        <use href="#beLeaf" transform="translate(50,168) rotate(36)" />
      </g>
      <use href="#beLaurel" transform="translate(340,0) scale(-1,1)" />
      <path d="M160,308 L168,316 L160,324 L152,316 Z" fill="url(#beGold)" />
      <path d="M80,50 H240 V170 C240,238 204,276 160,296 C116,276 80,238 80,170 Z"
        fill="url(#beShield)" stroke="url(#beGold)" strokeWidth="5" />
      <path d="M88,58 H232 V170 C232,232 200,268 160,286 C120,268 88,232 88,170 Z"
        fill="none" stroke="#d9bb78" strokeWidth="1.5" opacity="0.65" />
      <g strokeLinecap="round">
        <circle cx="160" cy="98" r="5.5" fill="url(#beGold)" />
        <rect x="156.5" y="104" width="7" height="92" rx="3" fill="url(#beGold)" />
        <rect x="108" y="114" width="104" height="5" rx="2.5" fill="url(#beGold)" />
        <circle cx="108" cy="116.5" r="4.5" fill="#c9a24f" />
        <circle cx="212" cy="116.5" r="4.5" fill="#c9a24f" />
        <path d="M108,119 L94,152 M108,119 L122,152" stroke="#c9a24f" strokeWidth="2.2" fill="none" />
        <path d="M212,119 L198,152 M212,119 L226,152" stroke="#c9a24f" strokeWidth="2.2" fill="none" />
        <path d="M90,152 C94,167 122,167 126,152 Z" fill="#d9bb78" stroke="#b48a3a" strokeWidth="1" />
        <path d="M194,152 C198,167 226,167 230,152 Z" fill="#d9bb78" stroke="#b48a3a" strokeWidth="1" />
        <path d="M136,214 L150,198 H170 L184,214 Z" fill="url(#beGold)" />
        <rect x="132" y="214" width="56" height="6" rx="2" fill="#8f6b22" />
      </g>
      <g stroke="#d9bb78" fill="none" strokeLinecap="round" opacity="0.85">
        <circle cx="104" cy="196" r="6" strokeWidth="2.5" />
        <path d="M108,201 L122,215" strokeWidth="3" />
        <path d="M116,208 L121,203 M119,212 L124,207" strokeWidth="2.2" />
      </g>
      <g transform="translate(216,204) rotate(38)" opacity="0.85">
        <rect x="-9" y="-6" width="18" height="10" rx="2.5" fill="#d9bb78" />
        <rect x="-1.8" y="4" width="3.6" height="20" rx="1.8" fill="#d9bb78" />
      </g>
      <path d="M52,256 L24,246 L33,270 L24,294 L52,284 Z" fill="#172745" stroke="#b48a3a" strokeWidth="1.5" />
      <path d="M268,256 L296,246 L287,270 L296,294 L268,284 Z" fill="#172745" stroke="#b48a3a" strokeWidth="1.5" />
      <rect x="52" y="248" width="216" height="38" fill="#0a1224" stroke="url(#beGold)" strokeWidth="2.5" />
      <text x="160" y="277" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="26" fontWeight="bold" letterSpacing="6" fill="#d9bb78">ACS</text>
      <text x="170" y="336" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="15" fontWeight="600" letterSpacing="4.5" fill={subtitle}>MAGISTRATS &amp; DOUANES</text>
    </svg>
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
        <BrandEmblem variant="dark" className="relative w-36" />
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
      <div data-field={dataField} className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 sm:gap-3">
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
        <label className="shrink-0 cursor-pointer rounded-lg p-2 text-navy-500 hover:bg-white hover:text-navy-800" title="Remplacer">
          <RefreshCw className="h-4 w-4" />
          <input type="file" accept={accept} className="hidden" onChange={e => pick(e.target.files?.[0])} />
        </label>
        <button type="button" onClick={() => onChange?.(null)} title="Retirer"
          className="shrink-0 rounded-lg p-2 text-navy-400 hover:bg-white hover:text-red-600">
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
        "flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-4 transition",
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

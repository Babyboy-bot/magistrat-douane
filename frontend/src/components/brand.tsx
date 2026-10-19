"use client";

import { useEffect, useMemo, useState } from "react";
import { Scale, UploadCloud, FileText, X, RefreshCw, type LucideIcon } from "lucide-react";
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

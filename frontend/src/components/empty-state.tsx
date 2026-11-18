"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** État vide illustré — icône en médaillon, titre, description, action optionnelle. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-navy-200 bg-navy-50/40 text-center",
        compact ? "px-5 py-7" : "px-6 py-12",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-amber-600 ring-1 ring-navy-100 shadow-[0_2px_8px_-2px_rgb(16_28_52/0.08)]">
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-3 font-medium text-navy-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-navy-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseDisplayDate(d: string | null | undefined): Date {
  if (!d) return new Date(0);
  const parts = d.split("-");
  if (parts.length === 3 && parts[0].length === 2) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? new Date(0) : dt;
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "";
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return `${String(dt.getUTCDate()).padStart(2, "0")}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${dt.getUTCFullYear()}`;
  } catch { return d; }
}

/**
 * client.ts — Couche HTTP de base.
 * Gère : auth cookies, refresh auto, extraction erreurs.
 * Tous les autres modules importent `apiFetch` depuis ici.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export type ApiFetchOptions = RequestInit & { skipAuthHandling?: boolean };

// ── Helpers ──────────────────────────────────────────────────────────────────

export function extractErrorMessage(data: unknown): string | undefined {
  if (!data) return undefined;
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj.detail === "string") return obj.detail;
    if (typeof obj.message === "string") return obj.message;
    for (const value of Object.values(obj)) {
      if (typeof value === "string" && value.trim()) return value;
      if (Array.isArray(value) && value.length) {
        const first = value[0];
        if (typeof first === "string" && first.trim()) return first;
      }
    }
  }
  return undefined;
}

export async function downloadFile(url: string, nom: string): Promise<void> {
  try {
    const res = await fetch(url, { credentials: "include" });
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
}

// ── Token refresh (race-condition safe) ──────────────────────────────────────

let _refreshPromise: Promise<boolean> | null = null;

const _doRefresh = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    // 429 = rate limit, pas une session expirée — ne pas déconnecter
    if (res.status === 429) return false;
    return res.ok;
  } catch {
    return false;
  } finally {
    _refreshPromise = null;
  }
};

const refreshOnce = (): Promise<boolean> => {
  if (!_refreshPromise) _refreshPromise = _doRefresh();
  return _refreshPromise;
};

// ── Core fetch ───────────────────────────────────────────────────────────────

export const apiFetch = async <T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> => {
  const { skipAuthHandling = false, ...reqOpts } = options;

  const baseHeaders: Record<string, string> =
    reqOpts.body instanceof FormData ? {} : { "Content-Type": "application/json" };

  const headers: Record<string, string> = {
    ...baseHeaders,
    ...(reqOpts.headers as Record<string, string> | undefined),
  };

  const init = (): RequestInit => ({ ...reqOpts, headers, credentials: "include" });
  const url = (p: string) => `${API_BASE}${p}`;

  let res = await fetch(url(path), init());

  if (!skipAuthHandling && res.status === 401 && !path.includes("/token/refresh/")) {
    const refreshed = await refreshOnce();
    if (refreshed) {
      res = await fetch(url(path), init());
    } else {
      localStorage.removeItem("auth-storage");
      const publicPaths = ["/login", "/register", "/reset-password"];
      const isPublic = publicPaths.some((p) => window.location.pathname.startsWith(p));
      if (!isPublic) {
        window.location.href = "/login";
      }
      throw new Error("Session expirée");
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(body) || `HTTP ${res.status}`);
  }

  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
};

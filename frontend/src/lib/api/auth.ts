import { apiFetch } from "./client";
import type { User } from "@/lib/types";

function normalizeMediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const base = process.env.NEXT_PUBLIC_API_BASE ?? "";
  return `${base}${url.startsWith("/") ? url : "/" + url}`;
}

export function mapUser(u: Record<string, unknown>): User {
  return {
    id: String(u.id),
    nom: u.nom as string,
    prenoms: u.prenoms as string,
    profession: (u.profession as string) || "",
    professionType: (u.profession_type as User["professionType"]) || "autre",
    telephone: u.telephone as string,
    telephone2: (u.telephone2 as string) || "",
    email: (u.email as string) || "",
    emailVerified: Boolean(u.email_verified),
    photo: normalizeMediaUrl(u.photo as string),
    role: u.role as User["role"],
    verified: Boolean(u.verified),
    verifiedAt: (u.verified_at as string) || undefined,
    verifiedBy: (u.verified_by as string) || undefined,
    accountStatus: (u.account_status as User["accountStatus"]) || "active",
    riskLevel: (u.risk_level as User["riskLevel"]) || "standard",
    createdAt: u.created_at as string,
    is_active: Boolean(u.is_active),
  };
}

export const authApi = {
  async login(identifier: string, password: string): Promise<User> {
    const raw = await apiFetch<Record<string, unknown>>("/api/auth/login/", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
      skipAuthHandling: true,
    });
    return mapUser(raw);
  },

  async logout(): Promise<void> {
    await apiFetch("/api/auth/logout/", { method: "POST" });
  },

  async me(): Promise<User> {
    const raw = await apiFetch<Record<string, unknown>>("/api/auth/me/");
    return mapUser(raw);
  },

  async updateProfile(data: Partial<{
    nom: string; prenoms: string; profession: string;
    telephone: string; telephone2: string;
  }>): Promise<User> {
    const raw = await apiFetch<Record<string, unknown>>("/api/auth/me/", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return mapUser(raw);
  },

  async register(data: {
    nom: string; prenoms: string; profession: string; profession_type: string;
    telephone: string; telephone2?: string; email: string; password: string;
  }): Promise<User> {
    const raw = await apiFetch<Record<string, unknown>>("/api/auth/register/", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return mapUser(raw);
  },

  async uploadPhoto(file: File): Promise<User> {
    const formData = new FormData();
    formData.append("photo", file);
    const raw = await apiFetch<Record<string, unknown>>("/api/auth/me/", {
      method: "PATCH",
      body: formData,
    });
    return mapUser(raw);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiFetch("/api/auth/me/password/", {
      method: "POST",
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  },

  async resetPassword(identifier: string): Promise<{ message: string }> {
    const raw = await apiFetch<Record<string, unknown>>("/api/auth/reset-password/", {
      method: "POST",
      body: JSON.stringify({ identifier }),
    });
    return raw as { message: string };
  },

  async confirmResetPassword(uid: string, token: string, newPassword: string): Promise<{ message: string }> {
    const raw = await apiFetch<Record<string, unknown>>("/api/auth/reset-password/confirm/", {
      method: "POST",
      body: JSON.stringify({ uid, token, new_password: newPassword }),
    });
    return raw as { message: string };
  },

  async verifyEmail(uid: string, token: string): Promise<{ message: string }> {
    const raw = await apiFetch<Record<string, unknown>>("/api/auth/verify-email/", {
      method: "POST",
      body: JSON.stringify({ uid, token }),
    });
    return raw as { message: string };
  },

  async resendVerificationEmail(): Promise<{ detail: string }> {
    const raw = await apiFetch<Record<string, unknown>>("/api/auth/verify-email/resend/", { method: "POST" });
    return raw as { detail: string };
  },
};

"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, RefreshCw, WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/brand";
import { apiFetch } from "@/lib/api/client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

const ROLE_LABELS: Record<string, string> = {
  client: "Client",
  prospect: "Prospect",
  agent: "Agent",
  admin: "Admin",
};

const ROLE_COLORS: Record<string, string> = {
  client: "bg-navy-100 text-navy-700",
  prospect: "bg-amber-100 text-amber-800",
  agent: "bg-emerald-100 text-emerald-700",
  admin: "bg-amber-500/20 text-amber-800",
};

const PROF_LABELS: Record<string, string> = {
  magistrat: "Magistrat",
  douanier: "Douanier",
  autre: "Autre",
};

interface OnlineUser {
  id: number;
  nom: string;
  prenoms: string;
  email: string;
  role: string;
  profession_type: string;
  photo: string | null;
  connected_since: number | null;
}

function timeAgo(ts: number | null): string {
  if (!ts) return "—";
  const s = Math.floor(Date.now() / 1000) - ts;
  if (s < 60) return `il y a ${s}s`;
  if (s < 3600) return `il y a ${Math.floor(s / 60)}min`;
  return `il y a ${Math.floor(s / 3600)}h`;
}

function initials(nom: string, prenoms: string): string {
  return `${nom[0] ?? ""}${prenoms[0] ?? ""}`.toUpperCase();
}

export default function OnlineUsersPage() {
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchOnline = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<OnlineUser[]>("/api/online-users/");
      setUsers(data);
      setLastRefresh(new Date());
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnline();
    const interval = setInterval(fetchOnline, 15_000);
    return () => clearInterval(interval);
  }, [fetchOnline]);

  const byRole = users.reduce<Record<string, OnlineUser[]>>((acc, u) => {
    (acc[u.role] = acc[u.role] || []).push(u);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Utilisateurs connectés"
        description={
          <>
            {users.length} utilisateur{users.length !== 1 ? "s" : ""} en ligne
            {lastRefresh && (
              <span className="ml-2 text-xs text-navy-300">
                — mis à jour à {lastRefresh.toLocaleTimeString("fr-FR")}
              </span>
            )}
          </>
        }
        actions={
          <Button variant="outline" size="sm" onClick={fetchOnline} disabled={loading} className="h-10 rounded-xl border-navy-100">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        }
      />

      {/* Résumé par rôle */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["client", "prospect", "agent", "admin"] as const).map((role) => (
          <Card key={role} className="rounded-2xl border-navy-100 shadow-[0_1px_2px_rgb(16_28_52/0.04)]">
            <CardContent className="pb-4 pt-4 text-center">
              <p className="font-display text-2xl font-semibold text-navy-900">{byRole[role]?.length ?? 0}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-navy-400">{ROLE_LABELS[role]}s</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length === 0 && !loading ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-50">
            <WifiOff className="h-6 w-6 text-navy-300" />
          </div>
          <p className="text-navy-400">Aucun utilisateur connecté</p>
        </div>
      ) : (
        <Card className="rounded-2xl border-navy-100 shadow-[0_1px_2px_rgb(16_28_52/0.04)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base font-semibold text-navy-900">
              <Users className="h-4 w-4 text-amber-600" />
              Liste en temps réel
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-navy-50">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-4 px-6 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-800 text-sm font-bold text-amber-300">
                    {u.photo
                      ? <img src={`${API_BASE}${u.photo}`} className="h-9 w-9 rounded-full object-cover" alt="" />
                      : initials(u.nom, u.prenoms)
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-navy-900">{u.nom} {u.prenoms}</p>
                    <p className="truncate text-xs text-navy-400">{u.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="secondary" className={`text-xs ${ROLE_COLORS[u.role] ?? ""}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </Badge>
                    {u.profession_type && u.profession_type !== "autre" && (
                      <Badge variant="outline" className="border-navy-200 text-xs text-navy-600">
                        {PROF_LABELS[u.profession_type] ?? u.profession_type}
                      </Badge>
                    )}
                    <span className="hidden text-xs text-navy-300 sm:block">{timeAgo(u.connected_since)}</span>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" title="En ligne" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

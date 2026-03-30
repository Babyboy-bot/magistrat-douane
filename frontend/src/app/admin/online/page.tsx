"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

const ROLE_LABELS: Record<string, string> = {
  client: "Client",
  prospect: "Prospect",
  agent: "Agent",
  admin: "Admin",
};

const ROLE_COLORS: Record<string, string> = {
  client: "bg-blue-100 text-blue-700",
  prospect: "bg-yellow-100 text-yellow-700",
  agent: "bg-green-100 text-green-700",
  admin: "bg-purple-100 text-purple-700",
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wifi className="h-6 w-6 text-green-500" />
            Utilisateurs connectés
          </h1>
          <p className="text-gray-500 mt-1">
            {users.length} utilisateur{users.length !== 1 ? "s" : ""} en ligne
            {lastRefresh && (
              <span className="ml-2 text-xs text-gray-400">
                — mis à jour à {lastRefresh.toLocaleTimeString("fr-FR")}
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchOnline} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Résumé par rôle */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["client", "prospect", "agent", "admin"] as const).map((role) => (
          <Card key={role} className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold">{byRole[role]?.length ?? 0}</p>
              <p className="text-sm text-gray-500 mt-1">{ROLE_LABELS[role]}s</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length === 0 && !loading ? (
        <div className="text-center py-16">
          <WifiOff className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Aucun utilisateur connecté</p>
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Liste en temps réel
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-4 px-6 py-3">
                  <div className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold text-white bg-[hsl(222,47%,20%)] shrink-0">
                    {u.photo
                      ? <img src={`${API_BASE}${u.photo}`} className="h-9 w-9 rounded-full object-cover" alt="" />
                      : initials(u.nom, u.prenoms)
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.nom} {u.prenoms}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className={`text-xs ${ROLE_COLORS[u.role] ?? ""}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </Badge>
                    {u.profession_type && u.profession_type !== "autre" && (
                      <Badge variant="outline" className="text-xs">
                        {PROF_LABELS[u.profession_type] ?? u.profession_type}
                      </Badge>
                    )}
                    <span className="text-xs text-gray-400 hidden sm:block">{timeAgo(u.connected_since)}</span>
                    <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" title="En ligne" />
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

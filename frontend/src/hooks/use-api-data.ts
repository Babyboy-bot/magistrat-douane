"use client";

import { useState, useEffect, useRef } from "react";
import { emissionsApi, requestsApi, dashboardApi, usersApi, auditLogsApi, magistassurApi } from "@/lib/api";
import type { EmissionListParams, UserListParams } from "@/lib/api";
import type { User, CompteStats, AuditLogEntry, PaginatedResponse, Emission, ContratEpargne, ContratPrevoyance } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";

// ── Generic fetch hook — no mock fallback ──

type UseApiOptions = {
  enabled?: boolean;
  deps?: React.DependencyList;
};

function useApi<T>(apiFn: () => Promise<T>, defaultValue: T, options?: UseApiOptions) {
  const { enabled = true, deps = [] } = options || {};
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiFnRef = useRef(apiFn);

  useEffect(() => {
    apiFnRef.current = apiFn;
  }, [apiFn]);

  const doFetch = async () => {
    setLoading(true);
    try {
      const result = await apiFnRef.current();
      if (result === null || result === undefined) {
        console.warn("[useApi] API returned null/undefined, using default");
        setData(defaultValue);
      } else if (Array.isArray(defaultValue) && !Array.isArray(result)) {
        console.warn("[useApi] Expected array but got:", typeof result);
        setData(defaultValue);
      } else {
        setData(result);
      }
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur API";
      console.error("[useApi]", msg);
      setError(msg);
      setData(defaultValue);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    doFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return { data, loading, error, refetch: doFetch };
}

// ── Emissions ──

const emptyPaginatedEmissions: PaginatedResponse<Emission> = {
  results: [],
  count: 0,
  next: null,
  previous: null,
};

export function useEmissions(params?: EmissionListParams) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useApi(
    () => emissionsApi.list(params),
    emptyPaginatedEmissions,
    {
      enabled: isAuthenticated,
      deps: [
        params?.page,
        params?.pageSize,
        params?.search,
        params?.clientId,
        params?.agentId,
        params?.compagnie,
        params?.risque,
        params?.situation,
        params?.dateFrom,
        params?.dateTo,
        params?.echeanceFrom,
        params?.echeanceTo,
        params?.ordering,
        isAuthenticated,
      ],
    }
  );
}

export function useClientEmissions(clientId?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useApi(
    async () => {
      if (!clientId) return [] as Emission[];
      const paginated = await emissionsApi.list({ clientId, pageSize: 200 });
      return paginated.results;
    },
    [],
    { enabled: isAuthenticated && Boolean(clientId), deps: [clientId, isAuthenticated] }
  );
}

// ── Requests ──

export function useRequests() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useApi(() => requestsApi.list(), [], { enabled: isAuthenticated });
}

export function useClientRequests(clientId?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useApi(
    () => requestsApi.list(clientId),
    [],
    { enabled: isAuthenticated && !!clientId, deps: [clientId, isAuthenticated] }
  );
}

// ── Users ──

export function useUsers(role?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useApi(() => usersApi.list(role), [], { enabled: isAuthenticated, deps: [role, isAuthenticated] });
}

const emptyPaginatedUsers: PaginatedResponse<User> = {
  results: [],
  count: 0,
  next: null,
  previous: null,
};

export function usePaginatedUsers(params?: UserListParams) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useApi(() => usersApi.listPaginated(params), emptyPaginatedUsers, {
    enabled: isAuthenticated,
    deps: [params?.role, params?.search, params?.page, params?.pageSize, params?.profession_type, params?.exclude_profession_type, params?.risk_level, isAuthenticated],
  });
}

// ── Écheances proches (computed from emissions) ──

export function useEcheancesProches(jours: number = 45) {
  const { data: emissions, loading } = useEmissions();
  const now = new Date();
  const limit = new Date();
  limit.setDate(limit.getDate() + jours);
  const proches = Array.isArray(emissions) ? emissions.filter((e) => {
    const ech = new Date(e.echeance);
    return ech >= now && ech <= limit;
  }) : [];
  return { data: proches, loading };
}

// ── Agent Dashboard Stats (from API) ──

export function useAgentDashboardStats() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: stats, loading } = useApi(() => dashboardApi.stats(), {
    total_contrats: 0,
    contrats_actifs: 0,
    contrats_expires: 0,
    total_primes: 0,
    primes_payees: 0,
    primes_impayees: 0,
    total_clients: 0,
    total_prospects: 0,
    total_agents: 0,
  }, { enabled: isAuthenticated, deps: [isAuthenticated] });

  return {
    stats: {
      totalContrats: stats.total_contrats,
      contratsActifs: stats.contrats_actifs,
      contratsExpires: stats.contrats_expires,
      totalPrimes: stats.total_primes,
      primesPayees: stats.primes_payees,
      primesImpayees: stats.primes_impayees,
      totalClients: stats.total_clients,
      totalProspects: stats.total_prospects,
      totalAgents: stats.total_agents,
    },
    loading,
  };
}

// ── Client Stats (computed from emissions) ──

export function useClientStats(clientId: string) {
  const { data: emissions, loading, refetch } = useClientEmissions(clientId);
  const emissionsArray = Array.isArray(emissions) ? emissions : [];

  const stats: CompteStats = {
    primeTotale: emissionsArray.reduce((sum: number, e: Emission) => sum + e.primeTTC, 0),
    primePayee: emissionsArray.reduce((sum: number, e: Emission) => sum + (e.totalPaye ?? 0), 0),
    primeAPayer: emissionsArray.reduce((sum: number, e: Emission) => sum + (e.solde ?? 0), 0),
  };

  return { stats, emissions: emissionsArray, loading, refetch };
}

// ── MAGIST'ASSUR (client) ──

export function useClientEpargne(clientId?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useApi(
    () => magistassurApi.listEpargne(clientId ? { clientId } : {}),
    [] as ContratEpargne[],
    { enabled: isAuthenticated && Boolean(clientId), deps: [clientId, isAuthenticated] }
  );
}

export function useClientPrevoyance(clientId?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useApi(
    () => magistassurApi.listPrevoyance(clientId ? { clientId } : {}),
    [] as ContratPrevoyance[],
    { enabled: isAuthenticated && Boolean(clientId), deps: [clientId, isAuthenticated] }
  );
}

// ── Audit Logs (admin only) ──

const emptyPaginatedAuditLogs: PaginatedResponse<AuditLogEntry> = {
  results: [],
  count: 0,
  next: null,
  previous: null,
};

export function useAuditLogs(filters?: { userId?: string; action?: string; page?: number; pageSize?: number }) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const enabled = Boolean(isAuthenticated && user?.role === "admin");
  return useApi(() => auditLogsApi.list(filters), emptyPaginatedAuditLogs, {
    enabled,
    deps: [filters?.userId, filters?.action, filters?.page, filters?.pageSize, enabled],
  });
}

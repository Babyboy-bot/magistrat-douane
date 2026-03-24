import { apiFetch } from "./client";

export interface DashboardStats {
  total_contrats: number;
  contrats_actifs: number;
  contrats_expires: number;
  total_primes: number;
  primes_payees: number;
  primes_impayees: number;
  total_clients: number;
  total_prospects: number;
  total_agents: number;
}

export const dashboardApi = {
  async stats(role?: string): Promise<DashboardStats> {
    const url = role ? `/api/dashboard/stats/?role=${role}` : "/api/dashboard/stats/";
    return apiFetch<DashboardStats>(url);
  },
};

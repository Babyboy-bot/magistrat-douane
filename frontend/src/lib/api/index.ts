/**
 * index.ts — Point d'entrée unique du module api/.
 * Importer depuis "@/lib/api" plutôt que "@/lib/api.ts" (ancien god-file).
 */
export { apiFetch, downloadFile, API_BASE } from "./client";
export type { ApiFetchOptions } from "./client";

export { authApi, mapUser } from "./auth";

export { usersApi, agentsApi, auditLogsApi } from "./users";
export type { UserListParams } from "./users";

export { emissionsApi, paiementsApi, compagniesApi, mapEmission, mapPaiement } from "./emissions";
export type { EmissionListParams } from "./emissions";

export { requestsApi, documentsApi, mapRequest, mapDocument } from "./requests";

export { magistassurApi } from "./magistassur";

export { dashboardApi } from "./dashboard";
export type { DashboardStats } from "./dashboard";

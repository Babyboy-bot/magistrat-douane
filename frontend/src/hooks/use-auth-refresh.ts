import { useCallback, useRef } from "react";
import { useAuthStore } from "@/stores/auth-store";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

interface UseAuthRefreshReturn {
  handleTokenRefresh: () => Promise<boolean>;
  isRefreshing: boolean;
}

export function useAuthRefresh(): UseAuthRefreshReturn {
  const { logout } = useAuthStore();
  const isRefreshingRef = useRef(false);

  const handleTokenRefresh = useCallback(async (): Promise<boolean> => {
    // Éviter les rafraîchissements multiples
    if (isRefreshingRef.current) {
      return false;
    }

    isRefreshingRef.current = true;

    try {
      // Les tokens sont renouvelés dans les cookies httpOnly par le backend
      const response = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        return true;
      }

      // Si le rafraîchissement échoue, déconnecter l'utilisateur
      console.warn('Token refresh failed, logging out...');
      logout();
      return false;

    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
      return false;

    } finally {
      isRefreshingRef.current = false;
    }
  }, [logout]);

  return {
    handleTokenRefresh,
    isRefreshing: isRefreshingRef.current,
  };
}

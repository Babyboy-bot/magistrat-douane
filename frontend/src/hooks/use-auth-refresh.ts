import { useCallback, useRef } from "react";
import { useAuthStore } from "@/stores/auth-store";

interface UseAuthRefreshReturn {
  handleTokenRefresh: () => Promise<boolean>;
  isRefreshing: boolean;
}

export function useAuthRefresh(): UseAuthRefreshReturn {
  const { login, logout, user } = useAuthStore();
  const isRefreshingRef = useRef(false);

  const handleTokenRefresh = useCallback(async (): Promise<boolean> => {
    // Éviter les rafraîchissements multiples
    if (isRefreshingRef.current) {
      return false;
    }

    isRefreshingRef.current = true;

    try {
      // Tenter de rafraîchir le token
      const response = await fetch('/api/auth/token/refresh/', {
        method: 'POST',
        credentials: 'include', // Important pour les cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Mettre à jour le user store avec les nouvelles données
        if (data.access) {
          // Le token est rafraîchi, l'utilisateur est toujours authentifié
          return true;
        }
      }

      // Si le rafraîchissement échoue, déconnecter l'utilisateur
      console.warn('Token refresh failed, logging out...');
      logout();
      return false;

    } catch (error) {
      console.error('Token refresh error:', error);
      
      // En cas d'erreur réseau, essayer de se reconnecter avec les credentials existants
      if (user?.email && user?.nom && user?.prenoms) {
        try {
          const loginSuccess = await login(user.email, '');
          return loginSuccess;
        } catch (loginError) {
          console.error('Auto-login failed:', loginError);
          logout();
          return false;
        }
      }

      logout();
      return false;

    } finally {
      isRefreshingRef.current = false;
    }
  }, [login, logout, user]);

  return {
    handleTokenRefresh,
    isRefreshing: isRefreshingRef.current,
  };
}

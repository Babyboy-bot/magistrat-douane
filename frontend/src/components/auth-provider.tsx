"use client";

import { useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const initialize = useAuthStore((state) => state.initialize);
  const initialized = useAuthStore((state) => state.initialized);

  const handleInitialize = useCallback(() => {
    initialize().catch(() => {
      // Silently fail - user will need to login
    });
  }, [initialize]);

  useEffect(() => {
    // Initialize auth state on app load
    if (!initialized) {
      handleInitialize();
    }
  }, [handleInitialize, initialized]);

  // Show loading spinner while initializing
  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-navy-100 border-t-amber-500"></div>
          <p className="text-sm text-navy-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

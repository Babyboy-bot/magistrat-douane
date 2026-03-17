"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Attempts to restore the session from httpOnly cookies on mount.
 * Call this once in each protected layout.
 */
export function useAuthInit() {
  const { isAuthenticated, fetchMe } = useAuthStore();
  const tried = useRef(false);

  useEffect(() => {
    if (!isAuthenticated && !tried.current) {
      tried.current = true;
      fetchMe();
    }
  }, [isAuthenticated, fetchMe]);
}

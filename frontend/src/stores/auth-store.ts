import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User } from "@/lib/types";
import { authApi } from "@/lib/api";
import { purgeMagistassurDrafts } from "@/lib/draft-storage";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  patchUser: (user: User) => void;
  fetchMe: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      loading: false,
      initialized: false,

      login: async (email: string, password: string) => {
        try {
          set({ loading: true });
          const user = await authApi.login(email, password);
          set({ user, isAuthenticated: true, loading: false });
          return true;
        } catch {
          set({ loading: false });
          return false;
        }
      },

      logout: () => {
        authApi.logout().catch(() => {});
        purgeMagistassurDrafts();
        set({ user: null, isAuthenticated: false });
      },

      updateProfile: (updates: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
        authApi.updateProfile(updates as Record<string, string>).catch(() => {});
      },

      patchUser: (user: User) => {
        set({ user });
      },

      fetchMe: async () => {
        try {
          const user = await authApi.me();
          set({ user, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },

      // Initialize on first load
      initialize: async () => {
        set({ loading: true });
        try {
          await get().fetchMe();
        } finally {
          set({ initialized: true, loading: false });
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

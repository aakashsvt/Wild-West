import { create } from "zustand";
import { clearToken, getToken, setToken, type UserDetail } from "@/lib/api";

interface AuthState {
  token: string | null;
  user: UserDetail | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: UserDetail) => void;
  setUser: (user: UserDetail) => void;
  clearAuth: () => void;
  hydrateToken: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  setAuth: (token, user) => {
    setToken(token);
    set({ token, user, isAuthenticated: true });
  },

  setUser: (user) => set({ user }),

  clearAuth: () => {
    clearToken();
    set({ token: null, user: null, isAuthenticated: false });
  },

  hydrateToken: () => {
    const token = getToken();
    if (token) set({ token, isAuthenticated: true });
  },
}));

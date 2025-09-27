import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authService, User, LoginRequest } from "../services/auth";

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      error: null,
      login: async (credentials) => {
        console.log('AuthStore login called with:', credentials);
        set({ loading: true, error: null });
        try {
          console.log('Calling authService.login...');
          const response = await authService.login(credentials);
          console.log('Login successful:', response);
          set({
            user: response.user,
            token: response.token,
            loading: false
          });
        } catch (error) {
          console.error('Login error:', error);
          const message = (error as { message?: string }).message ?? "Falha na autenticação";
          set({ error: message, loading: false });
          throw error;
        }
      },
      logout: async () => {
        set({ loading: true });
        try {
          await authService.logout();
        } finally {
          set({ user: null, token: null, loading: false });
        }
      },
      initialize: () => {
        const user = authService.initializeAuth();
        if (user) {
          set({ user, token: localStorage.getItem('auth_token') });
        }
      },
    }),
    {
      name: "auth-store",
      partialize: (state) => ({ user: state.user, token: state.token }),
    },
  ),
);

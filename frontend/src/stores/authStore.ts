import { create } from "zustand";
import { persist } from "zustand/middleware";
import api, { setAuthToken } from "../services/api";

type Loja = {
  id: number;
  nome: string;
};

type Usuario = {
  id: number;
  nome: string;
  email: string;
  perfil: "manager" | "cashier" | "stockist";
  lojas: Loja[];
};

type LoginPayload = {
  email: string;
  password: string;
};

type AuthState = {
  user: Usuario | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
};

const fallbackUser: Usuario = {
  id: 1,
  nome: "Administrador",
  email: "admin@comercio.local",
  perfil: "manager",
  lojas: [{ id: 1, nome: "Loja Centro" }],
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      loading: false,
      error: null,
      login: async ({ email, password }) => {
        set({ loading: true, error: null });
        try {
          const { data } = await api.post("/auth/login", { email, password });
          setAuthToken(data.access);
          set({ user: data.user, token: data.access, loading: false });
        } catch (error) {
          const message = (error as { message?: string }).message ?? "Falha na autenticação";
          // fallback offline: aceita credenciais padrão mesmo sem API
          if (email === fallbackUser.email && password === "admin123") {
            setAuthToken("offline-token");
            set({ user: fallbackUser, token: "offline-token", loading: false, error: null });
            return;
          }
          set({ error: message, loading: false });
          throw new Error(message);
        }
      },
      logout: () => {
        setAuthToken(undefined);
        set({ user: null, token: null });
      },
    }),
    {
      name: "auth-store",
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) setAuthToken(state.token);
      },
    },
  ),
);

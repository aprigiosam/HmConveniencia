import { beforeEach, describe, expect, it, vi } from "vitest";

import { authService } from "../services/auth";
import { useAuthStore } from "./authStore";

vi.mock("../services/auth", () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    initializeAuth: vi.fn(),
  },
}));

const mockedAuthService = authService as unknown as {
  login: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  initializeAuth: ReturnType<typeof vi.fn>;
};

const resetStore = () => {
  useAuthStore.setState({ user: null, token: null, loading: false, error: null });
  const persistHelper = (useAuthStore as any).persist;
  persistHelper?.clearStorage?.();
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  resetStore();
});

describe("useAuthStore", () => {
  it("atualiza estado no login bem sucedido", async () => {
    mockedAuthService.login.mockResolvedValueOnce({
      user: { id: 1, username: "sam", email: "sam@example.com", is_staff: false },
      token: "token-xyz",
    });

    await useAuthStore.getState().login({ username: "sam", password: "123" });

    const state = useAuthStore.getState();
    expect(state.user?.username).toBe("sam");
    expect(state.token).toBe("token-xyz");
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("registra erro quando login falha", async () => {
    mockedAuthService.login.mockRejectedValueOnce(new Error("Credenciais invalidas"));

    await expect(
      useAuthStore.getState().login({ username: "sam", password: "wrong" }),
    ).rejects.toThrow("Credenciais invalidas");

    const state = useAuthStore.getState();
    expect(state.error).toBe("Credenciais invalidas");
    expect(state.loading).toBe(false);
  });

  it("restaura usuario salvo na inicializacao", () => {
    mockedAuthService.initializeAuth.mockReturnValueOnce({
      id: 2,
      username: "ana",
      email: "ana@example.com",
      is_staff: true,
    });
    localStorage.setItem("auth_token", "persisted");

    useAuthStore.getState().initialize();

    const state = useAuthStore.getState();
    expect(state.user?.username).toBe("ana");
    expect(state.token).toBe("persisted");
  });

  it("limpa estado no logout", async () => {
    useAuthStore.setState({
      user: { id: 5, username: "joao", email: "joao@example.com", is_staff: false },
      token: "token",
      loading: false,
      error: null,
    });
    mockedAuthService.logout.mockResolvedValueOnce(undefined);

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.loading).toBe(false);
  });
});

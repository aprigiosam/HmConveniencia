import { beforeEach, describe, expect, it, vi } from "vitest";

import api, { setAuthToken } from "./api";
import { authService } from "./auth";

vi.mock("./api", () => {
  const post = vi.fn();
  const get = vi.fn();
  return {
    default: { post, get },
    setAuthToken: vi.fn(),
  };
});

const mockedApi = api as unknown as {
  post: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
};

const mockedSetAuthToken = setAuthToken as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("authService", () => {
  it("salva token e usuario no login", async () => {
    const response = {
      data: {
        message: "ok",
        token: "token-123",
        user: { id: 1, username: "sam", email: "sam@example.com", is_staff: true },
      },
    };
    mockedApi.post.mockResolvedValueOnce(response);

    const data = await authService.login({ username: "sam", password: "123" });

    expect(data).toEqual(response.data);
    expect(mockedSetAuthToken).toHaveBeenCalledWith("token-123");
    expect(localStorage.getItem("auth_token")).toBe("token-123");
    const storedUser = localStorage.getItem("user");
    expect(storedUser).toBeDefined();
    expect(storedUser).not.toBeNull();
    expect(JSON.parse(storedUser!)).toEqual(response.data.user);
  });

  it("limpa contexto no logout mesmo com erro", async () => {
    mockedApi.post.mockRejectedValueOnce(new Error("falha"));

    await expect(authService.logout()).resolves.toBeUndefined();

    expect(mockedSetAuthToken).toHaveBeenCalledWith(undefined);
    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(mockedApi.post).toHaveBeenCalledWith("/auth/logout/");
  });

  it("retorna usuario inicializado quando dados existem", () => {
    localStorage.setItem("auth_token", "stored-token");
    localStorage.setItem("user", JSON.stringify({ id: 2, username: "ana" }));

    const user = authService.initializeAuth();

    expect(user).toEqual({ id: 2, username: "ana" });
    expect(mockedSetAuthToken).toHaveBeenCalledWith("stored-token");
  });

  it("retorna null se nao houver dados salvos", () => {
    const user = authService.initializeAuth();

    expect(user).toBeNull();
    expect(mockedSetAuthToken).not.toHaveBeenCalled();
  });
});

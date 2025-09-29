import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

const api = axios.create({
  baseURL,
  withCredentials: true,
});

export const setAuthToken = (token?: string) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Token ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

type ApiError = {
  status: number;
  message: string;
  details?: unknown;
};

const extractErrorMessage = (error: unknown): string | undefined => {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  if (Array.isArray(error)) {
    const first = error.find((item) => typeof item === "string");
    return typeof first === "string" ? first : undefined;
  }

  const values = Object.values(error as Record<string, unknown>);

  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
    if (Array.isArray(value)) {
      const nested = value.find((item) => typeof item === "string" && item.trim());
      if (typeof nested === "string") {
        return nested;
      }
    }
    if (value && typeof value === "object") {
      const nested = extractErrorMessage(value);
      if (nested) {
        return nested;
      }
    }
  }

  return undefined;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const details = error.response?.data;
    const fallbackMessage = error.message ?? "Erro inesperado";
    const apiMessage = details?.detail ?? extractErrorMessage(details);

    const normalized: ApiError = {
      status: error.response?.status ?? 500,
      message: apiMessage ?? fallbackMessage,
      details,
    };
    return Promise.reject(normalized);
  },
);

export default api;

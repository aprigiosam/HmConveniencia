import axios from "axios";

const API_VERSION_SUFFIX = "/api/v1";

const ensureVersionedBaseURL = (value: string): string => {
  const sanitized = value.trim().replace(/\/+$/, "");

  if (/\/api\/v\d+$/i.test(sanitized) || /\/api\/.+/i.test(sanitized)) {
    return sanitized;
  }

  if (/\/api$/i.test(sanitized)) {
    return `${sanitized}/v1`;
  }

  return `${sanitized}${API_VERSION_SUFFIX}`;
};

const resolveBaseURL = (): string => {
  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (fromEnv && fromEnv.length > 0) {
    return ensureVersionedBaseURL(fromEnv);
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return ensureVersionedBaseURL(window.location.origin);
  }

  return ensureVersionedBaseURL("http://localhost:8000");
};

// Ensure the API client always talks to the versioned backend endpoint.
const api = axios.create({
  baseURL: resolveBaseURL(),
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

import axios from "axios";

const API_VERSION_SUFFIX = "/api/v1";

const ensureVersionedBaseURL = (raw: string): string => {
  const sanitized = raw.trim().replace(/\/+$/, "");

  if (/\/api\/v\d+$/i.test(sanitized) || /\/api\/.+/i.test(sanitized)) {
    return sanitized;
  }

  if (/\/api$/i.test(sanitized)) {
    return `${sanitized}/v1`;
  }

  return `${sanitized}${API_VERSION_SUFFIX}`;
};

const isAbsoluteUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const withWindowOrigin = (path: string): string => {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return `http://localhost:8000${path}`;
};

const normalizeBaseSource = (value: string): string => {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return trimmed;
  }

  if (isAbsoluteUrl(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return withWindowOrigin(trimmed);
  }

  return trimmed;
};

const resolveBaseURL = (): string => {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv !== undefined) {
    return ensureVersionedBaseURL(normalizeBaseSource(fromEnv));
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

api.interceptors.request.use((config) => {
  const url = config.url;

  if (typeof url === "string" && url.startsWith("/") && !/^https?:\/\//i.test(url)) {
    config.url = url.replace(/^\/+/u, "");
  }

  return config;
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

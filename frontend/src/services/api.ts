import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1",
  withCredentials: true,
});

export const setAuthToken = (token?: string) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

type ApiError = {
  status: number;
  message: string;
  details?: unknown;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalized: ApiError = {
      status: error.response?.status ?? 500,
      message: error.response?.data?.detail ?? error.message ?? "Erro inesperado",
      details: error.response?.data,
    };
    return Promise.reject(normalized);
  },
);

export default api;

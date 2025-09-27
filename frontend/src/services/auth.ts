import api, { setAuthToken } from './api';

export interface User {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user: User;
  token: string;
}

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post('/auth/login/', credentials);
    const data = response.data;

    setAuthToken(data.token);
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    return data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout/');
    } finally {
      setAuthToken();
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  },

  async getProfile(): Promise<User> {
    const response = await api.get('/auth/profile/');
    return response.data.user;
  },

  initializeAuth(): User | null {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      setAuthToken(token);
      return JSON.parse(userStr) as User;
    }

    return null;
  }
};

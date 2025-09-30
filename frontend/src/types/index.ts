/**
 * Exports centralizados de todos os tipos da aplicação
 */

export * from './catalog';
export * from './sales';
export * from './finance';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

export interface Loja {
  id: number;
  nome: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Usuario {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  groups: string[];
  permissions: string[];
}

export interface AuthToken {
  token: string;
  user: Usuario;
}
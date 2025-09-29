import api from "./api";

export type ClientAddress = {
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  complemento?: string;
  [key: string]: unknown;
};

export type Client = {
  id: number;
  cpf: string;
  nome: string;
  telefone: string;
  email: string;
  endereco: ClientAddress | null;
  pontos_fidelidade: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  total_compras: number;
  total_itens: number;
  valor_total: number;
  valor_total_display: string;
  ticket_medio: number;
  ticket_medio_display: string;
  ultima_compra: string | null;
};

export type ClientListResponse = {
  results: Client[];
  count?: number;
  next?: string | null;
  previous?: string | null;
};

export type ClientPayload = {
  cpf?: string;
  nome: string;
  telefone?: string;
  email?: string;
  endereco?: ClientAddress | null;
  pontos_fidelidade?: number;
  ativo?: boolean;
};

const extractResults = (data: unknown): Client[] => {
  if (Array.isArray(data)) {
    return data as Client[];
  }
  if (data && typeof data === "object" && Array.isArray((data as ClientListResponse).results)) {
    return (data as ClientListResponse).results;
  }
  return [];
};

export const fetchClients = async (params?: { search?: string; ativo?: boolean }) => {
  const query: Record<string, string> = {};
  if (params?.search) {
    query.search = params.search;
  }
  if (typeof params?.ativo === "boolean") {
    query.ativo = params.ativo ? "true" : "false";
  }

  const { data } = await api.get("/clientes/", {
    params: Object.keys(query).length ? query : undefined,
  });
  return extractResults(data);
};

export const createClient = async (payload: ClientPayload) => {
  const { data } = await api.post<Client>("/clientes/", payload);
  return data;
};

export const updateClient = async (id: number, payload: ClientPayload) => {
  const { data } = await api.patch<Client>(`/clientes/${id}/`, payload);
  return data;
};

export const toggleClientStatus = async (id: number, ativo: boolean) => {
  const { data } = await api.patch<Client>(`/clientes/${id}/`, { ativo });
  return data;
};

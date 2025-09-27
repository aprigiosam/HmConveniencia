import api from "./api";

export type SupplierContact = {
  nome?: string;
  telefone?: string;
  email?: string;
  observacao?: string;
};

export type Supplier = {
  id: number;
  cnpj_cpf: string;
  nome: string;
  telefone: string;
  email: string;
  responsavel: string;
  condicoes_pagamento: string;
  prazo_medio_entrega_dias: number;
  observacoes: string;
  contatos: SupplierContact[];
  endereco: Record<string, unknown> | null;
  estoque_total: number;
  produtos_ativos: number;
  valor_estoque: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type SupplierListResponse = {
  results: Supplier[];
  count: number;
  next?: string | null;
  previous?: string | null;
};

export const fetchSuppliers = async (params?: { search?: string; ativo?: boolean }) => {
  const query = params
    ? {
        ...(params.search ? { search: params.search } : {}),
        ...(typeof params.ativo === "boolean" ? { ativo: params.ativo } : {}),
      }
    : undefined;

  const { data } = await api.get<SupplierListResponse>("/catalog/fornecedores/", { params: query });
  return data;
};

export const createSupplier = async (payload: Partial<Supplier>) => {
  const { data } = await api.post<Supplier>("/catalog/fornecedores/", payload);
  return data;
};

export const updateSupplier = async (id: number, payload: Partial<Supplier>) => {
  const { data } = await api.patch<Supplier>(`/catalog/fornecedores/${id}/`, payload);
  return data;
};

export const toggleSupplierStatus = async (id: number, ativo: boolean) => {
  const endpoint = ativo ? "ativar" : "desativar";
  const { data } = await api.post<Supplier>(`/catalog/fornecedores/${id}/${endpoint}/`);
  return data;
};

export const fetchSupplierProducts = async (id: number) => {
  const { data } = await api.get(`/catalog/fornecedores/${id}/produtos/`);
  return data;
};

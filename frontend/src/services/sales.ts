/**
 * Serviços relacionados a vendas e sessões de PDV
 */

import api from './api';
import type {
  SessaoPDV,
  ValidationResult,
  MetodoPagamento,
  Cliente,
  Venda,
  ItemVenda,
  PagamentoVenda,
  MovimentoCaixa,
  PaginatedResponse,
} from '../types';

// ========================================
// SESSÕES DE PDV
// ========================================

export const sessaoService = {
  list: async (params?: Record<string, unknown>) => {
    const response = await api.get<PaginatedResponse<SessaoPDV>>('/sales/sessoes/', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get<SessaoPDV>(`/sales/sessoes/${id}/`);
    return response.data;
  },

  getAberta: async (lojaId: number) => {
    const response = await api.get<SessaoPDV>('/sales/sessoes/sessao_aberta/', {
      params: { loja: lojaId },
    });
    return response.data;
  },

  create: async (data: { loja: number; saldo_inicial: number }) => {
    const response = await api.post<SessaoPDV>('/sales/sessoes/', data);
    return response.data;
  },

  validarFechamento: async (id: number) => {
    const response = await api.get<ValidationResult>(`/sales/sessoes/${id}/validar_fechamento/`);
    return response.data;
  },

  fechar: async (id: number, saldoFechamentoReal: number, observacoes?: string) => {
    const response = await api.post<SessaoPDV>(`/sales/sessoes/${id}/fechar/`, {
      saldo_fechamento_real: saldoFechamentoReal,
      observacoes_fechamento: observacoes,
    });
    return response.data;
  },

  reabrirSessao: async (id: number) => {
    const response = await api.post<SessaoPDV>(`/sales/sessoes/${id}/reabrir/`);
    return response.data;
  },
};

// ========================================
// MÉTODOS DE PAGAMENTO
// ========================================

export const metodoPagamentoService = {
  list: async (params?: Record<string, unknown>) => {
    const response = await api.get<PaginatedResponse<MetodoPagamento>>('/sales/metodos-pagamento/', {
      params,
    });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get<MetodoPagamento>(`/sales/metodos-pagamento/${id}/`);
    return response.data;
  },

  create: async (data: Partial<MetodoPagamento>) => {
    const response = await api.post<MetodoPagamento>('/sales/metodos-pagamento/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<MetodoPagamento>) => {
    const response = await api.put<MetodoPagamento>(`/sales/metodos-pagamento/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/sales/metodos-pagamento/${id}/`);
  },
};

// ========================================
// CLIENTES
// ========================================

export const clienteService = {
  list: async (params?: Record<string, unknown>) => {
    const response = await api.get<PaginatedResponse<Cliente>>('/sales/clientes/', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get<Cliente>(`/sales/clientes/${id}/`);
    return response.data;
  },

  create: async (data: Partial<Cliente>) => {
    const response = await api.post<Cliente>('/sales/clientes/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Cliente>) => {
    const response = await api.put<Cliente>(`/sales/clientes/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/sales/clientes/${id}/`);
  },

  buscarPorCPF: async (cpf: string) => {
    const response = await api.get<Cliente>('/sales/clientes/buscar_por_cpf/', {
      params: { cpf },
    });
    return response.data;
  },
};

// ========================================
// VENDAS
// ========================================

export const vendaService = {
  list: async (params?: Record<string, unknown>) => {
    const response = await api.get<PaginatedResponse<Venda>>('/sales/vendas/', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get<Venda>(`/sales/vendas/${id}/`);
    return response.data;
  },

  create: async (data: Partial<Venda>) => {
    const response = await api.post<Venda>('/sales/vendas/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Venda>) => {
    const response = await api.put<Venda>(`/sales/vendas/${id}/`, data);
    return response.data;
  },

  finalizar: async (id: number) => {
    const response = await api.post<Venda>(`/sales/vendas/${id}/finalizar/`);
    return response.data;
  },

  cancelar: async (id: number, motivo: string) => {
    const response = await api.post<Venda>(`/sales/vendas/${id}/cancelar/`, {
      motivo_cancelamento: motivo,
    });
    return response.data;
  },

  addItem: async (vendaId: number, data: Partial<ItemVenda>) => {
    const response = await api.post<ItemVenda>(`/sales/vendas/${vendaId}/itens/`, data);
    return response.data;
  },

  updateItem: async (vendaId: number, itemId: number, data: Partial<ItemVenda>) => {
    const response = await api.put<ItemVenda>(`/sales/vendas/${vendaId}/itens/${itemId}/`, data);
    return response.data;
  },

  removeItem: async (vendaId: number, itemId: number) => {
    await api.delete(`/sales/vendas/${vendaId}/itens/${itemId}/`);
  },

  addPagamento: async (vendaId: number, data: Partial<PagamentoVenda>) => {
    const response = await api.post<PagamentoVenda>(`/sales/vendas/${vendaId}/pagamentos/`, data);
    return response.data;
  },

  removePagamento: async (vendaId: number, pagamentoId: number) => {
    await api.delete(`/sales/vendas/${vendaId}/pagamentos/${pagamentoId}/`);
  },
};

// ========================================
// MOVIMENTOS DE CAIXA
// ========================================

export const movimentoCaixaService = {
  list: async (params?: Record<string, unknown>) => {
    const response = await api.get<PaginatedResponse<MovimentoCaixa>>('/sales/movimentos-caixa/', {
      params,
    });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get<MovimentoCaixa>(`/sales/movimentos-caixa/${id}/`);
    return response.data;
  },

  create: async (data: Partial<MovimentoCaixa>) => {
    const response = await api.post<MovimentoCaixa>('/sales/movimentos-caixa/', data);
    return response.data;
  },

  registrarSangria: async (sessaoId: number, valor: number, descricao: string) => {
    const response = await api.post<MovimentoCaixa>('/sales/movimentos-caixa/', {
      sessao_pdv: sessaoId,
      tipo: 'SANGRIA',
      valor,
      descricao,
    });
    return response.data;
  },

  registrarReforco: async (sessaoId: number, valor: number, descricao: string) => {
    const response = await api.post<MovimentoCaixa>('/sales/movimentos-caixa/', {
      sessao_pdv: sessaoId,
      tipo: 'REFORCO',
      valor,
      descricao,
    });
    return response.data;
  },
};
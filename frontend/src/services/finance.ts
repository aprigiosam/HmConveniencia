/**
 * Serviços relacionados ao módulo financeiro
 */

import api from './api';
import type {
  ContaPagar,
  ContaReceber,
  MovimentoFinanceiro,
  RelatorioFinanceiro,
  PaginatedResponse,
} from '../types';

// ========================================
// CONTAS A PAGAR
// ========================================

export const contaPagarService = {
  list: async (params?: Record<string, unknown>) => {
    const response = await api.get<PaginatedResponse<ContaPagar>>('/finance/contas-pagar/', {
      params,
    });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get<ContaPagar>(`/finance/contas-pagar/${id}/`);
    return response.data;
  },

  create: async (data: Partial<ContaPagar>) => {
    const response = await api.post<ContaPagar>('/finance/contas-pagar/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<ContaPagar>) => {
    const response = await api.put<ContaPagar>(`/finance/contas-pagar/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/finance/contas-pagar/${id}/`);
  },

  marcarComoPaga: async (id: number, dataPagamento: string) => {
    const response = await api.post<ContaPagar>(`/finance/contas-pagar/${id}/marcar_paga/`, {
      data_pagamento: dataPagamento,
    });
    return response.data;
  },

  cancelar: async (id: number) => {
    const response = await api.post<ContaPagar>(`/finance/contas-pagar/${id}/cancelar/`);
    return response.data;
  },
};

// ========================================
// CONTAS A RECEBER
// ========================================

export const contaReceberService = {
  list: async (params?: Record<string, unknown>) => {
    const response = await api.get<PaginatedResponse<ContaReceber>>('/finance/contas-receber/', {
      params,
    });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get<ContaReceber>(`/finance/contas-receber/${id}/`);
    return response.data;
  },

  create: async (data: Partial<ContaReceber>) => {
    const response = await api.post<ContaReceber>('/finance/contas-receber/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<ContaReceber>) => {
    const response = await api.put<ContaReceber>(`/finance/contas-receber/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/finance/contas-receber/${id}/`);
  },

  marcarComoRecebida: async (id: number, dataRecebimento: string) => {
    const response = await api.post<ContaReceber>(`/finance/contas-receber/${id}/marcar_recebida/`, {
      data_recebimento: dataRecebimento,
    });
    return response.data;
  },

  cancelar: async (id: number) => {
    const response = await api.post<ContaReceber>(`/finance/contas-receber/${id}/cancelar/`);
    return response.data;
  },
};

// ========================================
// MOVIMENTOS FINANCEIROS
// ========================================

export const movimentoFinanceiroService = {
  list: async (params?: Record<string, unknown>) => {
    const response = await api.get<PaginatedResponse<MovimentoFinanceiro>>(
      '/finance/movimentos/',
      { params }
    );
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get<MovimentoFinanceiro>(`/finance/movimentos/${id}/`);
    return response.data;
  },

  create: async (data: Partial<MovimentoFinanceiro>) => {
    const response = await api.post<MovimentoFinanceiro>('/finance/movimentos/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<MovimentoFinanceiro>) => {
    const response = await api.put<MovimentoFinanceiro>(`/finance/movimentos/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/finance/movimentos/${id}/`);
  },
};

// ========================================
// RELATÓRIOS FINANCEIROS
// ========================================

export const relatorioFinanceiroService = {
  getDashboard: async (periodoInicio: string, periodoFim: string) => {
    const response = await api.get<RelatorioFinanceiro>('/finance/relatorios/dashboard/', {
      params: {
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
      },
    });
    return response.data;
  },

  getFluxoCaixa: async (periodoInicio: string, periodoFim: string) => {
    const response = await api.get('/finance/relatorios/fluxo-caixa/', {
      params: {
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
      },
    });
    return response.data;
  },

  exportarPDF: async (periodoInicio: string, periodoFim: string) => {
    const response = await api.get('/finance/relatorios/exportar-pdf/', {
      params: {
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
      },
      responseType: 'blob',
    });
    return response.data;
  },

  exportarExcel: async (periodoInicio: string, periodoFim: string) => {
    const response = await api.get('/finance/relatorios/exportar-excel/', {
      params: {
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
      },
      responseType: 'blob',
    });
    return response.data;
  },
};
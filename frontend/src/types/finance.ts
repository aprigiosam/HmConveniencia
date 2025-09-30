/**
 * Tipos relacionados ao módulo financeiro
 */

export interface ContaPagar {
  id: number;
  fornecedor?: number;
  fornecedor_nome?: string;
  descricao: string;
  valor: string;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'PENDENTE' | 'PAGA' | 'VENCIDA' | 'CANCELADA';
  categoria?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface ContaReceber {
  id: number;
  cliente?: number;
  cliente_nome?: string;
  descricao: string;
  valor: string;
  data_vencimento: string;
  data_recebimento?: string;
  status: 'PENDENTE' | 'RECEBIDA' | 'VENCIDA' | 'CANCELADA';
  categoria?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface MovimentoFinanceiro {
  id: number;
  tipo: 'ENTRADA' | 'SAIDA';
  categoria: string;
  descricao: string;
  valor: string;
  data: string;
  conta_bancaria?: number;
  conta_bancaria_nome?: string;
  created_at: string;
  updated_at: string;
}

export interface FluxoCaixa {
  data: string;
  entradas: string;
  saidas: string;
  saldo: string;
}

export interface RelatorioFinanceiro {
  periodo_inicio: string;
  periodo_fim: string;
  total_entradas: string;
  total_saidas: string;
  saldo_liquido: string;
  contas_pagar_pendentes: string;
  contas_receber_pendentes: string;
  fluxo_caixa: FluxoCaixa[];
}
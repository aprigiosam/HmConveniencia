/**
 * Tipos relacionados a vendas e sessões de PDV
 */

export interface SessaoPDV {
  id: number;
  codigo: string;
  loja: number;
  responsavel: number;
  responsavel_nome?: string;
  status: 'ABERTA' | 'FECHADA';
  aberta_em: string;
  fechada_em?: string;
  saldo_inicial: string;
  saldo_fechamento_esperado?: string;
  saldo_fechamento_real?: string;
  divergencia?: string;
  observacoes_fechamento?: string;
  created_at: string;
  updated_at: string;
}

export interface ValidationResult {
  pode_fechar: boolean;
  avisos: string[];
  bloqueios: string[];
}

export interface MetodoPagamento {
  id: number;
  nome: string;
  tipo: 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'PIX' | 'BOLETO' | 'OUTROS';
  ativo: boolean;
  taxa_percentual?: string;
  taxa_fixa?: string;
  created_at: string;
  updated_at: string;
}

export interface Cliente {
  id: number;
  cpf_cnpj?: string;
  nome: string;
  telefone?: string;
  email?: string;
  data_nascimento?: string;
  endereco?: string;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Venda {
  id: number;
  numero_documento: string;
  loja: number;
  sessao_pdv?: number;
  cliente?: number;
  cliente_nome?: string;
  vendedor: number;
  vendedor_nome?: string;
  tipo_operacao: 'VENDA' | 'DEVOLUCAO' | 'ORCAMENTO';
  status: 'PENDENTE' | 'CONCLUIDA' | 'CANCELADA';
  subtotal: string;
  desconto_total: string;
  acrescimo_total: string;
  total_final: string;
  observacoes?: string;
  itens?: ItemVenda[];
  pagamentos?: PagamentoVenda[];
  created_at: string;
  updated_at: string;
  finalizada_em?: string;
  cancelada_em?: string;
  motivo_cancelamento?: string;
}

export interface ItemVenda {
  id: number;
  venda: number;
  produto?: number;
  produto_nome?: string;
  combo?: number;
  combo_nome?: string;
  quantidade: number;
  preco_unitario: string;
  desconto: string;
  acrescimo: string;
  subtotal: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface PagamentoVenda {
  id: number;
  venda: number;
  metodo_pagamento: number;
  metodo_pagamento_nome?: string;
  valor: string;
  troco?: string;
  autorizado: boolean;
  codigo_autorizacao?: string;
  created_at: string;
  updated_at: string;
}

export interface MovimentoCaixa {
  id: number;
  sessao_pdv: number;
  tipo: 'ENTRADA' | 'SAIDA' | 'SANGRIA' | 'REFORCO';
  valor: string;
  descricao: string;
  responsavel: number;
  responsavel_nome?: string;
  created_at: string;
}

export interface ProgramaFidelidade {
  id: number;
  nome: string;
  descricao: string;
  pontos_por_real: string;
  valor_ponto: string;
  minimo_resgate: number;
  validade_pontos_dias: number;
  multiplicador_aniversario: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClienteFidelidade {
  id: number;
  cliente: number;
  cliente_nome?: string;
  programa: number;
  pontos_disponiveis: number;
  pontos_totais_ganhos: number;
  nivel: 'BRONZE' | 'PRATA' | 'OURO' | 'DIAMANTE';
  data_nivel: string;
  created_at: string;
  updated_at: string;
}

export interface MovimentoPontos {
  id: number;
  cliente_fidelidade: number;
  tipo: 'GANHO' | 'RESGATE' | 'EXPIRACAO' | 'AJUSTE';
  pontos: number;
  venda?: number;
  descricao: string;
  data_expiracao?: string;
  created_at: string;
}

export interface Recompensa {
  id: number;
  programa: number;
  nome: string;
  descricao: string;
  pontos_necessarios: number;
  tipo: 'DESCONTO' | 'PRODUTO' | 'SERVICO';
  valor_desconto?: string;
  produto?: number;
  ativo: boolean;
  quantidade_disponivel?: number;
  created_at: string;
  updated_at: string;
}
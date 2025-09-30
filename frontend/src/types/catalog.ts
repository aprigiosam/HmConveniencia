/**
 * Tipos relacionados ao catálogo de produtos
 */

export interface Categoria {
  id: number;
  nome: string;
  descricao?: string;
  pai?: number;
  subcategorias_count?: number;
  produtos_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Fornecedor {
  id: number;
  cnpj_cpf: string;
  nome: string;
  telefone?: string;
  email?: string;
  responsavel?: string;
  contatos?: Array<{
    nome: string;
    telefone: string;
    email: string;
    observacao?: string;
  }>;
  condicoes_pagamento?: string;
  prazo_medio_entrega_dias?: number;
  observacoes?: string;
  endereco?: string;
  ativo: boolean;
  produtos_ativos?: number;
  estoque_total?: number;
  valor_estoque?: string;
  created_at: string;
  updated_at: string;
}

export interface LoteProduto {
  id: number;
  produto: number;
  produto_nome?: string;
  loja: number;
  loja_nome?: string;
  quantidade: number;
  data_fabricacao?: string;
  data_validade?: string;
  numero_lote?: string;
  created_at: string;
  updated_at: string;
}

export interface Produto {
  id: number;
  sku: string;
  codigo_barras?: string;
  nome: string;
  descricao?: string;
  categoria: number;
  categoria_nome?: string;
  fornecedor?: number;
  fornecedor_nome?: string;
  unidade: 'UN' | 'KG' | 'LT' | 'MT' | 'CX';
  preco_custo: string;
  preco_venda: string;
  estoque_minimo: number;
  controla_vencimento: boolean;
  dias_alerta_vencimento?: number;
  permite_venda_vencido: boolean;
  desconto_produto_vencido?: string;
  ativo: boolean;
  lotes?: LoteProduto[];
  estoque_total?: number;
  margem_lucro?: number;
  created_at: string;
  updated_at: string;
}

export interface GridProdutoPDV {
  id: number;
  nome: string;
  loja: number;
  usuario?: number;
  itens?: ItemGridPDV[];
  created_at: string;
  updated_at: string;
}

export interface ItemGridPDV {
  id: number;
  grid: number;
  produto: number;
  produto_nome?: string;
  produto_preco?: string;
  posicao_x: number;
  posicao_y: number;
  cor_fundo?: string;
  created_at: string;
  updated_at: string;
}

export interface ProdutoCombo {
  id: number;
  nome: string;
  descricao?: string;
  sku: string;
  tipo: 'FIXO' | 'FLEXIVEL';
  preco_combo: string;
  preco_original: string;
  desconto_percentual: string;
  imagem?: string;
  ativo: boolean;
  estoque_minimo: number;
  ordem_exibicao: number;
  itens?: ItemCombo[];
  created_at: string;
  updated_at: string;
}

export interface ItemCombo {
  id: number;
  combo: number;
  produto: number;
  produto_nome?: string;
  quantidade: number;
  permite_substituicao: boolean;
  opcoes_substituicao?: OpcaoSubstituicao[];
  created_at: string;
  updated_at: string;
}

export interface OpcaoSubstituicao {
  id: number;
  item_combo: number;
  produto: number;
  produto_nome?: string;
  acrescimo_preco?: string;
  created_at: string;
  updated_at: string;
}

export interface ProdutoFavorito {
  id: number;
  usuario: number;
  produto: number;
  produto_nome?: string;
  produto_preco?: string;
  created_at: string;
}

export interface ListaPreco {
  id: number;
  nome: string;
  descricao?: string;
  tipo: 'NORMAL' | 'ATACADO' | 'PROMOCIONAL' | 'PERSONALIZADA';
  percentual_desconto?: string;
  ativo: boolean;
  data_inicio?: string;
  data_fim?: string;
  itens?: ItemListaPreco[];
  created_at: string;
  updated_at: string;
}

export interface ItemListaPreco {
  id: number;
  lista_preco: number;
  produto: number;
  produto_nome?: string;
  preco_customizado: string;
  created_at: string;
  updated_at: string;
}

export interface Promocao {
  id: number;
  nome: string;
  tipo: 'DESCONTO_PERCENTUAL' | 'DESCONTO_FIXO' | 'PRECO_FIXO' | 'LEVE_PAGUE';
  valor: string;
  produto?: number;
  categoria?: number;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
  quantidade_minima?: number;
  quantidade_leve?: number;
  quantidade_pague?: number;
  created_at: string;
  updated_at: string;
}

export interface UsoPromocao {
  id: number;
  promocao: number;
  venda: number;
  desconto_aplicado: string;
  created_at: string;
}
/**
 * Serviços relacionados ao catálogo de produtos
 */

import api from './api';
import type {
  Categoria,
  Fornecedor,
  Produto,
  LoteProduto,
  GridProdutoPDV,
  ItemGridPDV,
  ProdutoCombo,
  ListaPreco,
  Promocao,
  PaginatedResponse,
} from '../types';

// ========================================
// CATEGORIAS
// ========================================

export const categoriaService = {
  list: async (params?: Record<string, unknown>) => {
    const response = await api.get<PaginatedResponse<Categoria>>('/catalog/categorias/', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get<Categoria>(`/catalog/categorias/${id}/`);
    return response.data;
  },

  create: async (data: Partial<Categoria>) => {
    const response = await api.post<Categoria>('/catalog/categorias/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Categoria>) => {
    const response = await api.put<Categoria>(`/catalog/categorias/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/catalog/categorias/${id}/`);
  },
};

// ========================================
// FORNECEDORES
// ========================================

export const fornecedorService = {
  list: async (params?: Record<string, unknown>) => {
    const response = await api.get<PaginatedResponse<Fornecedor>>('/catalog/fornecedores/', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get<Fornecedor>(`/catalog/fornecedores/${id}/`);
    return response.data;
  },

  create: async (data: Partial<Fornecedor>) => {
    const response = await api.post<Fornecedor>('/catalog/fornecedores/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Fornecedor>) => {
    const response = await api.put<Fornecedor>(`/catalog/fornecedores/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/catalog/fornecedores/${id}/`);
  },
};

// ========================================
// PRODUTOS
// ========================================

export const produtoService = {
  list: async (params?: Record<string, unknown>) => {
    const response = await api.get<PaginatedResponse<Produto>>('/catalog/produtos/', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get<Produto>(`/catalog/produtos/${id}/`);
    return response.data;
  },

  create: async (data: Partial<Produto>) => {
    const response = await api.post<Produto>('/catalog/produtos/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Produto>) => {
    const response = await api.put<Produto>(`/catalog/produtos/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/catalog/produtos/${id}/`);
  },

  buscarPorCodigoBarras: async (codigoBarras: string) => {
    const response = await api.get<Produto>('/catalog/produtos/buscar_por_codigo_barras/', {
      params: { codigo_barras: codigoBarras },
    });
    return response.data;
  },
};

// ========================================
// LOTES DE PRODUTOS
// ========================================

export const loteService = {
  list: async (params?: Record<string, unknown>) => {
    const response = await api.get<PaginatedResponse<LoteProduto>>('/catalog/lotes/', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get<LoteProduto>(`/catalog/lotes/${id}/`);
    return response.data;
  },

  create: async (data: Partial<LoteProduto>) => {
    const response = await api.post<LoteProduto>('/catalog/lotes/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<LoteProduto>) => {
    const response = await api.put<LoteProduto>(`/catalog/lotes/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/catalog/lotes/${id}/`);
  },

  ajustarEstoque: async (id: number, quantidade: number, motivo: string) => {
    const response = await api.post(`/catalog/lotes/${id}/ajustar_estoque/`, {
      quantidade,
      motivo,
    });
    return response.data;
  },

  verificarVencimento: async (lojaId: number, diasAlerta: number) => {
    const response = await api.get('/catalog/lotes/verificar_vencimento/', {
      params: { loja: lojaId, dias_alerta: diasAlerta },
    });
    return response.data;
  },
};

// ========================================
// GRIDS DE PDV
// ========================================

export const gridService = {
  list: async (params?: Record<string, unknown>) => {
    const response = await api.get<PaginatedResponse<GridProdutoPDV>>('/catalog/grids/', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get<GridProdutoPDV>(`/catalog/grids/${id}/`);
    return response.data;
  },

  create: async (data: Partial<GridProdutoPDV>) => {
    const response = await api.post<GridProdutoPDV>('/catalog/grids/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<GridProdutoPDV>) => {
    const response = await api.put<GridProdutoPDV>(`/catalog/grids/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/catalog/grids/${id}/`);
  },

  addItem: async (gridId: number, data: Partial<ItemGridPDV>) => {
    const response = await api.post<ItemGridPDV>(`/catalog/grids/${gridId}/itens/`, data);
    return response.data;
  },

  updateItem: async (gridId: number, itemId: number, data: Partial<ItemGridPDV>) => {
    const response = await api.put<ItemGridPDV>(`/catalog/grids/${gridId}/itens/${itemId}/`, data);
    return response.data;
  },

  removeItem: async (gridId: number, itemId: number) => {
    await api.delete(`/catalog/grids/${gridId}/itens/${itemId}/`);
  },
};

// ========================================
// COMBOS
// ========================================

export const comboService = {
  list: async (params?: Record<string, unknown>) => {
    const response = await api.get<PaginatedResponse<ProdutoCombo>>('/catalog/combos/', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get<ProdutoCombo>(`/catalog/combos/${id}/`);
    return response.data;
  },

  create: async (data: Partial<ProdutoCombo>) => {
    const response = await api.post<ProdutoCombo>('/catalog/combos/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<ProdutoCombo>) => {
    const response = await api.put<ProdutoCombo>(`/catalog/combos/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/catalog/combos/${id}/`);
  },
};

// ========================================
// LISTAS DE PREÇO
// ========================================

export const listaPrecoService = {
  list: async (params?: Record<string, unknown>) => {
    const response = await api.get<PaginatedResponse<ListaPreco>>('/catalog/listas-preco/', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get<ListaPreco>(`/catalog/listas-preco/${id}/`);
    return response.data;
  },

  create: async (data: Partial<ListaPreco>) => {
    const response = await api.post<ListaPreco>('/catalog/listas-preco/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<ListaPreco>) => {
    const response = await api.put<ListaPreco>(`/catalog/listas-preco/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/catalog/listas-preco/${id}/`);
  },
};

// ========================================
// PROMOÇÕES
// ========================================

export const promocaoService = {
  list: async (params?: Record<string, unknown>) => {
    const response = await api.get<PaginatedResponse<Promocao>>('/catalog/promocoes/', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get<Promocao>(`/catalog/promocoes/${id}/`);
    return response.data;
  },

  create: async (data: Partial<Promocao>) => {
    const response = await api.post<Promocao>('/catalog/promocoes/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Promocao>) => {
    const response = await api.put<Promocao>(`/catalog/promocoes/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/catalog/promocoes/${id}/`);
  },

  aplicar: async (promocaoId: number, vendaId: number) => {
    const response = await api.post(`/catalog/promocoes/${promocaoId}/aplicar/`, {
      venda: vendaId,
    });
    return response.data;
  },
};
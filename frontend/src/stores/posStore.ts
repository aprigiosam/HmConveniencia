import { create } from "zustand";
import api from "../services/api";
import { dbManager } from "../utils/indexedDB";

export type PosProduct = {
  id: number;
  sku: string;
  descricao: string;
  preco: number;
  estoque: number;
};

export type PosCartItem = PosProduct & {
  quantidade: number;
  descontoPercentual: number;
  descontoValor: number;
};

export type PosPayment = {
  formaPagamentoId: number;
  nome: string;
  valor: number;
};

export type Totals = {
  subtotal: number;
  descontos: number;
  total: number;
};

type PosState = {
  itens: PosCartItem[];
  pagamentos: PosPayment[];
  clienteNome?: string;
  carregandoProduto: boolean;
  isOfflineMode: boolean;
  buscarProduto: (termo: string) => Promise<PosProduct[]>;
  adicionarItem: (produto: PosProduct, quantidade?: number) => void;
  atualizarQuantidade: (sku: string, quantidade: number) => void;
  removerItem: (sku: string) => void;
  aplicarDescontoItem: (sku: string, percentual: number) => void;
  definirPagamentos: (pagamentos: PosPayment[]) => void;
  limpar: () => void;
  totais: () => Totals;
};

const fallbackProdutos: PosProduct[] = [
  { id: 1, sku: "COCA001", descricao: "Coca-Cola 350ml", preco: 4.2, estoque: 120 },
  { id: 2, sku: "BALA010", descricao: "Bala de menta 100g", preco: 2.5, estoque: 80 },
  { id: 3, sku: "PAPEL01", descricao: "Papel higienico 4un", preco: 7.9, estoque: 60 },
];

const calcularTotais = (itens: PosCartItem[]): Totals => {
  const subtotal = itens.reduce((sum, item) => sum + item.preco * item.quantidade, 0);
  const descontos = itens.reduce(
    (sum, item) =>
      sum + (item.preco * item.quantidade * item.descontoPercentual) / 100 + item.descontoValor,
    0,
  );
  return {
    subtotal,
    descontos,
    total: subtotal - descontos,
  };
};

export const usePosStore = create<PosState>((set, get) => ({
  itens: [],
  pagamentos: [],
  carregandoProduto: false,
  isOfflineMode: false,
  async buscarProduto(termo: string) {
    set({ carregandoProduto: true });

    // Tenta buscar online primeiro
    if (navigator.onLine) {
      try {
        const { data } = await api.get("/catalog/produtos/", {
          params: {
            search: termo,
            page_size: 20,
          },
        });
        const results = Array.isArray(data?.results) ? data.results : [];
        const produtos = results.map((item: any) => ({
          id: item.id,
          sku: item.sku,
          descricao: item.nome,
          preco: parseFloat(item.preco_venda) || 0,
          estoque: item.estoque_total ?? 0,
        })) as PosProduct[];

        // Cacheia produtos para uso offline
        if (produtos.length > 0) {
          await dbManager.cacheProducts(results);
        }

        set({ carregandoProduto: false, isOfflineMode: false });
        return produtos;
      } catch (error) {
        console.warn("Falha na busca online, tentando cache local", error);
      }
    }

    // Modo offline: busca no IndexedDB
    try {
      set({ isOfflineMode: true });
      const cachedProducts = await dbManager.getCachedProducts(termo);

      if (cachedProducts.length > 0) {
        const produtos = cachedProducts.map((item) => ({
          id: item.id,
          sku: item.sku,
          descricao: item.nome,
          preco: item.preco_venda,
          estoque: item.estoque_total,
        })) as PosProduct[];

        set({ carregandoProduto: false });
        return produtos;
      }
    } catch (error) {
      console.error("Erro ao buscar produtos no cache:", error);
    }

    // Fallback final: produtos hardcoded
    console.warn("Usando produtos fallback");
    const produtos = fallbackProdutos.filter((item) =>
      item.sku.toLowerCase().includes(termo.toLowerCase()) ||
      item.descricao.toLowerCase().includes(termo.toLowerCase()),
    );

    set({ carregandoProduto: false });
    return produtos;
  },
  adicionarItem(produto, quantidade = 1) {
    set((state) => {
      const existente = state.itens.find((item) => item.sku === produto.sku);
      if (existente) {
        return {
          itens: state.itens.map((item) =>
            item.sku === produto.sku ? { ...item, quantidade: item.quantidade + quantidade } : item,
          ),
        };
      }
      return {
        itens: [
          ...state.itens,
          {
            ...produto,
            quantidade,
            descontoPercentual: 0,
            descontoValor: 0,
          },
        ],
      };
    });
  },
  atualizarQuantidade(sku, quantidade) {
    set((state) => ({
      itens: state.itens.map((item) =>
        item.sku === sku ? { ...item, quantidade: Math.max(quantidade, 1) } : item,
      ),
    }));
  },
  removerItem(sku) {
    set((state) => ({ itens: state.itens.filter((item) => item.sku !== sku) }));
  },
  aplicarDescontoItem(sku, percentual) {
    set((state) => ({
      itens: state.itens.map((item) =>
        item.sku === sku ? { ...item, descontoPercentual: Math.min(Math.max(percentual, 0), 100) } : item,
      ),
    }));
  },
  definirPagamentos(pagamentos) {
    set({ pagamentos });
  },
  totais() {
    return calcularTotais(get().itens);
  },
  limpar() {
    set({ itens: [], pagamentos: [] });
  },
}));

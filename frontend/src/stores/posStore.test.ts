import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "../services/api";
import { usePosStore, type PosProduct } from "./posStore";

vi.mock("../services/api", () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
};

const baseProduct: PosProduct = {
  id: 99,
  sku: "ITEM",
  descricao: "Item Teste",
  preco: 10,
  estoque: 5,
};

const resetStore = () => {
  usePosStore.setState({
    itens: [],
    pagamentos: [],
    carregandoProduto: false,
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  resetStore();
});

describe("usePosStore", () => {
  it("busca produtos na API e normaliza resposta", async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        results: [
          { id: 1, sku: "SKU1", nome: "Produto 1", preco_venda: "3.50", estoque_total: 7 },
        ],
      },
    });

    const resultados = await usePosStore.getState().buscarProduto("SKU1");

    expect(resultados).toEqual([
      { id: 1, sku: "SKU1", descricao: "Produto 1", preco: 3.5, estoque: 7 },
    ]);
    expect(usePosStore.getState().carregandoProduto).toBe(false);
  });

  it("usa fallback quando API falha", async () => {
    mockedApi.get.mockRejectedValueOnce(new Error("falha"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const resultados = await usePosStore.getState().buscarProduto("coca");

    expect(resultados[0].sku).toBe("COCA001");
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("adiciona itens e acumula quantidades", () => {
    usePosStore.getState().adicionarItem(baseProduct);
    usePosStore.getState().adicionarItem(baseProduct, 2);

    const item = usePosStore.getState().itens[0];
    expect(item.quantidade).toBe(3);
    expect(item.descontoPercentual).toBe(0);
  });

  it("atualiza quantidade e aplica limites", () => {
    usePosStore.getState().adicionarItem(baseProduct);
    usePosStore.getState().atualizarQuantidade("ITEM", 0);

    const item = usePosStore.getState().itens[0];
    expect(item.quantidade).toBe(1);

    usePosStore.getState().aplicarDescontoItem("ITEM", 120);
    expect(usePosStore.getState().itens[0].descontoPercentual).toBe(100);
  });

  it("calcula totais e permite limpar carrinho", () => {
    usePosStore.getState().adicionarItem(baseProduct, 2);
    usePosStore.getState().aplicarDescontoItem("ITEM", 50);

    const totais = usePosStore.getState().totais();
    expect(totais.subtotal).toBe(20);
    expect(totais.descontos).toBe(10);
    expect(totais.total).toBe(10);

    usePosStore.getState().definirPagamentos([
      { formaPagamentoId: 1, nome: "Dinheiro", valor: 10 },
    ]);
    expect(usePosStore.getState().pagamentos).toHaveLength(1);

    usePosStore.getState().limpar();
    expect(usePosStore.getState().itens).toHaveLength(0);
    expect(usePosStore.getState().pagamentos).toHaveLength(0);
  });
});

import { create } from 'zustand';
import { PosCartItem, PosPayment, Totals } from './posStore';

export interface Order {
  id: string;
  nome: string;
  itens: PosCartItem[];
  pagamentos: PosPayment[];
  clienteNome?: string;
  criadoEm: Date;
  atualizadoEm: Date;
  status: 'rascunho' | 'finalizada' | 'cancelada';
}

interface MultiOrderState {
  pedidos: Order[];
  pedidoAtivo: string | null;

  // Ações
  criarPedido: (nome?: string) => string;
  selecionarPedido: (id: string) => void;
  removerPedido: (id: string) => void;
  renomearPedido: (id: string, novoNome: string) => void;

  // Gestão de itens do pedido ativo
  adicionarItemPedidoAtivo: (item: PosCartItem) => void;
  atualizarItemPedidoAtivo: (sku: string, updates: Partial<PosCartItem>) => void;
  removerItemPedidoAtivo: (sku: string) => void;

  // Gestão de pagamentos
  definirPagamentosPedidoAtivo: (pagamentos: PosPayment[]) => void;
  definirClientePedidoAtivo: (clienteNome: string) => void;

  // Finalização
  finalizarPedidoAtivo: () => void;
  cancelarPedidoAtivo: () => void;
  limparPedidoAtivo: () => void;

  // Utilitários
  obterPedidoAtivo: () => Order | null;
  calcularTotaisPedido: (pedidoId: string) => Totals;
  obterQuantidadePedidos: () => number;
}

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

const gerarIdPedido = (): string => {
  return `pedido_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const gerarNomePedido = (numero: number): string => {
  return `Pedido #${numero.toString().padStart(3, '0')}`;
};

export const useMultiOrderStore = create<MultiOrderState>((set, get) => ({
  pedidos: [],
  pedidoAtivo: null,

  criarPedido: (nome?: string) => {
    const id = gerarIdPedido();
    const numeroPedido = get().pedidos.length + 1;
    const novoPedido: Order = {
      id,
      nome: nome || gerarNomePedido(numeroPedido),
      itens: [],
      pagamentos: [],
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      status: 'rascunho',
    };

    set((state) => ({
      pedidos: [...state.pedidos, novoPedido],
      pedidoAtivo: id,
    }));

    console.log('✅ Novo pedido criado:', novoPedido.nome);
    return id;
  },

  selecionarPedido: (id: string) => {
    const pedido = get().pedidos.find((p) => p.id === id);
    if (pedido && pedido.status === 'rascunho') {
      set({ pedidoAtivo: id });
      console.log('📝 Pedido selecionado:', pedido.nome);
    } else {
      console.warn('⚠️ Pedido não encontrado ou já finalizado:', id);
    }
  },

  removerPedido: (id: string) => {
    set((state) => {
      const novoPedidos = state.pedidos.filter((p) => p.id !== id);
      const novoPedidoAtivo =
        state.pedidoAtivo === id
          ? novoPedidos.find((p) => p.status === 'rascunho')?.id || null
          : state.pedidoAtivo;

      return {
        pedidos: novoPedidos,
        pedidoAtivo: novoPedidoAtivo,
      };
    });
    console.log('🗑️ Pedido removido:', id);
  },

  renomearPedido: (id: string, novoNome: string) => {
    set((state) => ({
      pedidos: state.pedidos.map((p) =>
        p.id === id
          ? { ...p, nome: novoNome, atualizadoEm: new Date() }
          : p
      ),
    }));
  },

  adicionarItemPedidoAtivo: (item: PosCartItem) => {
    const { pedidoAtivo } = get();
    if (!pedidoAtivo) {
      console.warn('⚠️ Nenhum pedido ativo');
      return;
    }

    set((state) => ({
      pedidos: state.pedidos.map((p) => {
        if (p.id !== pedidoAtivo) return p;

        const itemExistente = p.itens.find((i) => i.sku === item.sku);
        const novosItens = itemExistente
          ? p.itens.map((i) =>
              i.sku === item.sku
                ? { ...i, quantidade: i.quantidade + item.quantidade }
                : i
            )
          : [...p.itens, item];

        return {
          ...p,
          itens: novosItens,
          atualizadoEm: new Date(),
        };
      }),
    }));
  },

  atualizarItemPedidoAtivo: (sku: string, updates: Partial<PosCartItem>) => {
    const { pedidoAtivo } = get();
    if (!pedidoAtivo) return;

    set((state) => ({
      pedidos: state.pedidos.map((p) => {
        if (p.id !== pedidoAtivo) return p;

        return {
          ...p,
          itens: p.itens.map((i) =>
            i.sku === sku ? { ...i, ...updates } : i
          ),
          atualizadoEm: new Date(),
        };
      }),
    }));
  },

  removerItemPedidoAtivo: (sku: string) => {
    const { pedidoAtivo } = get();
    if (!pedidoAtivo) return;

    set((state) => ({
      pedidos: state.pedidos.map((p) => {
        if (p.id !== pedidoAtivo) return p;

        return {
          ...p,
          itens: p.itens.filter((i) => i.sku !== sku),
          atualizadoEm: new Date(),
        };
      }),
    }));
  },

  definirPagamentosPedidoAtivo: (pagamentos: PosPayment[]) => {
    const { pedidoAtivo } = get();
    if (!pedidoAtivo) return;

    set((state) => ({
      pedidos: state.pedidos.map((p) =>
        p.id === pedidoAtivo
          ? { ...p, pagamentos, atualizadoEm: new Date() }
          : p
      ),
    }));
  },

  definirClientePedidoAtivo: (clienteNome: string) => {
    const { pedidoAtivo } = get();
    if (!pedidoAtivo) return;

    set((state) => ({
      pedidos: state.pedidos.map((p) =>
        p.id === pedidoAtivo
          ? { ...p, clienteNome, atualizadoEm: new Date() }
          : p
      ),
    }));
  },

  finalizarPedidoAtivo: () => {
    const { pedidoAtivo } = get();
    if (!pedidoAtivo) return;

    set((state) => ({
      pedidos: state.pedidos.map((p) =>
        p.id === pedidoAtivo
          ? { ...p, status: 'finalizada', atualizadoEm: new Date() }
          : p
      ),
      // Seleciona próximo pedido rascunho
      pedidoAtivo:
        state.pedidos.find((p) => p.status === 'rascunho' && p.id !== pedidoAtivo)?.id || null,
    }));

    console.log('✅ Pedido finalizado:', pedidoAtivo);
  },

  cancelarPedidoAtivo: () => {
    const { pedidoAtivo } = get();
    if (!pedidoAtivo) return;

    set((state) => ({
      pedidos: state.pedidos.map((p) =>
        p.id === pedidoAtivo
          ? { ...p, status: 'cancelada', atualizadoEm: new Date() }
          : p
      ),
      pedidoAtivo:
        state.pedidos.find((p) => p.status === 'rascunho' && p.id !== pedidoAtivo)?.id || null,
    }));

    console.log('❌ Pedido cancelado:', pedidoAtivo);
  },

  limparPedidoAtivo: () => {
    const { pedidoAtivo } = get();
    if (!pedidoAtivo) return;

    set((state) => ({
      pedidos: state.pedidos.map((p) =>
        p.id === pedidoAtivo
          ? { ...p, itens: [], pagamentos: [], clienteNome: undefined, atualizadoEm: new Date() }
          : p
      ),
    }));

    console.log('🧹 Pedido limpo:', pedidoAtivo);
  },

  obterPedidoAtivo: () => {
    const { pedidoAtivo, pedidos } = get();
    if (!pedidoAtivo) return null;
    return pedidos.find((p) => p.id === pedidoAtivo) || null;
  },

  calcularTotaisPedido: (pedidoId: string) => {
    const pedido = get().pedidos.find((p) => p.id === pedidoId);
    if (!pedido) {
      return { subtotal: 0, descontos: 0, total: 0 };
    }
    return calcularTotais(pedido.itens);
  },

  obterQuantidadePedidos: () => {
    return get().pedidos.filter((p) => p.status === 'rascunho').length;
  },
}));
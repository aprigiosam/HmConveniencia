import { useState } from 'react';
import { useMultiOrderStore } from '../stores/multiOrderStore';
import { Plus, X, Edit2, Check, ShoppingCart, DollarSign } from 'lucide-react';
import { formatCurrency } from '../utils/format';

/**
 * Componente de gerenciamento de múltiplos pedidos paralelos
 * Permite criar, selecionar e alternar entre vários pedidos simultaneamente
 */
export function MultiOrderManager() {
  const {
    pedidos,
    pedidoAtivo,
    criarPedido,
    selecionarPedido,
    removerPedido,
    renomearPedido,
    calcularTotaisPedido,
    obterQuantidadePedidos,
  } = useMultiOrderStore();

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState('');

  const pedidosRascunho = pedidos.filter((p) => p.status === 'rascunho');
  const quantidadePedidos = obterQuantidadePedidos();

  const handleCriarPedido = () => {
    const id = criarPedido();
    console.log('Novo pedido criado:', id);
  };

  const handleRemoverPedido = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deseja realmente remover este pedido?')) {
      removerPedido(id);
    }
  };

  const handleIniciarEdicao = (id: string, nomeAtual: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditandoId(id);
    setNovoNome(nomeAtual);
  };

  const handleSalvarNome = (id: string) => {
    if (novoNome.trim()) {
      renomearPedido(id, novoNome.trim());
    }
    setEditandoId(null);
    setNovoNome('');
  };

  const handleCancelarEdicao = () => {
    setEditandoId(null);
    setNovoNome('');
  };

  if (quantidadePedidos === 0) {
    return null; // Não mostrar se não houver pedidos
  }

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-800">
              Pedidos Ativos ({quantidadePedidos})
            </h3>
          </div>

          <button
            onClick={handleCriarPedido}
            className="
              flex items-center gap-2 px-3 py-1.5
              bg-blue-600 hover:bg-blue-700 text-white
              rounded-lg text-sm font-medium
              transition-colors duration-200
            "
          >
            <Plus className="w-4 h-4" />
            Novo Pedido
          </button>
        </div>

        {/* Lista de Pedidos */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
          {pedidosRascunho.map((pedido) => {
            const totais = calcularTotaisPedido(pedido.id);
            const estaAtivo = pedido.id === pedidoAtivo;
            const estaEditando = editandoId === pedido.id;

            return (
              <div
                key={pedido.id}
                onClick={() => !estaEditando && selecionarPedido(pedido.id)}
                className={`
                  flex-shrink-0 min-w-[200px] p-3 rounded-lg
                  border-2 cursor-pointer transition-all duration-200
                  ${estaAtivo
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow'
                  }
                `}
              >
                {/* Nome do Pedido */}
                <div className="flex items-center justify-between mb-2">
                  {estaEditando ? (
                    <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={novoNome}
                        onChange={(e) => setNovoNome(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSalvarNome(pedido.id);
                          if (e.key === 'Escape') handleCancelarEdicao();
                        }}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSalvarNome(pedido.id)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancelarEdicao}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h4 className={`font-semibold text-sm ${estaAtivo ? 'text-blue-700' : 'text-gray-700'}`}>
                        {pedido.nome}
                      </h4>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleIniciarEdicao(pedido.id, pedido.nome, e)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleRemoverPedido(pedido.id, e)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Informações do Pedido */}
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Itens:</span>
                    <span className="font-medium">{pedido.itens.length}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Total:</span>
                    <span className={`font-bold ${estaAtivo ? 'text-blue-600' : 'text-gray-800'}`}>
                      {formatCurrency(totais.total)}
                    </span>
                  </div>

                  {pedido.clienteNome && (
                    <div className="flex items-center gap-1 text-gray-500 truncate">
                      <span className="truncate">{pedido.clienteNome}</span>
                    </div>
                  )}
                </div>

                {/* Badge de Pedido Ativo */}
                {estaAtivo && (
                  <div className="mt-2 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded text-center">
                    ATIVO
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Dica */}
        {quantidadePedidos === 1 && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            💡 Dica: Crie múltiplos pedidos para atender vários clientes simultaneamente
          </p>
        )}
      </div>
    </div>
  );
}

// Utilitário de formatação (caso não exista)
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};
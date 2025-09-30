/**
 * Componente para exibir e gerenciar produtos favoritos no PDV
 * Permite acesso rápido aos produtos mais vendidos
 */

import { useState, useEffect } from 'react';
import { Star, Plus, X, GripVertical } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Produto {
  id: number;
  nome: string;
  sku: string;
  preco_venda: number;
  imagem_url?: string;
}

interface ProdutoFavorito {
  id: number;
  produto: number;
  produto_dados: Produto;
  ordem: number;
  contador_uso: number;
}

interface ProdutosFavoritosProps {
  onSelectProduct: (produto: Produto) => void;
  compact?: boolean;
}

export function ProdutosFavoritos({ onSelectProduct, compact = false }: ProdutosFavoritosProps) {
  const [favoritos, setFavoritos] = useState<ProdutoFavorito[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadFavoritos();
  }, []);

  const loadFavoritos = async () => {
    try {
      const { data } = await api.get('/catalog/favoritos/');
      setFavoritos(data);
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
      toast.error('Erro ao carregar favoritos');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFavorito = async (favorito: ProdutoFavorito) => {
    try {
      // Incrementa contador de uso
      await api.post(`/catalog/favoritos/${favorito.id}/usar/`);

      // Adiciona produto ao carrinho
      onSelectProduct(favorito.produto_dados);

      // Atualiza contador localmente
      setFavoritos(prev =>
        prev.map(f =>
          f.id === favorito.id
            ? { ...f, contador_uso: f.contador_uso + 1 }
            : f
        )
      );
    } catch (error) {
      console.error('Erro ao usar favorito:', error);
      toast.error('Erro ao adicionar produto');
    }
  };

  const handleRemoveFavorito = async (id: number) => {
    try {
      await api.delete(`/catalog/favoritos/${id}/`);
      setFavoritos(prev => prev.filter(f => f.id !== id));
      toast.success('Favorito removido');
    } catch (error) {
      console.error('Erro ao remover favorito:', error);
      toast.error('Erro ao remover favorito');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (favoritos.length === 0) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <Star className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 mb-2">Nenhum produto favorito</p>
        <p className="text-sm text-gray-500">
          Adicione produtos frequentemente vendidos para acesso rápido
        </p>
        <button
          onClick={() => setShowAddModal(true)}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 mx-auto"
        >
          <Plus className="w-4 h-4" />
          Adicionar Favorito
        </button>
      </div>
    );
  }

  if (compact) {
    // Modo compacto: apenas lista horizontal
    return (
      <div className="flex gap-2 overflow-x-auto pb-2">
        {favoritos.slice(0, 10).map((favorito) => (
          <button
            key={favorito.id}
            onClick={() => handleSelectFavorito(favorito)}
            className="flex-shrink-0 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-lg p-3 transition-colors min-w-[120px]"
            title={favorito.produto_dados.nome}
          >
            <div className="flex items-start justify-between mb-1">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-xs text-gray-500">{favorito.contador_uso}x</span>
            </div>
            <p className="text-sm font-medium text-gray-800 truncate">
              {favorito.produto_dados.nome}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              R$ {favorito.produto_dados.preco_venda.toFixed(2)}
            </p>
          </button>
        ))}
      </div>
    );
  }

  // Modo completo: grid de cards
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          <h3 className="font-bold text-gray-800">Produtos Favoritos</h3>
          <span className="text-sm text-gray-500">({favoritos.length})</span>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {favoritos.map((favorito) => (
          <div
            key={favorito.id}
            className="relative group bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-lg p-3 transition-all hover:shadow-md cursor-pointer"
            onClick={() => handleSelectFavorito(favorito)}
          >
            {/* Badge de uso */}
            <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
              {favorito.contador_uso}x
            </div>

            {/* Botão remover */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFavorito(favorito.id);
              }}
              className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white p-1 rounded"
              title="Remover favorito"
            >
              <X className="w-3 h-3" />
            </button>

            {/* Estrela */}
            <div className="flex justify-center mb-2 mt-4">
              <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
            </div>

            {/* Nome */}
            <p className="text-sm font-medium text-gray-800 text-center mb-1 line-clamp-2">
              {favorito.produto_dados.nome}
            </p>

            {/* SKU e Preço */}
            <p className="text-xs text-gray-500 text-center mb-1">
              {favorito.produto_dados.sku}
            </p>
            <p className="text-sm font-bold text-blue-600 text-center">
              R$ {favorito.produto_dados.preco_venda.toFixed(2)}
            </p>

            {/* Handle de drag (para reordenação futura) */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-50 transition-opacity">
              <GripVertical className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        ))}
      </div>

      {/* Dica */}
      <p className="text-xs text-gray-500 text-center">
        💡 Clique para adicionar ao carrinho • Os mais usados aparecem primeiro
      </p>
    </div>
  );
}

/**
 * Badge simples para mostrar favoritos em qualquer lugar
 */
export function FavoritosBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
      <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
      {count} favorito{count !== 1 ? 's' : ''}
    </div>
  );
}
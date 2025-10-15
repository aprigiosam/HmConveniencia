
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import PDV from './PDV';
import * as api from '../services/api';
import { localDB } from '../utils/db';

// Mock para localDB
vi.mock('../utils/db', () => ({
  localDB: {
    cacheProdutos: vi.fn().mockResolvedValue(),
    getCachedProdutos: vi.fn().mockResolvedValue([]),
    cacheClientes: vi.fn().mockResolvedValue(),
    getCachedClientes: vi.fn().mockResolvedValue([]),
    saveVendaPendente: vi.fn().mockResolvedValue(),
  }
}));

const mockProdutos = [
  { id: 1, nome: 'Coca-Cola 2L', preco: '8.50', estoque: 50, codigo_barras: '111' },
  { id: 2, nome: 'Pão Francês', preco: '12.00', estoque: 20, codigo_barras: '222' },
];

const mockClientes = [
  { id: 1, nome: 'Cliente Padrão', saldo_devedor: '0.00' },
];

// Wrapper para componentes que usam react-router
const renderWithRouter = (ui, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);
  return render(ui, { wrapper: BrowserRouter });
};

describe('PDV Component', () => {
  beforeEach(() => {
    // Limpa os mocks antes de cada teste
    vi.clearAllMocks();

    // Configura mocks padrão para as chamadas de API
    vi.spyOn(api, 'getProdutos').mockResolvedValue({ data: { results: mockProdutos } });
    vi.spyOn(api, 'getClientes').mockResolvedValue({ data: { results: mockClientes } });
    vi.spyOn(api, 'createVenda').mockResolvedValue({ data: { status: 'FINALIZADA' } });
  });

  it('deve adicionar um produto ao carrinho e finalizar uma venda em dinheiro', async () => {
    const { container } = renderWithRouter(<PDV />);

    // 1. Espera o componente carregar
    const buscaInput = await screen.findByPlaceholderText('Digite o nome ou código...');
    expect(buscaInput).toBeInTheDocument();

    // 2. Busca por um produto
    fireEvent.change(buscaInput, { target: { value: 'Coca-Cola' } });

    // 3. Clica no produto para adicionar ao carrinho
    const produtoItem = await screen.findByText('Coca-Cola 2L');
    fireEvent.click(produtoItem);

    // 4. Verifica se o item está no carrinho
    expect(await screen.findByText('Carrinho')).toBeInTheDocument();
    expect(screen.getByText('Coca-Cola 2L')).toBeInTheDocument();
    // Verifica o subtotal de forma específica
    const subtotalElement = container.querySelector('.item-subtotal');
    expect(subtotalElement).toHaveTextContent('R$ 8.50');

    // 5. Finaliza a venda
    const finalizarButton = screen.getByRole('button', { name: /Finalizar Venda/i });
    fireEvent.click(finalizarButton);

    // 6. Verifica se a API foi chamada corretamente
    await waitFor(() => {
      expect(api.createVenda).toHaveBeenCalledTimes(1);
      expect(api.createVenda).toHaveBeenCalledWith({
        forma_pagamento: 'DINHEIRO',
        desconto: 0,
        observacoes: '',
        itens: [{ produto_id: 1, quantidade: '1' }],
      });
    });

    // 7. Verifica se o carrinho foi limpo
    await waitFor(() => {
      expect(screen.getByText('Carrinho vazio')).toBeInTheDocument();
    });
  });
});


import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Produtos from './Produtos';
import * as api from '../services/api';

const mockProdutos = [
  { id: 1, nome: 'Produto A', preco: '10.00', preco_custo: '5.00', estoque: 10, codigo_barras: '111', categoria: 1, categoria_nome: 'Eletrônicos', margem_lucro: '100.00' },
  { id: 2, nome: 'Produto B', preco: '20.00', preco_custo: '10.00', estoque: 5, codigo_barras: '222', categoria: 2, categoria_nome: 'Alimentos', margem_lucro: '100.00' },
];

const mockCategorias = [
  { id: 1, nome: 'Eletrônicos', ativo: true },
  { id: 2, nome: 'Alimentos', ativo: true },
];

const renderWithRouter = (ui) => {
  return render(ui, { wrapper: BrowserRouter });
};

describe('Produtos Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
    vi.spyOn(api, 'getProdutos').mockResolvedValue({ data: { results: mockProdutos } });
    vi.spyOn(api, 'getCategorias').mockResolvedValue({ data: { results: mockCategorias } });
    vi.spyOn(api, 'createProduto').mockResolvedValue({ data: { id: 3, ...mockProdutos[0] } });
    vi.spyOn(api, 'updateProduto').mockResolvedValue({ data: { id: 1, ...mockProdutos[0] } });
    vi.spyOn(api, 'deleteProduto').mockResolvedValue({});
  });

    // 5. Verifica se a nova categoria aparece na lista
    await waitFor(() => {
      expect(screen.getByText('Produto C')).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: 'Eletrônicos' })).toBeInTheDocument(); // Mais específico
    });

    expect(getProdutosMock).toHaveBeenCalledTimes(2); // Inicial e após criação
    expect(getCategoriasMock).toHaveBeenCalledTimes(2); // Inicial e após criação
  });

  it('deve permitir editar um produto existente e sua categoria', async () => {
    const getProdutosMock = vi.spyOn(api, 'getProdutos')
      .mockResolvedValueOnce({ data: { results: mockProdutos } }) // 1ª chamada (inicial)
      .mockResolvedValueOnce({ data: { results: [{ ...mockProdutos[0], nome: 'Produto A Editado', categoria: 2, categoria_nome: 'Alimentos' }, mockProdutos[1]] } }); // 2ª chamada (após edição)

    const getCategoriasMock = vi.spyOn(api, 'getCategorias')
      .mockResolvedValueOnce({ data: { results: mockCategorias } }) // 1ª chamada (inicial)
      .mockResolvedValueOnce({ data: { results: mockCategorias } }); // 2ª chamada (após edição)

    const updateProdutoMock = vi.spyOn(api, 'updateProduto').mockResolvedValue({ data: { id: 1, ...mockProdutos[0] } });

    renderWithRouter(<Produtos />);

    // 1. Espera a lista de produtos carregar
    expect(await screen.findByText('Produto A')).toBeInTheDocument();

    // 2. Clica no botão de editar do primeiro produto
    const editButtons = screen.getAllByTitle('Editar');
    fireEvent.click(editButtons[0]);

    // 3. Preenche o formulário de edição
    const nomeInput = screen.getByLabelText('Nome *');
    const categoriaSelect = screen.getByLabelText('Categoria');
    const salvarButton = screen.getByRole('button', { name: /Salvar/i });

    fireEvent.change(nomeInput, { target: { value: 'Produto A Editado' } });
    fireEvent.change(categoriaSelect, { target: { value: mockCategorias[1].id } }); // Muda para Alimentos

    fireEvent.click(salvarButton);

    // 4. Verifica se a API de atualização foi chamada corretamente
    await waitFor(() => {
      expect(updateProdutoMock).toHaveBeenCalledWith(1, {
        nome: 'Produto A Editado',
        preco: '10.00',
        preco_custo: '5.00',
        estoque: 10,
        codigo_barras: '111',
        categoria: mockCategorias[1].id,
      });
    });

    // 5. Verifica se a lista é atualizada
    await waitFor(() => {
      expect(screen.getByText('Produto A Editado')).toBeInTheDocument();
      // Mais específico para evitar ambiguidade
      const produtoARow = screen.getByText('Produto A Editado').closest('tr');
      expect(within(produtoARow).getByRole('cell', { name: 'Alimentos' })).toBeInTheDocument();
    });

    expect(getProdutosMock).toHaveBeenCalledTimes(2); // Inicial e após edição
    expect(getCategoriasMock).toHaveBeenCalledTimes(2); // Inicial e após edição
  });

  it('deve permitir excluir um produto', async () => {
    const getProdutosMock = vi.spyOn(api, 'getProdutos')
      .mockResolvedValueOnce({ data: { results: mockProdutos } }) // 1ª chamada (inicial)
      .mockResolvedValueOnce({ data: { results: [mockProdutos[1]] } }); // 2ª chamada (após exclusão)

    const getCategoriasMock = vi.spyOn(api, 'getCategorias')
      .mockResolvedValueOnce({ data: { results: mockCategorias } }) // 1ª chamada (inicial)
      .mockResolvedValueOnce({ data: { results: mockCategorias } }); // 2ª chamada (após exclusão)

    const deleteProdutoMock = vi.spyOn(api, 'deleteProduto').mockResolvedValue({});

    renderWithRouter(<Produtos />);

    // 1. Espera a lista de produtos carregar
    expect(await screen.findByText('Produto A')).toBeInTheDocument();

    // 2. Clica no botão de excluir do primeiro produto
    const deleteButtons = screen.getAllByTitle('Excluir');
    fireEvent.click(deleteButtons[0]);

    // 3. Verifica se a confirmação foi exibida
    expect(window.confirm).toHaveBeenCalledWith('Tem certeza que deseja excluir este produto?');

    // 4. Verifica se a API de exclusão foi chamada
    await waitFor(() => {
      expect(deleteProdutoMock).toHaveBeenCalledWith(1);
    });

    // 5. Verifica se a lista é atualizada
    await waitFor(() => {
      expect(screen.queryByText('Produto A')).not.toBeInTheDocument();
      expect(screen.getByText('Produto B')).toBeInTheDocument();
    });

    expect(getProdutosMock).toHaveBeenCalledTimes(2); // Inicial e após exclusão
    expect(getCategoriasMock).toHaveBeenCalledTimes(2); // Inicial e após exclusão
  });
});

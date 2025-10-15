import { render, screen, waitFor, within } from '../setupTests.jsx';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
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

  it('deve exibir a lista de produtos e permitir adicionar um novo com categoria', async () => {
    const getProdutosMock = vi.spyOn(api, 'getProdutos')
      .mockResolvedValueOnce({ data: { results: mockProdutos } })
      .mockResolvedValueOnce({ data: { results: [...mockProdutos, { id: 3, nome: 'Produto C', preco: '15.00', preco_custo: '7.50', estoque: 20, codigo_barras: '333', categoria: 1, categoria_nome: 'Eletrônicos', margem_lucro: '100.00' }] } });

    const getCategoriasMock = vi.spyOn(api, 'getCategorias')
      .mockResolvedValueOnce({ data: { results: mockCategorias } })
      .mockResolvedValueOnce({ data: { results: mockCategorias } });

    const createProdutoMock = vi.spyOn(api, 'createProduto').mockResolvedValue({ data: { id: 3, ...mockProdutos[0] } });

    render(<Produtos />);

    expect(await screen.findByText('Produto A')).toBeInTheDocument();

    const newProductButton = screen.getByRole('button', { name: /Novo Produto/i });
    await userEvent.click(newProductButton);
    await screen.findByRole('dialog'); // Wait for the modal to appear

    const nomeInput = screen.getByLabelText('Nome');
    const precoInput = screen.getByLabelText('Preço');
    const estoqueInput = screen.getByLabelText('Estoque');
    const categoriaSelect = screen.getByLabelText('Categoria');
    const salvarButton = screen.getByRole('button', { name: /Criar/i });

    await userEvent.type(nomeInput, 'Produto C');
    await userEvent.type(precoInput, '15.00');
    await userEvent.type(estoqueInput, '20');
    await userEvent.selectOptions(categoriaSelect, mockCategorias[0].id.toString());

    await userEvent.click(salvarButton);

    await waitFor(() => {
      expect(createProdutoMock).toHaveBeenCalledWith({
        nome: 'Produto C',
        preco: 15.00,
        estoque: 20,
        categoria: mockCategorias[0].id,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Produto C')).toBeInTheDocument();
    });

    expect(getProdutosMock).toHaveBeenCalledTimes(2);
    expect(getCategoriasMock).toHaveBeenCalledTimes(2);
  });

  it('deve permitir editar um produto existente e sua categoria', async () => {
    const getProdutosMock = vi.spyOn(api, 'getProdutos')
      .mockResolvedValueOnce({ data: { results: mockProdutos } })
      .mockResolvedValueOnce({ data: { results: [{ ...mockProdutos[0], nome: 'Produto A Editado', categoria: 2, categoria_nome: 'Alimentos' }, mockProdutos[1]] } });

    const getCategoriasMock = vi.spyOn(api, 'getCategorias')
      .mockResolvedValueOnce({ data: { results: mockCategorias } })
    render(<Produtos />);

    expect(await screen.findByText('Produto A')).toBeInTheDocument();

    const editButtons = screen.getAllByLabelText('Editar');
    await userEvent.click(editButtons[0]);
    await screen.findByRole('dialog'); // Wait for the modal to appear

    const nomeInput = screen.getByLabelText('Nome');
    const categoriaSelect = screen.getByLabelText('Categoria');
    const salvarButton = screen.getByRole('button', { name: /Salvar/i });

    await userEvent.type(nomeInput, 'Produto A Editado');
    await userEvent.selectOptions(categoriaSelect, mockCategorias[1].id.toString());

    await userEvent.click(salvarButton);

    await waitFor(() => {
      expect(updateProdutoMock).toHaveBeenCalledWith(1, {
        nome: 'Produto A Editado',
        preco: '10.00',
        estoque: 10,
        categoria: mockCategorias[1].id,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Produto A Editado')).toBeInTheDocument();
      const produtoARow = screen.getByText('Produto A Editado').closest('tr');
      expect(within(produtoARow).getByText('Alimentos')).toBeInTheDocument();
    });

    expect(getProdutosMock).toHaveBeenCalledTimes(2);
    expect(getCategoriasMock).toHaveBeenCalledTimes(2);
  });

  it('deve permitir excluir um produto', async () => {
    const getProdutosMock = vi.spyOn(api, 'getProdutos')
      .mockResolvedValueOnce({ data: { results: mockProdutos } })
      .mockResolvedValueOnce({ data: { results: [mockProdutos[1]] } });

    const getCategoriasMock = vi.spyOn(api, 'getCategorias')
      .mockResolvedValueOnce({ data: { results: mockCategorias } })
      .mockResolvedValueOnce({ data: { results: mockCategorias } });

    const deleteProdutoMock = vi.spyOn(api, 'deleteProduto').mockResolvedValue({});

    render(<Produtos />);

    expect(await screen.findByText('Produto A')).toBeInTheDocument();

    const deleteButtons = screen.getAllByLabelText('Excluir');
    await userEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith('Tem certeza que deseja excluir este produto?');

    await waitFor(() => {
      expect(deleteProdutoMock).toHaveBeenCalledWith(1);
    });

    await waitFor(() => {
      expect(screen.queryByText('Produto A')).not.toBeInTheDocument();
      expect(screen.getByText('Produto B')).toBeInTheDocument();
    });

    expect(getProdutosMock).toHaveBeenCalledTimes(2);
    expect(getCategoriasMock).toHaveBeenCalledTimes(2);
  });
});

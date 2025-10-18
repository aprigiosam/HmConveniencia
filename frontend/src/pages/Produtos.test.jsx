import { render, screen, waitFor, within } from '../setupTests';
import { vi } from 'vitest';
import Produtos from './Produtos';
import * as api from '../services/api';
import { localDB } from '../utils/db';

// Mock das dependências externas
vi.mock('../services/api');
vi.mock('../utils/db');

const mockProdutos = [
  {
    id: 1,
    nome: 'Produto Teste 1',
    preco: '10.00',
    estoque: '100',
    categoria: 1,
    categoria_nome: 'Categoria 1',
    codigo_barras: '123456789',
  },
  {
    id: 2,
    nome: 'Produto Teste 2',
    preco: '20.00',
    estoque: '50',
    categoria: 2,
    categoria_nome: 'Categoria 2',
    codigo_barras: '987654321',
  },
];

const mockCategorias = [
  { id: 1, nome: 'Categoria 1' },
  { id: 2, nome: 'Categoria 2' },
];

describe('Página de Produtos', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.getProdutos.mockResolvedValue({ data: { results: mockProdutos } });
    api.getCategorias.mockResolvedValue({ data: { results: mockCategorias } });
    localDB.getCachedProdutos.mockResolvedValue([]);
    localDB.cacheProdutos.mockResolvedValue(true);
    api.createProduto.mockResolvedValue({ data: { id: 3, ...mockProdutos[0] } });
  });

  test('Deve renderizar o título da página', async () => {
    render(<Produtos />);
    const title = await screen.findByText('Produtos');
    expect(title).toBeInTheDocument();
  });

  test('Deve carregar e exibir os produtos na tabela (desktop)', async () => {
    render(<Produtos />);
    const table = await screen.findByRole('table');
    await waitFor(() => {
      expect(within(table).getByText('Produto Teste 1')).toBeInTheDocument();
      expect(within(table).getByText('Produto Teste 2')).toBeInTheDocument();
    });
  });

  test('Deve chamar a API para criar um novo produto ao submeter o formulário', async () => {
    const { user } = render(<Produtos />);

    const novoProdutoBtn = screen.getByText('Novo Produto');
    await user.click(novoProdutoBtn);

    const modal = await screen.findByRole('dialog');

    const nomeInput = within(modal).getByPlaceholderText('Nome do produto');
    const precoInput = within(modal).getByPlaceholderText('9.99');
    const estoqueInput = within(modal).getByPlaceholderText('0');
    const criarBtn = within(modal).getByText('Criar');

    await user.type(nomeInput, 'Novo Produto via Teste');
    await user.type(precoInput, '15.99');
    await user.type(estoqueInput, '75');
    await user.click(criarBtn);

    await waitFor(() => {
      expect(api.createProduto).toHaveBeenCalledTimes(1);
      expect(api.createProduto).toHaveBeenCalledWith({
        nome: 'Novo Produto via Teste',
        preco: 15.99,
        estoque: 75,
        categoria: null,
        codigo_barras: '',
        data_validade: null, // Adicionado para corresponder à chamada real da API
      });
    });
  }, 10000);
});

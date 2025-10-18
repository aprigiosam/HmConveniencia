import { render, screen, waitFor, within } from '../setupTests';
import { vi } from 'vitest';
import Clientes from './Clientes';
import * as api from '../services/api';
import { localDB } from '../utils/db';

// Mock das dependências externas
vi.mock('../services/api');
vi.mock('../utils/db');

const mockClientes = [
  {
    id: 1,
    nome: 'Cliente Teste 1',
    telefone: '(11) 99999-1111',
    saldo_devedor: '50.00',
    limite_credito: '100.00',
  },
  {
    id: 2,
    nome: 'Cliente Teste 2',
    telefone: '(22) 99999-2222',
    saldo_devedor: '25.00',
    limite_credito: '200.00',
  },
];

describe('Página de Clientes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.getClientes.mockResolvedValue({ data: { results: mockClientes } });
    localDB.getCachedClientes.mockResolvedValue([]);
    localDB.cacheClientes.mockResolvedValue(true);
    api.createCliente.mockResolvedValue({ data: { id: 3, nome: 'Novo Cliente', telefone: '', limite_credito: 0 } });
  });

  test('Deve renderizar o título da página', async () => {
    render(<Clientes />);
    const title = await screen.findByText('Clientes');
    expect(title).toBeInTheDocument();
  });

  test('Deve carregar e exibir os clientes na tabela (desktop)', async () => {
    render(<Clientes />);
    const table = await screen.findByRole('table');
    await waitFor(() => {
      expect(within(table).getByText('Cliente Teste 1')).toBeInTheDocument();
      expect(within(table).getByText('Cliente Teste 2')).toBeInTheDocument();
    });
  });

  test('Deve chamar a API para criar um novo cliente ao submeter o formulário', async () => {
    const { user } = render(<Clientes />);

    const novoClienteBtn = screen.getByText('Novo Cliente');
    await user.click(novoClienteBtn);

    const modal = await screen.findByRole('dialog');

    const nomeInput = within(modal).getByPlaceholderText('Nome do cliente');
    const telefoneInput = within(modal).getByPlaceholderText('(99) 99999-9999');
    const criarBtn = within(modal).getByText('Criar');

    await user.type(nomeInput, 'Novo Cliente via Teste');
    await user.type(telefoneInput, '(99) 12345-6789');
    await user.click(criarBtn);

    await waitFor(() => {
      expect(api.createCliente).toHaveBeenCalledTimes(1);
      expect(api.createCliente).toHaveBeenCalledWith({
        nome: 'Novo Cliente via Teste',
        telefone: '(99) 12345-6789',
        limite_credito: 0,
      });
    });
  }, 10000); // Aumenta o timeout para 10 segundos
});

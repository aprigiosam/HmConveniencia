import { render, screen, waitFor, within } from '../setupTests';
import { vi } from 'vitest';
import ContasReceber from './ContasReceber';
import * as api from '../services/api';

// Mock da API
vi.mock('../services/api');

const mockContas = [
  {
    id: 1,
    cliente_nome: 'Cliente Devedor 1',
    data_vencimento: '2025-10-20',
    total: '150.00',
    status_pagamento: 'PENDENTE',
  },
  {
    id: 2,
    cliente_nome: 'Cliente Devedor 2',
    data_vencimento: '2025-10-15', // Vencida
    total: '200.50',
    status_pagamento: 'PENDENTE',
  },
];

describe('Página de Contas a Receber', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.getContasReceber.mockResolvedValue({ data: { results: mockContas } });
  });

  test('Deve renderizar o título e o total a receber', async () => {
    render(<ContasReceber />);
    expect(await screen.findByText('Contas a Receber')).toBeInTheDocument();
    expect(await screen.findByText('R$ 350.50')).toBeInTheDocument(); // 150.00 + 200.50
  });

  test('Deve carregar e exibir as contas na tabela (desktop)', async () => {
    render(<ContasReceber />);
    const table = await screen.findByRole('table');

    await waitFor(() => {
      expect(within(table).getByText('Cliente Devedor 1')).toBeInTheDocument();
      expect(within(table).getByText('Cliente Devedor 2')).toBeInTheDocument();
      // Verifica status vencida
      expect(within(table).getByText('Vencida')).toBeInTheDocument();
    });
  });

  test('Deve chamar a API de receberPagamento ao clicar no botão', async () => {
    const { user } = render(<ContasReceber />);
    api.receberPagamento.mockResolvedValue({ data: {} }); // Mock do sucesso
    window.confirm = vi.fn(() => true); // Mock do window.confirm

    // Encontra o botão de receber da primeira conta
    const receberBtns = await screen.findAllByRole('button', { name: /Receber/i });
    await user.click(receberBtns[0]);

    expect(window.confirm).toHaveBeenCalledWith('Confirmar recebimento desta conta?');

    await waitFor(() => {
      expect(api.receberPagamento).toHaveBeenCalledTimes(1);
      expect(api.receberPagamento).toHaveBeenCalledWith(mockContas[0].id);
    });
  });
});

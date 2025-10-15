import { render, screen, fireEvent, waitFor } from '../setupTests.jsx';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ContasReceber from './ContasReceber';
import * as api from '../services/api';

const mockContas = [
  {
    id: 1,
    numero: 'V001',
    cliente_nome: 'Cliente Devedor 1',
    created_at: new Date().toISOString(),
    data_vencimento: new Date().toISOString(),
    total: '150.75',
    status_pagamento: 'PENDENTE',
  },
  {
    id: 2,
    numero: 'V002',
    cliente_nome: 'Cliente Devedor 2',
    created_at: new Date().toISOString(),
    data_vencimento: null,
    total: '80.00',
    status_pagamento: 'PENDENTE',
  },
];

describe('ContasReceber Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  it('deve exibir a lista de contas e permitir receber um pagamento', async () => {
    const getContasMock = vi.spyOn(api, 'getContasReceber')
      .mockResolvedValueOnce({ data: { results: mockContas } })
      .mockResolvedValueOnce({ data: { results: [mockContas[1]] } });

    const receberPagamentoMock = vi.spyOn(api, 'receberPagamento').mockResolvedValue({ data: { status_pagamento: 'PAGO' } });

    render(<ContasReceber />);

    expect(await screen.findByText('Cliente Devedor 1')).toBeInTheDocument();
    expect(screen.getByText('Cliente Devedor 2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /R\$ 230\.75/i })).toBeInTheDocument();

    const receberButtons = screen.getAllByRole('button', { name: /Receber/i });
    fireEvent.click(receberButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith('Confirmar recebimento desta conta?');

    await waitFor(() => {
      expect(receberPagamentoMock).toHaveBeenCalledWith(mockContas[0].id);
    });

    await waitFor(() => {
      expect(screen.queryByText('Cliente Devedor 1')).not.toBeInTheDocument();
      expect(screen.getByText('Cliente Devedor 2')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: /R\$ 80\.00/i })).toBeInTheDocument();
    });

    expect(getContasMock).toHaveBeenCalledTimes(2);
  });
});

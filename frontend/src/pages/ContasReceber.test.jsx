import { customRender as render, screen, fireEvent, waitFor } from '../setupTests.jsx';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
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

const renderWithRouter = (ui) => {
  return render(ui, { wrapper: BrowserRouter });
};

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

    renderWithRouter(<ContasReceber />);

    expect(await screen.findByText('Cliente Devedor 1')).toBeInTheDocument();
    expect(screen.getByText('Cliente Devedor 2')).toBeInTheDocument();
    const totalLabel = screen.getByText(/Total a Receber/i);
    expect(totalLabel.parentElement).toHaveTextContent('R$ 230.75');

    const receberButtons = screen.getAllByRole('button', { name: /Receber/i });
    fireEvent.click(receberButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith('Confirmar recebimento desta conta?');

    await waitFor(() => {
      expect(receberPagamentoMock).toHaveBeenCalledWith(mockContas[0].id);
    });

    await waitFor(() => {
      expect(screen.queryByText('Cliente Devedor 1')).not.toBeInTheDocument();
      expect(screen.getByText('Cliente Devedor 2')).toBeInTheDocument();
      const totalLabelUpdated = screen.getByText(/Total a Receber/i);
      expect(totalLabelUpdated).toHaveTextContent('R$ 80.00');
    });

    expect(getContasMock).toHaveBeenCalledTimes(2);
  });
});

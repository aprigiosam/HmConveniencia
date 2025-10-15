
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    // Mock para a confirmação do usuário
    window.confirm = vi.fn(() => true);
  });

  it('deve exibir a lista de contas e permitir receber um pagamento', async () => {
    // Configura os mocks para as chamadas da API em ordem
    const getContasMock = vi.spyOn(api, 'getContasReceber')
      .mockResolvedValueOnce({ data: { results: mockContas } }) // 1ª chamada (inicial)
      .mockResolvedValueOnce({ data: { results: [mockContas[1]] } }); // 2ª chamada (após receber)

    const receberPagamentoMock = vi.spyOn(api, 'receberPagamento').mockResolvedValue({ data: { status_pagamento: 'PAGO' } });

    renderWithRouter(<ContasReceber />);

    // 1. Espera a lista carregar e verifica os itens
    expect(await screen.findByText('Cliente Devedor 1')).toBeInTheDocument();
    expect(screen.getByText('Cliente Devedor 2')).toBeInTheDocument();
    const totalLabel = screen.getByText(/Total a Receber:/i);
    expect(totalLabel.parentElement).toHaveTextContent('R$ 230.75');

    // 2. Encontra o botão "Receber" da primeira conta e clica nele
    const receberButtons = screen.getAllByRole('button', { name: /✓ Receber/i });
    fireEvent.click(receberButtons[0]);

    // 3. Verifica se a confirmação foi exibida
    expect(window.confirm).toHaveBeenCalledWith('Confirmar recebimento desta conta?');

    // 4. Verifica se a API de receber pagamento foi chamada
    await waitFor(() => {
      expect(receberPagamentoMock).toHaveBeenCalledWith(mockContas[0].id);
    });

    // 5. Verifica se a lista foi atualizada na tela
    await waitFor(() => {
      expect(screen.queryByText('Cliente Devedor 1')).not.toBeInTheDocument();
      expect(screen.getByText('Cliente Devedor 2')).toBeInTheDocument();
      // A verificação do total precisa ser refeita aqui dentro do waitFor
      const totalLabelUpdated = screen.getByText(/Total a Receber:/i);
      expect(totalLabelUpdated.parentElement).toHaveTextContent('R$ 80.00');
    });

    // Verifica se a API de getContas foi chamada duas vezes
    expect(getContasMock).toHaveBeenCalledTimes(2);
  });
});

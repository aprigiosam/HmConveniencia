
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Caixa from './Caixa';
import * as api from '../services/api';

describe('Caixa Component', () => {
  it('deve permitir abrir um novo caixa', async () => {
    // 1. Configura todos os mocks ANTES de renderizar

    // Mock para a primeira chamada (caixa fechado)
    const getCaixaStatusMock = vi.spyOn(api, 'getCaixaStatus')
      .mockResolvedValueOnce({ data: { status: 'FECHADO' } });

    // Mock para a chamada de abrir o caixa
    const abrirCaixaMock = vi.spyOn(api, 'abrirCaixa').mockResolvedValue({
      data: { id: 1, status: 'ABERTO', valor_inicial: '150.00', data_abertura: new Date().toISOString() },
    });

    // Mock para a segunda chamada de status (após abrir)
    getCaixaStatusMock.mockResolvedValueOnce({
      data: { id: 1, status: 'ABERTO', valor_inicial: '150.00', data_abertura: new Date().toISOString() },
    });

    // 2. Renderiza o componente
    render(<Caixa />);

    // 3. Espera o carregamento inicial e interage com a UI
    const valorInput = await screen.findByPlaceholderText('Valor inicial (troco)');
    const abrirButton = screen.getByRole('button', { name: /Abrir Caixa/i });

    expect(valorInput).toBeInTheDocument();

    // Simula a ação do usuário
    fireEvent.change(valorInput, { target: { value: '150' } });
    fireEvent.click(abrirButton);

    // 4. Espera e verifica o resultado final
    await waitFor(() => {
      // Verifica se a API de abrir caixa foi chamada
      expect(abrirCaixaMock).toHaveBeenCalledWith({ valor_inicial: '150' });
    });

    // Espera a UI atualizar para o estado de caixa aberto
    expect(await screen.findByText('Gestão de Caixa')).toBeInTheDocument();
    const labelElement = screen.getByText('Valor Inicial (Troco):');
    expect(labelElement.parentElement).toHaveTextContent('R$ 150.00');

    // Verifica se a API de status foi chamada duas vezes
    expect(getCaixaStatusMock).toHaveBeenCalledTimes(2);
  });
});

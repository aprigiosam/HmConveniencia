import { customRender as render, screen, fireEvent, waitFor } from '../setupTests.jsx';
import { describe, it, expect, vi } from 'vitest';
import Caixa from './Caixa';
import * as api from '../services/api';

describe('Caixa Component', () => {
  it('deve permitir abrir um novo caixa', async () => {
    const getCaixaStatusMock = vi.spyOn(api, 'getCaixaStatus')
      .mockResolvedValueOnce({ data: { status: 'FECHADO' } });

    const abrirCaixaMock = vi.spyOn(api, 'abrirCaixa').mockResolvedValue({
      data: { id: 1, status: 'ABERTO', valor_inicial: '150.00', data_abertura: new Date().toISOString() },
    });

    getCaixaStatusMock.mockResolvedValueOnce({
      data: { id: 1, status: 'ABERTO', valor_inicial: '150.00', data_abertura: new Date().toISOString() },
    });

    render(<Caixa />);

    const valorInput = await screen.findByLabelText('Valor inicial (troco)');
    const abrirButton = screen.getByRole('button', { name: /Abrir Caixa/i });

    expect(valorInput).toBeInTheDocument();

    fireEvent.change(valorInput, { target: { value: '150' } });
    fireEvent.click(abrirButton);

    await waitFor(() => {
      expect(abrirCaixaMock).toHaveBeenCalledWith({ valor_inicial: 150 });
    });

    expect(await screen.findByText('Gestão de Caixa')).toBeInTheDocument();
    expect(screen.getByText('Valor Inicial (Troco):')).toBeInTheDocument();
    expect(screen.getByText('R$ 150.00')).toBeInTheDocument();

    expect(getCaixaStatusMock).toHaveBeenCalledTimes(2);
  });
});
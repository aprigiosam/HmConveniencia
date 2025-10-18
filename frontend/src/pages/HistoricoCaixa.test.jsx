import { render, screen, waitFor, within } from '../setupTests';
import { vi } from 'vitest';
import HistoricoCaixa from './HistoricoCaixa';
import * as api from '../services/api';

// Mock da API
vi.mock('../services/api');

const mockHistorico = [
  {
    id: 1,
    data_abertura: '2025-10-17T10:00:00Z',
    data_fechamento: '2025-10-17T18:00:00Z',
    valor_inicial: '100.00',
    valor_final_sistema: '1500.00',
    valor_final_informado: '1500.01', // Valor ligeiramente diferente para evitar duplicatas no teste
    diferenca: '0.01',
  },
  {
    id: 2,
    data_abertura: '2025-10-18T10:00:00Z',
    data_fechamento: '2025-10-18T18:05:00Z',
    valor_inicial: '100.00',
    valor_final_sistema: '2500.00',
    valor_final_informado: '2490.00',
    diferenca: '-10.00',
  },
];

describe('Página de Histórico de Caixa', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.getHistoricoCaixa.mockResolvedValue({ data: mockHistorico });
  });

  test('Deve renderizar o título da página', async () => {
    render(<HistoricoCaixa />);
    expect(await screen.findByText('Histórico de Caixas')).toBeInTheDocument();
  });

  test('Deve carregar e exibir o histórico na tabela (desktop)', async () => {
    render(<HistoricoCaixa />);
    const table = await screen.findByRole('table');

    await waitFor(() => {
      // Verifica valores únicos para garantir que as linhas estão lá
      expect(within(table).getByText('R$ 1500.00')).toBeInTheDocument();
      expect(within(table).getByText('R$ 1500.01')).toBeInTheDocument();
      expect(within(table).getByText('R$ 2490.00')).toBeInTheDocument();
      // Verifica a diferença negativa
      expect(within(table).getByText('R$ -10.00')).toBeInTheDocument();
    });
  });
});

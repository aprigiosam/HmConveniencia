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
    valor_final_informado: '1500.01',
    diferenca: '0.01',
    // Novos campos do detalhamento
    total_dinheiro: '500.00',
    total_debito: '300.00',
    total_credito: '400.00',
    total_pix: '250.00',
    total_fiado: '50.00',
    total_vendas: '1500.00',
  },
  {
    id: 2,
    data_abertura: '2025-10-18T10:00:00Z',
    data_fechamento: '2025-10-18T18:05:00Z',
    valor_inicial: '100.00',
    valor_final_sistema: '2500.00',
    valor_final_informado: '2490.00',
    diferenca: '-10.00',
    // Novos campos do detalhamento
    total_dinheiro: '800.00',
    total_debito: '600.00',
    total_credito: '700.00',
    total_pix: '300.00',
    total_fiado: '100.00',
    total_vendas: '2500.00',
  },
];

describe('Página de Histórico de Caixa', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.getHistoricoCaixa.mockResolvedValue({ data: mockHistorico });
    api.deletarCaixa.mockResolvedValue({ data: { message: 'Caixa deletado' } });
    api.deletarTodosCaixas.mockResolvedValue({ data: { total: 2 } });
  });

  test('Deve renderizar o título da página', async () => {
    render(<HistoricoCaixa />);
    expect(await screen.findByText('Histórico de Caixas')).toBeInTheDocument();
  });

  test('Deve carregar e exibir o histórico na tabela (desktop)', async () => {
    render(<HistoricoCaixa />);
    const table = await screen.findByRole('table');

    await waitFor(() => {
      // Verifica se os totais de vendas estão sendo exibidos
      expect(within(table).getByText('R$ 1500.00')).toBeInTheDocument();
      expect(within(table).getByText('R$ 2500.00')).toBeInTheDocument();

      // Verifica diferenças
      expect(within(table).getByText('R$ 0.01')).toBeInTheDocument();
      expect(within(table).getByText('R$ -10.00')).toBeInTheDocument();

      // Verifica valor inicial
      const initialValues = within(table).getAllByText('R$ 100.00');
      expect(initialValues.length).toBeGreaterThan(0);
    });
  });

  test('Deve exibir botão de excluir todos quando há caixas', async () => {
    render(<HistoricoCaixa />);

    await waitFor(() => {
      expect(screen.getByText(/Excluir Todos/i)).toBeInTheDocument();
    });
  });

  test('Deve renderizar caixas sem detalhamento (retrocompatibilidade)', async () => {
    const caixaSemDetalhamento = {
      id: 3,
      data_abertura: '2025-10-16T10:00:00Z',
      data_fechamento: '2025-10-16T18:00:00Z',
      valor_inicial: '50.00',
      valor_final_sistema: '500.00',
      valor_final_informado: '500.00',
      diferenca: '0.00',
      // SEM os novos campos (caixa antigo)
      total_dinheiro: null,
      total_debito: null,
      total_credito: null,
      total_pix: null,
      total_fiado: null,
      total_vendas: null,
    };

    api.getHistoricoCaixa.mockResolvedValue({
      data: [caixaSemDetalhamento]
    });

    render(<HistoricoCaixa />);
    const table = await screen.findByRole('table');

    await waitFor(() => {
      // Deve mostrar valor_final_sistema quando total_vendas é null
      const valores = within(table).getAllByText('R$ 500.00');
      expect(valores.length).toBeGreaterThan(0);
    });
  });
});

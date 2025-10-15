import { render, screen, waitFor } from '../setupTests.jsx';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import Caixa from './Caixa';
import * as api from '../services/api';

vi.mock('@mantine/core', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
            TextInput: vi.fn((props) => {
              const id = props.id || 'text-input-' + Math.random().toString(36).substr(2, 9);
              return (
                <>
                  {props.label && <label htmlFor={id}>{props.label}</label>}
                  <input {...props} data-testid="TextInput" id={id} value={props.value} onChange={props.onChange} />
                </>
              );
            }),
            NumberInput: vi.fn((props) => {
              const id = props.id || 'number-input-' + Math.random().toString(36).substr(2, 9);
              return (
                <>
                  {props.label && <label htmlFor={id}>{props.label}</label>}
                  <input
                    type="number"
                    {...props}
                    data-testid="NumberInput"
                    id={id}
                    value={props.value}
                    onChange={(e) => props.onChange(parseFloat(e.target.value))}
                  />
                </>
              );
            }),    Select: vi.fn((props) => <select {...props} data-testid="Select" />),
    Textarea: vi.fn((props) => <textarea {...props} data-testid="Textarea" />),
    Button: vi.fn((props) => <button {...props} data-testid="Button" />),
    Modal: vi.fn((props) => (props.opened ? <div data-testid="Modal">{props.children}</div> : null)),
    Card: vi.fn(({ children }) => <div data-testid="Card">{children}</div>),
    Group: vi.fn(({ children }) => <div data-testid="Group">{children}</div>),
    Title: vi.fn(({ children }) => <h2 data-testid="Title">{children}</h2>),
    Text: vi.fn(({ children }) => <p data-testid="Text">{children}</p>),
    Stack: vi.fn(({ children }) => <div data-testid="Stack">{children}</div>),
  };
});

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

    const valorInput = await screen.findByLabelText(/Valor inicial \(troco\)/i);
    const abrirButton = screen.getByRole('button', { name: /Abrir Caixa/i });

    expect(valorInput).toBeInTheDocument();

    await userEvent.type(valorInput, '150');
    await userEvent.click(abrirButton);

    await waitFor(() => {
      expect(abrirCaixaMock).toHaveBeenCalledWith({ valor_inicial: 150 });
    });

    expect(await screen.findByText('Gestão de Caixa')).toBeInTheDocument();
    expect(screen.getByText('Valor Inicial (Troco):')).toBeInTheDocument();
    expect(screen.getByText('R$ 150.00')).toBeInTheDocument();

    expect(getCaixaStatusMock).toHaveBeenCalledTimes(2);
  });
});
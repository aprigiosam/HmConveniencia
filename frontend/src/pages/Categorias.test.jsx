import { render, screen, waitFor } from '../setupTests.jsx';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import Categorias from './Categorias';
import * as api from '../services/api';

const mockCategorias = [
  { id: 1, nome: 'Eletrônicos', ativo: true, created_at: new Date().toISOString() },
  { id: 2, nome: 'Alimentos', ativo: false, created_at: new Date().toISOString() },
];

describe('Categorias Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  it('deve exibir a lista de categorias e permitir criar uma nova', async () => {
    const getCategoriasMock = vi.spyOn(api, 'getCategorias')
      .mockResolvedValueOnce({ data: { results: mockCategorias } })
      .mockResolvedValueOnce({ data: { results: [...mockCategorias, { id: 3, nome: 'Bebidas', ativo: true, created_at: new Date().toISOString() }] } });

    const createCategoriaMock = vi.spyOn(api, 'createCategoria').mockResolvedValue({
      data: { id: 3, nome: 'Bebidas', ativo: true, created_at: new Date().toISOString() },
    });

    render(<Categorias />);

    expect(await screen.findByText('Eletrônicos')).toBeInTheDocument();
    expect(screen.getByText('Alimentos')).toBeInTheDocument();

    const newCategoryButton = screen.getByRole('button', { name: /Nova Categoria/i });
    await userEvent.click(newCategoryButton);
    await screen.findByRole('dialog'); // Wait for the modal to appear

    const nomeInput = screen.getByLabelText('Nome');
    const salvarButton = screen.getByRole('button', { name: /Criar/i });

    await userEvent.type(nomeInput, 'Bebidas');
    await userEvent.click(salvarButton);

    await waitFor(() => {
      expect(createCategoriaMock).toHaveBeenCalledWith({ nome: 'Bebidas', ativo: true });
    });

    await waitFor(() => {
      expect(screen.getByText('Bebidas')).toBeInTheDocument();
    });

    expect(getCategoriasMock).toHaveBeenCalledTimes(2);
  });

  it('deve permitir editar uma categoria existente', async () => {
    const getCategoriasMock = vi.spyOn(api, 'getCategorias')
      .mockResolvedValueOnce({ data: { results: mockCategorias } })
    render(<Categorias />);

    expect(await screen.findByText('Eletrônicos')).toBeInTheDocument();

    const editButtons = screen.getAllByLabelText('Editar');
    await userEvent.click(editButtons[0]);
    await screen.findByRole('dialog'); // Wait for the modal to appear

    const nomeInput = screen.getByLabelText('Nome');
    const ativoSwitch = screen.getByLabelText('Ativo');
    const salvarButton = screen.getByRole('button', { name: /Salvar/i });

    await userEvent.type(nomeInput, 'Eletrônicos Atualizados');
    await userEvent.click(ativoSwitch); // Desativa
    await userEvent.click(salvarButton);

    await waitFor(() => {
      expect(updateCategoriaMock).toHaveBeenCalledWith(1, { nome: 'Eletrônicos Atualizados', ativo: false });
    });

    await waitFor(() => {
      expect(screen.getByText('Eletrônicos Atualizados')).toBeInTheDocument();
      expect(screen.queryByText('Eletrônicos')).not.toBeInTheDocument();
    });

    expect(getCategoriasMock).toHaveBeenCalledTimes(2);
  });

  it('deve permitir excluir uma categoria existente', async () => {
    const getCategoriasMock = vi.spyOn(api, 'getCategorias')
      .mockResolvedValueOnce({ data: { results: mockCategorias } })
      .mockResolvedValueOnce({ data: { results: [mockCategorias[1]] } });

    const deleteCategoriaMock = vi.spyOn(api, 'deleteCategoria').mockResolvedValue({});

    render(<Categorias />);

    expect(await screen.findByText('Eletrônicos')).toBeInTheDocument();

    const deleteButtons = screen.getAllByLabelText('Excluir');
    await userEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith('Tem certeza que deseja excluir esta categoria?');

    await waitFor(() => {
      expect(deleteCategoriaMock).toHaveBeenCalledWith(1);
    });

    await waitFor(() => {
      expect(screen.queryByText('Eletrônicos')).not.toBeInTheDocument();
      expect(screen.getByText('Alimentos')).toBeInTheDocument();
    });

    expect(getCategoriasMock).toHaveBeenCalledTimes(2);
  });
});
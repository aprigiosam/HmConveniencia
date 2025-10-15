import { customRender as render, screen, fireEvent, waitFor } from '../setupTests.jsx';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Categorias from './Categorias';
import * as api from '../services/api';

const mockCategorias = [
  { id: 1, nome: 'Eletrônicos', ativo: true, created_at: new Date().toISOString() },
  { id: 2, nome: 'Alimentos', ativo: false, created_at: new Date().toISOString() },
];

const renderWithRouter = (ui) => {
  return render(ui, { wrapper: BrowserRouter });
};

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

    renderWithRouter(<Categorias />);

    expect(await screen.findByText('Eletrônicos')).toBeInTheDocument();
    expect(screen.getByText('Alimentos')).toBeInTheDocument();

    const newCategoryButton = screen.getByRole('button', { name: /Nova Categoria/i });
    fireEvent.click(newCategoryButton);

    const nomeInput = screen.getByLabelText('Nome');
    const salvarButton = screen.getByRole('button', { name: /Criar/i });

    fireEvent.change(nomeInput, { target: { value: 'Bebidas' } });
    fireEvent.click(salvarButton);

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
      .mockResolvedValueOnce({ data: { results: [{ id: 1, nome: 'Eletrônicos Atualizados', ativo: false, created_at: new Date().toISOString() }, mockCategorias[1]] } });

    const updateCategoriaMock = vi.spyOn(api, 'updateCategoria').mockResolvedValue({
      data: { id: 1, nome: 'Eletrônicos Atualizados', ativo: false, created_at: new Date().toISOString() },
    });

    renderWithRouter(<Categorias />);

    expect(await screen.findByText('Eletrônicos')).toBeInTheDocument();

    const editButtons = screen.getAllByLabelText('Editar');
    fireEvent.click(editButtons[0]);

    const nomeInput = screen.getByLabelText('Nome');
    const ativoSwitch = screen.getByLabelText('Ativo');
    const salvarButton = screen.getByRole('button', { name: /Salvar/i });

    fireEvent.change(nomeInput, { target: { value: 'Eletrônicos Atualizados' } });
    fireEvent.click(ativoSwitch); // Desativa
    fireEvent.click(salvarButton);

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

    renderWithRouter(<Categorias />);

    expect(await screen.findByText('Eletrônicos')).toBeInTheDocument();

    const deleteButtons = screen.getAllByLabelText('Excluir');
    fireEvent.click(deleteButtons[0]);

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
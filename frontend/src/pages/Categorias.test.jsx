
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    // Configura os mocks para as chamadas da API em ordem
    const getCategoriasMock = vi.spyOn(api, 'getCategorias')
      .mockResolvedValueOnce({ data: { results: mockCategorias } }) // 1ª chamada (inicial)
      .mockResolvedValueOnce({ data: { results: [...mockCategorias, { id: 3, nome: 'Bebidas', ativo: true, created_at: new Date().toISOString() }] } }); // 2ª chamada (após criação)

    const createCategoriaMock = vi.spyOn(api, 'createCategoria').mockResolvedValue({
      data: { id: 3, nome: 'Bebidas', ativo: true, created_at: new Date().toISOString() },
    });

    renderWithRouter(<Categorias />);

    // 1. Espera a lista carregar e verifica os itens
    expect(await screen.findByText('Eletrônicos')).toBeInTheDocument();
    expect(screen.getByText('Alimentos')).toBeInTheDocument();

    // 2. Clica no botão para adicionar nova categoria
    const newCategoryButton = screen.getByRole('button', { name: /Nova Categoria/i });
    fireEvent.click(newCategoryButton);

    // 3. Preenche o formulário e salva
    const nomeInput = screen.getByLabelText('Nome *');
    const salvarButton = screen.getByRole('button', { name: /Criar/i });

    fireEvent.change(nomeInput, { target: { value: 'Bebidas' } });
    fireEvent.click(salvarButton);

    // 4. Verifica se a API de criação foi chamada
    await waitFor(() => {
      expect(createCategoriaMock).toHaveBeenCalledWith({ nome: 'Bebidas', ativo: true });
    });

    // 5. Verifica se a nova categoria aparece na lista
    await waitFor(() => {
      expect(screen.getByText('Bebidas')).toBeInTheDocument();
    });

    expect(getCategoriasMock).toHaveBeenCalledTimes(2); // Inicial e após criação
  });

  it('deve permitir editar uma categoria existente', async () => {
    const getCategoriasMock = vi.spyOn(api, 'getCategorias')
      .mockResolvedValueOnce({ data: { results: mockCategorias } }) // 1ª chamada (inicial)
      .mockResolvedValueOnce({ data: { results: [{ id: 1, nome: 'Eletrônicos Atualizados', ativo: false, created_at: new Date().toISOString() }, mockCategorias[1]] } }); // 2ª chamada (após edição)

    const updateCategoriaMock = vi.spyOn(api, 'updateCategoria').mockResolvedValue({
      data: { id: 1, nome: 'Eletrônicos Atualizados', ativo: false, created_at: new Date().toISOString() },
    });

    renderWithRouter(<Categorias />);

    // 1. Espera a lista carregar
    expect(await screen.findByText('Eletrônicos')).toBeInTheDocument();

    // 2. Clica no botão de editar da primeira categoria
    const editButtons = screen.getAllByTitle('Editar');
    fireEvent.click(editButtons[0]);

    // 3. Preenche o formulário de edição e salva
    const nomeInput = screen.getByLabelText('Nome *');
    const ativoCheckbox = screen.getByLabelText('Ativo');
    const salvarButton = screen.getByRole('button', { name: /Salvar/i });

    fireEvent.change(nomeInput, { target: { value: 'Eletrônicos Atualizados' } });
    fireEvent.click(ativoCheckbox); // Desativa
    fireEvent.click(salvarButton);

    // 4. Verifica se a API de atualização foi chamada
    await waitFor(() => {
      expect(updateCategoriaMock).toHaveBeenCalledWith(1, { nome: 'Eletrônicos Atualizados', ativo: false });
    });

    // 5. Verifica se a categoria foi atualizada na lista
    await waitFor(() => {
      expect(screen.getByText('Eletrônicos Atualizados')).toBeInTheDocument();
      expect(screen.queryByText('Eletrônicos')).not.toBeInTheDocument();
    });

    expect(getCategoriasMock).toHaveBeenCalledTimes(2); // Inicial e após edição
  });

  it('deve permitir excluir uma categoria existente', async () => {
    const getCategoriasMock = vi.spyOn(api, 'getCategorias')
      .mockResolvedValueOnce({ data: { results: mockCategorias } }) // 1ª chamada (inicial)
      .mockResolvedValueOnce({ data: { results: [mockCategorias[1]] } }); // 2ª chamada (após exclusão)

    const deleteCategoriaMock = vi.spyOn(api, 'deleteCategoria').mockResolvedValue({});

    renderWithRouter(<Categorias />);

    // 1. Espera a lista carregar
    expect(await screen.findByText('Eletrônicos')).toBeInTheDocument();

    // 2. Clica no botão de excluir da primeira categoria
    const deleteButtons = screen.getAllByTitle('Excluir');
    fireEvent.click(deleteButtons[0]);

    // 3. Verifica se a confirmação foi exibida
    expect(window.confirm).toHaveBeenCalledWith('Tem certeza que deseja excluir esta categoria?');

    // 4. Verifica se a API de exclusão foi chamada
    await waitFor(() => {
      expect(deleteCategoriaMock).toHaveBeenCalledWith(1);
    });

    // 5. Verifica se a categoria foi removida da lista
    await waitFor(() => {
      expect(screen.queryByText('Eletrônicos')).not.toBeInTheDocument();
      expect(screen.getByText('Alimentos')).toBeInTheDocument();
    });

    expect(getCategoriasMock).toHaveBeenCalledTimes(2); // Inicial e após exclusão
  });
});

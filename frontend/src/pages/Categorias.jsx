import { useState, useEffect } from 'react';
import { getCategorias, createCategoria, updateCategoria, deleteCategoria } from '../services/api';
import { Table, Button, Modal, TextInput, Group, Title, ActionIcon, Stack, Text, Switch, Badge } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ nome: '', ativo: true });

  useEffect(() => {
    loadCategorias();
  }, []);

  const loadCategorias = async () => {
    setLoading(true);
    try {
      const response = await getCategorias();
      setCategorias(response.data.results || response.data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ nome: '', ativo: true });
    setEditingCategory(null);
  };

  const handleOpenModal = (categoria = null) => {
    if (categoria) {
      setEditingCategory(categoria);
      setFormData({ nome: categoria.nome, ativo: categoria.ativo });
    } else {
      resetForm();
    }
    open();
  };

  const handleCloseModal = () => {
    close();
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await updateCategoria(editingCategory.id, formData);
      } else {
        await createCategoria(formData);
      }
      handleCloseModal();
      loadCategorias();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
    try {
      await deleteCategoria(id);
      loadCategorias();
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
    }
  };

  const rows = categorias.map((categoria) => (
    <tr key={categoria.id}>
      <td>{categoria.nome}</td>
      <td>
        <Badge color={categoria.ativo ? 'green' : 'red'} variant="light">
          {categoria.ativo ? 'Ativa' : 'Inativa'}
        </Badge>
      </td>
      <td>
        <Group spacing="xs" noWrap>
          <ActionIcon color="blue" onClick={() => handleOpenModal(categoria)}><FaEdit /></ActionIcon>
          <ActionIcon color="red" onClick={() => handleDelete(categoria.id)}><FaTrash /></ActionIcon>
        </Group>
      </td>
    </tr>
  ));

  return (
    <>
      <Group position="apart" mb="lg">
        <Title order={2}>Categorias</Title>
        <Button leftIcon={<FaPlus />} onClick={() => handleOpenModal()}>Nova Categoria</Button>
      </Group>

      <Modal opened={opened} onClose={handleCloseModal} title={editingCategory ? 'Editar Categoria' : 'Nova Categoria'}>
        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput label="Nome" placeholder="Nome da categoria" required value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
            <Switch label="Ativo" checked={formData.ativo} onChange={(e) => setFormData({ ...formData, ativo: e.currentTarget.checked })} />
            <Group position="right" mt="md">
              <Button variant="default" onClick={handleCloseModal}>Cancelar</Button>
              <Button type="submit">{editingCategory ? 'Salvar' : 'Criar'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Table striped highlightOnHover withBorder withColumnBorders>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? rows : (
            <tr>
              <td colSpan={3}><Text color="dimmed" align="center">Nenhuma categoria cadastrada.</Text></td>
            </tr>
          )}
        </tbody>
      </Table>
    </>
  );
}

export default Categorias;
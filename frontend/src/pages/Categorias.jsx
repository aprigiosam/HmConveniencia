import { useState, useEffect } from 'react';
import { getCategorias, createCategoria, updateCategoria, deleteCategoria } from '../services/api';
import { localDB } from '../utils/db';
import { Table, Button, Modal, TextInput, Group, Title, ActionIcon, Stack, Text, Switch, Badge, ScrollArea } from '@mantine/core';
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
    // CACHE-FIRST: Carrega do cache imediatamente
    const cachedCategorias = await localDB.getCachedCategorias();
    if (cachedCategorias.length > 0) {
      setCategorias(cachedCategorias);
      setLoading(false);
    }

    // Tenta sincronizar com servidor em background
    try {
      const response = await getCategorias();
      const categoriasData = response.data.results || response.data;
      setCategorias(categoriasData);
      await localDB.cacheCategorias(categoriasData);
    } catch (error) {
      console.error('Servidor offline, usando cache local');
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
    <Table.Tr key={categoria.id}>
      <Table.Td>{categoria.nome}</Table.Td>
      <Table.Td>
        <Badge color={categoria.ativo ? 'green' : 'red'} variant="light">
          {categoria.ativo ? 'Ativa' : 'Inativa'}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          <ActionIcon color="blue" aria-label="Editar" onClick={() => handleOpenModal(categoria)} size="lg">
            <FaEdit size={16} />
          </ActionIcon>
          <ActionIcon color="red" aria-label="Excluir" onClick={() => handleDelete(categoria.id)} size="lg">
            <FaTrash size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Group justify="space-between" mb="md" wrap="wrap" gap="xs">
        <Title order={2}>Categorias</Title>
        <Button leftSection={<FaPlus />} onClick={() => handleOpenModal()} size="md">
          Nova Categoria
        </Button>
      </Group>

      <Modal opened={opened} onClose={handleCloseModal} title={editingCategory ? 'Editar Categoria' : 'Nova Categoria'} size="md">
        <form onSubmit={handleSubmit}>
          <Stack gap="sm">
            <TextInput
              label="Nome"
              placeholder="Nome da categoria"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              size="md"
            />
            <Switch
              label="Ativo"
              checked={formData.ativo}
              onChange={(e) => setFormData({ ...formData, ativo: e.currentTarget.checked })}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleCloseModal}>Cancelar</Button>
              <Button type="submit">{editingCategory ? 'Salvar' : 'Criar'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <ScrollArea>
        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nome</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th style={{ width: '120px' }}>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length > 0 ? rows : (
              <Table.Tr>
                <Table.Td colSpan={3}>
                  <Text c="dimmed" ta="center">Nenhuma categoria cadastrada.</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </>
  );
}

export default Categorias;
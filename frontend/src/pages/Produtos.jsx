import { useState, useEffect } from 'react';
import { getProdutos, createProduto, updateProduto, deleteProduto, getCategorias } from '../services/api';
import { localDB } from '../utils/db';
import { Table, Button, Modal, TextInput, NumberInput, Select, Group, Title, ActionIcon, Stack, Text, ScrollArea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [formData, setFormData] = useState({ nome: '', preco: '', estoque: '', categoria: '' });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    // CACHE-FIRST: Carrega do cache imediatamente
    const cachedProdutos = await localDB.getCachedProdutos();
    if (cachedProdutos.length > 0) {
      setProdutos(cachedProdutos);
      setLoading(false);
    }

    // Tenta sincronizar com servidor em background
    try {
      const [produtosRes, categoriasRes] = await Promise.all([getProdutos(), getCategorias()]);
      const produtosData = produtosRes.data.results || produtosRes.data;
      const categoriasData = categoriasRes.data.results || categoriasRes.data;

      setProdutos(produtosData);
      setCategorias(categoriasData);
      await localDB.cacheProdutos(produtosData);
    } catch (error) {
      // Se falhar, mantém dados do cache (já carregados)
      console.error('Servidor offline, usando cache local');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ nome: '', preco: '', estoque: '', categoria: '' });
    setEditingProduct(null);
  };

  const handleOpenModal = (produto = null) => {
    if (produto) {
      setEditingProduct(produto);
      setFormData({
        nome: produto.nome,
        preco: produto.preco,
        estoque: produto.estoque,
        categoria: produto.categoria?.toString() || '',
      });
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
    const dataToSend = { ...formData, categoria: formData.categoria ? parseInt(formData.categoria) : null };
    try {
      if (editingProduct) {
        await updateProduto(editingProduct.id, dataToSend);
      } else {
        await createProduto(dataToSend);
      }
      handleCloseModal();
      loadInitialData();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
    }
  };

  const handleOpenDeleteModal = (produto) => {
    setDeletingProduct(produto);
    openDeleteModal();
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    try {
      await deleteProduto(deletingProduct.id);
      closeDeleteModal();
      setDeletingProduct(null);
      loadInitialData();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      alert('Erro ao excluir produto');
    }
  };

  const handleCancelDelete = () => {
    closeDeleteModal();
    setDeletingProduct(null);
  };

  const rows = produtos.map((produto) => (
    <Table.Tr key={produto.id}>
      <Table.Td>{produto.nome}</Table.Td>
      <Table.Td>R$ {parseFloat(produto.preco).toFixed(2)}</Table.Td>
      <Table.Td>{parseInt(produto.estoque)}</Table.Td>
      <Table.Td>{produto.categoria_nome || 'Sem categoria'}</Table.Td>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          <ActionIcon color="blue" aria-label="Editar" onClick={() => handleOpenModal(produto)} size="lg">
            <FaEdit size={16} />
          </ActionIcon>
          <ActionIcon color="red" aria-label="Excluir" onClick={() => handleOpenDeleteModal(produto)} size="lg">
            <FaTrash size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  const categoriaOptions = categorias.map(cat => ({ value: cat.id.toString(), label: cat.nome }));

  return (
    <>
      <Group justify="space-between" mb="md" wrap="wrap" gap="xs">
        <Title order={2}>Produtos</Title>
        <Button leftSection={<FaPlus />} onClick={() => handleOpenModal()} size="md">
          Novo Produto
        </Button>
      </Group>

      <Modal opened={opened} onClose={handleCloseModal} title={editingProduct ? 'Editar Produto' : 'Novo Produto'} size="md">
        <form onSubmit={handleSubmit}>
          <Stack gap="sm">
            <TextInput label="Nome" placeholder="Nome do produto" required value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} size="md" />
            <NumberInput label="Preço" placeholder="9.99" required precision={2} value={Number(formData.preco)} onChange={(value) => setFormData({ ...formData, preco: value })} size="md" />
            <NumberInput label="Estoque" placeholder="0" required value={Number(formData.estoque)} onChange={(value) => setFormData({ ...formData, estoque: value })} size="md" />
            <Select label="Categoria" placeholder="Selecione uma categoria" data={categoriaOptions} value={formData.categoria} onChange={(value) => setFormData({ ...formData, categoria: value })} clearable size="md" />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleCloseModal}>Cancelar</Button>
              <Button type="submit">{editingProduct ? 'Salvar' : 'Criar'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        opened={deleteModalOpened}
        onClose={handleCancelDelete}
        title="Confirmar Exclusão"
        centered
        size="sm"
      >
        <Stack gap="md">
          <Text>
            Tem certeza que deseja excluir o produto <strong>{deletingProduct?.nome}</strong>?
          </Text>
          <Text size="sm" c="dimmed">
            Esta ação não pode ser desfeita.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={handleCancelDelete}>
              Cancelar
            </Button>
            <Button color="red" onClick={handleConfirmDelete}>
              Excluir
            </Button>
          </Group>
        </Stack>
      </Modal>

      <ScrollArea>
        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nome</Table.Th>
              <Table.Th>Preço</Table.Th>
              <Table.Th>Estoque</Table.Th>
              <Table.Th>Categoria</Table.Th>
              <Table.Th style={{ width: '120px' }}>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length > 0 ? rows : (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text c="dimmed" ta="center">Nenhum produto cadastrado.</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </>
  );
}

export default Produtos;
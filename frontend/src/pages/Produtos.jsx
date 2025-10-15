import { useState, useEffect } from 'react';
import { getProdutos, createProduto, updateProduto, deleteProduto, getCategorias } from '../services/api';
import { localDB } from '../utils/db';
import { Table, Button, Modal, TextInput, NumberInput, Select, Group, Title, ActionIcon, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingProduct, setEditingProduct] = useState(null);
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

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
      await deleteProduto(id);
      loadInitialData();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
    }
  };

  const rows = produtos.map((produto) => (
    <tr key={produto.id}>
      <td>{produto.nome}</td>
      <td>R$ {parseFloat(produto.preco).toFixed(2)}</td>
      <td>{parseInt(produto.estoque)}</td>
      <td>{produto.categoria_nome || 'Sem categoria'}</td>
      <td>
        <Group spacing="xs" noWrap>
          <ActionIcon color="blue" aria-label="Editar" onClick={() => handleOpenModal(produto)}><FaEdit /></ActionIcon>
          <ActionIcon color="red" aria-label="Excluir" onClick={() => handleDelete(produto.id)}><FaTrash /></ActionIcon>
        </Group>
      </td>
    </tr>
  ));

  const categoriaOptions = categorias.map(cat => ({ value: cat.id.toString(), label: cat.nome }));

  return (
    <>
      <Group position="apart" mb="lg">
        <Title order={2}>Produtos</Title>
        <Button leftIcon={<FaPlus />} onClick={() => handleOpenModal()}>Novo Produto</Button>
      </Group>

      <Modal opened={opened} onClose={handleCloseModal} title={editingProduct ? 'Editar Produto' : 'Novo Produto'}>
        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput label="Nome" placeholder="Nome do produto" required value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
            <NumberInput label="Preço" placeholder="9.99" required precision={2} value={Number(formData.preco)} onChange={(value) => setFormData({ ...formData, preco: value })} />
            <NumberInput label="Estoque" placeholder="0" required value={Number(formData.estoque)} onChange={(value) => setFormData({ ...formData, estoque: value })} />
            <Select label="Categoria" placeholder="Selecione uma categoria" data={categoriaOptions} value={formData.categoria} onChange={(value) => setFormData({ ...formData, categoria: value })} clearable />
            <Group position="right" mt="md">
              <Button variant="default" onClick={handleCloseModal}>Cancelar</Button>
              <Button type="submit">{editingProduct ? 'Salvar' : 'Criar'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Table striped highlightOnHover withBorder withColumnBorders>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Preço</th>
            <th>Estoque</th>
            <th>Categoria</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? rows : (
            <tr>
              <td colSpan={5}><Text color="dimmed" align="center">Nenhum produto cadastrado.</Text></td>
            </tr>
          )}
        </tbody>
      </Table>
    </>
  );
}

export default Produtos;
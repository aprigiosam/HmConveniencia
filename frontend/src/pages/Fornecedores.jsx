import { useState, useEffect } from 'react';
import { getFornecedores, createFornecedor, updateFornecedor, deleteFornecedor } from '../services/api';
import { Table, Button, Modal, TextInput, Textarea, Group, Title, ActionIcon, Stack, Text, ScrollArea, Card, Badge } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { FaEdit, FaTrash, FaPlus, FaBox } from 'react-icons/fa';
import './Fornecedores.css';

function Fornecedores() {
  const [fornecedores, setFornecedores] = useState([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [editingFornecedor, setEditingFornecedor] = useState(null);
  const [deletingFornecedor, setDeletingFornecedor] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    nome_fantasia: '',
    cnpj: '',
    telefone: '',
    email: '',
    endereco: '',
    observacoes: ''
  });

  useEffect(() => {
    loadFornecedores();
  }, []);

  const formatCurrency = (valor) => {
    if (valor === null || valor === undefined) return 'R$ 0,00';
    return `R$ ${parseFloat(valor || 0).toFixed(2)}`;
  };

  const formatDate = (valor) => {
    if (!valor) return '-';
    const date = new Date(valor);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('pt-BR');
  };

  const loadFornecedores = async () => {
    try {
      const response = await getFornecedores({ ativo: true });
      const fornecedoresData = response.data.results || response.data;
      setFornecedores(fornecedoresData);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      nome_fantasia: '',
      cnpj: '',
      telefone: '',
      email: '',
      endereco: '',
      observacoes: ''
    });
    setEditingFornecedor(null);
  };

  const handleOpenModal = (fornecedor = null) => {
    if (fornecedor) {
      setEditingFornecedor(fornecedor);
      setFormData({
        nome: fornecedor.nome,
        nome_fantasia: fornecedor.nome_fantasia || '',
        cnpj: fornecedor.cnpj || '',
        telefone: fornecedor.telefone || '',
        email: fornecedor.email || '',
        endereco: fornecedor.endereco || '',
        observacoes: fornecedor.observacoes || ''
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
    try {
      // Remove campos vazios para enviar null ao backend
      const dataToSend = { ...formData };
      if (!dataToSend.cnpj) dataToSend.cnpj = null;

      if (editingFornecedor) {
        await updateFornecedor(editingFornecedor.id, dataToSend);
      } else {
        await createFornecedor(dataToSend);
      }
      handleCloseModal();
      loadFornecedores();
    } catch (error) {
      console.error('Erro ao salvar fornecedor:', error);
      alert('Erro ao salvar fornecedor. Verifique os dados e tente novamente.');
    }
  };

  const handleOpenDeleteModal = (fornecedor) => {
    setDeletingFornecedor(fornecedor);
    openDeleteModal();
  };

  const handleConfirmDelete = async () => {
    if (!deletingFornecedor) return;
    try {
      await deleteFornecedor(deletingFornecedor.id);
      closeDeleteModal();
      setDeletingFornecedor(null);
      loadFornecedores();
    } catch (error) {
      console.error('Erro ao excluir fornecedor:', error);
      alert('Erro ao excluir fornecedor');
    }
  };

  const handleCancelDelete = () => {
    closeDeleteModal();
    setDeletingFornecedor(null);
  };

  const rows = fornecedores.map((fornecedor) => (
    <Table.Tr key={fornecedor.id}>
      <Table.Td>
        <div>
          <Text fw={500}>{fornecedor.nome}</Text>
          {fornecedor.nome_fantasia && (
            <Text size="xs" c="dimmed">{fornecedor.nome_fantasia}</Text>
          )}
        </div>
      </Table.Td>
      <Table.Td>{fornecedor.cnpj || '-'}</Table.Td>
      <Table.Td>{fornecedor.telefone || '-'}</Table.Td>
      <Table.Td>
        <Stack gap={2} align="flex-start">
          <Badge color="blue" variant="light" leftSection={<FaBox size={12} />}>
            {fornecedor.total_lotes || 0} lotes
          </Badge>
          <Text size="xs" c="dimmed">
            {fornecedor.total_notas || 0} nota(s)
          </Text>
        </Stack>
      </Table.Td>
      <Table.Td>
        <Stack gap={2} align="flex-start">
          <Text size="sm" fw={600}>{formatCurrency(fornecedor.total_compras)}</Text>
          <Text size="xs" c="dimmed">NF-e importadas</Text>
        </Stack>
      </Table.Td>
      <Table.Td>
        <Stack gap={2} align="flex-start">
          <Text size="sm">{formatDate(fornecedor.ultima_compra_data)}</Text>
          <Text size="xs" c="dimmed">
            {fornecedor.ultima_compra_valor ? formatCurrency(fornecedor.ultima_compra_valor) : 'Sem registro'}
          </Text>
        </Stack>
      </Table.Td>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          <ActionIcon color="blue" onClick={() => handleOpenModal(fornecedor)} size="lg">
            <FaEdit size={16} />
          </ActionIcon>
          <ActionIcon color="red" onClick={() => handleOpenDeleteModal(fornecedor)} size="lg">
            <FaTrash size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  const cards = fornecedores.map((fornecedor) => (
    <Card withBorder radius="md" p="sm" key={fornecedor.id} className="fornecedor-card">
      <Group justify="space-between" mb="xs">
        <div>
          <Text fw={500}>{fornecedor.nome}</Text>
          {fornecedor.nome_fantasia && (
            <Text size="xs" c="dimmed">{fornecedor.nome_fantasia}</Text>
          )}
        </div>
        <Group gap="xs" wrap="nowrap">
          <ActionIcon color="blue" variant="light" onClick={() => handleOpenModal(fornecedor)} size="lg">
            <FaEdit size={16} />
          </ActionIcon>
          <ActionIcon color="red" variant="light" onClick={() => handleOpenDeleteModal(fornecedor)} size="lg">
            <FaTrash size={16} />
          </ActionIcon>
        </Group>
      </Group>
      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">CNPJ:</Text>
          <Text size="sm">{fornecedor.cnpj || '-'}</Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Telefone:</Text>
          <Text size="sm">{fornecedor.telefone || '-'}</Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Total Lotes:</Text>
          <Badge color="blue" variant="light" size="sm">
            {fornecedor.total_lotes || 0}
          </Badge>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Notas NF-e:</Text>
          <Text size="sm" fw={500}>{fornecedor.total_notas || 0}</Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Total Compras:</Text>
          <Text size="sm" fw={500} c="green">
            {formatCurrency(fornecedor.total_compras)}
          </Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Última Compra:</Text>
          <Stack gap={0} align="flex-end">
            <Text size="sm">{formatDate(fornecedor.ultima_compra_data)}</Text>
            <Text size="xs" c="dimmed">
              {fornecedor.ultima_compra_valor ? formatCurrency(fornecedor.ultima_compra_valor) : 'Sem registro'}
            </Text>
          </Stack>
        </Group>
      </Stack>
    </Card>
  ));

  return (
    <>
      <Group justify="space-between" mb="md" wrap="wrap" gap="xs">
        <Title order={2}>Fornecedores</Title>
        <Button leftSection={<FaPlus />} onClick={() => handleOpenModal()} size="md">
          Novo Fornecedor
        </Button>
      </Group>

      <Modal
        opened={opened}
        onClose={handleCloseModal}
        title={editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="sm">
            <TextInput
              label="Nome / Razão Social"
              placeholder="Nome do fornecedor"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              size="md"
            />
            <TextInput
              label="Nome Fantasia"
              placeholder="Nome fantasia (opcional)"
              value={formData.nome_fantasia}
              onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
              size="md"
            />
            <TextInput
              label="CNPJ"
              placeholder="00.000.000/0000-00"
              value={formData.cnpj}
              onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
              size="md"
            />
            <TextInput
              label="Telefone"
              placeholder="(99) 99999-9999"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              size="md"
            />
            <TextInput
              label="Email"
              placeholder="email@exemplo.com"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              size="md"
            />
            <Textarea
              label="Endereço"
              placeholder="Endereço completo"
              value={formData.endereco}
              onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              size="md"
              minRows={2}
            />
            <Textarea
              label="Observações"
              placeholder="Observações adicionais"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              size="md"
              minRows={3}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleCloseModal}>Cancelar</Button>
              <Button type="submit">{editingFornecedor ? 'Salvar' : 'Criar'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={deleteModalOpened}
        onClose={handleCancelDelete}
        title="Confirmar Exclusão"
        centered
        size="sm"
      >
        <Stack gap="md">
          <Text>
            Tem certeza que deseja excluir o fornecedor <strong>{deletingFornecedor?.nome}</strong>?
          </Text>
          <Text size="sm" c="dimmed">
            Os lotes associados a este fornecedor não serão excluídos, mas ficarão sem fornecedor.
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

      {/* Layout de Tabela para Desktop */}
      <div className="table-desktop">
        <ScrollArea>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nome</Table.Th>
                <Table.Th>CNPJ</Table.Th>
                <Table.Th>Telefone</Table.Th>
                <Table.Th>Lotes / Notas</Table.Th>
                <Table.Th>Total NF-e</Table.Th>
                <Table.Th>Última Compra</Table.Th>
                <Table.Th style={{ width: '120px' }}>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? rows : (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text c="dimmed" ta="center">Nenhum fornecedor cadastrado.</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </div>

      {/* Layout de Cards para Mobile */}
      <div className="fornecedores-cards">
        {cards.length > 0 ? cards : (
          <Text c="dimmed" ta="center">Nenhum fornecedor cadastrado.</Text>
        )}
      </div>
    </>
  );
}

export default Fornecedores;

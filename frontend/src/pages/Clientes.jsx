import { useState, useEffect } from 'react';
import { getClientes, createCliente, updateCliente, deleteCliente } from '../services/api';
import { localDB } from '../utils/db';
import { Table, Button, Modal, TextInput, NumberInput, Group, Title, ActionIcon, Stack, Text, ScrollArea, Card } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { FaEdit, FaTrash, FaUserPlus } from 'react-icons/fa';
import './Clientes.css'; // Importa o CSS

function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [deletingCliente, setDeletingCliente] = useState(null);
  const [formData, setFormData] = useState({ nome: '', telefone: '', limite_credito: 0 });

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    const cachedClientes = await localDB.getCachedClientes();
    if (cachedClientes.length > 0) {
      setClientes(cachedClientes);
      setLoading(false);
    }

    try {
      const response = await getClientes();
      const clientesData = response.data.results || response.data;
      setClientes(clientesData);
      await localDB.cacheClientes(clientesData);
    } catch (error) {
      console.error('Servidor offline, usando cache local');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ nome: '', telefone: '', limite_credito: 0 });
    setEditingCliente(null);
  };

  const handleOpenModal = (cliente = null) => {
    if (cliente) {
      setEditingCliente(cliente);
      setFormData({
        nome: cliente.nome,
        telefone: cliente.telefone || '',
        limite_credito: parseFloat(cliente.limite_credito) || 0,
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
      if (editingCliente) {
        await updateCliente(editingCliente.id, formData);
      } else {
        await createCliente(formData);
      }
      handleCloseModal();
      loadClientes();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
    }
  };

  const handleOpenDeleteModal = (cliente) => {
    setDeletingCliente(cliente);
    openDeleteModal();
  };

  const handleConfirmDelete = async () => {
    if (!deletingCliente) return;
    try {
      await deleteCliente(deletingCliente.id);
      closeDeleteModal();
      setDeletingCliente(null);
      loadClientes();
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      alert('Erro ao excluir cliente');
    }
  };

  const handleCancelDelete = () => {
    closeDeleteModal();
    setDeletingCliente(null);
  };

  const rows = clientes.map((cliente) => (
    <Table.Tr key={cliente.id}>
      <Table.Td>{cliente.nome}</Table.Td>
      <Table.Td>{cliente.telefone || '-'}</Table.Td>
      <Table.Td>R$ {parseFloat(cliente.saldo_devedor || 0).toFixed(2)}</Table.Td>
      <Table.Td>R$ {parseFloat(cliente.limite_credito).toFixed(2)}</Table.Td>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          <ActionIcon color="blue" onClick={() => handleOpenModal(cliente)} size="lg">
            <FaEdit size={16} />
          </ActionIcon>
          <ActionIcon color="red" onClick={() => handleOpenDeleteModal(cliente)} size="lg">
            <FaTrash size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  const cards = clientes.map((cliente) => (
    <Card withBorder radius="md" p="sm" key={cliente.id} className="cliente-card">
      <Group justify="space-between" mb="xs">
        <Text fw={500}>{cliente.nome}</Text>
        <Group gap="xs" wrap="nowrap">
          <ActionIcon color="blue" variant="light" onClick={() => handleOpenModal(cliente)} size="lg">
            <FaEdit size={16} />
          </ActionIcon>
          <ActionIcon color="red" variant="light" onClick={() => handleOpenDeleteModal(cliente)} size="lg">
            <FaTrash size={16} />
          </ActionIcon>
        </Group>
      </Group>
      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Telefone:</Text>
          <Text size="sm">{cliente.telefone || '-'}</Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Saldo Devedor:</Text>
          <Text size="sm" fw={500} c="red">R$ {parseFloat(cliente.saldo_devedor || 0).toFixed(2)}</Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Limite:</Text>
          <Text size="sm">R$ {parseFloat(cliente.limite_credito).toFixed(2)}</Text>
        </Group>
      </Stack>
    </Card>
  ));

  return (
    <>
      <Group justify="space-between" mb="md" wrap="wrap" gap="xs">
        <Title order={2}>Clientes</Title>
        <Button leftSection={<FaUserPlus />} onClick={() => handleOpenModal()} size="md">
          Novo Cliente
        </Button>
      </Group>

      <Modal opened={opened} onClose={handleCloseModal} title={editingCliente ? 'Editar Cliente' : 'Novo Cliente'} size="md">
        <form onSubmit={handleSubmit}>
          <Stack gap="sm">
            <TextInput
              label="Nome"
              placeholder="Nome do cliente"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              size="md"
            />
            <TextInput
              label="Telefone"
              placeholder="(99) 99999-9999"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              size="md"
            />
            <NumberInput
              label="Limite de Crédito"
              defaultValue={0}
              precision={2}
              step={50}
              value={formData.limite_credito}
              onChange={(value) => setFormData({ ...formData, limite_credito: value })}
              parser={(value) => value.replace(/\s?R\$\s?|/g, '')}
              formatter={(value) =>
                !Number.isNaN(parseFloat(value))
                  ? `R$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                  : 'R$ '
              }
              size="md"
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleCloseModal}>Cancelar</Button>
              <Button type="submit">{editingCliente ? 'Salvar' : 'Criar'}</Button>
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
            Tem certeza que deseja excluir o cliente <strong>{deletingCliente?.nome}</strong>?
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

      {/* Layout de Tabela para Desktop */}
      <div className="table-desktop">
        <ScrollArea>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nome</Table.Th>
                <Table.Th>Telefone</Table.Th>
                <Table.Th>Saldo Devedor</Table.Th>
                <Table.Th>Limite</Table.Th>
                <Table.Th style={{ width: '120px' }}>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? rows : (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text c="dimmed" ta="center">Nenhum cliente cadastrado.</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </div>

      {/* Layout de Cards para Mobile */}
      <div className="clientes-cards">
        {cards.length > 0 ? cards : (
          <Text c="dimmed" ta="center">Nenhum cliente cadastrado.</Text>
        )}
      </div>
    </>
  );
}

export default Clientes;

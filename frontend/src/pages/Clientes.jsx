import { useState, useEffect } from 'react';
import { getClientes, createCliente, updateCliente, deleteCliente } from '../services/api';
import { localDB } from '../utils/db';
import { Table, Button, Modal, TextInput, NumberInput, Group, Title, ActionIcon, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { FaEdit, FaTrash, FaUserPlus } from 'react-icons/fa';

function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [formData, setFormData] = useState({ nome: '', telefone: '', limite_credito: 0 });

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    // CACHE-FIRST: Carrega do cache imediatamente
    const cachedClientes = await localDB.getCachedClientes();
    if (cachedClientes.length > 0) {
      setClientes(cachedClientes);
      setLoading(false);
    }

    // Tenta sincronizar com servidor em background
    try {
      const response = await getClientes();
      const clientesData = response.data.results || response.data;
      setClientes(clientesData);
      await localDB.cacheClientes(clientesData);
    } catch (error) {
      // Se falhar, mantém dados do cache (já carregados)
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

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
      await deleteCliente(id);
      loadClientes();
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
    }
  };

  const rows = clientes.map((cliente) => (
    <tr key={cliente.id}>
      <td>{cliente.nome}</td>
      <td>{cliente.telefone || '-'}</td>
      <td>R$ {parseFloat(cliente.saldo_devedor || 0).toFixed(2)}</td>
      <td>R$ {parseFloat(cliente.limite_credito).toFixed(2)}</td>
      <td>
        <Group spacing="xs" noWrap>
          <ActionIcon color="blue" onClick={() => handleOpenModal(cliente)}><FaEdit /></ActionIcon>
          <ActionIcon color="red" onClick={() => handleDelete(cliente.id)}><FaTrash /></ActionIcon>
        </Group>
      </td>
    </tr>
  ));

  return (
    <>
      <Group position="apart" mb="lg">
        <Title order={2}>Clientes</Title>
        <Button leftIcon={<FaUserPlus />} onClick={() => handleOpenModal()}>Novo Cliente</Button>
      </Group>

      <Modal opened={opened} onClose={handleCloseModal} title={editingCliente ? 'Editar Cliente' : 'Novo Cliente'}>
        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="Nome"
              placeholder="Nome do cliente"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            />
            <TextInput
              label="Telefone"
              placeholder="(99) 99999-9999"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
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
            />
            <Group position="right" mt="md">
              <Button variant="default" onClick={handleCloseModal}>Cancelar</Button>
              <Button type="submit">{editingCliente ? 'Salvar' : 'Criar'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Table striped highlightOnHover withBorder withColumnBorders>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Telefone</th>
            <th>Saldo Devedor</th>
            <th>Limite</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? rows : (
            <tr>
              <td colSpan={5}><Text color="dimmed" align="center">Nenhum cliente cadastrado.</Text></td>
            </tr>
          )}
        </tbody>
      </Table>
    </>
  );
}

export default Clientes;
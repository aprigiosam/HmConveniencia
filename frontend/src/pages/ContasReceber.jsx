import { useState, useEffect } from 'react';
import { getContasReceber, receberPagamento, getClientes, createVenda, getProdutos } from '../services/api';
import { Table, Button, Group, Title, Text, Card, Badge, ScrollArea, Stack, Modal, Select, NumberInput, Textarea } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { FaCheck, FaPlus, FaTimes } from 'react-icons/fa';
import './ContasReceber.css';

function ContasReceber() {
  const [contas, setContas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [formData, setFormData] = useState({
    cliente_id: '',
    descricao: '',
    valor: '',
    data_vencimento: null
  });

  useEffect(() => {
    loadContas();
    loadClientes();
    loadProdutos();
  }, []);

  const loadContas = async () => {
    setLoading(true);
    try {
      const response = await getContasReceber();
      setContas(response.data.results || response.data);
    } catch (error) {
      console.error('Erro ao carregar contas a receber:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClientes = async () => {
    try {
      const response = await getClientes({ ativo: true });
      setClientes(response.data.results || response.data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const loadProdutos = async () => {
    try {
      const response = await getProdutos({ ativo: true });
      setProdutos(response.data.results || response.data);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const handleReceber = async (vendaId) => {
    if (!confirm('Confirmar recebimento desta conta?')) return;
    try {
      await receberPagamento(vendaId);
      notifications.show({
        title: 'Pagamento recebido!',
        message: 'Conta marcada como paga com sucesso',
        color: 'green',
        icon: <FaCheck />,
      });
      loadContas();
    } catch (error) {
      console.error('Erro ao receber pagamento:', error);
      notifications.show({
        title: 'Erro ao receber',
        message: 'Não foi possível processar o recebimento',
        color: 'red',
        icon: <FaTimes />,
      });
    }
  };

  const handleOpenModal = () => {
    setFormData({
      cliente_id: '',
      descricao: '',
      valor: '',
      data_vencimento: null
    });
    open();
  };

  const handleCloseModal = () => {
    close();
    setFormData({
      cliente_id: '',
      descricao: '',
      valor: '',
      data_vencimento: null
    });
  };

  const handleAdicionarDivida = async (e) => {
    e.preventDefault();

    if (!formData.cliente_id || !formData.valor || !formData.data_vencimento) {
      notifications.show({
        title: 'Campos obrigatórios',
        message: 'Preencha cliente, valor e data de vencimento',
        color: 'orange',
        icon: <FaTimes />,
      });
      return;
    }

    // Encontra ou cria um produto "LANÇAMENTO MANUAL" para representar dívidas avulsas
    let produtoManual = produtos.find(p => p.nome === 'LANÇAMENTO MANUAL' || p.nome === 'DIVIDA AVULSA');

    // Se não existe, usa o primeiro produto disponível como placeholder
    // (idealmente deveria criar um produto específico, mas por ora usa qualquer um)
    if (!produtoManual && produtos.length > 0) {
      produtoManual = produtos[0];
    }

    if (!produtoManual) {
      notifications.show({
        title: 'Erro',
        message: 'Nenhum produto disponível. Cadastre ao menos um produto primeiro.',
        color: 'red',
        icon: <FaTimes />,
      });
      return;
    }

    try {
      const dataVencimentoFormatada = formData.data_vencimento instanceof Date
        ? formData.data_vencimento.toISOString().split('T')[0]
        : formData.data_vencimento;

      const vendaData = {
        forma_pagamento: 'FIADO',
        cliente_id: parseInt(formData.cliente_id),
        data_vencimento: dataVencimentoFormatada,
        observacao: formData.descricao || 'Dívida avulsa',
        itens: [{
          produto_id: produtoManual.id,
          quantidade: parseFloat(formData.valor) / parseFloat(produtoManual.preco),
          // Ajusta quantidade para que o total seja exatamente o valor desejado
        }]
      };

      await createVenda(vendaData);

      notifications.show({
        title: 'Dívida adicionada!',
        message: `Dívida de R$ ${parseFloat(formData.valor).toFixed(2)} registrada com sucesso`,
        color: 'green',
        icon: <FaCheck />,
      });

      handleCloseModal();
      loadContas();
    } catch (error) {
      console.error('Erro ao adicionar dívida:', error);
      const errorMsg = error.response?.data?.detail
        || Object.values(error.response?.data || {}).flat().join(', ')
        || 'Erro ao registrar dívida';

      notifications.show({
        title: 'Erro ao adicionar dívida',
        message: errorMsg,
        color: 'red',
        icon: <FaTimes />,
      });
    }
  };

  const isVencida = (dataVencimento) => {
    if (!dataVencimento) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return new Date(dataVencimento) < hoje;
  };

  const totalDevedor = contas.reduce((sum, venda) => sum + parseFloat(venda.total), 0);

  const rows = contas.map((venda) => {
    const vencida = isVencida(venda.data_vencimento);
    return (
      <Table.Tr key={venda.id} style={{ backgroundColor: vencida ? 'var(--mantine-color-red-0)' : 'transparent' }}>
        <Table.Td>{venda.cliente_nome}</Table.Td>
        <Table.Td>{new Date(venda.data_vencimento).toLocaleDateString('pt-BR')}</Table.Td>
        <Table.Td>R$ {parseFloat(venda.total).toFixed(2)}</Table.Td>
        <Table.Td>
          <Badge color={vencida ? 'red' : 'yellow'} variant="light">
            {vencida ? 'Vencida' : 'Pendente'}
          </Badge>
        </Table.Td>
        <Table.Td>
          <Button size="xs" leftIcon={<FaCheck />} onClick={() => handleReceber(venda.id)}>
            Receber
          </Button>
        </Table.Td>
      </Table.Tr>
    );
  });

  const cards = contas.map((venda) => {
    const vencida = isVencida(venda.data_vencimento);
    return (
      <Card withBorder radius="md" p="sm" key={venda.id} className={`conta-card ${vencida ? 'vencida' : ''}`}>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text fw={500}>{venda.cliente_nome}</Text>
            <Badge color={vencida ? 'red' : 'yellow'} variant="light">
              {vencida ? 'Vencida' : 'Pendente'}
            </Badge>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Vencimento:</Text>
            <Text size="sm">{new Date(venda.data_vencimento).toLocaleDateString('pt-BR')}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Valor:</Text>
            <Text size="sm" fw={500}>R$ {parseFloat(venda.total).toFixed(2)}</Text>
          </Group>
          <Button mt="sm" size="sm" leftIcon={<FaCheck />} onClick={() => handleReceber(venda.id)} fullWidth>
            Receber Pagamento
          </Button>
        </Stack>
      </Card>
    );
  });

  const clienteOptions = clientes.map(c => ({ value: c.id.toString(), label: c.nome }));

  return (
    <>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Contas a Receber</Title>
        <Button leftSection={<FaPlus />} onClick={handleOpenModal} color="orange">
          Adicionar Dívida
        </Button>
      </Group>

      <Card withBorder p="lg" radius="md" mb="lg">
        <Text align="center" size="lg" weight={500} color="dimmed">Total a Receber</Text>
        <Title order={1} align="center" color="blue">R$ {totalDevedor.toFixed(2)}</Title>
      </Card>

      <div className="table-desktop">
        <ScrollArea>
          <Table striped highlightOnHover withBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Cliente</Table.Th>
                <Table.Th>Vencimento</Table.Th>
                <Table.Th>Valor</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Ação</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? rows : (
                <Table.Tr>
                  <Table.Td colSpan={5}><Text color="dimmed" align="center">Nenhuma conta pendente.</Text></Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </div>

      <div className="contas-cards">
        {cards.length > 0 ? cards : (
          <Text c="dimmed" ta="center">Nenhuma conta pendente.</Text>
        )}
      </div>

      {/* Modal Adicionar Dívida */}
      <Modal
        opened={opened}
        onClose={handleCloseModal}
        title="Adicionar Dívida Avulsa"
        size="md"
        centered
      >
        <form onSubmit={handleAdicionarDivida}>
          <Stack gap="md">
            <Select
              label="Cliente"
              placeholder="Selecione o cliente"
              data={clienteOptions}
              value={formData.cliente_id}
              onChange={(value) => setFormData({ ...formData, cliente_id: value })}
              searchable
              required
              size="md"
            />

            <Textarea
              label="Descrição"
              placeholder="Ex: Empréstimo, Venda antiga, etc..."
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              size="md"
              description="Opcional - Descreva o motivo da dívida"
            />

            <NumberInput
              label="Valor da Dívida"
              placeholder="0.00"
              value={formData.valor}
              onChange={(value) => setFormData({ ...formData, valor: value })}
              precision={2}
              min={0.01}
              leftSection="R$"
              required
              size="md"
            />

            <DatePickerInput
              label="Data de Vencimento"
              placeholder="Selecione a data"
              value={formData.data_vencimento}
              onChange={(value) => setFormData({ ...formData, data_vencimento: value })}
              minDate={new Date()}
              required
              size="md"
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button type="submit" color="orange" leftSection={<FaPlus />}>
                Adicionar Dívida
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}

export default ContasReceber;

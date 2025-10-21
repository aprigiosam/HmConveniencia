import { useState, useEffect } from 'react';
import { getVendas, getVenda } from '../services/api';
import { Table, Card, TextInput, Select, Group, Title, Stack, Text, ScrollArea, Badge, Button, Modal, Paper } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { FaSearch, FaEye, FaPrint, FaFilter, FaTimes } from 'react-icons/fa';
import Comprovante from '../components/Comprovante';

function HistoricoVendas() {
  const [vendas, setVendas] = useState([]);
  const [vendaDetalhe, setVendaDetalhe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comprovanteAberto, setComprovanteAberto] = useState(false);

  // Filtros
  const [busca, setBusca] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [dataInicio, setDataInicio] = useState(null);
  const [dataFim, setDataFim] = useState(null);

  useEffect(() => {
    loadVendas();
  }, []);

  const loadVendas = async () => {
    setLoading(true);
    try {
      const response = await getVendas();
      const vendasData = response.data.results || response.data;
      setVendas(vendasData);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
      notifications.show({
        title: 'Erro ao carregar vendas',
        message: 'Não foi possível carregar o histórico de vendas',
        color: 'red',
        icon: <FaTimes />,
      });
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    loadVendas();
  };

  const limparFiltros = () => {
    setBusca('');
    setFormaPagamento('');
    setDataInicio(null);
    setDataFim(null);
    loadVendas();
  };

  const abrirComprovante = async (venda) => {
    try {
      // Busca detalhes completos da venda (com itens)
      const response = await getVenda(venda.id);
      setVendaDetalhe(response.data);
      setComprovanteAberto(true);
    } catch (error) {
      console.error('Erro ao carregar detalhes da venda:', error);
      notifications.show({
        title: 'Erro ao carregar detalhes',
        message: 'Não foi possível carregar os detalhes da venda',
        color: 'red',
        icon: <FaTimes />,
      });
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFormaPagamentoBadge = (forma) => {
    const colors = {
      'DINHEIRO': 'green',
      'DEBITO': 'blue',
      'CREDITO': 'indigo',
      'PIX': 'teal',
      'FIADO': 'orange'
    };
    const labels = {
      'DINHEIRO': 'Dinheiro',
      'DEBITO': 'Débito',
      'CREDITO': 'Crédito',
      'PIX': 'PIX',
      'FIADO': 'Fiado'
    };
    return <Badge color={colors[forma] || 'gray'}>{labels[forma] || forma}</Badge>;
  };

  // Filtra vendas
  const vendasFiltradas = vendas.filter(venda => {
    // Filtro por busca (ID ou cliente)
    if (busca && !venda.id.toString().includes(busca) && !venda.cliente_nome?.toLowerCase().includes(busca.toLowerCase())) {
      return false;
    }

    // Filtro por forma de pagamento
    if (formaPagamento && venda.forma_pagamento !== formaPagamento) {
      return false;
    }

    // Filtro por data início
    if (dataInicio) {
      const vendaDate = new Date(venda.created_at);
      if (vendaDate < dataInicio) return false;
    }

    // Filtro por data fim
    if (dataFim) {
      const vendaDate = new Date(venda.created_at);
      const fimComHora = new Date(dataFim);
      fimComHora.setHours(23, 59, 59, 999);
      if (vendaDate > fimComHora) return false;
    }

    return true;
  });

  const totalFiltrado = vendasFiltradas.reduce((sum, venda) => sum + parseFloat(venda.valor_total || venda.total || 0), 0);

  const rows = vendasFiltradas.map((venda) => (
    <Table.Tr key={venda.id}>
      <Table.Td>#{venda.id}</Table.Td>
      <Table.Td>{formatDate(venda.created_at)}</Table.Td>
      <Table.Td>{getFormaPagamentoBadge(venda.forma_pagamento)}</Table.Td>
      <Table.Td>{venda.cliente_nome || '-'}</Table.Td>
      <Table.Td>
        <Text fw={600} c="orange">R$ {parseFloat(venda.valor_total || venda.total || 0).toFixed(2)}</Text>
      </Table.Td>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          <Button
            leftSection={<FaEye />}
            size="xs"
            variant="light"
            onClick={() => abrirComprovante(venda)}
          >
            Ver
          </Button>
          <Button
            leftSection={<FaPrint />}
            size="xs"
            variant="light"
            color="blue"
            onClick={() => abrirComprovante(venda)}
          >
            Imprimir
          </Button>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  const cards = vendasFiltradas.map((venda) => (
    <Card withBorder radius="md" p="sm" key={venda.id}>
      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Venda #{venda.id}</Text>
          {getFormaPagamentoBadge(venda.forma_pagamento)}
        </Group>
        <Text size="xs" c="dimmed">{formatDate(venda.created_at)}</Text>
        {venda.cliente_nome && (
          <Text size="sm">Cliente: {venda.cliente_nome}</Text>
        )}
        <Text size="lg" fw={700} c="orange">R$ {parseFloat(venda.valor_total || venda.total || 0).toFixed(2)}</Text>
        <Group gap="xs" mt="xs">
          <Button
            leftSection={<FaEye />}
            size="xs"
            variant="light"
            fullWidth
            onClick={() => abrirComprovante(venda)}
          >
            Ver Detalhes
          </Button>
          <Button
            leftSection={<FaPrint />}
            size="xs"
            variant="light"
            color="blue"
            fullWidth
            onClick={() => abrirComprovante(venda)}
          >
            Imprimir
          </Button>
        </Group>
      </Stack>
    </Card>
  ));

  return (
    <>
      <Title order={2} mb="md">Histórico de Vendas</Title>

      {/* Filtros */}
      <Paper p="md" withBorder mb="md">
        <Stack gap="md">
          <Group align="flex-end" wrap="wrap" gap="xs">
            <TextInput
              label="Buscar"
              placeholder="ID da venda ou nome do cliente..."
              leftSection={<FaSearch />}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ flex: 1, minWidth: '200px' }}
            />
            <Select
              label="Forma de Pagamento"
              placeholder="Todas"
              value={formaPagamento}
              onChange={setFormaPagamento}
              clearable
              data={[
                { value: 'DINHEIRO', label: 'Dinheiro' },
                { value: 'DEBITO', label: 'Débito' },
                { value: 'CREDITO', label: 'Crédito' },
                { value: 'PIX', label: 'PIX' },
                { value: 'FIADO', label: 'Fiado' },
              ]}
              style={{ flex: 1, minWidth: '150px' }}
            />
            <DatePickerInput
              label="Data Início"
              placeholder="Selecione"
              value={dataInicio}
              onChange={setDataInicio}
              clearable
              style={{ flex: 1, minWidth: '150px' }}
            />
            <DatePickerInput
              label="Data Fim"
              placeholder="Selecione"
              value={dataFim}
              onChange={setDataFim}
              clearable
              style={{ flex: 1, minWidth: '150px' }}
            />
          </Group>
          <Group gap="xs">
            <Button
              leftSection={<FaFilter />}
              onClick={aplicarFiltros}
              variant="light"
            >
              Aplicar Filtros
            </Button>
            <Button
              leftSection={<FaTimes />}
              onClick={limparFiltros}
              variant="subtle"
              color="gray"
            >
              Limpar
            </Button>
          </Group>
        </Stack>
      </Paper>

      {/* Resumo */}
      <Paper p="md" withBorder mb="md" style={{ backgroundColor: '#f8f9fa' }}>
        <Group justify="space-between">
          <div>
            <Text size="sm" c="dimmed">Total de Vendas Filtradas</Text>
            <Text size="xl" fw={700}>{vendasFiltradas.length}</Text>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Text size="sm" c="dimmed">Valor Total</Text>
            <Text size="xl" fw={700} c="orange">R$ {totalFiltrado.toFixed(2)}</Text>
          </div>
        </Group>
      </Paper>

      {/* Tabela Desktop */}
      <div style={{ display: 'none' }}>
        <style>
          {`
            @media (min-width: 768px) {
              .table-desktop { display: block !important; }
              .vendas-cards { display: none !important; }
            }
          `}
        </style>
      </div>
      <div className="table-desktop" style={{ display: 'none' }}>
        <ScrollArea>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ID</Table.Th>
                <Table.Th>Data/Hora</Table.Th>
                <Table.Th>Pagamento</Table.Th>
                <Table.Th>Cliente</Table.Th>
                <Table.Th>Valor Total</Table.Th>
                <Table.Th style={{ width: '200px' }}>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? rows : (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed" ta="center">Nenhuma venda encontrada.</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </div>

      {/* Cards Mobile */}
      <div className="vendas-cards">
        <Stack gap="sm">
          {cards.length > 0 ? cards : (
            <Text c="dimmed" ta="center">Nenhuma venda encontrada.</Text>
          )}
        </Stack>
      </div>

      {/* Modal do Comprovante */}
      <Modal
        opened={comprovanteAberto}
        onClose={() => setComprovanteAberto(false)}
        title=""
        size="lg"
        centered
        padding={0}
        classNames={{
          root: 'comprovante-modal-root',
          content: 'comprovante-modal-content',
          body: 'comprovante-modal-body',
          overlay: 'comprovante-modal-overlay'
        }}
      >
        {vendaDetalhe && (
          <Comprovante
            venda={vendaDetalhe}
            onClose={() => setComprovanteAberto(false)}
          />
        )}
      </Modal>
    </>
  );
}

export default HistoricoVendas;

import { useState, useEffect } from 'react';
import { getHistoricoCaixa, deletarCaixa, deletarTodosCaixas } from '../services/api';
import {
  Table,
  Title,
  Text,
  Badge,
  Card,
  ScrollArea,
  Stack,
  Group,
  Button,
  ActionIcon,
  Modal,
  Paper,
  Divider,
  Collapse
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { FaTrash, FaChevronDown, FaChevronUp, FaMoneyBill, FaCreditCard, FaQrcode, FaFileInvoice } from 'react-icons/fa';
import './HistoricoCaixa.css';

function HistoricoCaixa() {
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [detailModalOpened, setDetailModalOpened] = useState(false);
  const [selectedCaixa, setSelectedCaixa] = useState(null);

  useEffect(() => {
    loadHistorico();
  }, []);

  const loadHistorico = async () => {
    setLoading(true);
    try {
      const response = await getHistoricoCaixa();
      setHistorico(response.data);
    } catch (error) {
      console.error('Erro ao carregar histórico de caixa:', error);
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível carregar o histórico de caixas',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    const number = parseFloat(value);
    return isNaN(number) ? 'R$ 0.00' : `R$ ${number.toFixed(2)}`;
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleRow = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleDeletarCaixa = (caixa) => {
    modals.openConfirmModal({
      title: 'Confirmar exclusão',
      children: (
        <Text size="sm">
          Tem certeza que deseja excluir o caixa de{' '}
          <strong>{formatDateTime(caixa.data_abertura)}</strong>?
          <br /><br />
          Esta ação não pode ser desfeita.
        </Text>
      ),
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deletarCaixa(caixa.id);
          notifications.show({
            title: 'Sucesso',
            message: 'Caixa excluído com sucesso',
            color: 'green',
          });
          loadHistorico();
        } catch (error) {
          console.error('Erro ao deletar caixa:', error);
          notifications.show({
            title: 'Erro',
            message: error.response?.data?.error || 'Erro ao excluir caixa',
            color: 'red',
          });
        }
      },
    });
  };

  const handleDeletarTodos = () => {
    modals.openConfirmModal({
      title: 'ATENÇÃO: Excluir todos os caixas',
      children: (
        <Stack gap="md">
          <Text size="sm" fw={700} c="red">
            Esta ação irá excluir PERMANENTEMENTE todos os {historico.length} caixas fechados!
          </Text>
          <Text size="sm">
            Esta operação não pode ser desfeita. Todos os registros de caixas
            fechados serão removidos do sistema.
          </Text>
          <Text size="sm" c="dimmed">
            Digite <strong>CONFIRMAR</strong> para prosseguir:
          </Text>
        </Stack>
      ),
      labels: { confirm: 'Excluir Todos', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        const confirmar = window.prompt('Digite "CONFIRMAR" para excluir todos os caixas:');
        if (confirmar !== 'CONFIRMAR') {
          notifications.show({
            title: 'Cancelado',
            message: 'Operação cancelada',
            color: 'yellow',
          });
          return;
        }

        try {
          const response = await deletarTodosCaixas();
          notifications.show({
            title: 'Sucesso',
            message: `${response.data.total} caixa(s) excluído(s) com sucesso`,
            color: 'green',
          });
          loadHistorico();
        } catch (error) {
          console.error('Erro ao deletar todos os caixas:', error);
          notifications.show({
            title: 'Erro',
            message: error.response?.data?.error || 'Erro ao excluir caixas',
            color: 'red',
          });
        }
      },
    });
  };

  const renderDetalhamento = (caixa) => {
    const temDetalhamento = caixa.total_vendas !== null && caixa.total_vendas !== undefined;

    if (!temDetalhamento) {
      return (
        <Text size="sm" c="dimmed" ta="center" py="md">
          Caixa fechado antes da implementação do detalhamento
        </Text>
      );
    }

    return (
      <Paper p="md" radius="md" bg="gray.0">
        <Stack gap="md">
          {/* Detalhamento por forma de pagamento */}
          <div>
            <Text fw={700} size="sm" mb="sm">📊 Vendas por Forma de Pagamento</Text>
            <Stack gap="xs">
              <Group justify="space-between">
                <Group gap="xs">
                  <FaMoneyBill color="green" size={14} />
                  <Text size="sm">Dinheiro</Text>
                </Group>
                <Text size="sm" fw={600}>{formatCurrency(caixa.total_dinheiro)}</Text>
              </Group>
              <Group justify="space-between">
                <Group gap="xs">
                  <FaCreditCard color="blue" size={14} />
                  <Text size="sm">Débito</Text>
                </Group>
                <Text size="sm" fw={600}>{formatCurrency(caixa.total_debito)}</Text>
              </Group>
              <Group justify="space-between">
                <Group gap="xs">
                  <FaCreditCard color="purple" size={14} />
                  <Text size="sm">Crédito</Text>
                </Group>
                <Text size="sm" fw={600}>{formatCurrency(caixa.total_credito)}</Text>
              </Group>
              <Group justify="space-between">
                <Group gap="xs">
                  <FaQrcode color="teal" size={14} />
                  <Text size="sm">PIX</Text>
                </Group>
                <Text size="sm" fw={600}>{formatCurrency(caixa.total_pix)}</Text>
              </Group>
              <Group justify="space-between">
                <Group gap="xs">
                  <FaFileInvoice color="orange" size={14} />
                  <Text size="sm">Fiado</Text>
                </Group>
                <Text size="sm" fw={600}>{formatCurrency(caixa.total_fiado)}</Text>
              </Group>
              <Divider my="xs" />
              <Group justify="space-between">
                <Text size="sm" fw={700}>TOTAL DE VENDAS</Text>
                <Badge color="blue">{formatCurrency(caixa.total_vendas)}</Badge>
              </Group>
            </Stack>
          </div>

          {/* Resumo do caixa físico */}
          <div>
            <Text fw={700} size="sm" mb="sm">💰 Caixa Físico</Text>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm">Valor Inicial</Text>
                <Text size="sm">{formatCurrency(caixa.valor_inicial)}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">Esperado (Sistema)</Text>
                <Text size="sm" fw={600} c="blue">{formatCurrency(caixa.valor_final_sistema)}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">Contado</Text>
                <Text size="sm" fw={600}>{formatCurrency(caixa.valor_final_informado)}</Text>
              </Group>
              <Divider my="xs" />
              <Group justify="space-between">
                <Text size="sm" fw={700}>Diferença</Text>
                <Badge color={parseFloat(caixa.diferenca) < 0 ? 'red' : parseFloat(caixa.diferenca) > 0 ? 'green' : 'gray'}>
                  {formatCurrency(caixa.diferenca)}
                </Badge>
              </Group>
            </Stack>
          </div>
        </Stack>
      </Paper>
    );
  };

  const rows = historico.map((caixa) => {
    const diferenca = parseFloat(caixa.diferenca);
    const corDiferenca = diferenca < 0 ? 'red' : diferenca > 0 ? 'green' : 'gray';
    const isExpanded = expandedRows.has(caixa.id);

    return (
      <>
        <Table.Tr key={caixa.id}>
          <Table.Td>
            <ActionIcon
              variant="subtle"
              onClick={() => toggleRow(caixa.id)}
              title="Ver detalhes"
            >
              {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
            </ActionIcon>
          </Table.Td>
          <Table.Td>{formatDateTime(caixa.data_abertura)}</Table.Td>
          <Table.Td>{formatDateTime(caixa.data_fechamento)}</Table.Td>
          <Table.Td>{formatCurrency(caixa.valor_inicial)}</Table.Td>
          <Table.Td>{formatCurrency(caixa.total_vendas || caixa.valor_final_sistema)}</Table.Td>
          <Table.Td>
            <Badge color={corDiferenca} variant="filled">
              {formatCurrency(caixa.diferenca)}
            </Badge>
          </Table.Td>
          <Table.Td>
            <ActionIcon
              color="red"
              variant="light"
              onClick={() => handleDeletarCaixa(caixa)}
              title="Excluir caixa"
            >
              <FaTrash size={16} />
            </ActionIcon>
          </Table.Td>
        </Table.Tr>
        {isExpanded && (
          <Table.Tr>
            <Table.Td colSpan={7} style={{ padding: 0 }}>
              <Collapse in={isExpanded}>
                <div style={{ padding: '1rem' }}>
                  {renderDetalhamento(caixa)}
                </div>
              </Collapse>
            </Table.Td>
          </Table.Tr>
        )}
      </>
    );
  });

  const cards = historico.map((caixa) => {
    const diferenca = parseFloat(caixa.diferenca);
    const corDiferenca = diferenca < 0 ? 'red' : diferenca > 0 ? 'green' : 'gray';

    return (
      <Card withBorder radius="md" p="sm" key={caixa.id} className="caixa-card">
        <Group justify="space-between" mb="sm">
          <Text fw={500}>Fechado em: {formatDateTime(caixa.data_fechamento)}</Text>
          <Group gap="xs">
            <Button
              size="xs"
              variant="light"
              onClick={() => {
                setSelectedCaixa(caixa);
                setDetailModalOpened(true);
              }}
            >
              Detalhes
            </Button>
            <ActionIcon
              color="red"
              variant="light"
              onClick={() => handleDeletarCaixa(caixa)}
              title="Excluir caixa"
            >
              <FaTrash size={16} />
            </ActionIcon>
          </Group>
        </Group>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Total de Vendas:</Text>
            <Text size="sm" fw={600}>{formatCurrency(caixa.total_vendas || caixa.valor_final_sistema)}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Diferença:</Text>
            <Badge color={corDiferenca} variant="filled">
              {formatCurrency(caixa.diferenca)}
            </Badge>
          </Group>
        </Stack>
      </Card>
    );
  });

  return (
    <>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Histórico de Caixas</Title>
        {historico.length > 0 && (
          <Button
            color="red"
            variant="light"
            leftSection={<FaTrash size={16} />}
            onClick={handleDeletarTodos}
          >
            Excluir Todos ({historico.length})
          </Button>
        )}
      </Group>

      <div className="table-desktop">
        <ScrollArea>
          <Table striped highlightOnHover withBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: '50px' }}></Table.Th>
                <Table.Th>Abertura</Table.Th>
                <Table.Th>Fechamento</Table.Th>
                <Table.Th>Valor Inicial</Table.Th>
                <Table.Th>Total Vendas</Table.Th>
                <Table.Th>Diferença</Table.Th>
                <Table.Th>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? rows : (
                <Table.Tr>
                  <Table.Td colSpan={7}><Text c="dimmed" ta="center">Nenhum caixa fechado ainda.</Text></Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </div>

      <div className="historico-cards">
        {cards.length > 0 ? cards : (
          <Text c="dimmed" ta="center">Nenhum caixa fechado ainda.</Text>
        )}
      </div>

      {/* Modal de Detalhes (Mobile) */}
      <Modal
        opened={detailModalOpened}
        onClose={() => setDetailModalOpened(false)}
        title="Detalhes do Caixa"
        size="lg"
      >
        {selectedCaixa && (
          <Stack gap="md">
            <div>
              <Text size="sm" c="dimmed">Fechado em</Text>
              <Text fw={600}>{formatDateTime(selectedCaixa.data_fechamento)}</Text>
            </div>
            {renderDetalhamento(selectedCaixa)}
          </Stack>
        )}
      </Modal>
    </>
  );
}

export default HistoricoCaixa;

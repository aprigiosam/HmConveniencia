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
  ActionIcon
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { FaTrash } from 'react-icons/fa';
import './HistoricoCaixa.css';

function HistoricoCaixa() {
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);

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
        // Segunda confirmação
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

  const rows = historico.map((caixa) => {
    const diferenca = parseFloat(caixa.diferenca);
    const corDiferenca = diferenca < 0 ? 'red' : 'green';
    return (
      <Table.Tr key={caixa.id}>
        <Table.Td>{formatDateTime(caixa.data_abertura)}</Table.Td>
        <Table.Td>{formatDateTime(caixa.data_fechamento)}</Table.Td>
        <Table.Td>{formatCurrency(caixa.valor_inicial)}</Table.Td>
        <Table.Td>{formatCurrency(caixa.valor_final_sistema)}</Table.Td>
        <Table.Td>{formatCurrency(caixa.valor_final_informado)}</Table.Td>
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
    );
  });

  const cards = historico.map((caixa) => {
    const diferenca = parseFloat(caixa.diferenca);
    const corDiferenca = diferenca < 0 ? 'red' : 'green';
    return (
      <Card withBorder radius="md" p="sm" key={caixa.id} className="caixa-card">
        <Group justify="space-between" mb="sm">
          <Text fw={500}>Fechado em: {formatDateTime(caixa.data_fechamento)}</Text>
          <ActionIcon
            color="red"
            variant="light"
            onClick={() => handleDeletarCaixa(caixa)}
            title="Excluir caixa"
          >
            <FaTrash size={16} />
          </ActionIcon>
        </Group>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Valor Sistema:</Text>
            <Text size="sm">{formatCurrency(caixa.valor_final_sistema)}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Valor Informado:</Text>
            <Text size="sm">{formatCurrency(caixa.valor_final_informado)}</Text>
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
                <Table.Th>Abertura</Table.Th>
                <Table.Th>Fechamento</Table.Th>
                <Table.Th>Valor Inicial</Table.Th>
                <Table.Th>Valor Sistema</Table.Th>
                <Table.Th>Valor Informado</Table.Th>
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
    </>
  );
}

export default HistoricoCaixa;

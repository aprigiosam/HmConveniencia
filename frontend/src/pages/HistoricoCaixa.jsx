import { useState, useEffect } from 'react';
import { getHistoricoCaixa } from '../services/api';
import { Table, Title, Text, Badge, Card, ScrollArea, Stack, Group } from '@mantine/core';
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
      </Table.Tr>
    );
  });

  const cards = historico.map((caixa) => {
    const diferenca = parseFloat(caixa.diferenca);
    const corDiferenca = diferenca < 0 ? 'red' : 'green';
    return (
      <Card withBorder radius="md" p="sm" key={caixa.id} className="caixa-card">
        <Text fw={500} mb="sm">Fechado em: {formatDateTime(caixa.data_fechamento)}</Text>
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
      <Title order={2} mb="lg">Histórico de Caixas</Title>

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
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? rows : (
                <Table.Tr>
                  <Table.Td colSpan={6}><Text c="dimmed" ta="center">Nenhum caixa fechado ainda.</Text></Table.Td>
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

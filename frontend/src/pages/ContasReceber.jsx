import { useState, useEffect } from 'react';
import { getContasReceber, receberPagamento } from '../services/api';
import { Table, Button, Group, Title, Text, Card, Badge, ScrollArea, Stack } from '@mantine/core';
import { FaCheck } from 'react-icons/fa';
import './ContasReceber.css';

function ContasReceber() {
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContas();
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

  const handleReceber = async (vendaId) => {
    if (!confirm('Confirmar recebimento desta conta?')) return;
    try {
      await receberPagamento(vendaId);
      loadContas();
      alert('Pagamento recebido com sucesso!');
    } catch (error) {
      console.error('Erro ao receber pagamento:', error);
      alert('Erro ao processar recebimento.');
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

  return (
    <>
      <Group position="apart" mb="lg">
        <Title order={2}>Contas a Receber</Title>
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
    </>
  );
}

export default ContasReceber;

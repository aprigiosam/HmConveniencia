import { useState, useEffect } from 'react';
import { getContasReceber, receberPagamento } from '../services/api';
import { Table, Button, Group, Title, Text, Card, Badge } from '@mantine/core';
import { FaCheck } from 'react-icons/fa';

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
      <tr key={venda.id} style={{ backgroundColor: vencida ? 'var(--mantine-color-red-0)' : 'transparent' }}>
        <td>{venda.cliente_nome}</td>
        <td>{new Date(venda.data_vencimento).toLocaleDateString('pt-BR')}</td>
        <td>R$ {parseFloat(venda.total).toFixed(2)}</td>
        <td>
          <Badge color={vencida ? 'red' : 'yellow'} variant="light">
            {vencida ? 'Vencida' : 'Pendente'}
          </Badge>
        </td>
        <td>
          <Button size="xs" leftIcon={<FaCheck />} onClick={() => handleReceber(venda.id)}>
            Receber
          </Button>
        </td>
      </tr>
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

      <Table striped highlightOnHover withBorder withColumnBorders>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Vencimento</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? rows : (
            <tr>
              <td colSpan={5}><Text color="dimmed" align="center">Nenhuma conta pendente.</Text></td>
            </tr>
          )}
        </tbody>
      </Table>
    </>
  );
}

export default ContasReceber;
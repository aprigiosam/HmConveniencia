import { useState, useEffect } from 'react';
import { getDashboard } from '../services/api';
import { Card, Text, Grid, Title, Group, Center, Loader } from '@mantine/core';
import { FaDollarSign, FaExclamationTriangle, FaCashRegister, FaReceipt, FaChartLine, FaCalendarTimes, FaClock } from 'react-icons/fa';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // Atualiza a cada 2 minutos ao invés de 30 segundos
    const interval = setInterval(loadData, 120000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const statsRes = await getDashboard();
      setStats(statsRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Center style={{ height: '100%' }}><Loader /></Center>;
  }

  return (
    <div>
      <Title order={2} mb="md">Dashboard</Title>
      <Grid gutter="sm">
        <Grid.Col span={12} sm={6} lg={3}>
          <Card withBorder p="sm" radius="md">
            <Group justify="space-between" mb="xs">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Vendas Hoje</Text>
              <FaDollarSign size={18} color='#1971c2' />
            </Group>
            <Text size="lg" fw={700}>R$ {stats?.vendas_hoje?.total?.toFixed(2) || '0.00'}</Text>
            <Text size="xs" c="dimmed">{stats?.vendas_hoje?.quantidade || 0} vendas</Text>
          </Card>
        </Grid.Col>

        {/* Card de Lucro Hoje */}
        <Grid.Col span={12} sm={6} lg={3}>
          <Card withBorder p="sm" radius="md">
            <Group justify="space-between" mb="xs">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Lucro Hoje</Text>
              <FaChartLine size={18} color='green' />
            </Group>
            <Text size="lg" fw={700}>R$ {stats?.lucro_hoje?.toFixed(2) || '0.00'}</Text>
            <Text size="xs" c="dimmed">Margem Bruta</Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={12} sm={6} lg={3}>
          <Card withBorder p="sm" radius="md" bg={stats?.contas_receber?.vencidas?.quantidade > 0 ? 'red.1' : 'transparent'}>
            <Group justify="space-between" mb="xs">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Contas a Receber</Text>
              <FaReceipt size={18} color={stats?.contas_receber?.vencidas?.quantidade > 0 ? 'red' : '#40c057'} />
            </Group>
            <Text size="lg" fw={700}>R$ {stats?.contas_receber?.total?.toFixed(2) || '0.00'}</Text>
            {stats?.contas_receber?.vencidas?.quantidade > 0 &&
              <Text size="xs" c="red" fw={700}>{stats.contas_receber.vencidas.quantidade} vencidas!</Text>}
          </Card>
        </Grid.Col>
        <Grid.Col span={12} sm={6} lg={3}>
          <Card withBorder p="sm" radius="md">
            <Group justify="space-between" mb="xs">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Caixa Atual</Text>
              <FaCashRegister size={18} />
            </Group>
            <Text size="lg" fw={700}>R$ {stats?.caixa?.valor_atual?.toFixed(2) || 'Fechado'}</Text>
            {stats?.caixa && <Text size="xs" c="dimmed">Inicial: R$ {stats.caixa.valor_inicial?.toFixed(2)}</Text>}
          </Card>
        </Grid.Col>
        <Grid.Col span={12} sm={6} lg={3}>
          <Card withBorder p="sm" radius="md">
            <Group justify="space-between" mb="xs">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Estoque Baixo</Text>
              <FaExclamationTriangle size={18} color='orange' />
            </Group>
            <Text size="lg" fw={700}>{stats?.estoque_baixo || 0}</Text>
            <Text size="xs" c="dimmed">produtos</Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={12} sm={6} lg={3}>
          <Card withBorder p="sm" radius="md" bg={stats?.produtos_vencidos > 0 ? 'red.1' : 'transparent'}>
            <Group justify="space-between" mb="xs">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Produtos Vencidos</Text>
              <FaCalendarTimes size={18} color='red' />
            </Group>
            <Text size="lg" fw={700} c={stats?.produtos_vencidos > 0 ? 'red' : 'inherit'}>
              {stats?.produtos_vencidos || 0}
            </Text>
            <Text size="xs" c="dimmed">produtos</Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={12} sm={6} lg={3}>
          <Card withBorder p="sm" radius="md" bg={stats?.produtos_vencendo > 0 ? 'yellow.1' : 'transparent'}>
            <Group justify="space-between" mb="xs">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Próximos ao Vencimento</Text>
              <FaClock size={18} color='orange' />
            </Group>
            <Text size="lg" fw={700} c={stats?.produtos_vencendo > 0 ? 'orange' : 'inherit'}>
              {stats?.produtos_vencendo || 0}
            </Text>
            <Text size="xs" c="dimmed">≤ 7 dias</Text>
          </Card>
        </Grid.Col>
      </Grid>
    </div>
  );
}

export default Dashboard;

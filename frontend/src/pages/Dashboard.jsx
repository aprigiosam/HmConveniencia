import { useState, useEffect } from 'react';
import { getDashboard, triggerBackup } from '../services/api';
import { Card, Text, Grid, Title, Group, Button, RingProgress, Center, Loader } from '@mantine/core';
import { FaDollarSign, FaExclamationTriangle, FaArchive, FaCashRegister, FaReceipt, FaChartLine } from 'react-icons/fa';

const StatCard = ({ icon, title, value, color, children }) => (
  <Paper withBorder p="md" radius="md">
    <Group position="apart">
      <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
        {title}
      </Text>
      <ThemeIcon color={color} variant="light" size={38} radius="md">
        {icon}
      </ThemeIcon>
    </Group>
    <Group align="flex-end" spacing="xs" mt={25}>
      <Text size="xl" weight={700}>{value}</Text>
      {children}
    </Group>
  </Paper>
);

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
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

  const handleBackup = async () => {
    if (!confirm('Deseja iniciar um backup do banco de dados?')) return;
    setBackupLoading(true);
    try {
      await triggerBackup();
      alert('Backup iniciado com sucesso!');
    } catch (error) {
      console.error('Erro ao iniciar backup:', error);
      alert('Erro ao iniciar backup.');
    } finally {
      setBackupLoading(false);
    }
  };

  if (loading) {
    return <Center style={{ height: '100%' }}><Loader /></Center>;
  }

  return (
    <div>
      <Title order={2} mb="lg">Dashboard</Title>
      <Grid>
        <Grid.Col md={6} lg={3}>
          <Card withBorder p="md" radius="md">
            <Group position="apart">
              <Text size="xs" color="dimmed" transform="uppercase" weight={700}>Vendas Hoje</Text>
              <FaDollarSign size={22} color='#1971c2' />
            </Group>
            <Text size="xl" weight={700} mt="md">R$ {stats?.vendas_hoje?.total?.toFixed(2) || '0.00'}</Text>
            <Text size="sm" color="dimmed">{stats?.vendas_hoje?.quantidade || 0} vendas</Text>
          </Card>
        </Grid.Col>
        <Grid.Col md={6} lg={3}>
          <Card withBorder p="md" radius="md" bg={stats?.contas_receber?.vencidas?.quantidade > 0 ? 'red.1' : 'transparent'}>
            <Group position="apart">
              <Text size="xs" color="dimmed" transform="uppercase" weight={700}>Contas a Receber</Text>
              <FaReceipt size={22} color={stats?.contas_receber?.vencidas?.quantidade > 0 ? 'red' : '#40c057'} />
            </Group>
            <Text size="xl" weight={700} mt="md">R$ {stats?.contas_receber?.total?.toFixed(2) || '0.00'}</Text>
            {stats?.contas_receber?.vencidas?.quantidade > 0 && 
              <Text size="sm" color="red" weight={700}>{stats.contas_receber.vencidas.quantidade} vencidas!</Text>}
          </Card>
        </Grid.Col>
        <Grid.Col md={6} lg={3}>
          <Card withBorder p="md" radius="md">
            <Group position="apart">
              <Text size="xs" color="dimmed" transform="uppercase" weight={700}>Caixa Atual</Text>
              <FaCashRegister size={22} />
            </Group>
            <Text size="xl" weight={700} mt="md">R$ {stats?.caixa?.valor_atual?.toFixed(2) || 'Fechado'}</Text>
            {stats?.caixa && <Text size="sm" color="dimmed">Inicial: R$ {stats.caixa.valor_inicial?.toFixed(2)}</Text>}
          </Card>
        </Grid.Col>
        <Grid.Col md={6} lg={3}>
          <Card withBorder p="md" radius="md">
            <Group position="apart">
              <Text size="xs" color="dimmed" transform="uppercase" weight={700}>Estoque Baixo</Text>
              <FaExclamationTriangle size={22} color='orange' />
            </Group>
            <Text size="xl" weight={700} mt="md">{stats?.estoque_baixo || 0}</Text>
            <Text size="sm" color="dimmed">produtos</Text>
          </Card>
        </Grid.Col>
      </Grid>

      <Card withBorder p="md" radius="md" mt="lg">
        <Title order={4}>Manutenção</Title>
        <Text size="sm" color="dimmed" mt="xs" mb="md">Realize o backup do banco de dados para segurança.</Text>
        <Button onClick={handleBackup} loading={backupLoading} variant="light">
          Fazer Backup Agora
        </Button>
      </Card>
    </div>
  );
}

export default Dashboard;
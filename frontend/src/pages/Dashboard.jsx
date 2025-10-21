import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../services/api';
import { Card, Text, Grid, Title, Group, Center, Loader, Badge, Stack, Paper, Progress, Divider } from '@mantine/core';
import {
  FaDollarSign,
  FaExclamationTriangle,
  FaCashRegister,
  FaReceipt,
  FaChartLine,
  FaCalendarTimes,
  FaClock,
  FaBell,
} from 'react-icons/fa';

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // Atualiza a cada 2 minutos
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

  const formatCurrency = (value) => {
    return `R$ ${(value || 0).toFixed(2)}`;
  };

  const getAlertLevel = (vencidos, vencendo) => {
    if (vencidos > 0) return 'critical';
    if (vencendo > 0) return 'warning';
    return 'ok';
  };

  const renderCardPrincipal = (title, value, subtitle, Icon, color = '#1971c2') => (
    <Card withBorder p="sm" radius="md">
      <Group justify="space-between" mb="xs">
        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{title}</Text>
        <Icon size={18} color={color} />
      </Group>
      <Text size="lg" fw={700}>{value}</Text>
      {subtitle && <Text size="xs" c="dimmed">{subtitle}</Text>}
    </Card>
  );

  if (loading) {
    return <Center style={{ height: '100%' }}><Loader /></Center>;
  }

  const alertLevel = getAlertLevel(stats?.produtos_vencidos, stats?.produtos_vencendo);
  const totalAlertas = (stats?.produtos_vencidos || 0) + (stats?.produtos_vencendo || 0);

  return (
    <div>
      <Group justify="apart" mb="md">
        <Title order={2}>Dashboard</Title>
        {totalAlertas > 0 && (
          <Badge
            size="lg"
            color={alertLevel === 'critical' ? 'red' : 'orange'}
            leftSection={<FaBell size={14} />}
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/alertas')}
          >
            {totalAlertas} {totalAlertas === 1 ? 'alerta' : 'alertas'}
          </Badge>
        )}
      </Group>

      <Stack gap="md">
        {/* Cards Principais */}
        <Grid gutter="sm">
          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
            {renderCardPrincipal(
              'Vendas Hoje',
              formatCurrency(stats?.vendas_hoje?.total),
              `${stats?.vendas_hoje?.quantidade || 0} vendas`,
              FaDollarSign,
              '#1971c2'
            )}
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
            {renderCardPrincipal(
              'Lucro Hoje',
              formatCurrency(stats?.lucro_hoje),
              'Margem Bruta',
              FaChartLine,
              'green'
            )}
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
            <Card
              withBorder
              p="sm"
              radius="md"
              bg={stats?.contas_receber?.vencidas?.quantidade > 0 ? 'red.1' : 'transparent'}
            >
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Contas a Receber</Text>
                <FaReceipt
                  size={18}
                  color={stats?.contas_receber?.vencidas?.quantidade > 0 ? 'red' : '#40c057'}
                />
              </Group>
              <Text size="lg" fw={700}>
                {formatCurrency(stats?.contas_receber?.total)}
              </Text>
              {stats?.contas_receber?.vencidas?.quantidade > 0 && (
                <Text size="xs" c="red" fw={700}>
                  {stats.contas_receber.vencidas.quantidade} vencidas!
                </Text>
              )}
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
            {renderCardPrincipal(
              'Caixa Atual',
              stats?.caixa?.valor_atual ? formatCurrency(stats.caixa.valor_atual) : 'Fechado',
              stats?.caixa ? `Inicial: ${formatCurrency(stats.caixa.valor_inicial)}` : null,
              FaCashRegister
            )}
          </Grid.Col>
        </Grid>

        {/* Card de Alertas Detalhado */}
        {(stats?.produtos_vencidos > 0 || stats?.produtos_vencendo > 0 || stats?.estoque_baixo > 0) && (
          <Paper
            withBorder
            p="md"
            radius="md"
            bg={alertLevel === 'critical' ? 'red.0' : alertLevel === 'warning' ? 'yellow.0' : 'transparent'}
          >
            <Group justify="apart" mb="sm">
              <Text fw={700} size="lg">
                {alertLevel === 'critical' ? '🚨 Atenção Urgente!' : '⚠️ Alertas do Sistema'}
              </Text>
              <Badge
                size="lg"
                color={alertLevel === 'critical' ? 'red' : 'orange'}
                variant="filled"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/alertas')}
              >
                Ver Todos →
              </Badge>
            </Group>

            <Divider mb="sm" />

            <Grid gutter="sm">
              {stats?.produtos_vencidos > 0 && (
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Paper p="sm" withBorder bg="white" radius="md">
                    <Group justify="apart" mb="xs">
                      <Group gap="xs">
                        <FaCalendarTimes size={20} color="red" />
                        <Text fw={600} size="sm" c="red">Produtos Vencidos</Text>
                      </Group>
                      <Badge size="lg" color="red" variant="filled">
                        {stats.produtos_vencidos}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed">
                      Lotes vencidos devem ser removidos imediatamente
                    </Text>
                  </Paper>
                </Grid.Col>
              )}

              {stats?.produtos_vencendo > 0 && (
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Paper p="sm" withBorder bg="white" radius="md">
                    <Group justify="apart" mb="xs">
                      <Group gap="xs">
                        <FaClock size={20} color="orange" />
                        <Text fw={600} size="sm" c="orange">Próximos ao Vencimento</Text>
                      </Group>
                      <Badge size="lg" color="orange" variant="filled">
                        {stats.produtos_vencendo}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed">
                      Lotes vencem em até 7 dias
                    </Text>
                  </Paper>
                </Grid.Col>
              )}

              {stats?.estoque_baixo > 0 && (
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Paper p="sm" withBorder bg="white" radius="md">
                    <Group justify="apart" mb="xs">
                      <Group gap="xs">
                        <FaExclamationTriangle size={20} color="orange" />
                        <Text fw={600} size="sm" c="orange">Estoque Baixo</Text>
                      </Group>
                      <Badge size="lg" color="orange" variant="filled">
                        {stats.estoque_baixo}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed">
                      Produtos abaixo do estoque mínimo
                    </Text>
                  </Paper>
                </Grid.Col>
              )}
            </Grid>

            {stats?.produtos_vencidos > 0 && (
              <Paper p="xs" mt="sm" bg="red.1" radius="sm">
                <Text size="xs" fw={700} c="red" ta="center">
                  ⚠️ AÇÃO NECESSÁRIA: Verifique os alertas e remova produtos vencidos imediatamente
                </Text>
              </Paper>
            )}
          </Paper>
        )}

        {/* Cards de Estoque */}
        {!(stats?.produtos_vencidos > 0 || stats?.produtos_vencendo > 0 || stats?.estoque_baixo > 0) && (
          <Grid gutter="sm">
            <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
              <Card withBorder p="sm" radius="md">
                <Group justify="space-between" mb="xs">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Estoque Baixo</Text>
                  <FaExclamationTriangle size={18} color="orange" />
                </Group>
                <Text size="lg" fw={700}>{stats?.estoque_baixo || 0}</Text>
                <Text size="xs" c="dimmed">produtos</Text>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
              <Card withBorder p="sm" radius="md" bg="green.0">
                <Group justify="space-between" mb="xs">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Produtos Vencidos</Text>
                  <FaCalendarTimes size={18} color="green" />
                </Group>
                <Text size="lg" fw={700} c="green">0</Text>
                <Text size="xs" c="dimmed">Tudo OK!</Text>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
              <Card withBorder p="sm" radius="md" bg="green.0">
                <Group justify="space-between" mb="xs">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Próximos ao Vencimento</Text>
                  <FaClock size={18} color="green" />
                </Group>
                <Text size="lg" fw={700} c="green">0</Text>
                <Text size="xs" c="dimmed">Nada vencendo</Text>
              </Card>
            </Grid.Col>
          </Grid>
        )}
      </Stack>
    </div>
  );
}

export default Dashboard;

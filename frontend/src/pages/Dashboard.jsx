import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../services/api';
import { Card, Text, Grid, Title, Group, Center, Loader, Badge, Stack, Paper, Divider, Box } from '@mantine/core';
import {
  FaDollarSign,
  FaExclamationTriangle,
  FaCashRegister,
  FaReceipt,
  FaChartLine,
  FaCalendarTimes,
  FaClock,
  FaBell,
  FaBoxes,
} from 'react-icons/fa';
import { useMediaQuery } from '@mantine/hooks';

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useMediaQuery('(max-width: 768px)');

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

  const renderCardPrincipal = (title, value, subtitle, Icon, gradientFrom, gradientTo, onClick) => (
    <Card
      className="glass-stat-card"
      p={isMobile ? "md" : "lg"}
      radius="xl"
      style={{
        background: `linear-gradient(135deg, ${gradientFrom}15 0%, ${gradientTo}15 100%)`,
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
      onClick={onClick}
    >
      <Box
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '150px',
          height: '150px',
          background: `radial-gradient(circle, ${gradientFrom}30 0%, transparent 70%)`,
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />
      <Stack spacing="xs" style={{ position: 'relative', zIndex: 1 }}>
        <Group justify="space-between">
          <Text size="xs" tt="uppercase" fw={700} style={{
            color: gradientFrom,
            letterSpacing: '1px',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          }}>
            {title}
          </Text>
          <Box
            style={{
              background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
              padding: '10px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 20px ${gradientFrom}40`,
            }}
          >
            <Icon size={20} color="white" />
          </Box>
        </Group>
        <Text size={isMobile ? "xl" : "2rem"} fw={900} style={{
          background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-1px',
        }}>
          {value}
        </Text>
        {subtitle && (
          <Text size="xs" c="dimmed" fw={600}>
            {subtitle}
          </Text>
        )}
      </Stack>
    </Card>
  );

  if (loading) {
    return (
      <Center style={{ height: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
        <Stack align="center" spacing="md">
          <Loader size="xl" variant="bars" />
          <Text size="lg" fw={600} c="dimmed">Carregando dados...</Text>
        </Stack>
      </Center>
    );
  }

  const alertLevel = getAlertLevel(stats?.produtos_vencidos, stats?.produtos_vencendo);
  const totalAlertas = (stats?.produtos_vencidos || 0) + (stats?.produtos_vencendo || 0);

  return (
    <Box style={{
      minHeight: '100%',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: isMobile ? '1rem' : '1.5rem',
    }}>
      <style>
        {`
          @keyframes slideInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }

          .glass-stat-card:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15) !important;
          }

          .alert-card {
            animation: slideInUp 0.5s ease-out;
          }

          .critical-alert {
            animation: pulse 2s ease-in-out infinite;
          }

          .stat-card-enter {
            animation: slideInUp 0.6s ease-out;
          }
        `}
      </style>

      <Group justify="apart" mb={isMobile ? "md" : "xl"}>
        <Box>
          <Title
            order={isMobile ? 3 : 1}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 900,
              letterSpacing: '-1px',
            }}
          >
            Dashboard
          </Title>
          <Text size="sm" c="dimmed" fw={500} mt={4}>
            Visão geral do seu negócio
          </Text>
        </Box>
        {totalAlertas > 0 && (
          <Badge
            size="lg"
            variant="gradient"
            gradient={{ from: alertLevel === 'critical' ? 'red' : 'orange', to: alertLevel === 'critical' ? 'pink' : 'yellow', deg: 135 }}
            leftSection={<FaBell size={14} />}
            className={alertLevel === 'critical' ? 'critical-alert' : ''}
            style={{
              cursor: 'pointer',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 700,
              boxShadow: '0 4px 20px rgba(255, 107, 53, 0.3)',
            }}
            onClick={() => navigate('/alertas')}
          >
            {totalAlertas} {totalAlertas === 1 ? 'alerta' : 'alertas'}
          </Badge>
        )}
      </Group>

      <Stack gap={isMobile ? "md" : "lg"}>
        {/* Cards Principais */}
        <Grid gutter={isMobile ? "md" : "lg"} className="stat-card-enter">
          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
            {renderCardPrincipal(
              'Vendas Hoje',
              formatCurrency(stats?.vendas_hoje?.total),
              `${stats?.vendas_hoje?.quantidade || 0} ${stats?.vendas_hoje?.quantidade === 1 ? 'venda' : 'vendas'}`,
              FaDollarSign,
              '#667eea',
              '#764ba2',
              () => navigate('/vendas')
            )}
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
            {renderCardPrincipal(
              'Lucro Hoje',
              formatCurrency(stats?.lucro_hoje),
              'Margem Bruta',
              FaChartLine,
              '#11998e',
              '#38ef7d',
              () => navigate('/vendas')
            )}
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
            {renderCardPrincipal(
              'Contas a Receber',
              formatCurrency(stats?.contas_receber?.total),
              stats?.contas_receber?.vencidas?.quantidade > 0
                ? `⚠️ ${stats.contas_receber.vencidas.quantidade} vencida${stats.contas_receber.vencidas.quantidade > 1 ? 's' : ''}!`
                : 'Tudo em dia',
              FaReceipt,
              stats?.contas_receber?.vencidas?.quantidade > 0 ? '#fa709a' : '#FF6B35',
              stats?.contas_receber?.vencidas?.quantidade > 0 ? '#fee140' : '#FF8E53',
              () => navigate('/contas-receber')
            )}
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
            {renderCardPrincipal(
              'Caixa Atual',
              stats?.caixa?.valor_atual ? formatCurrency(stats.caixa.valor_atual) : 'Fechado',
              stats?.caixa?.vendas_dinheiro
                ? `Vendas dinheiro: ${formatCurrency(stats.caixa.vendas_dinheiro)}`
                : stats?.caixa
                  ? `Inicial: ${formatCurrency(stats.caixa.valor_inicial)}`
                  : 'Sem movimentação',
              FaCashRegister,
              '#4facfe',
              '#00f2fe',
              () => navigate('/caixa')
            )}
          </Grid.Col>
        </Grid>

        {/* Card de Alertas Detalhado */}
        {(stats?.produtos_vencidos > 0 || stats?.produtos_vencendo > 0 || stats?.estoque_baixo > 0) && (
          <Paper
            className="alert-card"
            p={isMobile ? "md" : "xl"}
            radius="xl"
            style={{
              background: alertLevel === 'critical'
                ? 'linear-gradient(135deg, rgba(255, 107, 107, 0.15) 0%, rgba(255, 142, 83, 0.15) 100%)'
                : 'linear-gradient(135deg, rgba(255, 193, 7, 0.15) 0%, rgba(255, 235, 59, 0.15) 100%)',
              backdropFilter: 'blur(10px)',
              border: alertLevel === 'critical' ? '2px solid rgba(255, 107, 107, 0.3)' : '2px solid rgba(255, 193, 7, 0.3)',
              boxShadow: alertLevel === 'critical' ? '0 8px 32px rgba(255, 107, 107, 0.2)' : '0 8px 32px rgba(255, 193, 7, 0.2)',
            }}
          >
            <Group justify="apart" mb="lg">
              <Stack spacing={4}>
                <Title
                  order={isMobile ? 4 : 3}
                  style={{
                    color: alertLevel === 'critical' ? '#d32f2f' : '#f57c00',
                    fontWeight: 800,
                  }}
                >
                  {alertLevel === 'critical' ? '🚨 Atenção Urgente!' : '⚠️ Alertas do Sistema'}
                </Title>
                <Text size="sm" c="dimmed" fw={500}>
                  {alertLevel === 'critical' ? 'Ação imediata necessária' : 'Requer sua atenção'}
                </Text>
              </Stack>
              <Badge
                size="lg"
                variant="gradient"
                gradient={{
                  from: alertLevel === 'critical' ? 'red' : 'orange',
                  to: alertLevel === 'critical' ? 'pink' : 'yellow',
                  deg: 135
                }}
                style={{
                  cursor: 'pointer',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 700,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                }}
                onClick={() => navigate('/alertas')}
              >
                Ver Todos →
              </Badge>
            </Group>

            <Divider mb="lg" opacity={0.3} />

            <Grid gutter={isMobile ? "sm" : "md"}>
              {stats?.produtos_vencidos > 0 && (
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Paper
                    p="md"
                    radius="lg"
                    style={{
                      background: 'rgba(255, 255, 255, 0.9)',
                      border: '2px solid rgba(255, 82, 82, 0.3)',
                      boxShadow: '0 4px 20px rgba(255, 82, 82, 0.15)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate('/alertas')}
                  >
                    <Stack spacing="xs">
                      <Group justify="apart">
                        <Box
                          style={{
                            background: 'linear-gradient(135deg, #ff5252 0%, #f48fb1 100%)',
                            padding: '8px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <FaCalendarTimes size={18} color="white" />
                        </Box>
                        <Badge size="lg" variant="filled" color="red" style={{ fontSize: '16px', padding: '12px 16px' }}>
                          {stats.produtos_vencidos}
                        </Badge>
                      </Group>
                      <Text fw={700} size="sm" c="red">Produtos Vencidos</Text>
                      <Text size="xs" c="dimmed" lineClamp={2}>
                        Lotes vencidos devem ser removidos imediatamente
                      </Text>
                    </Stack>
                  </Paper>
                </Grid.Col>
              )}

              {stats?.produtos_vencendo > 0 && (
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Paper
                    p="md"
                    radius="lg"
                    style={{
                      background: 'rgba(255, 255, 255, 0.9)',
                      border: '2px solid rgba(255, 152, 0, 0.3)',
                      boxShadow: '0 4px 20px rgba(255, 152, 0, 0.15)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate('/alertas')}
                  >
                    <Stack spacing="xs">
                      <Group justify="apart">
                        <Box
                          style={{
                            background: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
                            padding: '8px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <FaClock size={18} color="white" />
                        </Box>
                        <Badge size="lg" variant="filled" color="orange" style={{ fontSize: '16px', padding: '12px 16px' }}>
                          {stats.produtos_vencendo}
                        </Badge>
                      </Group>
                      <Text fw={700} size="sm" c="orange">Próximos ao Vencimento</Text>
                      <Text size="xs" c="dimmed" lineClamp={2}>
                        Lotes vencem em até 7 dias
                      </Text>
                    </Stack>
                  </Paper>
                </Grid.Col>
              )}

              {stats?.estoque_baixo > 0 && (
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Paper
                    p="md"
                    radius="lg"
                    style={{
                      background: 'rgba(255, 255, 255, 0.9)',
                      border: '2px solid rgba(255, 193, 7, 0.3)',
                      boxShadow: '0 4px 20px rgba(255, 193, 7, 0.15)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate('/alertas')}
                  >
                    <Stack spacing="xs">
                      <Group justify="apart">
                        <Box
                          style={{
                            background: 'linear-gradient(135deg, #ffc107 0%, #ffeb3b 100%)',
                            padding: '8px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <FaBoxes size={18} color="white" />
                        </Box>
                        <Badge size="lg" variant="filled" color="yellow" style={{ fontSize: '16px', padding: '12px 16px' }}>
                          {stats.estoque_baixo}
                        </Badge>
                      </Group>
                      <Text fw={700} size="sm" style={{ color: '#f57c00' }}>Estoque Baixo</Text>
                      <Text size="xs" c="dimmed" lineClamp={2}>
                        Produtos abaixo do estoque mínimo
                      </Text>
                    </Stack>
                  </Paper>
                </Grid.Col>
              )}
            </Grid>

            {stats?.produtos_vencidos > 0 && (
              <Paper
                p="md"
                mt="md"
                radius="md"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 82, 82, 0.2) 0%, rgba(244, 143, 177, 0.2) 100%)',
                  border: '2px solid rgba(255, 82, 82, 0.4)',
                }}
              >
                <Text size="sm" fw={700} c="red" ta="center">
                  ⚠️ AÇÃO NECESSÁRIA: Verifique os alertas e remova produtos vencidos imediatamente
                </Text>
              </Paper>
            )}
          </Paper>
        )}

        {/* Card de Status OK - Quando não há alertas */}
        {!(stats?.produtos_vencidos > 0 || stats?.produtos_vencendo > 0 || stats?.estoque_baixo > 0) && (
          <Paper
            p={isMobile ? "md" : "xl"}
            radius="xl"
            style={{
              background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(129, 199, 132, 0.1) 100%)',
              border: '2px solid rgba(76, 175, 80, 0.3)',
              boxShadow: '0 8px 32px rgba(76, 175, 80, 0.1)',
              textAlign: 'center',
            }}
          >
            <Stack align="center" spacing="md">
              <Box
                style={{
                  background: 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)',
                  padding: '20px',
                  borderRadius: '50%',
                  display: 'inline-flex',
                  boxShadow: '0 8px 24px rgba(76, 175, 80, 0.3)',
                }}
              >
                <Text size="3rem">✓</Text>
              </Box>
              <div>
                <Title
                  order={isMobile ? 4 : 3}
                  style={{
                    background: 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: 800,
                  }}
                >
                  Tudo em Ordem!
                </Title>
                <Text size="sm" c="dimmed" fw={500} mt="xs">
                  Nenhum alerta crítico detectado no momento
                </Text>
              </div>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Box>
  );
}

export default Dashboard;

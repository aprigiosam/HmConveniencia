import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Card,
  Group,
  Badge,
  Text,
  Stack,
  Button,
  Tabs,
  LoadingOverlay,
  Alert,
  ActionIcon,
  Tooltip,
  SimpleGrid,
  Paper,
  ThemeIcon,
} from '@mantine/core';
import {
  FaBell,
  FaBellSlash,
  FaCheck,
  FaSync,
  FaExclamationCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaShoppingCart,
  FaCalendar,
  FaBoxOpen,
  FaCreditCard,
  FaMoneyBill,
} from 'react-icons/fa';
import { notifications } from '@mantine/notifications';
import {
  getAlertasResumo,
  getAlertasPorPrioridade,
  verificarAlertas,
  marcarAlertaLido,
  resolverAlerta,
  marcarTodosLidos,
} from '../services/api';
import './Alertas.css';

const Alertas = () => {
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState(null);
  const [alertasPorPrioridade, setAlertasPorPrioridade] = useState({});
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    carregarAlertas();
  }, []);

  const carregarAlertas = async () => {
    try {
      setLoading(true);
      const [resumoRes, alertasRes] = await Promise.all([
        getAlertasResumo(),
        getAlertasPorPrioridade(),
      ]);
      setResumo(resumoRes.data);
      setAlertasPorPrioridade(alertasRes.data);
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível carregar os alertas',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerificar = async () => {
    try {
      setVerificando(true);
      const response = await verificarAlertas();
      notifications.show({
        title: 'Verificação Concluída',
        message: `${response.data.total_criados} novo(s) alerta(s) detectado(s)`,
        color: 'blue',
      });
      await carregarAlertas();
    } catch (error) {
      console.error('Erro ao verificar alertas:', error);
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível verificar alertas',
        color: 'red',
      });
    } finally {
      setVerificando(false);
    }
  };

  const handleMarcarLido = async (id) => {
    try {
      await marcarAlertaLido(id);
      await carregarAlertas();
      notifications.show({
        message: 'Alerta marcado como lido',
        color: 'green',
      });
    } catch (error) {
      console.error('Erro ao marcar como lido:', error);
    }
  };

  const handleResolver = async (id) => {
    try {
      await resolverAlerta(id);
      await carregarAlertas();
      notifications.show({
        message: 'Alerta resolvido',
        color: 'green',
      });
    } catch (error) {
      console.error('Erro ao resolver alerta:', error);
    }
  };

  const handleMarcarTodosLidos = async () => {
    try {
      const response = await marcarTodosLidos();
      await carregarAlertas();
      notifications.show({
        message: response.data.message,
        color: 'green',
      });
    } catch (error) {
      console.error('Erro ao marcar todos como lidos:', error);
    }
  };

  const getPrioridadeColor = (prioridade) => {
    const cores = {
      CRITICA: 'red',
      ALTA: 'orange',
      MEDIA: 'yellow',
      BAIXA: 'blue',
    };
    return cores[prioridade] || 'gray';
  };

  const getTipoIcon = (tipo) => {
    const icons = {
      LIMITE_CREDITO: FaCreditCard,
      PRODUTO_VENCENDO: FaCalendar,
      PRODUTO_VENCIDO: FaExclamationCircle,
      ESTOQUE_BAIXO: FaBoxOpen,
      ESTOQUE_ZERADO: FaBoxOpen,
      CONTA_VENCIDA: FaMoneyBill,
      DIFERENCA_CAIXA: FaMoneyBill,
    };
    return icons[tipo] || FaBell;
  };

  const renderAlerta = (alerta) => {
    const IconComponent = getTipoIcon(alerta.tipo);

    return (
      <Card key={alerta.id} shadow="sm" padding="md" radius="md" withBorder className={`alerta-card ${!alerta.lido ? 'nao-lido' : ''}`}>
        <Group justify="apart" mb="xs">
          <Group>
            <ThemeIcon color={getPrioridadeColor(alerta.prioridade)} size="lg" radius="md">
              <IconComponent size={20} />
            </ThemeIcon>
            <div>
              <Text fw={alerta.lido ? 400 : 700} size="sm">
                {alerta.titulo}
              </Text>
              <Text size="xs" c="dimmed">
                {new Date(alerta.created_at).toLocaleString('pt-BR')}
              </Text>
            </div>
          </Group>
          <Group>
            <Badge color={getPrioridadeColor(alerta.prioridade)} variant="light">
              {alerta.prioridade_display}
            </Badge>
          </Group>
        </Group>

        <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-line' }} mb="md">
          {alerta.mensagem}
        </Text>

        <Group justify="apart">
          <Group gap="xs">
            {alerta.cliente_nome && (
              <Badge size="sm" variant="outline">Cliente: {alerta.cliente_nome}</Badge>
            )}
            {alerta.produto_nome && (
              <Badge size="sm" variant="outline">Produto: {alerta.produto_nome}</Badge>
            )}
            {alerta.venda_numero && (
              <Badge size="sm" variant="outline">Venda: {alerta.venda_numero}</Badge>
            )}
          </Group>

          <Group gap="xs">
            {!alerta.lido && (
              <Tooltip label="Marcar como lido">
                <ActionIcon variant="light" color="blue" onClick={() => handleMarcarLido(alerta.id)}>
                  <FaBellSlash size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            {!alerta.resolvido && (
              <Tooltip label="Marcar como resolvido">
                <ActionIcon variant="light" color="green" onClick={() => handleResolver(alerta.id)}>
                  <FaCheck size={16} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>
      </Card>
    );
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <LoadingOverlay visible />
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="apart">
          <div>
            <Title order={2}>
              <Group>
                <FaBell size={32} />
                Alertas
              </Group>
            </Title>
            <Text c="dimmed" size="sm">
              Notificações e avisos do sistema
            </Text>
          </div>

          <Group>
            {resumo?.nao_lidos > 0 && (
              <Button
                variant="light"
                leftSection={<FaBellSlash size={16} />}
                onClick={handleMarcarTodosLidos}
              >
                Marcar todos como lidos
              </Button>
            )}
            <Button
              leftSection={<FaSync size={16} />}
              onClick={handleVerificar}
              loading={verificando}
            >
              Verificar Novos
            </Button>
          </Group>
        </Group>

        {/* Resumo */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          <Paper p="md" radius="md" withBorder>
            <Group justify="apart">
              <div>
                <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                  Total Pendentes
                </Text>
                <Text fw={700} size="xl">
                  {resumo?.total_pendentes || 0}
                </Text>
              </div>
              <ThemeIcon size="xl" radius="md" variant="light">
                <FaBell size={28} />
              </ThemeIcon>
            </Group>
          </Paper>

          <Paper p="md" radius="md" withBorder style={{ borderColor: 'var(--mantine-color-red-6)' }}>
            <Group justify="apart">
              <div>
                <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                  Críticos
                </Text>
                <Text fw={700} size="xl" c="red">
                  {resumo?.criticos || 0}
                </Text>
              </div>
              <ThemeIcon size="xl" radius="md" color="red" variant="light">
                <FaExclamationCircle size={28} />
              </ThemeIcon>
            </Group>
          </Paper>

          <Paper p="md" radius="md" withBorder style={{ borderColor: 'var(--mantine-color-orange-6)' }}>
            <Group justify="apart">
              <div>
                <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                  Altos
                </Text>
                <Text fw={700} size="xl" c="orange">
                  {resumo?.altos || 0}
                </Text>
              </div>
              <ThemeIcon size="xl" radius="md" color="orange" variant="light">
                <FaExclamationTriangle size={28} />
              </ThemeIcon>
            </Group>
          </Paper>

          <Paper p="md" radius="md" withBorder>
            <Group justify="apart">
              <div>
                <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                  Não Lidos
                </Text>
                <Text fw={700} size="xl">
                  {resumo?.nao_lidos || 0}
                </Text>
              </div>
              <ThemeIcon size="xl" radius="md" color="blue" variant="light">
                <FaInfoCircle size={28} />
              </ThemeIcon>
            </Group>
          </Paper>
        </SimpleGrid>

        {/* Lista de Alertas */}
        {resumo?.total_pendentes === 0 ? (
          <Alert icon={<FaCheck size={16} />} title="Tudo certo!" color="green">
            Não há alertas pendentes no momento.
          </Alert>
        ) : (
          <Tabs defaultValue="CRITICA">
            <Tabs.List>
              <Tabs.Tab value="CRITICA" leftSection={<FaExclamationCircle size={16} />}>
                Críticos ({alertasPorPrioridade.CRITICA?.length || 0})
              </Tabs.Tab>
              <Tabs.Tab value="ALTA" leftSection={<FaExclamationTriangle size={16} />}>
                Altos ({alertasPorPrioridade.ALTA?.length || 0})
              </Tabs.Tab>
              <Tabs.Tab value="MEDIA" leftSection={<FaInfoCircle size={16} />}>
                Médios ({alertasPorPrioridade.MEDIA?.length || 0})
              </Tabs.Tab>
              <Tabs.Tab value="BAIXA" leftSection={<FaBell size={16} />}>
                Baixos ({alertasPorPrioridade.BAIXA?.length || 0})
              </Tabs.Tab>
            </Tabs.List>

            {['CRITICA', 'ALTA', 'MEDIA', 'BAIXA'].map((prioridade) => (
              <Tabs.Panel key={prioridade} value={prioridade} pt="md">
                <Stack gap="md">
                  {alertasPorPrioridade[prioridade]?.length > 0 ? (
                    alertasPorPrioridade[prioridade].map(renderAlerta)
                  ) : (
                    <Alert icon={<FaCheck size={16} />} color="green">
                      Nenhum alerta nesta categoria
                    </Alert>
                  )}
                </Stack>
              </Tabs.Panel>
            ))}
          </Tabs>
        )}
      </Stack>
    </Container>
  );
};

export default Alertas;

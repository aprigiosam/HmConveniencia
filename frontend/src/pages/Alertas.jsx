import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Select,
  Divider,
} from '@mantine/core';
import {
  FaBell,
  FaBellSlash,
  FaCheck,
  FaSync,
  FaExclamationCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCalendar,
  FaBoxOpen,
  FaCreditCard,
  FaMoneyBill,
  FaFilter,
  FaEye,
  FaTag,
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState(null);
  const [alertasPorPrioridade, setAlertasPorPrioridade] = useState({});
  const [verificando, setVerificando] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);

  useEffect(() => {
    carregarAlertas();
    // Auto-refresh a cada 2 minutos
    const interval = setInterval(carregarAlertas, 120000);
    return () => clearInterval(interval);
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
      setUltimaAtualizacao(new Date());
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

  const handleIrParaProduto = (produtoId) => {
    navigate('/produtos');
    // Adicionar filtro por produto depois que a página carregar
    setTimeout(() => {
      // Você pode implementar scroll até o produto específico aqui
    }, 500);
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
      PRODUTO_SEM_PRECO: FaTag,
      CONTA_VENCIDA: FaMoneyBill,
      DIFERENCA_CAIXA: FaMoneyBill,
    };
    return icons[tipo] || FaBell;
  };

  const getTipoLabel = (tipo) => {
    const labels = {
      LIMITE_CREDITO: 'Limite de Crédito',
      PRODUTO_VENCENDO: 'Produto Vencendo',
      PRODUTO_VENCIDO: 'Produto Vencido',
      ESTOQUE_BAIXO: 'Estoque Baixo',
      ESTOQUE_ZERADO: 'Estoque Zerado',
      PRODUTO_SEM_PRECO: 'Produto sem Preço',
      CONTA_VENCIDA: 'Conta Vencida',
      DIFERENCA_CAIXA: 'Diferença de Caixa',
    };
    return labels[tipo] || tipo;
  };

  const renderLoteInfo = (alerta) => {
    if (!alerta.lote) return null;

    return (
      <Paper p="xs" radius="sm" withBorder bg="gray.0" mt="xs">
        <Text size="xs" fw={700} mb={4} c="dimmed">
          Informações do Lote:
        </Text>
        <SimpleGrid cols={2} spacing="xs">
          {alerta.lote_numero && (
            <Text size="xs">
              <Text span fw={600}>Lote:</Text> {alerta.lote_numero}
            </Text>
          )}
          {alerta.lote_quantidade && (
            <Text size="xs">
              <Text span fw={600}>Qtd:</Text> {alerta.lote_quantidade} un
            </Text>
          )}
          {alerta.lote_data_validade && (
            <Text size="xs">
              <Text span fw={600}>Validade:</Text> {new Date(alerta.lote_data_validade).toLocaleDateString('pt-BR')}
            </Text>
          )}
          {alerta.lote_fornecedor && (
            <Text size="xs">
              <Text span fw={600}>Fornecedor:</Text> {alerta.lote_fornecedor}
            </Text>
          )}
        </SimpleGrid>
      </Paper>
    );
  };

  const renderAlerta = (alerta) => {
    const IconComponent = getTipoIcon(alerta.tipo);

    return (
      <Card
        key={alerta.id}
        shadow="sm"
        padding="md"
        radius="md"
        withBorder
        className={`alerta-card ${!alerta.lido ? 'nao-lido' : ''}`}>
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
          <Group gap="xs">
            <Badge color={getPrioridadeColor(alerta.prioridade)} variant="light">
              {alerta.prioridade_display}
            </Badge>
            <Badge variant="outline" size="sm">
              {getTipoLabel(alerta.tipo)}
            </Badge>
          </Group>
        </Group>

        <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-line' }} mb="xs">
          {alerta.mensagem}
        </Text>

        {renderLoteInfo(alerta)}

        <Divider my="sm" />

        <Group justify="apart">
          <Group gap="xs">
            {alerta.cliente_nome && (
              <Badge size="sm" variant="dot" color="blue">
                Cliente: {alerta.cliente_nome}
              </Badge>
            )}
            {alerta.produto_nome && (
              <Badge size="sm" variant="dot" color="green">
                Produto: {alerta.produto_nome}
              </Badge>
            )}
            {alerta.venda_numero && (
              <Badge size="sm" variant="dot" color="grape">
                Venda: {alerta.venda_numero}
              </Badge>
            )}
          </Group>

          <Group gap="xs">
            {alerta.tipo === 'PRODUTO_SEM_PRECO' && alerta.produto && (
              <Button
                size="xs"
                variant="light"
                color="orange"
                onClick={() => handleIrParaProduto(alerta.produto)}
              >
                Definir preço
              </Button>
            )}
            {alerta.produto && (
              <Tooltip label="Ver produto">
                <ActionIcon
                  variant="light"
                  color="blue"
                  onClick={() => handleIrParaProduto(alerta.produto)}
                >
                  <FaEye size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            {!alerta.lido && (
              <Tooltip label="Marcar como lido">
                <ActionIcon
                  variant="light"
                  color="blue"
                  onClick={() => handleMarcarLido(alerta.id)}
                >
                  <FaBellSlash size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            {!alerta.resolvido && (
              <Tooltip label="Marcar como resolvido">
                <ActionIcon
                  variant="light"
                  color="green"
                  onClick={() => handleResolver(alerta.id)}
                >
                  <FaCheck size={16} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>
      </Card>
    );
  };

  const filtrarAlertas = (alertas) => {
    if (!filtroTipo || filtroTipo === 'TODOS') return alertas;
    return alertas.filter(a => a.tipo === filtroTipo);
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
              {ultimaAtualizacao && (
                <> • Atualizado: {ultimaAtualizacao.toLocaleTimeString('pt-BR')}</>
              )}
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

        {/* Filtro por Tipo */}
        <Paper p="md" withBorder>
          <Group>
            <FaFilter size={16} />
            <Select
              placeholder="Filtrar por tipo"
              data={[
                { value: 'TODOS', label: 'Todos os tipos' },
                { value: 'PRODUTO_VENCIDO', label: 'Produtos Vencidos' },
                { value: 'PRODUTO_VENCENDO', label: 'Produtos Vencendo' },
                { value: 'ESTOQUE_BAIXO', label: 'Estoque Baixo' },
                { value: 'ESTOQUE_ZERADO', label: 'Estoque Zerado' },
                { value: 'PRODUTO_SEM_PRECO', label: 'Produtos sem Preço' },
                { value: 'CONTA_VENCIDA', label: 'Contas Vencidas' },
                { value: 'LIMITE_CREDITO', label: 'Limite de Crédito' },
                { value: 'DIFERENCA_CAIXA', label: 'Diferença de Caixa' },
              ]}
              value={filtroTipo}
              onChange={setFiltroTipo}
              clearable
              style={{ flex: 1, maxWidth: 300 }}
            />
          </Group>
        </Paper>

        {/* Lista de Alertas */}
        {resumo?.total_pendentes === 0 ? (
          <Alert icon={<FaCheck size={16} />} title="Tudo certo!" color="green">
            Não há alertas pendentes no momento.
          </Alert>
        ) : (
          <Tabs defaultValue="CRITICA">
            <Tabs.List>
              <Tabs.Tab value="CRITICA" leftSection={<FaExclamationCircle size={16} />}>
                Críticos ({filtrarAlertas(alertasPorPrioridade.CRITICA || []).length})
              </Tabs.Tab>
              <Tabs.Tab value="ALTA" leftSection={<FaExclamationTriangle size={16} />}>
                Altos ({filtrarAlertas(alertasPorPrioridade.ALTA || []).length})
              </Tabs.Tab>
              <Tabs.Tab value="MEDIA" leftSection={<FaInfoCircle size={16} />}>
                Médios ({filtrarAlertas(alertasPorPrioridade.MEDIA || []).length})
              </Tabs.Tab>
              <Tabs.Tab value="BAIXA" leftSection={<FaBell size={16} />}>
                Baixos ({filtrarAlertas(alertasPorPrioridade.BAIXA || []).length})
              </Tabs.Tab>
            </Tabs.List>

            {['CRITICA', 'ALTA', 'MEDIA', 'BAIXA'].map((prioridade) => (
              <Tabs.Panel key={prioridade} value={prioridade} pt="md">
                <Stack gap="md">
                  {filtrarAlertas(alertasPorPrioridade[prioridade] || []).length > 0 ? (
                    filtrarAlertas(alertasPorPrioridade[prioridade] || []).map(renderAlerta)
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

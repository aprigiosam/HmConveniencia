import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core';
import { FaClipboardList, FaPlus, FaSearch, FaTrash } from 'react-icons/fa';
import { modals } from '@mantine/modals';
import dayjs from 'dayjs';
import { notifications } from '@mantine/notifications';
import { getInventarios, createInventario, deleteInventario } from '../services/api';
import { localDB } from '../utils/db';

function Inventario() {
  const [inventarios, setInventarios] = useState([]);
  const [busca, setBusca] = useState('');
  const [opened, setOpened] = useState(false);
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState({ titulo: '', responsavel: '', observacoes: '' });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const navigate = useNavigate();

  useEffect(() => {
    carregarInventarios();

    // Listener para mudanças de conexão
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const carregarInventarios = async () => {
    try {
      // Tenta carregar do cache primeiro (cache-first para performance)
      const cached = await localDB.getCachedInventarios();
      if (cached && cached.length > 0) {
        setInventarios(cached);
      }

      // Tenta buscar da API se estiver online
      if (navigator.onLine) {
        const response = await getInventarios();
        const data = response.data.results || response.data;
        const inventariosData = Array.isArray(data) ? data : [];

        setInventarios(inventariosData);

        // Atualiza cache
        if (inventariosData.length > 0) {
          await localDB.cacheInventarios(inventariosData);
        }
      } else if (!cached || cached.length === 0) {
        // Offline e sem cache
        notifications.show({
          title: 'Modo Offline',
          message: 'Você está offline. Mostrando dados em cache.',
          color: 'yellow',
        });
      }
    } catch (error) {
      console.error('Erro ao carregar inventários:', error);

      // Em caso de erro, tenta usar cache
      const cached = await localDB.getCachedInventarios();
      if (cached && cached.length > 0) {
        setInventarios(cached);
        notifications.show({
          title: 'Offline',
          message: 'Mostrando inventários do cache local.',
          color: 'yellow',
        });
      } else {
        notifications.show({
          title: 'Erro',
          message: 'Não foi possível carregar as sessões de inventário.',
          color: 'red',
        });
      }
    }
  };

  const handleCreate = async () => {
    if (!form.titulo.trim()) {
      notifications.show({
        title: 'Informe um título',
        message: 'Defina um nome para identificar esta contagem.',
        color: 'orange',
      });
      return;
    }
    try {
      setCriando(true);
      const response = await createInventario(form);
      const novoInventario = response.data;
      setInventarios((prev) => [novoInventario, ...prev]);
      setOpened(false);
      setForm({ titulo: '', responsavel: '', observacoes: '' });
      notifications.show({
        title: 'Inventário criado',
        message: 'Sessão de inventário aberta.',
        color: 'green',
      });
    } catch (error) {
      console.error('Erro ao criar inventário:', error);
      const detail = error.response?.data?.detail || 'Não foi possível criar o inventário.';
      notifications.show({
        title: 'Erro',
        message: detail,
        color: 'red',
      });
    } finally {
      setCriando(false);
    }
  };

  const handleDelete = (inventario) => {
    const isFinalizado = inventario.status === 'FINALIZADO';

    modals.openConfirmModal({
      title: isFinalizado ? '⚠️ Excluir sessão FINALIZADA' : 'Excluir sessão de inventário',
      children: (
        <Stack gap="sm">
          <Text size="sm">
            Tem certeza que deseja excluir a sessão <strong>{inventario.titulo}</strong>?
          </Text>
          {isFinalizado && (
            <Paper withBorder p="sm" bg="red.0" style={{ borderColor: 'var(--mantine-color-red-6)' }}>
              <Text size="sm" fw={700} c="red.9">
                ⚠️ ATENÇÃO: Esta sessão está FINALIZADA!
              </Text>
              <Text size="xs" c="red.8" mt={4}>
                Os ajustes de estoque já aplicados serão <strong>REVERTIDOS</strong> automaticamente.
                Os produtos voltarão para o estoque anterior ao inventário.
              </Text>
            </Paper>
          )}
          <Text size="xs" c="dimmed">
            Esta ação não pode ser desfeita e todos os itens registrados serão perdidos.
          </Text>
        </Stack>
      ),
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteInventario(inventario.id);
          setInventarios((prev) => prev.filter((inv) => inv.id !== inventario.id));
          notifications.show({
            title: 'Sessão excluída',
            message: isFinalizado
              ? 'A sessão foi removida e os ajustes de estoque foram revertidos.'
              : 'A sessão de inventário foi removida com sucesso.',
            color: 'green',
          });
        } catch (error) {
          console.error('Erro ao excluir inventário:', error);
          const detail = error.response?.data?.detail || error.response?.data?.non_field_errors?.[0] || 'Não foi possível excluir a sessão.';
          notifications.show({
            title: 'Erro',
            message: detail,
            color: 'red',
          });
        }
      },
    });
  };

  const inventariosFiltrados = inventarios.filter((inv) =>
    inv.titulo.toLowerCase().includes(busca.toLowerCase()) ||
    (inv.responsavel || '').toLowerCase().includes(busca.toLowerCase())
  );

  const mockSessao = useMemo(
    () => ({
      titulo: 'Inventário geral (exemplo)',
      responsavel: 'Fulano da Silva',
      status: 'EM_ANDAMENTO',
      iniciado_em: dayjs().subtract(2, 'hour'),
      itens: [
        {
          id: 'mock-1',
          produto: { nome: 'Refrigerante Cola 2L' },
          codigo_barras: '7890000000001',
          quantidade_sistema: 12,
          quantidade_contada: 10,
          diferenca: -2,
          custo_informado: 7.2,
          validade_informada: dayjs().add(90, 'day'),
          observacao: '1 unidade avariada',
        },
        {
          id: 'mock-2',
          produto: { nome: 'Batata Chips 90g' },
          codigo_barras: '7890000000002',
          quantidade_sistema: 8,
          quantidade_contada: 9,
          diferenca: 1,
          custo_informado: 4.1,
          validade_informada: null,
          observacao: '',
        },
        {
          id: 'mock-3',
          produto: null,
          descricao: 'Chocolate novo (cadastro pendente)',
          codigo_barras: '7890000000003',
          quantidade_sistema: 0,
          quantidade_contada: 6,
          diferenca: 6,
          custo_informado: 2.8,
          validade_informada: dayjs().add(120, 'day'),
          observacao: 'Produto ainda não cadastrado',
        },
      ],
    }),
    []
  );

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Group gap="sm">
          <FaClipboardList size={22} />
          <Title order={2}>Inventário</Title>
          {!isOnline && (
            <Badge color="yellow" variant="filled" size="sm">
              📶 Offline
            </Badge>
          )}
        </Group>
        <Button leftSection={<FaPlus size={14} />} onClick={() => setOpened(true)}>
          Nova Sessão
        </Button>
      </Group>

      <Card withBorder padding="md" radius="md">
        <Group align="flex-end" gap="sm">
          <TextInput
            label="Buscar sessões"
            placeholder="Filtrar por título ou responsável"
            leftSection={<FaSearch size={14} />}
            value={busca}
            onChange={(event) => setBusca(event.currentTarget.value)}
            style={{ flex: 1 }}
          />
        </Group>
      </Card>

      <Card withBorder padding="0" radius="md">
        <Table highlightOnHover striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Título</Table.Th>
              <Table.Th>Responsável</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Iniciado</Table.Th>
              <Table.Th>Finalizado</Table.Th>
              <Table.Th ta="center">Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {inventariosFiltrados.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text ta="center" c="dimmed">
                    Nenhuma sessão de inventário cadastrada ainda.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              inventariosFiltrados.map((inv) => (
                <Table.Tr key={inv.id}>
                  <Table.Td
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/estoque/inventario/${inv.id}`)}
                  >
                    <Stack gap={2}>
                      <Group gap="xs" align="center">
                        <Text fw={600}>{inv.titulo}</Text>
                        <Badge size="xs" color="gray" variant="light">
                          Ver detalhes
                        </Badge>
                      </Group>
                      {inv.observacoes && (
                        <Text size="xs" c="dimmed">{inv.observacoes}</Text>
                      )}
                    </Stack>
                  </Table.Td>
                  <Table.Td
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/estoque/inventario/${inv.id}`)}
                  >
                    {inv.responsavel || '-'}
                  </Table.Td>
                  <Table.Td
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/estoque/inventario/${inv.id}`)}
                  >
                    <Badge color={inv.status === 'FINALIZADO' ? 'green' : inv.status === 'EM_ANDAMENTO' ? 'blue' : 'orange'}>
                      {inv.status.replace('_', ' ')}
                    </Badge>
                  </Table.Td>
                  <Table.Td
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/estoque/inventario/${inv.id}`)}
                  >
                    {inv.iniciado_em ? dayjs(inv.iniciado_em).format('DD/MM/YYYY HH:mm') : '-'}
                  </Table.Td>
                  <Table.Td
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/estoque/inventario/${inv.id}`)}
                  >
                    {inv.finalizado_em ? dayjs(inv.finalizado_em).format('DD/MM/YYYY HH:mm') : '-'}
                  </Table.Td>
                  <Table.Td ta="center">
                    <Tooltip
                      label={inv.status === 'FINALIZADO' ? 'Excluir sessão finalizada (reverterá ajustes)' : 'Excluir sessão'}
                      position="left"
                    >
                      <ActionIcon
                        color="red"
                        variant="light"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(inv);
                        }}
                      >
                        <FaTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Card>

      <Card withBorder padding="md" radius="md">
        <Group justify="space-between" align="flex-start" mb="md">
          <Stack gap={2}>
            <Group gap="xs">
              <FaClipboardList size={18} />
              <Text fw={600}>Prévia da contagem</Text>
            </Group>
            <Text size="sm" c="dimmed">
              Esta prévia demonstra como ficará a tela ao abrir uma sessão de inventário. Os dados são ilustrativos.
            </Text>
          </Stack>
          <Badge color="blue" variant="light">
            Sessão em andamento
          </Badge>
        </Group>

        <Paper withBorder radius="md" p="md" mb="md">
          <Group justify="space-between" align="flex-start">
            <Stack gap={2}>
              <Text fw={600}>{mockSessao.titulo}</Text>
              <Text size="sm" c="dimmed">
                Responsável: {mockSessao.responsavel}
              </Text>
            </Stack>
            <Stack align="flex-end" gap={2}>
              <Text size="xs" c="dimmed">
                Iniciado em
              </Text>
              <Text fw={500}>{mockSessao.iniciado_em.format('DD/MM/YYYY HH:mm')}</Text>
            </Stack>
          </Group>
          <Divider my="sm" />
          <Group gap="sm" align="flex-end">
            <TextInput
              label="Código / nome"
              placeholder="Escaneie ou digite para buscar"
              leftSection={<FaSearch size={14} />}
              style={{ flex: 1 }}
              disabled
            />
            <Button variant="light" color="indigo" disabled>
              Ler código
            </Button>
            <Button disabled>Adicionar</Button>
          </Group>
        </Paper>

        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Produto</Table.Th>
              <Table.Th>Código</Table.Th>
              <Table.Th ta="right">Sis.</Table.Th>
              <Table.Th ta="right">Contado</Table.Th>
              <Table.Th ta="right">Dif.</Table.Th>
              <Table.Th ta="center">Observação</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {mockSessao.itens.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>
                  <Stack gap={2}>
                    <Text fw={500}>{item.produto?.nome || item.descricao || '—'}</Text>
                    <Group gap="xs">
                      <Badge size="xs" color={item.diferenca < 0 ? 'red' : item.diferenca > 0 ? 'green' : 'gray'}>
                        Dif.: {item.diferenca}
                      </Badge>
                      {item.validade_informada && (
                        <Badge size="xs" color="yellow">
                          Validade: {dayjs(item.validade_informada).format('DD/MM/YYYY')}
                        </Badge>
                      )}
                    </Group>
                  </Stack>
                </Table.Td>
                <Table.Td>{item.codigo_barras || '—'}</Table.Td>
                <Table.Td ta="right">{Number(item.quantidade_sistema).toFixed(2)}</Table.Td>
                <Table.Td ta="right">{Number(item.quantidade_contada).toFixed(2)}</Table.Td>
                <Table.Td ta="right">
                  <Text c={item.diferenca < 0 ? 'red' : item.diferenca > 0 ? 'green' : 'dimmed'}>
                    {Number(item.diferenca).toFixed(2)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {item.observacao || '—'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        <Paper withBorder radius="md" p="md" mt="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Ajuste estimado com base na prévia:
            </Text>
            <Group gap="sm">
              <Badge color="red" variant="light">
                -2 unidades (perdas)
              </Badge>
              <Badge color="green" variant="light">
                +7 unidades (sobras)
              </Badge>
            </Group>
          </Group>
        </Paper>
      </Card>

      <Modal opened={opened} onClose={() => setOpened(false)} title="Nova sessão de inventário" size="md">
        <Stack gap="sm">
          <TextInput
            label="Título"
            placeholder="Ex.: Inventário geral outubro"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            required
          />
          <TextInput
            label="Responsável"
            placeholder="Quem vai conduzir a contagem"
            value={form.responsavel}
            onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
          />
          <Textarea
            label="Observações"
            placeholder="Notas importantes sobre esta contagem"
            minRows={3}
            value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setOpened(false)}>
              Cancelar
            </Button>
            <Button loading={criando} onClick={handleCreate}>
              Criar sessão
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

export default Inventario;

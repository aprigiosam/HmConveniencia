import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Center,
  Grid,
  Group,
  Loader,
  NumberInput,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import {
  getInventario,
  getProdutos,
  addInventarioItem,
  finalizeInventario,
  searchOpenFoodProducts,
  deleteInventarioItem,
} from '../services/api';
import BarcodeScanner from '../components/BarcodeScanner';
import { FaArrowLeft, FaBarcode, FaCheck, FaClipboardList, FaSearch, FaTrash } from 'react-icons/fa';
import { localDB } from '../utils/db';
import { inventarioSyncManager } from '../utils/inventarioSyncManager';

function InventarioDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [sessao, setSessao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [produtos, setProdutos] = useState([]);
  const [scannerAberto, setScannerAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [excluindoId, setExcluindoId] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [itensPendentes, setItensPendentes] = useState(0);
  const [form, setForm] = useState({
    produto: '',
    codigo_barras: '',
    descricao: '',
    quantidade_sistema: '',
    quantidade_contada: '',
    custo_informado: '',
    validade_informada: null,
    observacao: '',
  });
  const [buscandoSugestao, setBuscandoSugestao] = useState(false);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [sessaoRes, produtosRes] = await Promise.all([
        getInventario(id),
        getProdutos({ ativo: true }),
      ]);

      const sessaoData = sessaoRes.data;
      const produtosData = produtosRes.data.results || produtosRes.data;

      setSessao(sessaoData);
      setProdutos(Array.isArray(produtosData) ? produtosData : []);
    } catch (error) {
      console.error('Erro ao carregar inventário:', error);
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível carregar os dados da sessão de inventário.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    carregarDados();

    inventarioSyncManager.startAutoSync(30000);

    const handleOnline = () => {
      setIsOnline(true);
      inventarioSyncManager.syncAll();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const updatePending = async () => {
      const count = await localDB.countInventarioItensPendentes();
      setItensPendentes(count);
    };
    updatePending();
    const interval = setInterval(updatePending, 10000);

    return () => {
      inventarioSyncManager.stopAutoSync();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [carregarDados]);

  const produtoOptions = useMemo(
    () =>
      produtos.map((produto) => ({
        value: produto.id.toString(),
        label: produto.nome,
        data: produto,
      })),
    [produtos]
  );

  const itens = useMemo(() => sessao?.itens || [], [sessao]);

  const toDecimalString = (value) => {
    if (value === '' || value === null || typeof value === 'undefined') {
      return '0';
    }
    return value.toString();
  };

  const resumo = useMemo(() => {
    const totais = itens.reduce(
      (acc, item) => {
        const diferenca = Number(item.diferenca);
        if (diferenca > 0) acc.positivos += diferenca;
        if (diferenca < 0) acc.negativos += diferenca;
        if (!item.produto) acc.naoCadastrados += 1;
        return acc;
      },
      { positivos: 0, negativos: 0, naoCadastrados: 0 }
    );
    totais.negativos = Math.abs(totais.negativos);
    return totais;
  }, [itens]);

  const sessaoFinalizada = sessao?.status === 'FINALIZADO';

  const preencherComProduto = (produtoId) => {
    const produto = produtos.find((p) => p.id.toString() === produtoId);
    if (!produto) return;
    setForm((prev) => ({
      ...prev,
      produto: produtoId,
      codigo_barras: produto.codigo_barras || prev.codigo_barras,
      descricao: produto.nome || prev.descricao,
      quantidade_sistema: produto.estoque != null ? Number(produto.estoque).toString() : prev.quantidade_sistema,
    }));
  };

  const handleProdutoChange = (value) => {
    setForm((prev) => ({ ...prev, produto: value || '' }));
    if (value) preencherComProduto(value);
  };

  const handleScan = (codigo) => {
    setScannerAberto(false);
    const produto = produtos.find((p) => p.codigo_barras === codigo);
    if (produto) {
      notifications.show({
        title: 'Produto encontrado',
        message: produto.nome,
        color: 'green',
        icon: <FaCheck />,
      });
      setForm({
        produto: produto.id.toString(),
        codigo_barras: codigo,
        descricao: produto.nome,
        quantidade_sistema:
          produto.estoque != null ? Number(produto.estoque).toString() : '',
        quantidade_contada: '',
        custo_informado: produto.preco_custo?.toString() || '',
        validade_informada: null,
        observacao: '',
      });
    } else {
      buscarSugestaoOpenFood(codigo);
    }
  };

  const buscarSugestaoOpenFood = async (codigoAtual) => {
    const codigo = codigoAtual || form.codigo_barras?.trim();
    if (!codigo) {
      notifications.show({
        title: 'Informe o código de barras',
        message: 'Digite ou escaneie o GTIN para buscar informações.',
        color: 'orange',
      });
      return;
    }

    try {
      setBuscandoSugestao(true);
      const response = await searchOpenFoodProducts({ code: codigo });
      const resultados = Array.isArray(response.data) ? response.data : [];
      const produtoSugerido = resultados[0];

      if (!produtoSugerido) {
        notifications.show({
          title: 'Produto não encontrado',
          message: `Nenhuma informação externa disponível para ${codigo}.`,
          color: 'orange',
        });
        setForm((prev) => ({
          ...prev,
          codigo_barras: codigo,
          produto: '',
        }));
        return;
      }

      notifications.show({
        title: 'Sugestão carregada',
        message: produtoSugerido.name || 'Dados preenchidos automaticamente.',
        color: 'blue',
      });

      setForm((prev) => ({
        ...prev,
        produto: '',
        codigo_barras: codigo,
        descricao: produtoSugerido.name || prev.descricao || '',
        observacao: prev.observacao,
        quantidade_sistema: prev.quantidade_sistema,
        custo_informado: prev.custo_informado,
      }));
    } catch (error) {
      console.error('Erro ao buscar dados externos:', error);
      notifications.show({
        title: 'Erro ao buscar dados externos',
        message: 'Não foi possível consultar o Open Food Facts agora.',
        color: 'red',
      });
    } finally {
      setBuscandoSugestao(false);
    }
  };

  const resetForm = () => {
    setForm({
      produto: '',
      codigo_barras: '',
      descricao: '',
      quantidade_sistema: '',
      quantidade_contada: '',
      custo_informado: '',
      validade_informada: null,
      observacao: '',
    });
  };

  const handleAdicionarItem = async () => {
    if (!form.quantidade_contada) {
      notifications.show({
        title: 'Informe a quantidade contada',
        message: 'A quantidade contada é obrigatória.',
        color: 'orange',
      });
      return;
    }

    const payload = {
      produto: form.produto || null,
      codigo_barras: form.codigo_barras || '',
      descricao: form.descricao || '',
      quantidade_contada: toDecimalString(form.quantidade_contada),
      quantidade_sistema: toDecimalString(form.quantidade_sistema),
      custo_informado: toDecimalString(form.custo_informado),
      validade_informada: form.validade_informada
        ? dayjs(form.validade_informada).format('YYYY-MM-DD')
        : null,
      observacao: form.observacao || '',
    };

    try {
      setSalvando(true);

      if (navigator.onLine) {
        // Tenta salvar online primeiro
        try {
          await addInventarioItem(id, payload);
          notifications.show({
            title: 'Item registrado',
            message: 'Contagem adicionada ao inventário.',
            color: 'green',
          });
        } catch (error) {
          // Se falhar online, salva offline
          console.warn('Falha ao salvar online, salvando offline:', error);
          await inventarioSyncManager.addItemOffline(id, payload);
          notifications.show({
            title: '📶 Salvo offline',
            message: 'Item será sincronizado quando a conexão retornar.',
            color: 'yellow',
          });
        }
      } else {
        // Modo offline: salva localmente
        await inventarioSyncManager.addItemOffline(id, payload);
        notifications.show({
          title: '📶 Salvo offline',
          message: 'Item será sincronizado quando a conexão retornar.',
          color: 'yellow',
        });
      }

      resetForm();
      carregarDados();

      // Atualiza contador de itens pendentes
      const count = await localDB.countInventarioItensPendentes();
      setItensPendentes(count);
    } catch (error) {
      console.error('Erro ao adicionar item de inventário:', error);
      const detail = error.response?.data?.detail || error.message || 'Não foi possível adicionar o item.';
      notifications.show({
        title: 'Erro',
        message: detail,
        color: 'red',
      });
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirItem = async (item) => {
    if (sessaoFinalizada) return;
    const confirmar = window.confirm(`Remover a contagem de ${item.produto_nome || item.descricao || 'este item'}?`);
    if (!confirmar) return;

    try {
      setExcluindoId(item.id);
      await deleteInventarioItem(id, item.id);
      notifications.show({
        title: 'Item removido',
        message: 'A contagem foi excluída.',
        color: 'green',
      });
      carregarDados();
    } catch (error) {
      console.error('Erro ao remover item do inventário:', error);
      const detail = error.response?.data?.detail || 'Não foi possível remover o item.';
      notifications.show({
        title: 'Erro',
        message: detail,
        color: 'red',
      });
    } finally {
      setExcluindoId(null);
    }
  };

  const handleFinalizar = async () => {
    if (!sessao || sessaoFinalizada) return;

    try {
      setFinalizando(true);
      await finalizeInventario(id);
      notifications.show({
        title: 'Inventário finalizado',
        message: 'Os ajustes foram aplicados ao estoque.',
        color: 'green',
      });
      carregarDados();
    } catch (error) {
      console.error('Erro ao finalizar inventário:', error);
      const detail = error.response?.data?.detail || 'Não foi possível finalizar a sessão.';
      notifications.show({
        title: 'Erro',
        message: detail,
        color: 'red',
      });
    } finally {
      setFinalizando(false);
    }
  };

  if (loading) {
    return (
      <Center style={{ height: '100%' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!sessao) {
    return (
      <Center style={{ height: '100%' }}>
        <Stack align="center">
          <Text size="lg" fw={500}>
            Sessão de inventário não encontrada.
          </Text>
          <Button leftSection={<FaArrowLeft />} onClick={() => navigate('/estoque/inventario')}>
            Voltar
          </Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Group gap="sm">
          <Button variant="subtle" size="compact-sm" onClick={() => navigate('/estoque/inventario')}>
            <FaArrowLeft size={12} style={{ marginRight: 6 }} />
            Voltar
          </Button>
          <Group gap="xs">
            <FaClipboardList size={22} />
            <Title order={2}>{sessao.titulo}</Title>
          </Group>
        </Group>
        <Group gap="sm">
          {!isOnline && (
            <Badge size="lg" color="red" variant="filled">
              📶 Offline
            </Badge>
          )}
          {itensPendentes > 0 && (
            <Badge size="lg" color="yellow" variant="filled">
              {itensPendentes} {itensPendentes === 1 ? 'item pendente' : 'itens pendentes'}
            </Badge>
          )}
          <Badge
            size="lg"
            color={
              sessao.status === 'FINALIZADO'
                ? 'green'
                : sessao.status === 'EM_ANDAMENTO'
                ? 'blue'
                : 'orange'
            }
          >
            {sessao.status.replace('_', ' ')}
          </Badge>
          {!sessaoFinalizada && (
            <Button color="green" loading={finalizando} onClick={handleFinalizar}>
              Finalizar sessão
            </Button>
          )}
        </Group>
      </Group>

      <Card withBorder radius="md" padding="md">
        <Grid>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap={2}>
              <Text size="sm" c="dimmed">
                Responsável
              </Text>
              <Text fw={500}>{sessao.responsavel || 'Não informado'}</Text>
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap={2}>
              <Text size="sm" c="dimmed">
                Iniciado em
              </Text>
              <Text fw={500}>
                {sessao.iniciado_em ? dayjs(sessao.iniciado_em).format('DD/MM/YYYY HH:mm') : '-'}
              </Text>
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap={2}>
              <Text size="sm" c="dimmed">
                Finalizado em
              </Text>
              <Text fw={500}>
                {sessao.finalizado_em ? dayjs(sessao.finalizado_em).format('DD/MM/YYYY HH:mm') : '-'}
              </Text>
            </Stack>
          </Grid.Col>
        </Grid>
        {sessao.observacoes && (
          <Paper withBorder radius="md" p="sm" mt="md">
            <Text size="sm" c="dimmed">
              Observações
            </Text>
            <Text size="sm">{sessao.observacoes}</Text>
          </Paper>
        )}
      </Card>

      <Card withBorder radius="md" padding="md">
        <Group justify="space-between" align="center" mb="md">
          <Text fw={600}>Adicionar contagem</Text>
          <Button
            variant="light"
            size="compact-md"
            leftSection={<FaBarcode size={12} />}
            onClick={() => setScannerAberto(true)}
            disabled={sessaoFinalizada}
          >
            Ler código
          </Button>
        </Group>

        <Grid gutter="sm">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Select
              label="Produto"
              placeholder="Selecione um produto"
              data={produtoOptions}
              value={form.produto}
              onChange={handleProdutoChange}
              searchable
              disabled={sessaoFinalizada}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label="Código de barras"
              placeholder="789..."
              value={form.codigo_barras}
              onChange={(e) => setForm((prev) => ({ ...prev, codigo_barras: e.target.value }))}
              disabled={sessaoFinalizada}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <TextInput
              label="Descrição"
              placeholder="Nome do produto"
              value={form.descricao}
              onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))}
              disabled={sessaoFinalizada}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Button
              variant="light"
              leftSection={<FaSearch size={12} />}
              onClick={() => buscarSugestaoOpenFood()}
              loading={buscandoSugestao}
              disabled={sessaoFinalizada}
            >
              Buscar dados externos
            </Button>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <NumberInput
              label="Quantidade no sistema"
              placeholder="0"
              value={form.quantidade_sistema === '' ? '' : Number(form.quantidade_sistema)}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, quantidade_sistema: value === '' ? '' : value }))
              }
              disabled={sessaoFinalizada}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <NumberInput
              label="Quantidade contada"
              placeholder="0"
              value={form.quantidade_contada === '' ? '' : Number(form.quantidade_contada)}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, quantidade_contada: value === '' ? '' : value }))
              }
              required
              disabled={sessaoFinalizada}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <NumberInput
              label="Custo informado (opcional)"
              placeholder="0,00"
              value={form.custo_informado === '' ? '' : Number(form.custo_informado)}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, custo_informado: value === '' ? '' : value }))
              }
              disabled={sessaoFinalizada}
              precision={2}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <DatePickerInput
              label="Validade informada"
              placeholder="Selecione a data"
              value={form.validade_informada}
              onChange={(value) => setForm((prev) => ({ ...prev, validade_informada: value }))}
              disabled={sessaoFinalizada}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Textarea
              label="Observação"
              minRows={2}
              value={form.observacao}
              onChange={(e) => setForm((prev) => ({ ...prev, observacao: e.target.value }))}
              disabled={sessaoFinalizada}
            />
          </Grid.Col>
        </Grid>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={resetForm} disabled={sessaoFinalizada || salvando}>
            Limpar
          </Button>
          <Button onClick={handleAdicionarItem} loading={salvando} disabled={sessaoFinalizada}>
            Adicionar contagem
          </Button>
        </Group>
      </Card>

      <Card withBorder radius="md" padding="md">
        <Group justify="space-between" mb="md">
          <Text fw={600}>Itens contados ({itens.length})</Text>
          <Group gap="sm">
            <Badge color="green" variant="light">
              +{resumo.positivos} sobras
            </Badge>
            <Badge color="red" variant="light">
              -{resumo.negativos} faltas
            </Badge>
            {resumo.naoCadastrados > 0 && (
              <Badge color="orange" variant="light">
                {resumo.naoCadastrados} sem cadastro
              </Badge>
            )}
          </Group>
        </Group>

        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Produto</Table.Th>
              <Table.Th>Código</Table.Th>
              <Table.Th ta="right">Sistema</Table.Th>
              <Table.Th ta="right">Contado</Table.Th>
              <Table.Th ta="right">Diferença</Table.Th>
              <Table.Th>Observações</Table.Th>
              <Table.Th ta="center">Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {itens.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Text c="dimmed" ta="center">
                    Nenhum item foi contado ainda.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              itens.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>
                    <Stack gap={2}>
                      <Text fw={500}>{item.produto_nome || item.descricao || '—'}</Text>
                      {!item.produto_nome && (
                        <Badge size="xs" color="orange" variant="light">
                          Cadastro pendente
                        </Badge>
                      )}
                    </Stack>
                  </Table.Td>
                  <Table.Td>{item.codigo_barras || '—'}</Table.Td>
                  <Table.Td ta="right">{Number(item.quantidade_sistema || 0).toFixed(2)}</Table.Td>
                  <Table.Td ta="right">{Number(item.quantidade_contada || 0).toFixed(2)}</Table.Td>
                  <Table.Td ta="right">
                    <Text c={item.diferenca < 0 ? 'red' : item.diferenca > 0 ? 'green' : 'dimmed'}>
                      {Number(item.diferenca || 0).toFixed(2)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={2}>
                      <Text size="sm" c="dimmed">
                        {item.observacao || '—'}
                      </Text>
                      {item.validade_informada && (
                        <Badge size="xs" color="yellow" variant="light">
                          Validade: {dayjs(item.validade_informada).format('DD/MM/YYYY')}
                        </Badge>
                      )}
                      {item.custo_informado && (
                        <Badge size="xs" color="blue" variant="light">
                          Custo: R$ {Number(item.custo_informado).toFixed(2)}
                        </Badge>
                      )}
                    </Stack>
                  </Table.Td>
                  <Table.Td ta="center">
                    <ActionIcon
                      color="red"
                      variant="light"
                      onClick={() => handleExcluirItem(item)}
                      disabled={sessaoFinalizada || excluindoId === item.id}
                    >
                      {excluindoId === item.id ? <Loader size="xs" /> : <FaTrash size={14} />}
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Card>

      <BarcodeScanner
        opened={scannerAberto}
        onClose={() => setScannerAberto(false)}
        onScan={handleScan}
        title="Ler código do produto"
      />
    </Stack>
  );
}

export default InventarioDetalhe;

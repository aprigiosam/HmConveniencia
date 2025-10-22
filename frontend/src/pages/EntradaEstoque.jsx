import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Title,
  Paper,
  Grid,
  TextInput,
  NumberInput,
  Select,
  Textarea,
  Button,
  Group,
  Table,
  Badge,
  Text,
  LoadingOverlay,
  Card,
  Stack,
  ActionIcon,
  FileInput,
  Divider,
  Alert,
  ThemeIcon,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { FaBoxOpen, FaPlus, FaCalendar, FaTruck, FaEdit, FaTimes, FaFileUpload, FaFileInvoiceDollar, FaInfoCircle, FaCheck } from 'react-icons/fa';
import { getProdutos, entradaEstoque, getLotes, getFornecedores, updateLote, importarNFe } from '../services/api';

const EntradaEstoque = () => {
  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [lotesRecentes, setLotesRecentes] = useState([]);
  const [editingLote, setEditingLote] = useState(null);
  const [xmlFile, setXmlFile] = useState(null);
  const [importandoXml, setImportandoXml] = useState(false);
  const [notaImportada, setNotaImportada] = useState(null);

  // Form state
  const [produtoId, setProdutoId] = useState('');
  const [quantidade, setQuantidade] = useState(null);
  const [dataValidade, setDataValidade] = useState(null);
  const [numeroLote, setNumeroLote] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [precoCustoLote, setPrecoCustoLote] = useState(null);
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  const parseOptionalNumber = (value) =>
    value === null || value === '' || typeof value === 'undefined'
      ? null
      : Number(value);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [produtosRes, lotesRes, fornecedoresRes] = await Promise.all([
        getProdutos({ ativo: true }),
        getLotes({ ativo: true }),
        getFornecedores({ ativo: true }),
      ]);

      setProdutos(produtosRes.data.results || produtosRes.data);
      setFornecedores(fornecedoresRes.data.results || fornecedoresRes.data);

      // Ordena lotes por data de entrada (mais recentes primeiro)
      const lotes = lotesRes.data.results || lotesRes.data;
      const lotesOrdenados = lotes.sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      ).slice(0, 10); // Apenas os 10 mais recentes

      setLotesRecentes(lotesOrdenados);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível carregar os dados',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImportarXml = async () => {
    if (!xmlFile) {
      notifications.show({
        title: 'Selecione um arquivo',
        message: 'Escolha o XML da NF-e para importar',
        color: 'orange',
        icon: <FaInfoCircle />,
      });
      return;
    }

    setImportandoXml(true);
    try {
      const response = await importarNFe(xmlFile);
      const nota = response.data;
      setNotaImportada(nota);
      notifications.show({
        title: 'NF-e importada',
        message: `Nota ${nota.numero}/${nota.serie} importada com ${nota.itens?.length || 0} item(ns)`,
        color: 'green',
        icon: <FaCheck />,
      });
      setXmlFile(null);
      await carregarDados();
    } catch (error) {
      console.error('Erro ao importar NF-e:', error);
      const detalhe =
        error.response?.data?.detail ||
        error.response?.data?.error ||
        'Não foi possível importar a NF-e';
      notifications.show({
        title: 'Erro ao importar NF-e',
        message: detalhe,
        color: 'red',
        icon: <FaTimes />,
      });
    } finally {
      setImportandoXml(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const quantidadeNumber = Number(quantidade);

    if (!produtoId || Number.isNaN(quantidadeNumber) || quantidadeNumber <= 0) {
      notifications.show({
        title: 'Erro',
        message: 'Preencha o produto e quantidade corretamente',
        color: 'red',
      });
      return;
    }

    try {
      setLoading(true);

      // Formata a data corretamente
      let dataValidadeFormatada = null;
      if (dataValidade) {
        if (typeof dataValidade === 'string') {
          // Se já é string no formato YYYY-MM-DD, usa direto
          dataValidadeFormatada = dataValidade;
        } else if (dataValidade instanceof Date && !isNaN(dataValidade.getTime())) {
          // Se é objeto Date válido, formata
          const year = dataValidade.getFullYear();
          const month = String(dataValidade.getMonth() + 1).padStart(2, '0');
          const day = String(dataValidade.getDate()).padStart(2, '0');
          dataValidadeFormatada = `${year}-${month}-${day}`;
        }
      }

      const fornecedorId = fornecedor ? parseInt(fornecedor, 10) : null;
      const precoCustoNumber = parseOptionalNumber(precoCustoLote);
      const produtoSelecionado = produtos.find(
        (p) => p.id === parseInt(produtoId, 10)
      );

      const lotePayload = {
        quantidade: quantidadeNumber,
        data_validade: dataValidadeFormatada,
        numero_lote: numeroLote || null,
        fornecedor: fornecedorId,
        preco_custo_lote: precoCustoNumber,
        observacoes,
        ativo: true,
      };

      if (editingLote) {
        lotePayload.produto = parseInt(produtoId, 10);

        await updateLote(editingLote.id, lotePayload);

        notifications.show({
          title: 'Lote atualizado',
          message: `Entrada ajustada para ${
            produtoSelecionado?.nome || editingLote.produto_nome
          }`,
          color: 'green',
        });
      } else {
        const data = {
          produto_id: produtoId,
          quantidade: quantidadeNumber,
          data_validade: dataValidadeFormatada,
          numero_lote: numeroLote,
          fornecedor_id: fornecedorId,
          preco_custo_lote: precoCustoNumber,
          observacoes,
        };

        await entradaEstoque(data);

        notifications.show({
          title: 'Sucesso',
          message: `Lote adicionado ao estoque de ${produtoSelecionado?.nome}`,
          color: 'green',
        });
      }

      resetForm();

      // Recarrega os dados
      await carregarDados();
    } catch (error) {
      console.error('Erro ao adicionar lote:', error);
      notifications.show({
        title: 'Erro',
        message:
          error.response?.data?.error ||
          error.response?.data?.quantidade?.[0] ||
          'Não foi possível salvar o lote',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setProdutoId('');
    setQuantidade(null);
    setDataValidade(null);
    setNumeroLote('');
    setFornecedor('');
    setPrecoCustoLote(null);
    setObservacoes('');
    setEditingLote(null);
  };

  const iniciarEdicao = (lote) => {
    setEditingLote(lote);
    setProdutoId(lote.produto.toString());
    setQuantidade(parseFloat(lote.quantidade));
    setNumeroLote(lote.numero_lote || '');
    setObservacoes(lote.observacoes || '');
    setFornecedor(lote.fornecedor ? lote.fornecedor.toString() : '');
    setPrecoCustoLote(
      lote.preco_custo_lote !== null ? parseFloat(lote.preco_custo_lote) : null
    );
    setDataValidade(lote.data_validade ? new Date(lote.data_validade) : null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getDiasParaVencer = (dataValidade) => {
    if (!dataValidade) return null;
    const hoje = new Date();
    const vencimento = new Date(dataValidade);
    const diffTime = vencimento - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getBadgeValidade = (lote) => {
    if (!lote.data_validade) {
      return <Badge color="gray">Sem validade</Badge>;
    }

    const dias = getDiasParaVencer(lote.data_validade);

    if (dias < 0) {
      return <Badge color="red">Vencido</Badge>;
    } else if (dias <= 7) {
      return <Badge color="yellow">{dias} dias</Badge>;
    } else {
      return <Badge color="green">{dias} dias</Badge>;
    }
  };

  const produtosOptions = produtos.map(p => ({
    value: p.id.toString(),
    label: `${p.nome} - Estoque: ${p.estoque}`,
  }));

  const fornecedoresOptions = fornecedores.map(f => ({
    value: f.id.toString(),
    label: f.nome_fantasia ? `${f.nome} (${f.nome_fantasia})` : f.nome,
  }));

  return (
    <Container size="xl" py="xl">
      <LoadingOverlay visible={loading} />

      <Stack gap="lg">
        <div>
          <Title order={2}>
            <Group>
              <FaBoxOpen size={32} />
              Entrada de Estoque
            </Group>
          </Title>
          <Text c="dimmed" size="sm">
            Importe notas fiscais para atualizar o estoque automaticamente e use os ajustes abaixo apenas para casos excepcionais.
          </Text>
        </div>

        {/* Importação NF-e */}
        <Paper shadow="sm" p="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <Group gap="sm">
                <ThemeIcon color="blue" size="lg" radius="md" variant="light">
                  <FaFileInvoiceDollar size={18} />
                </ThemeIcon>
                <div>
                  <Title order={4}>Importar NF-e (XML)</Title>
                  <Text c="dimmed" size="sm">
                    Faça o upload do XML da nota fiscal de entrada para cadastrar produtos, atualizar estoque e registrar custos automaticamente.
                  </Text>
                </div>
              </Group>
            </Group>

            <Alert icon={<FaInfoCircle size={16} />} color="blue" variant="light">
              Garanta que o XML esteja completo (modelo 55). Após a importação, defina o preço de venda dos itens sinalizados em <strong>Produtos</strong>.
            </Alert>

            <FileInput
              label="Arquivo XML da NF-e"
              placeholder="Selecione o arquivo .xml"
              value={xmlFile}
              onChange={setXmlFile}
              accept=".xml"
              leftSection={<FaFileUpload size={16} />}
            />

            <Group justify="space-between" align="center">
              <Text size="sm" c="dimmed">
                Aceita arquivos de NF-e (versão 4.0). Cada upload importa todos os itens da nota.
              </Text>
              <Button
                leftSection={<FaFileUpload size={16} />}
                onClick={handleImportarXml}
                loading={importandoXml}
                disabled={!xmlFile || importandoXml}
              >
                Importar NF-e
              </Button>
            </Group>

            {notaImportada && (
              <Card withBorder shadow="sm" radius="md">
                <Stack gap="sm">
                  <Group justify="space-between" align="center">
                    <div>
                      <Text fw={600}>
                        Nota {notaImportada.numero}/{notaImportada.serie} · Chave {notaImportada.chave_acesso}
                      </Text>
                      <Text size="sm" c="dimmed">
                        Emitente: {notaImportada.fornecedor_nome || '—'} · Total R$ {Number(notaImportada.valor_total || 0).toFixed(2)}
                      </Text>
                    </div>
                    <Button
                      variant="light"
                      color="orange"
                      component={Link}
                      to="/produtos"
                      size="xs"
                    >
                      Ajustar preços dos produtos
                    </Button>
                  </Group>

                  <Text size="sm" fw={500}>
                    Itens importados ({notaImportada.itens?.length || 0})
                  </Text>

                  <Table highlightOnHover withTableBorder>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Descrição</Table.Th>
                        <Table.Th>Qtd.</Table.Th>
                        <Table.Th>Unidade</Table.Th>
                        <Table.Th>Preço de custo</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {(notaImportada.itens || []).map((item) => (
                        <Table.Tr key={item.id}>
                          <Table.Td>{item.descricao}</Table.Td>
                          <Table.Td>{Number(item.quantidade || 0).toFixed(2)}</Table.Td>
                          <Table.Td>{item.unidade || '-'}</Table.Td>
                          <Table.Td>R$ {Number(item.valor_unitario || 0).toFixed(2)}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Stack>
              </Card>
            )}
          </Stack>
        </Paper>

        <Divider label="Ajustes manuais (usar apenas em exceções)" labelPosition="center" />

        {/* Formulário de Ajuste Manual */}
        <Paper shadow="sm" p="md" withBorder>
          <Group justify="space-between" align="center" mb="sm">
            <Stack gap={2}>
              <Title order={4}>
                {editingLote ? 'Editar ajuste de estoque' : 'Novo ajuste de estoque'}
              </Title>
              <Text c="dimmed" size="sm">
                Utilize este formulário somente para correções de inventário, perdas ou ajustes pontuais. Entradas regulares devem ser feitas via NF-e.
              </Text>
            </Stack>
            {editingLote && (
              <Badge color="orange" variant="light">
                Editando lote #{editingLote.id}
              </Badge>
            )}
          </Group>

          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Select
                    label="Produto"
                    placeholder="Selecione o produto"
                    data={produtosOptions}
                    value={produtoId}
                    onChange={setProdutoId}
                    required
                    searchable
                    clearable
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 3 }}>
                  <NumberInput
                    label="Quantidade"
                    placeholder="Quantidade"
                    value={quantidade}
                    onChange={setQuantidade}
                    required
                    min={0.01}
                    step={0.01}
                    decimalScale={2}
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 3 }}>
                  <DateInput
                    label="Data de Validade"
                    placeholder="Selecione a data"
                    value={dataValidade}
                    onChange={setDataValidade}
                    leftSection={<FaCalendar size={16} />}
                    clearable
                    valueFormat="DD/MM/YYYY"
                  />
                </Grid.Col>
              </Grid>

              <Grid>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <TextInput
                    label="Número do Lote"
                    placeholder="Ex: L123456 (opcional)"
                    value={numeroLote}
                    onChange={(e) => setNumeroLote(e.target.value)}
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Select
                    label="Fornecedor"
                    placeholder="Selecione o fornecedor (opcional)"
                    data={fornecedoresOptions}
                    value={fornecedor}
                    onChange={setFornecedor}
                    leftSection={<FaTruck size={16} />}
                    searchable
                    clearable
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 4 }}>
                  <NumberInput
                    label="Preço de Custo"
                    placeholder="R$ 0,00 (opcional)"
                    value={precoCustoLote}
                    onChange={setPrecoCustoLote}
                    min={0}
                    step={0.01}
                    decimalScale={2}
                    prefix="R$ "
                  />
                </Grid.Col>
              </Grid>

              <Textarea
                label="Observações"
                placeholder="Observações sobre este lote (opcional)"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
              />

              <Group justify="space-between" align="center">
                {editingLote ? (
                  <Button
                    variant="subtle"
                    color="gray"
                    leftSection={<FaTimes size={14} />}
                    onClick={resetForm}
                  >
                    Cancelar edição
                  </Button>
                ) : (
                  <div />
                )}
                <Button
                  type="submit"
                  leftSection={<FaPlus size={16} />}
                  loading={loading}
                >
                  {editingLote ? 'Salvar alterações' : 'Adicionar ao Estoque'}
                </Button>
              </Group>
            </Stack>
          </form>
        </Paper>

        {/* Lotes Recentes */}
        <Card shadow="sm" padding="md" withBorder>
          <Card.Section withBorder inheritPadding py="xs">
            <Text fw={500}>Últimas Entradas de Estoque</Text>
          </Card.Section>

          <Card.Section>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Data</Table.Th>
                  <Table.Th>Produto</Table.Th>
                  <Table.Th>Lote</Table.Th>
                  <Table.Th>Quantidade</Table.Th>
                  <Table.Th>Validade</Table.Th>
                  <Table.Th>Fornecedor</Table.Th>
                  <Table.Th style={{ width: 80 }}>Ações</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {lotesRecentes.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={7} style={{ textAlign: 'center' }}>
                      <Text c="dimmed">Nenhum lote cadastrado</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  lotesRecentes.map((lote) => (
                    <Table.Tr key={lote.id}>
                      <Table.Td>{formatDate(lote.data_entrada)}</Table.Td>
                      <Table.Td>{lote.produto_nome}</Table.Td>
                      <Table.Td>{lote.numero_lote || `#${lote.id}`}</Table.Td>
                      <Table.Td>{lote.quantidade} un</Table.Td>
                      <Table.Td>
                        {getBadgeValidade(lote)}
                      </Table.Td>
                      <Table.Td>{lote.fornecedor_nome || '-'}</Table.Td>
                      <Table.Td>
                        <ActionIcon
                          color="blue"
                          variant="light"
                          onClick={() => iniciarEdicao(lote)}
                          title="Editar entrada"
                        >
                          <FaEdit size={16} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Card.Section>
        </Card>
      </Stack>
    </Container>
  );
};

export default EntradaEstoque;

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getProdutos, createProduto, updateProduto, deleteProduto, getCategorias, searchOpenFoodProducts, createCategoria, getFornecedores, excluirTodosProdutos } from '../services/api';
import { localDB } from '../utils/db';
import {
  Table,
  Button,
  Modal,
  TextInput,
  NumberInput,
  Select,
  Group,
  Title,
  ActionIcon,
  Stack,
  Text,
  ScrollArea,
  Card,
  Badge,
  ThemeIcon,
  Loader,
  Image,
  Alert,
  Checkbox,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { FaEdit, FaTrash, FaPlus, FaBarcode, FaCheck, FaTimes, FaExclamationTriangle, FaSearch, FaTag, FaBomb } from 'react-icons/fa';
import BarcodeScanner from '../components/BarcodeScanner';
import './Estoque.css';

function Estoque() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [busca, setBusca] = useState('');
  const [opened, { open, close }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [excluirTodosModalOpened, { open: openExcluirTodosModal, close: closeExcluirTodosModal }] = useDisclosure(false);
  const [confirmacaoExcluirTodos, setConfirmacaoExcluirTodos] = useState(false);
  const [excluindoTodos, setExcluindoTodos] = useState(false);
  const [scannerAberto, setScannerAberto] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const initialFormData = useMemo(
    () => ({
      nome: '',
      marca: '',
      preco: '',
      preco_custo: '',
      estoque: '',
      categoria: '',
      fornecedor: '',
      codigo_barras: '',
      conteudo_valor: '',
      conteudo_unidade: '',
      data_validade: null,
    }),
    []
  );
  const [formData, setFormData] = useState(initialFormData);
  const [openFoodQuery, setOpenFoodQuery] = useState('');
  const [openFoodResults, setOpenFoodResults] = useState([]);
  const [openFoodLoading, setOpenFoodLoading] = useState(false);
  const [openFoodSelected, setOpenFoodSelected] = useState(null);
  const [categoriaSugestao, setCategoriaSugestao] = useState('');
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('');
  const [criandoCategoria, setCriandoCategoria] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingEditId, setPendingEditId] = useState(location.state?.editarProdutoId || null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (location.state?.editarProdutoId) {
      setPendingEditId(location.state.editarProdutoId);
      navigate('/estoque', { replace: true });
    }
  }, [location.state, navigate]);

  const loadInitialData = async () => {
    const cachedProdutos = await localDB.getCachedProdutos();
    if (cachedProdutos.length > 0) {
      setProdutos(cachedProdutos);
    }

    try {
      const [produtosRes, categoriasRes, fornecedoresRes] = await Promise.all([
        getProdutos(),
        getCategorias(),
        getFornecedores(),
      ]);
      const produtosData = produtosRes.data.results || produtosRes.data;
      const categoriasData = categoriasRes.data.results || categoriasRes.data;
      const fornecedoresData = fornecedoresRes.data.results || fornecedoresRes.data;

      setProdutos(produtosData);
      setCategorias(categoriasData);
      setFornecedores(fornecedoresData);
      await localDB.cacheProdutos(produtosData);
    } catch (error) {
      console.error('Servidor offline, usando cache local');
    }
  };

  const resetForm = useCallback(() => {
    setFormData({ ...initialFormData });
    setEditingProduct(null);
    setOpenFoodQuery('');
    setOpenFoodResults([]);
    setOpenFoodSelected(null);
    setCategoriaSugestao('');
    setNovaCategoriaNome('');
    setCriandoCategoria(false);
  }, [initialFormData]);

  const handleOpenModal = useCallback(
    (produto = null) => {
      setOpenFoodQuery('');
      setOpenFoodResults([]);
      setOpenFoodSelected(null);
      setCategoriaSugestao('');
      setNovaCategoriaNome('');
      setCriandoCategoria(false);

      if (produto) {
        setEditingProduct(produto);
        setFormData({
          nome: produto.nome,
          marca: produto.marca || '',
          preco: produto.preco,
          preco_custo: produto.preco_custo || '',
          estoque: produto.estoque,
          categoria: produto.categoria?.toString() || '',
          fornecedor: produto.fornecedor ? produto.fornecedor.toString() : '',
          codigo_barras: produto.codigo_barras || '',
          conteudo_valor: produto.conteudo_valor ?? '',
          conteudo_unidade: produto.conteudo_unidade || '',
          data_validade: produto.data_validade ? new Date(produto.data_validade) : null,
        });
      } else {
        resetForm();
      }
      open();
    },
    [open, resetForm]
  );

  useEffect(() => {
    if (pendingEditId && produtos.length > 0) {
      const produto = produtos.find((p) => p.id === pendingEditId);
      if (produto) {
        handleOpenModal(produto);
        setPendingEditId(null);
      }
    }
  }, [pendingEditId, produtos, handleOpenModal]);

  const handleCloseModal = () => {
    close();
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // VALIDAÇÃO: Verifica se código de barras já existe
    if (formData.codigo_barras && formData.codigo_barras.trim()) {
      const codigoDuplicado = produtos.find(p =>
        p.codigo_barras === formData.codigo_barras.trim() &&
        p.id !== editingProduct?.id  // Ignora o próprio produto ao editar
      );

      if (codigoDuplicado) {
        notifications.show({
          title: 'Código de barras duplicado!',
          message: `Este código já está cadastrado no produto: ${codigoDuplicado.nome}`,
          color: 'red',
          icon: <FaTimes />,
          autoClose: 6000,
        });
        return; // Bloqueia o envio
      }
    }

    // Conversão segura da data de validade
    let dataValidadeFormatada = null;
    if (formData.data_validade) {
      if (formData.data_validade instanceof Date) {
        dataValidadeFormatada = formData.data_validade.toISOString().split('T')[0];
      } else if (typeof formData.data_validade === 'string') {
        // Se já é uma string, usa diretamente
        dataValidadeFormatada = formData.data_validade;
      }
    }

    const conteudoValor =
      formData.conteudo_valor === '' || formData.conteudo_valor === null
        ? null
        : Number(formData.conteudo_valor);

    const dataToSend = {
      nome: formData.nome,
      marca: formData.marca?.trim() || '',
      preco: Number(formData.preco),
      preco_custo:
        formData.preco_custo === '' || formData.preco_custo === null
          ? 0
          : Number(formData.preco_custo),
      estoque: Number(formData.estoque),
      categoria: formData.categoria ? parseInt(formData.categoria, 10) : null,
      fornecedor: formData.fornecedor ? parseInt(formData.fornecedor, 10) : null,
      codigo_barras: formData.codigo_barras,
      conteudo_valor: conteudoValor,
      conteudo_unidade: formData.conteudo_unidade?.trim() || '',
      data_validade: dataValidadeFormatada,
    };
    try {
      if (editingProduct) {
        await updateProduto(editingProduct.id, dataToSend);
        notifications.show({
          title: 'Produto atualizado!',
          message: `${formData.nome} foi atualizado com sucesso`,
          color: 'green',
          icon: <FaCheck />,
        });
      } else {
        await createProduto(dataToSend);
        notifications.show({
          title: 'Produto criado!',
          message: `${formData.nome} foi cadastrado com sucesso`,
          color: 'green',
          icon: <FaCheck />,
        });
      }
      handleCloseModal();
      loadInitialData();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      const errorMsg = error.response?.data?.codigo_barras?.[0]
        || error.response?.data?.detail
        || 'Erro ao salvar produto';

      notifications.show({
        title: 'Erro ao salvar',
        message: errorMsg,
        color: 'red',
        icon: <FaTimes />,
      });
    }
  };

  const handleOpenDeleteModal = (produto) => {
    setDeletingProduct(produto);
    openDeleteModal();
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    try {
      await deleteProduto(deletingProduct.id);
      closeDeleteModal();
      setDeletingProduct(null);
      loadInitialData();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      alert('Erro ao excluir produto');
    }
  };

  const handleCancelDelete = () => {
    closeDeleteModal();
    setDeletingProduct(null);
  };

  const handleExcluirTodos = async () => {
    if (!confirmacaoExcluirTodos) {
      notifications.show({
        title: 'Confirmação necessária',
        message: 'Você precisa marcar a caixa de confirmação antes de prosseguir',
        color: 'red',
        icon: <FaExclamationTriangle />,
      });
      return;
    }

    try {
      setExcluindoTodos(true);
      const response = await excluirTodosProdutos();

      notifications.show({
        title: 'Produtos excluídos com sucesso',
        message: `${response.data.produtos_excluidos} produtos, ${response.data.lotes_excluidos} lotes e ${response.data.itens_venda_excluidos} itens de venda excluídos`,
        color: 'green',
        icon: <FaCheck />,
      });

      closeExcluirTodosModal();
      setConfirmacaoExcluirTodos(false);
      await loadInitialData();
    } catch (error) {
      console.error('Erro ao excluir produtos:', error);
      notifications.show({
        title: 'Erro ao excluir produtos',
        message: error.response?.data?.detail || 'Não foi possível excluir os produtos',
        color: 'red',
        icon: <FaTimes />,
      });
    } finally {
      setExcluindoTodos(false);
    }
  };

  const handleScan = (codigoBarras) => {
    setFormData(prev => ({ ...prev, codigo_barras: codigoBarras }));
    notifications.show({
      title: 'Código capturado!',
      message: `Código ${codigoBarras} adicionado ao formulário`,
      color: 'green',
      icon: <FaCheck />,
      autoClose: 3000,
    });
    setScannerAberto(false);
  };

  const handleSelectOpenFoodProduct = (product) => {
    if (!product) return;

    let quantityValue = product.quantity_value;
    let quantityUnit = product.quantity_unit;

    const suggestionRaw = (product.category_suggestion || '').trim();
    let categoriaSelecionada = null;

    if (suggestionRaw) {
      const match = categorias.find(
        (cat) => cat.nome.toLowerCase() === suggestionRaw.toLowerCase()
      );

      if (match) {
        categoriaSelecionada = match.id.toString();
        setCategoriaSugestao('');
        setNovaCategoriaNome('');
      } else {
        setCategoriaSugestao(suggestionRaw);
        setNovaCategoriaNome(suggestionRaw);
      }
    } else {
      setCategoriaSugestao('');
      setNovaCategoriaNome('');
    }

    if ((quantityValue === null || typeof quantityValue === 'undefined') && product.quantity) {
      const match = String(product.quantity).trim().match(/([\d,.]+)\s*([a-zA-Zµμ]+)/);
      if (match) {
        const normalized = match[1].replace(',', '.');
        const parsed = Number(normalized);
        if (!Number.isNaN(parsed)) {
          quantityValue = parsed;
        }
        quantityUnit = match[2];
      }
    }

    setOpenFoodSelected(product);
    setFormData((prev) => ({
      ...prev,
      nome: product.name || prev.nome,
      codigo_barras: product.code || prev.codigo_barras,
      marca: product.brand || prev.marca,
      categoria: categoriaSelecionada ?? prev.categoria,
      conteudo_valor:
        quantityValue === null || typeof quantityValue === 'undefined'
          ? prev.conteudo_valor
          : quantityValue,
      conteudo_unidade: quantityUnit
        ? String(quantityUnit).toUpperCase()
        : prev.conteudo_unidade,
    }));

    notifications.show({
      title: 'Sugestão aplicada',
      message: 'Revise os dados e complete as demais informações antes de salvar.',
      color: 'blue',
      icon: <FaCheck />,
      autoClose: 4000,
    });
  };

  const handleCreateCategory = async (nomeCategoria) => {
    const nome = (nomeCategoria || '').trim();
    if (!nome) {
      notifications.show({
        title: 'Informe a categoria',
        message: 'Digite um nome antes de criar a categoria.',
        color: 'orange',
        icon: <FaExclamationTriangle />,
      });
      return;
    }

    const existente = categorias.find(
      (cat) => cat.nome.toLowerCase() === nome.toLowerCase()
    );
    if (existente) {
      notifications.show({
        title: 'Categoria já existe',
        message: `Usando a categoria ${existente.nome}.`,
        color: 'blue',
        icon: <FaCheck />,
      });
      setFormData((prev) => ({
        ...prev,
        categoria: existente.id.toString(),
      }));
      setCategoriaSugestao('');
      setNovaCategoriaNome('');
      return;
    }

    try {
      setCriandoCategoria(true);
      const response = await createCategoria({ nome });
      const novaCategoria = response.data;
      setCategorias((prev) => [...prev, novaCategoria]);
      setFormData((prev) => ({
        ...prev,
        categoria: novaCategoria.id?.toString() || prev.categoria,
      }));
      notifications.show({
        title: 'Categoria criada',
        message: `${nome} adicionada com sucesso.`,
        color: 'green',
        icon: <FaCheck />,
      });
      setCategoriaSugestao('');
      setNovaCategoriaNome('');
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      const errorMsg =
        error.response?.data?.nome?.[0] ||
        error.response?.data?.detail ||
        'Não foi possível criar a categoria.';
      notifications.show({
        title: 'Erro',
        message: errorMsg,
        color: 'red',
        icon: <FaTimes />,
      });
    } finally {
      setCriandoCategoria(false);
    }
  };

  const handleFetchOpenFood = async ({ byCode = false } = {}) => {
    const params = {};
    if (byCode) {
      const codigo = formData.codigo_barras?.trim();
      if (!codigo) {
        notifications.show({
          title: 'Informe o código de barras',
          message: 'Digite ou capture o GTIN para buscar o produto.',
          color: 'orange',
          icon: <FaExclamationTriangle />,
        });
        return;
      }
      params.code = codigo;
    } else {
      if (!openFoodQuery.trim()) {
        notifications.show({
          title: 'Digite um termo',
          message: 'Use nome, marca ou palavra-chave para buscar.',
          color: 'orange',
          icon: <FaExclamationTriangle />,
        });
        return;
      }
      params.q = openFoodQuery.trim();
    }

    setOpenFoodLoading(true);
    try {
      const response = await searchOpenFoodProducts(params);
      const results = Array.isArray(response.data) ? response.data : [];
      setOpenFoodResults(results);

      if (byCode && results.length === 1) {
        handleSelectOpenFoodProduct(results[0]);
      } else if (results.length === 0) {
        notifications.show({
          title: 'Nada encontrado',
          message: 'Tente ajustar o termo ou busque manualmente.',
          color: 'orange',
          icon: <FaExclamationTriangle />,
        });
      }
    } catch (error) {
      console.error('Erro ao consultar Open Food Facts:', error);
      const detail =
        error.response?.data?.detail ||
        'Não foi possível consultar o Open Food Facts agora.';
      notifications.show({
        title: 'Erro na consulta',
        message: detail,
        color: 'red',
        icon: <FaTimes />,
      });
    } finally {
      setOpenFoodLoading(false);
    }
  };

  const getValidadeBadge = (produto) => {
    if (!produto.data_validade) return null;

    if (produto.esta_vencido) {
      return <Badge color="red" leftSection={<FaExclamationTriangle />}>VENCIDO</Badge>;
    }

    if (produto.proximo_vencimento) {
      return <Badge color="yellow" leftSection={<FaExclamationTriangle />}>{produto.dias_para_vencer} dias</Badge>;
    }

    return <Badge color="green">{produto.dias_para_vencer} dias</Badge>;
  };

  // Filtra produtos pela busca
  const produtosFiltrados = produtos.filter(produto =>
    produto.nome.toLowerCase().includes(busca.toLowerCase()) ||
    produto.codigo_barras?.includes(busca) ||
    produto.categoria_nome?.toLowerCase().includes(busca.toLowerCase())
  );

  const rows = produtosFiltrados.map((produto) => {
    const precoVenda = Number(produto.preco || 0);
    const precoCusto = Number(produto.preco_custo || 0);
    const estoqueAtual = Number(produto.estoque || 0);
    const semPreco = precoVenda <= 0;

    const estiloLinha = {
      backgroundColor: produto.esta_vencido
        ? '#fee'
        : produto.proximo_vencimento
        ? '#ffeaa7'
        : semPreco
        ? '#fff4e6'
        : 'inherit',
    };

    return (
      <Table.Tr key={produto.id} style={estiloLinha}>
      <Table.Td>
        <Group gap="xs">
          <Text>{produto.nome}</Text>
          {getValidadeBadge(produto)}
          {semPreco && (
            <Badge color="orange" size="sm" leftSection={<FaTag size={10} />}>
              Sem preço
            </Badge>
          )}
        </Group>
      </Table.Td>
      <Table.Td>{produto.codigo_barras || '-'}</Table.Td>
      <Table.Td>
        {semPreco ? (
          <Text size="sm" c="orange" fw={600}>
            Defina o preço
          </Text>
        ) : (
          <>R$ {precoVenda.toFixed(2)}</>
        )}
      </Table.Td>
      <Table.Td>
        {precoCusto > 0 ? (
          <>
            <Text size="sm">R$ {precoCusto.toFixed(2)}</Text>
            <Text size="xs" c="dimmed">{produto.margem_lucro?.toFixed(1)}%</Text>
          </>
        ) : (
          <Text size="xs" c="red">Não cadastrado</Text>
        )}
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <Text>{estoqueAtual}</Text>
          {produto.total_lotes > 0 && (
            <Badge size="sm" variant="light" color="blue">
              {produto.total_lotes} lote{produto.total_lotes !== 1 ? 's' : ''}
            </Badge>
          )}
        </Group>
      </Table.Td>
      <Table.Td>{produto.categoria_nome || 'Sem categoria'}</Table.Td>
      <Table.Td>{produto.fornecedor_nome || '-'}</Table.Td>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          <ActionIcon color="blue" aria-label="Editar" onClick={() => handleOpenModal(produto)} size="lg">
            <FaEdit size={16} />
          </ActionIcon>
          <ActionIcon color="red" aria-label="Excluir" onClick={() => handleOpenDeleteModal(produto)} size="lg">
            <FaTrash size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
    );
  });

  const cards = produtosFiltrados.map((produto) => {
    const precoVenda = Number(produto.preco || 0);
    const precoCusto = Number(produto.preco_custo || 0);
    const estoqueAtual = Number(produto.estoque || 0);
    const semPreco = precoVenda <= 0;

    return (
    <Card
      withBorder
      radius="md"
      p="sm"
      key={produto.id}
      className="produto-card"
      style={{ borderColor: produto.esta_vencido ? '#fa5252' : produto.proximo_vencimento ? '#fab005' : undefined }}
    >
      <Group justify="space-between" mb="xs">
        <Stack gap={4}>
          <Text fw={500}>{produto.nome}</Text>
          {getValidadeBadge(produto)}
        </Stack>
        <Group gap="xs" wrap="nowrap">
          <ActionIcon color="blue" variant="light" onClick={() => handleOpenModal(produto)} size="lg">
            <FaEdit size={16} />
          </ActionIcon>
          <ActionIcon color="red" variant="light" onClick={() => handleOpenDeleteModal(produto)} size="lg">
            <FaTrash size={16} />
          </ActionIcon>
        </Group>
      </Group>
      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Preço Venda:</Text>
          {semPreco ? (
            <Group gap={4}>
              <ThemeIcon size="sm" radius="xl" color="orange" variant="light">
                <FaTag size={10} />
              </ThemeIcon>
              <Text size="sm" c="orange" fw={600}>
                Defina o preço
              </Text>
            </Group>
          ) : (
            <Text size="sm" fw={500}>R$ {precoVenda.toFixed(2)}</Text>
          )}
        </Group>
        {precoCusto > 0 ? (
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Preço Custo:</Text>
            <Text size="sm">R$ {precoCusto.toFixed(2)} ({produto.margem_lucro?.toFixed(1)}%)</Text>
          </Group>
        ) : (
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Preço Custo:</Text>
            <Text size="sm" c="red">Não cadastrado</Text>
          </Group>
        )}
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Estoque:</Text>
          <Group gap="xs">
            <Text size="sm" fw={500}>{estoqueAtual}</Text>
            {produto.total_lotes > 0 && (
              <Badge size="xs" variant="light" color="blue">
                {produto.total_lotes} lote{produto.total_lotes !== 1 ? 's' : ''}
              </Badge>
            )}
          </Group>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Categoria:</Text>
          <Text size="sm">{produto.categoria_nome || '-'}</Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Fornecedor:</Text>
          <Text size="sm">{produto.fornecedor_nome || '-'}</Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Cód. Barras:</Text>
          <Text size="sm">{produto.codigo_barras || '-'}</Text>
        </Group>
        {semPreco && (
          <Button
            mt="sm"
            variant="light"
            color="orange"
            onClick={() => handleOpenModal(produto)}
            leftSection={<FaTag size={14} />}
          >
            Definir preço agora
          </Button>
        )}
      </Stack>
    </Card>
    );
  });

  const categoriaOptions = categorias
    .filter((cat) => cat.ativo !== false)
    .map((cat) => ({ value: cat.id.toString(), label: cat.nome }));
  const fornecedorOptions = fornecedores
    .filter((forn) => forn.ativo !== false)
    .map((forn) => ({ value: forn.id.toString(), label: forn.nome }));

  return (
    <>
      <Group justify="space-between" mb="md" wrap="wrap" gap="xs">
        <Title order={2}>Estoque</Title>
        <Group gap="xs">
          <Button
            leftSection={<FaBomb />}
            onClick={openExcluirTodosModal}
            size="md"
            color="red"
            variant="light"
          >
            Excluir Todos
          </Button>
          <Button leftSection={<FaPlus />} onClick={() => handleOpenModal()} size="md">
            Novo Produto
          </Button>
        </Group>
      </Group>

      <TextInput
        placeholder="Buscar por nome, código de barras ou categoria..."
        leftSection={<FaSearch />}
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        size="md"
        mb="md"
      />

      <Modal opened={opened} onClose={handleCloseModal} title={editingProduct ? 'Editar Produto' : 'Novo Produto'} size="md">
        <form onSubmit={handleSubmit}>
          <Stack gap="sm">
            <TextInput label="Nome" placeholder="Nome do produto" required value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} size="md" />
            <TextInput
              label="Marca"
              placeholder="Ex.: Coca-Cola"
              value={formData.marca}
              onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
              size="md"
            />
            <Stack gap="xs">
              <Group align="flex-end" gap="xs">
                <TextInput
                  label="Buscar no Open Food Facts"
                  placeholder="Ex.: Doritos 120g"
                  value={openFoodQuery}
                  onChange={(e) => setOpenFoodQuery(e.target.value)}
                  size="md"
                  style={{ flex: 1 }}
                />
                <Button
                  onClick={() => handleFetchOpenFood({ byCode: false })}
                  loading={openFoodLoading}
                  variant="light"
                  size="md"
                >
                  Buscar
                </Button>
              </Group>
              <Text size="xs" c="dimmed">
                Dados colaborativos do Open Food Facts. Sempre revise antes de salvar.
              </Text>
              {openFoodResults.length > 0 && (
                <Card withBorder radius="md" p="sm">
                  <Stack gap="sm">
                    <Text size="sm" fw={600}>
                      Sugestões encontradas
                    </Text>
                    <ScrollArea h={220} type="auto">
                      <Stack gap="sm">
                        {openFoodResults.map((product) => (
                          <Card
                            withBorder
                            radius="sm"
                            p="sm"
                            key={`${product.code || product.name}-${product.image_small_url}`}
                            shadow={openFoodSelected?.code === product.code ? 'sm' : 'xs'}
                            className="openfood-card"
                          >
                            <Group align="flex-start" gap="sm" wrap="nowrap">
                              <Image
                                src={product.image_small_url || product.image_url}
                                alt={product.name || 'Produto'}
                                withPlaceholder
                                radius="sm"
                                w={64}
                                h={64}
                                fit="cover"
                              />
                              <Stack gap={4} style={{ flex: 1 }}>
                                <Text fw={500} size="sm">
                                  {product.name || 'Nome não informado'}
                                </Text>
                                <Group gap="xs">
                                  {product.brand && (
                                    <Badge size="xs" color="blue" variant="light">
                                      {product.brand}
                                    </Badge>
                                  )}
                                  {product.quantity && (
                                    <Badge size="xs" variant="outline">
                                      {product.quantity}
                                    </Badge>
                                  )}
                                </Group>
                                {product.code && (
                                  <Text size="xs" c="dimmed">
                                    GTIN: {product.code}
                                  </Text>
                                )}
                              </Stack>
                              <Button
                                variant={
                                  openFoodSelected?.code === product.code ? 'filled' : 'light'
                                }
                                color="blue"
                                size="compact-sm"
                                onClick={() => handleSelectOpenFoodProduct(product)}
                              >
                                {openFoodSelected?.code === product.code ? 'Selecionado' : 'Usar'}
                              </Button>
                            </Group>
                          </Card>
                        ))}
                      </Stack>
                    </ScrollArea>
                  </Stack>
                </Card>
              )}
              {openFoodLoading && openFoodResults.length === 0 && (
                <Group justify="center">
                  <Loader size="sm" />
                </Group>
              )}
            </Stack>

            <Stack gap={4}>
              <Text size="sm" fw={500}>Código de Barras</Text>
              <Group gap="xs">
                <TextInput
                  placeholder="7891234567890"
                  value={formData.codigo_barras}
                  onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })}
                  size="md"
                  style={{ flex: 1 }}
                />
                <ActionIcon
                  size={36}
                  color="orange"
                  variant="filled"
                  onClick={() => setScannerAberto(true)}
                  title="Ler código com câmera"
                >
                  <FaBarcode size={18} />
                </ActionIcon>
                <Button
                  variant="light"
                  size="md"
                  loading={openFoodLoading}
                  onClick={() => handleFetchOpenFood({ byCode: true })}
                >
                  Buscar por código
                </Button>
              </Group>
              <Text size="xs" c="dimmed">Opcional - Digite ou use a câmera para escanear</Text>
            </Stack>

            <Group grow align="flex-end" gap="xs">
              <NumberInput
                label="Conteúdo"
                placeholder="Ex.: 2"
                precision={2}
                value={
                  formData.conteudo_valor === '' || formData.conteudo_valor === null
                    ? ''
                    : Number(formData.conteudo_valor)
                }
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    conteudo_valor: value === '' ? '' : value,
                  })
                }
                size="md"
              />
              <TextInput
                label="Unidade"
                placeholder="Ex.: L, ML"
                value={formData.conteudo_unidade}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    conteudo_unidade: e.target.value.toUpperCase(),
                  })
                }
                size="md"
              />
            </Group>
            <Text size="xs" c="dimmed">
              Esses campos são opcionais e ajudam a identificar variações (ex.: 2 L, 600 ML).
            </Text>

            <NumberInput
              label="Preço de Venda"
              placeholder="9.99"
              required
              precision={2}
              value={Number(formData.preco)}
              onChange={(value) => setFormData({ ...formData, preco: value })}
              size="md"
              leftSection="R$"
            />
            <NumberInput
              label="Preço de Custo"
              placeholder="0.00"
              precision={2}
              value={Number(formData.preco_custo)}
              onChange={(value) => setFormData({ ...formData, preco_custo: value })}
              size="md"
              leftSection="R$"
              description="Quanto você pagou no fornecedor (opcional, mas importante para calcular lucro)"
            />
            {formData.preco && formData.preco_custo && Number(formData.preco_custo) > 0 && (
              <Text size="sm" c={Number(formData.preco) > Number(formData.preco_custo) ? 'green' : 'red'} fw={600}>
                Margem de lucro: {(((Number(formData.preco) - Number(formData.preco_custo)) / Number(formData.preco_custo)) * 100).toFixed(1)}%
                {' '}(Lucro: R$ {(Number(formData.preco) - Number(formData.preco_custo)).toFixed(2)})
              </Text>
            )}
            <NumberInput label="Estoque" placeholder="0" required value={Number(formData.estoque)} onChange={(value) => setFormData({ ...formData, estoque: value })} size="md" />
            <Select
              label="Categoria"
              placeholder="Selecione uma categoria"
              data={categoriaOptions}
              value={formData.categoria}
              onChange={(value) => setFormData({ ...formData, categoria: value })}
              clearable
              size="md"
            />
            <Select
              label="Fornecedor"
              placeholder="Selecione um fornecedor"
              data={fornecedorOptions}
              value={formData.fornecedor}
              onChange={(value) => setFormData({ ...formData, fornecedor: value })}
              clearable
              size="md"
              description="Opcional - define o fornecedor padrão deste produto"
            />
            {categoriaSugestao && (
              <Card withBorder p="sm" radius="sm">
                <Group justify="space-between" align="center">
                  <Text size="sm">
                    Categoria sugerida:{' '}
                    <Text component="span" fw={600}>
                      {categoriaSugestao}
                    </Text>
                  </Text>
                  <Button
                    size="xs"
                    variant="light"
                    color="blue"
                    loading={criandoCategoria}
                    onClick={() => handleCreateCategory(categoriaSugestao)}
                  >
                    Criar categoria
                  </Button>
                </Group>
              </Card>
            )}
            <Card withBorder p="sm" radius="sm">
              <Stack gap="xs">
                <Text size="sm" fw={600}>
                  Criar nova categoria
                </Text>
                <Group align="flex-end" gap="xs">
                  <TextInput
                    placeholder="Nome da categoria"
                    value={novaCategoriaNome}
                    onChange={(e) => setNovaCategoriaNome(e.target.value)}
                    size="md"
                  />
                  <Button
                    variant="light"
                    size="md"
                    loading={criandoCategoria}
                    onClick={() => handleCreateCategory(novaCategoriaNome)}
                  >
                    Adicionar
                  </Button>
                </Group>
              </Stack>
            </Card>
            <DatePickerInput
              label="Data de Validade"
              placeholder="Selecione a data"
              value={formData.data_validade}
              onChange={(value) => setFormData({ ...formData, data_validade: value })}
              minDate={new Date()}
              clearable
              size="md"
              description="Deixe em branco para produtos sem validade"
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleCloseModal}>Cancelar</Button>
              <Button type="submit">{editingProduct ? 'Salvar' : 'Criar'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={deleteModalOpened}
        onClose={handleCancelDelete}
        title="Confirmar Exclusão"
        centered
        size="sm"
      >
        <Stack gap="md">
          <Text>
            Tem certeza que deseja excluir o produto <strong>{deletingProduct?.nome}</strong>?
          </Text>
          <Text size="sm" c="dimmed">
            Esta ação não pode ser desfeita.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={handleCancelDelete}>
              Cancelar
            </Button>
            <Button color="red" onClick={handleConfirmDelete}>
              Excluir
            </Button>
          </Group>
        </Stack>
      </Modal>

      <BarcodeScanner
        opened={scannerAberto}
        onClose={() => setScannerAberto(false)}
        onScan={handleScan}
        title="Ler Código de Barras do Produto"
      />

      <div className="table-desktop">
        <ScrollArea>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nome</Table.Th>
                <Table.Th>Código de Barras</Table.Th>
                <Table.Th>Preço Venda</Table.Th>
                <Table.Th>Custo (Margem)</Table.Th>
                <Table.Th>Estoque</Table.Th>
                <Table.Th>Categoria</Table.Th>
                <Table.Th>Fornecedor</Table.Th>
                <Table.Th style={{ width: '120px' }}>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? rows : (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <Text c="dimmed" ta="center">Nenhum produto cadastrado.</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </div>

      <div className="produtos-cards">
        {cards.length > 0 ? cards : (
          <Text c="dimmed" ta="center">Nenhum produto cadastrado.</Text>
        )}
      </div>

      {/* Modal de Confirmação para Excluir Todos os Produtos */}
      <Modal
        opened={excluirTodosModalOpened}
        onClose={() => {
          closeExcluirTodosModal();
          setConfirmacaoExcluirTodos(false);
        }}
        title="⚠️ EXCLUIR TODOS OS PRODUTOS"
        centered
        size="md"
      >
        <Stack gap="md">
          <Alert color="red" icon={<FaExclamationTriangle />} title="ATENÇÃO: OPERAÇÃO IRREVERSÍVEL">
            Esta ação irá EXCLUIR PERMANENTEMENTE:
            <ul style={{ marginTop: '8px', marginBottom: 0 }}>
              <li><strong>TODOS os produtos cadastrados</strong></li>
              <li><strong>TODOS os lotes vinculados</strong></li>
              <li><strong>TODOS os movimentos de estoque</strong></li>
              <li><strong>TODOS os itens de vendas passadas</strong></li>
            </ul>
          </Alert>

          <Alert color="orange" title="Esta ação NÃO PODE ser desfeita">
            Você perderá permanentemente TODOS os produtos e históricos relacionados.
            O sistema ficará COMPLETAMENTE VAZIO de produtos.
          </Alert>

          <Checkbox
            label="Eu entendo que esta ação é IRREVERSÍVEL e aceito EXCLUIR TODOS OS PRODUTOS"
            checked={confirmacaoExcluirTodos}
            onChange={(event) => setConfirmacaoExcluirTodos(event.currentTarget.checked)}
            color="red"
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => {
                closeExcluirTodosModal();
                setConfirmacaoExcluirTodos(false);
              }}
              disabled={excluindoTodos}
            >
              Cancelar
            </Button>
            <Button
              color="red"
              onClick={handleExcluirTodos}
              loading={excluindoTodos}
              disabled={!confirmacaoExcluirTodos}
              leftSection={<FaBomb />}
            >
              EXCLUIR TODOS OS PRODUTOS
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

export default Estoque;

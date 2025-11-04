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
  Modal,
  NumberInput,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
  Image,
  ScrollArea,
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
  getLotesPorProduto,
  getCategorias,
  updateInventarioItem,
  createLote,
  getFornecedores,
} from '../services/api';
import BarcodeScanner from '../components/BarcodeScanner';
import {
  FaArrowLeft,
  FaBarcode,
  FaCheck,
  FaClipboardList,
  FaSearch,
  FaTrash,
  FaEdit,
  FaPlus,
  FaTimes,
  FaSync,
} from 'react-icons/fa';
import { localDB } from '../utils/db';
import { inventarioSyncManager } from '../utils/inventarioSyncManager';
import {
  loadingMessages,
  successMessages,
  errorMessages,
  warningMessages,
  confirmMessages,
  getRandomMessage,
} from '../utils/messages';

function InventarioDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [sessao, setSessao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [produtos, setProdutos] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [loteModalOpened, setLoteModalOpened] = useState(false);
  const [novoLoteForm, setNovoLoteForm] = useState({
    numero_lote: '',
    quantidade: '',
    data_validade: null,
    preco_custo_lote: '',
    fornecedor: '',
    observacoes: '',
  });
  const [salvandoLote, setSalvandoLote] = useState(false);
  const [scannerAberto, setScannerAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [excluindoId, setExcluindoId] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [itensPendentes, setItensPendentes] = useState(0);
  const [categorias, setCategorias] = useState([]);
  const [form, setForm] = useState({
    produto: '',
    codigo_barras: '',
    descricao: '',
    marca: '',
    conteudo_valor: '',
    conteudo_unidade: '',
    categoria: '',
    quantidade_sistema: '',
    quantidade_contada: '',
    custo_informado: '',
    validade_informada: null,
    observacao: '',
    lote: '',
  });
  const [openFoodQuery, setOpenFoodQuery] = useState('');
  const [openFoodResults, setOpenFoodResults] = useState([]);
  const [openFoodLoading, setOpenFoodLoading] = useState(false);
  const [openFoodSelected, setOpenFoodSelected] = useState(null);
  const [categoriaSugestao, setCategoriaSugestao] = useState('');


  const carregarDados = useCallback(async () => {
    setLoading(true);
    const loadingId = notifications.show({
      message: loadingMessages.inventario.carregando,
      color: 'blue',
      loading: true,
      autoClose: false,
    });

    try {
      const [sessaoRes, produtosRes, categoriasRes, fornecedoresRes] = await Promise.all([
        getInventario(id),
        getProdutos({ ativo: true }),
        getCategorias({ ativo: true }),
        getFornecedores({ ativo: true }),
      ]);

      const sessaoData = sessaoRes.data;
      const produtosData = produtosRes.data.results || produtosRes.data;
      const categoriasData = categoriasRes.data.results || categoriasRes.data;
      const fornecedoresData = fornecedoresRes.data.results || fornecedoresRes.data;

      setSessao(sessaoData);
      setProdutos(Array.isArray(produtosData) ? produtosData : []);
      setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
      setFornecedores(Array.isArray(fornecedoresData) ? fornecedoresData : []);

      notifications.hide(loadingId);
    } catch (error) {
      console.error('Erro ao carregar inventário:', error);
      notifications.update({
        id: loadingId,
        message: errorMessages.inventario.erroCarregar,
        color: 'red',
        loading: false,
        autoClose: 4000,
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

  const fornecedorOptions = useMemo(
    () =>
      fornecedores.map((fornecedor) => ({
        value: fornecedor.id.toString(),
        label: fornecedor.nome,
      })),
    [fornecedores]
  );

  const produtoSelecionado = useMemo(
    () => produtos.find((produto) => produto.id.toString() === form.produto),
    [form.produto, produtos]
  );

  const loteOptions = useMemo(
    () =>
      lotes.map((lote) => ({
        value: lote.id.toString(),
        label: `${lote.numero_lote} - Val: ${dayjs(lote.data_validade).format('DD/MM/YYYY')} - Qtd: ${lote.quantidade}`,
      })),
    [lotes]
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

  const loadLotesForProduto = useCallback(
    async (produtoId, { autoSelectSingle = false } = {}) => {
      if (!produtoId) {
        setLotes([]);
        return [];
      }

      try {
        const response = await getLotesPorProduto(produtoId);
        const lotesEncontrados = response.data.results || response.data || [];
        const listaNormalizada = Array.isArray(lotesEncontrados) ? lotesEncontrados : [];
        setLotes(listaNormalizada);

        if (autoSelectSingle && listaNormalizada.length === 1) {
          const loteUnico = listaNormalizada[0];
          setForm((prev) => ({
            ...prev,
            lote: loteUnico.id.toString(),
            validade_informada: loteUnico.data_validade
              ? dayjs(loteUnico.data_validade).toDate()
              : prev.validade_informada,
            quantidade_sistema:
              loteUnico.quantidade != null
                ? Number(loteUnico.quantidade).toString()
                : prev.quantidade_sistema,
            custo_informado:
              loteUnico.preco_custo_lote != null
                ? Number(loteUnico.preco_custo_lote).toString()
                : prev.custo_informado,
          }));
        }

        return listaNormalizada;
      } catch (error) {
        console.error('Erro ao buscar lotes do produto:', error);
        setLotes([]);
        notifications.show({
          title: 'Erro ao buscar lotes',
          message: 'Não foi possível carregar os lotes para este produto.',
          color: 'red',
        });
        return [];
      }
    },
    [setLotes, setForm, setCategoriaSugestao]
  );

  const preencherComProduto = async (produtoId) => {
    const produto = produtos.find((p) => p.id.toString() === produtoId);
    if (!produto) return;

    setForm((prev) => ({
      ...prev,
      produto: produtoId,
      codigo_barras: produto.codigo_barras || prev.codigo_barras,
      descricao: produto.nome || prev.descricao,
      quantidade_sistema: produto.estoque != null ? Number(produto.estoque).toString() : prev.quantidade_sistema,
      lote: '',
    }));

    await loadLotesForProduto(produtoId, { autoSelectSingle: true });
  };

  const handleProdutoChange = (value) => {
    setForm((prev) => ({ ...prev, produto: value || '' }));
    if (value) preencherComProduto(value);
  };

  const handleLoteChange = (value) => {
    if (!value) {
      setForm((prev) => ({ ...prev, lote: '', validade_informada: null }));
      return;
    }

    const loteSelecionado = lotes.find((loteAtual) => loteAtual.id.toString() === value.toString());

    setForm((prev) => ({
      ...prev,
      lote: value,
      validade_informada: loteSelecionado?.data_validade
        ? dayjs(loteSelecionado.data_validade).toDate()
        : prev.validade_informada,
      quantidade_sistema:
        loteSelecionado?.quantidade != null
          ? Number(loteSelecionado.quantidade).toString()
          : prev.quantidade_sistema,
      custo_informado:
        loteSelecionado?.preco_custo_lote != null
          ? Number(loteSelecionado.preco_custo_lote).toString()
          : prev.custo_informado,
    }));
  };

  const handleScan = (codigo) => {
    setScannerAberto(false);
    const produto = produtos.find((p) => p.codigo_barras === codigo);
    if (produto) {
      notifications.show({
        message: `✅ Produto encontrado! ${produto.nome}`,
        color: 'green',
        icon: <FaCheck />,
        autoClose: 3000,
      });
      setForm((prev) => ({
        ...prev,
        produto: produto.id.toString(),
        codigo_barras: codigo,
        descricao: produto.nome,
        quantidade_sistema:
          produto.estoque != null ? Number(produto.estoque).toString() : '',
        custo_informado: produto.preco_custo?.toString() || '',
      }));
      loadLotesForProduto(produto.id, { autoSelectSingle: true });
    } else {
      notifications.show({
        message: `🔍 Produto não cadastrado! Buscando na internet... (${codigo})`,
        color: 'yellow',
        autoClose: 3000,
      });
      setForm((prev) => ({ ...prev, codigo_barras: codigo }));
      handleFetchOpenFood({ byCode: true, code: codigo });
    }
  };

  const handleFetchOpenFood = async ({ byCode = false, code: externalCode } = {}) => {
    const params = {};
    if (byCode) {
      const codigo = externalCode || form.codigo_barras?.trim();
      if (!codigo) {
        notifications.show({
          message: errorMessages.openFood.semCodigo,
          color: 'orange',
          icon: '🤷',
        });
        return;
      }
      params.code = codigo;
    } else {
      if (!openFoodQuery.trim()) {
        notifications.show({
          message: errorMessages.openFood.semTermo,
          color: 'orange',
          icon: '🔍',
        });
        return;
      }
      params.q = openFoodQuery.trim();
    }

    const loadingId = notifications.show({
      message: loadingMessages.openFood.buscando,
      color: 'blue',
      loading: true,
      autoClose: false,
    });

    setOpenFoodLoading(true);
    try {
      const response = await searchOpenFoodProducts(params);
      const results = Array.isArray(response.data) ? response.data : [];
      setOpenFoodResults(results);

      if (byCode && results.length === 1) {
        handleSelectOpenFoodProduct(results[0]);
        notifications.update({
          id: loadingId,
          message: getRandomMessage(successMessages.openFood.encontrado),
          color: 'green',
          loading: false,
          autoClose: 3000,
        });
      } else if (results.length === 0) {
        notifications.update({
          id: loadingId,
          message: errorMessages.openFood.naoEncontrado,
          color: 'orange',
          loading: false,
          autoClose: 4000,
        });
      } else {
        notifications.update({
          id: loadingId,
          message: `${loadingMessages.openFood.encontrando} Encontrados ${results.length} produtos!`,
          color: 'green',
          loading: false,
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error('Erro ao consultar Open Food Facts:', error);
      const detail = error.response?.data?.detail;
      notifications.update({
        id: loadingId,
        message: detail || errorMessages.openFood.erroApi,
        color: 'red',
        loading: false,
        autoClose: 5000,
      });
    } finally {
      setOpenFoodLoading(false);
    }
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
      } else {
        setCategoriaSugestao(suggestionRaw);
      }
    } else {
      setCategoriaSugestao('');
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
    setForm((prev) => ({
      ...prev,
      descricao: product.name || prev.descricao,
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
      message: getRandomMessage(successMessages.openFood.aplicado),
      color: 'blue',
      icon: <FaCheck />,
      autoClose: 4000,
    });
  };

  const resetForm = () => {
    setForm({
      produto: '',
      codigo_barras: '',
      descricao: '',
      marca: '',
      conteudo_valor: '',
      conteudo_unidade: '',
      categoria: '',
      quantidade_sistema: '',
      quantidade_contada: '',
      custo_informado: '',
      validade_informada: null,
      observacao: '',
      lote: '',
    });
    setLotes([]);
    setOpenFoodQuery('');
    setOpenFoodResults([]);
    setOpenFoodSelected(null);
    setCategoriaSugestao('');
    setEditingItem(null);
  };

  const handleEditItem = async (item) => {
    if (sessaoFinalizada) {
      return;
    }

    setEditingItem(item);
    setForm({
      produto: item.produto ? item.produto.toString() : '',
      codigo_barras: item.codigo_barras || '',
      descricao: item.descricao || '',
      marca: item.marca || '',
      conteudo_valor:
        item.conteudo_valor === null || typeof item.conteudo_valor === 'undefined'
          ? ''
          : item.conteudo_valor,
      conteudo_unidade: item.conteudo_unidade || '',
      categoria: item.categoria ? item.categoria.toString() : '',
      quantidade_sistema:
        item.quantidade_sistema === null || typeof item.quantidade_sistema === 'undefined'
          ? ''
          : item.quantidade_sistema,
      quantidade_contada:
        item.quantidade_contada === null || typeof item.quantidade_contada === 'undefined'
          ? ''
          : item.quantidade_contada,
      custo_informado:
        item.custo_informado === null || typeof item.custo_informado === 'undefined'
          ? ''
          : item.custo_informado,
      validade_informada: item.validade_informada ? dayjs(item.validade_informada).toDate() : null,
      observacao: item.observacao || '',
      lote: item.lote ? item.lote.toString() : '',
    });

    if (item.produto) {
      const lotesCarregados = await loadLotesForProduto(item.produto.toString(), { autoSelectSingle: false });
      if (item.lote && lotesCarregados.some((lote) => lote.id === item.lote)) {
        setForm((prev) => ({
          ...prev,
          lote: item.lote.toString(),
        }));
      }
    } else {
      setLotes([]);
    }
  };

  const handleCancelarEdicao = () => {
    resetForm();
  };

  const handleSalvarItem = async () => {
    // Validação: quantidade contada obrigatória
    if (!form.quantidade_contada) {
      notifications.show({
        message: errorMessages.inventario.semQuantidade,
        color: 'orange',
        icon: '🤔',
      });
      return;
    }

    // Validação anti-duplicação: verifica se produto já foi contado nesta sessão
    if (form.produto) {
      const produtoJaContado = itens.find(item =>
        item.produto &&
        item.produto.toString() === form.produto.toString() &&
        item.id !== editingItem?.id
      );

      if (produtoJaContado) {
        notifications.show({
          message: errorMessages.inventario.itemDuplicado,
          color: 'orange',
          icon: '⚠️',
          autoClose: 6000,
        });
        return;
      }
    }

    // Aviso: diferença muito grande
    const qtdSistema = Number(form.quantidade_sistema) || 0;
    const qtdContada = Number(form.quantidade_contada) || 0;
    const diferenca = Math.abs(qtdContada - qtdSistema);
    const percentualDiferenca = qtdSistema > 0 ? (diferenca / qtdSistema) * 100 : 0;

    if (percentualDiferenca > 50 && qtdSistema > 0) {
      const confirmar = window.confirm(
        `${warningMessages.inventario.diferencaGrande}\n\n` +
        `Sistema: ${qtdSistema}\n` +
        `Contado: ${qtdContada}\n` +
        `Diferença: ${diferenca} (${percentualDiferenca.toFixed(1)}%)\n\n` +
        'Continuar mesmo assim?'
      );
      if (!confirmar) return;
    }

    const payload = {
      produto: form.produto || null,
      codigo_barras: form.codigo_barras || '',
      descricao: form.descricao || '',
      marca: form.marca || '',
      conteudo_valor: form.conteudo_valor || null,
      conteudo_unidade: form.conteudo_unidade || '',
      categoria: form.categoria || null,
      quantidade_contada: toDecimalString(form.quantidade_contada),
      quantidade_sistema: toDecimalString(form.quantidade_sistema),
      custo_informado: toDecimalString(form.custo_informado),
      validade_informada: form.validade_informada
        ? dayjs(form.validade_informada).format('YYYY-MM-DD')
        : null,
      observacao: form.observacao || '',
      lote: form.lote || null,
    };

    const loadingId = notifications.show({
      message: loadingMessages.inventario.salvando,
      color: 'blue',
      loading: true,
      autoClose: false,
    });

    try {
      setSalvando(true);

      if (navigator.onLine) {
        if (editingItem) {
          try {
            await updateInventarioItem(id, editingItem.id, payload);
            notifications.update({
              id: loadingId,
              message: 'Item atualizado com sucesso!',
              color: 'green',
              loading: false,
              autoClose: 3000,
            });
            if (navigator.onLine) {
              setTimeout(() => inventarioSyncManager.syncAll(), 500);
            }
          } catch (error) {
            console.warn('Falha ao atualizar item do inventário:', error);
            const detail = error.response?.data?.detail || error.message;
            notifications.update({
              id: loadingId,
              message: detail || errorMessages.inventario.erroSalvar,
              color: 'red',
              loading: false,
              autoClose: 5000,
            });
            return;
          }
        } else {
          // Tenta salvar online primeiro
          try {
            await addInventarioItem(id, payload);
            notifications.update({
              id: loadingId,
              message: getRandomMessage(successMessages.inventario.itemAdicionado),
              color: 'green',
              loading: false,
              autoClose: 3000,
            });
          } catch (error) {
            // Se falhar online, salva offline
            console.warn('Falha ao salvar online, salvando offline:', error);
            await inventarioSyncManager.addItemOffline(id, payload);
            notifications.update({
              id: loadingId,
              message: '📶 Salvo offline! Item será sincronizado quando a conexão retornar.',
              color: 'yellow',
              loading: false,
              autoClose: 4000,
            });
          }
          if (navigator.onLine) {
            setTimeout(() => inventarioSyncManager.syncAll(), 500);
          }
        }
      } else {
        if (editingItem) {
          notifications.update({
            id: loadingId,
            message: 'Edição offline indisponível. Conecte-se para atualizar este item.',
            color: 'orange',
            loading: false,
            autoClose: 4000,
          });
          return;
        }

        // Modo offline: salva localmente
        await inventarioSyncManager.addItemOffline(id, payload);
        notifications.update({
          id: loadingId,
          message: '📶 Modo offline ativado! Salvando localmente...',
          color: 'yellow',
          loading: false,
          autoClose: 4000,
        });
      }

      resetForm();
      carregarDados();

      // Atualiza contador de itens pendentes
      const count = await localDB.countInventarioItensPendentes();
      setItensPendentes(count);
    } catch (error) {
      console.error('Erro ao adicionar item de inventário:', error);
      const detail = error.response?.data?.detail || error.message;
      notifications.update({
        id: loadingId,
        message: detail || errorMessages.inventario.erroSalvar,
        color: 'red',
        loading: false,
        autoClose: 5000,
      });
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirItem = async (item) => {
    if (sessaoFinalizada) return;

    const confirmar = window.confirm(
      `${confirmMessages.inventario.excluirItem}\n\n` +
      `Produto: ${item.produto_nome || item.descricao || 'Sem nome'}\n` +
      `Quantidade: ${item.quantidade_contada}`
    );
    if (!confirmar) return;

    const loadingId = notifications.show({
      message: loadingMessages.inventario.excluindo,
      color: 'blue',
      loading: true,
      autoClose: false,
    });

    try {
      setExcluindoId(item.id);
      await deleteInventarioItem(id, item.id);
      if (editingItem && editingItem.id === item.id) {
        resetForm();
      }
      notifications.update({
        id: loadingId,
        message: getRandomMessage(successMessages.inventario.itemRemovido),
        color: 'green',
        loading: false,
        autoClose: 3000,
      });
      carregarDados();
    } catch (error) {
      console.error('Erro ao remover item do inventário:', error);
      const detail = error.response?.data?.detail;
      notifications.update({
        id: loadingId,
        message: detail || errorMessages.inventario.erroSalvar,
        color: 'red',
        loading: false,
        autoClose: 5000,
      });
    } finally {
      setExcluindoId(null);
    }
  };

  const handleCriarLote = async () => {
    if (!form.produto) {
      notifications.show({
        title: 'Selecione um produto',
        message: 'Escolha o produto antes de criar um lote.',
        color: 'orange',
      });
      return;
    }

    if (
      novoLoteForm.quantidade === '' ||
      novoLoteForm.quantidade === null ||
      Number(novoLoteForm.quantidade) <= 0
    ) {
      notifications.show({
        title: 'Informe a quantidade',
        message: 'A quantidade do lote deve ser maior que zero.',
        color: 'orange',
      });
      return;
    }

    if (!navigator.onLine) {
      notifications.show({
        title: 'Sem conexão',
        message: 'Conecte-se à internet para criar um novo lote.',
        color: 'orange',
      });
      return;
    }

    setSalvandoLote(true);

    try {
      const payload = {
        produto: parseInt(form.produto, 10),
        quantidade: Number(novoLoteForm.quantidade),
        numero_lote: novoLoteForm.numero_lote || '',
        observacoes: novoLoteForm.observacoes || '',
      };

      if (novoLoteForm.data_validade) {
        payload.data_validade = dayjs(novoLoteForm.data_validade).format('YYYY-MM-DD');
      }

      if (
        novoLoteForm.preco_custo_lote !== '' &&
        novoLoteForm.preco_custo_lote !== null
      ) {
        payload.preco_custo_lote = Number(novoLoteForm.preco_custo_lote);
      }

      if (novoLoteForm.fornecedor) {
        payload.fornecedor = parseInt(novoLoteForm.fornecedor, 10);
      }

      const response = await createLote(payload);

      notifications.show({
        title: 'Lote criado',
        message: 'O lote inicial foi adicionado com sucesso!',
        color: 'green',
        icon: <FaCheck />,
      });

      setLoteModalOpened(false);
      setNovoLoteForm({
        numero_lote: '',
        quantidade: '',
        data_validade: null,
        preco_custo_lote: '',
        fornecedor: '',
        observacoes: '',
      });

      const lotesAtualizados = await loadLotesForProduto(form.produto, { autoSelectSingle: false });
      const novoLoteId = response.data?.id;

      if (novoLoteId) {
        setForm((prev) => ({
          ...prev,
          lote: novoLoteId.toString(),
          quantidade_sistema:
            response.data?.quantidade != null
              ? Number(response.data.quantidade).toString()
              : prev.quantidade_sistema,
          custo_informado:
            response.data?.preco_custo_lote != null
              ? Number(response.data.preco_custo_lote).toString()
              : prev.custo_informado,
          validade_informada: response.data?.data_validade
            ? dayjs(response.data.data_validade).toDate()
            : prev.validade_informada,
        }));
      } else if (lotesAtualizados.length > 0) {
        const ultimoLote = lotesAtualizados[lotesAtualizados.length - 1];
        setForm((prev) => ({
          ...prev,
          lote: ultimoLote.id.toString(),
        }));
      }
    } catch (error) {
      console.error('Erro ao criar lote inicial:', error);
      const detail =
        error.response?.data?.detail ||
        error.response?.data?.quantidade ||
        error.response?.data?.numero_lote;
      notifications.show({
        title: 'Erro ao criar lote',
        message: detail ? String(detail) : 'Não foi possível criar o lote inicial.',
        color: 'red',
        icon: <FaTimes />,
      });
    } finally {
      setSalvandoLote(false);
    }
  };

  const handleFinalizar = async () => {
    if (!sessao || sessaoFinalizada) return;

    const confirmar = window.confirm(
      `${confirmMessages.inventario.finalizar}\n\n` +
      `Sessão: ${sessao.titulo}\n` +
      `Itens contados: ${itens.length}\n` +
      `Sobras: +${resumo.positivos}\n` +
      `Faltas: -${resumo.negativos}\n\n` +
      'Os ajustes serão aplicados ao estoque!'
    );
    if (!confirmar) return;

    const loadingId = notifications.show({
      message: loadingMessages.inventario.finalizando,
      color: 'blue',
      loading: true,
      autoClose: false,
    });

    try {
      setFinalizando(true);
      await finalizeInventario(id);
      notifications.update({
        id: loadingId,
        message: getRandomMessage(successMessages.inventario.sessaoFinalizada),
        color: 'green',
        loading: false,
        autoClose: 5000,
      });
      carregarDados();
    } catch (error) {
      console.error('Erro ao finalizar inventário:', error);
      const detail = error.response?.data?.detail;
      notifications.update({
        id: loadingId,
        message: detail || errorMessages.inventario.erroFinalizar,
        color: 'red',
        loading: false,
        autoClose: 5000,
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
            <Stack gap="xs">
              <Select
                label="Lote"
                placeholder={form.produto ? 'Selecione um lote' : 'Escolha um produto primeiro'}
                data={loteOptions}
                value={form.lote}
                onChange={handleLoteChange}
                searchable
                nothingFoundMessage="Nenhum lote disponível"
                disabled={sessaoFinalizada || !form.produto}
              />
              <Group gap="xs">
                <Button
                  variant="light"
                  size="xs"
                  leftSection={<FaPlus size={10} />}
                  onClick={() => {
                    if (!form.produto) {
                      notifications.show({
                        title: 'Selecione um produto',
                        message: 'Escolha o produto antes de criar um lote.',
                        color: 'orange',
                      });
                      return;
                    }
                    setNovoLoteForm({
                      numero_lote: '',
                      quantidade: '',
                      data_validade: null,
                      preco_custo_lote: form.custo_informado || '',
                      fornecedor: form.fornecedor || '',
                      observacoes: '',
                    });
                    setLoteModalOpened(true);
                  }}
                  disabled={sessaoFinalizada}
                >
                  Criar lote
                </Button>
                <Button
                  variant="subtle"
                  size="xs"
                  leftSection={<FaSync size={10} />}
                  onClick={() => {
                    if (!form.produto) {
                      notifications.show({
                        title: 'Selecione um produto',
                        message: 'Escolha o produto para recarregar os lotes.',
                        color: 'orange',
                      });
                      return;
                    }
                    loadLotesForProduto(form.produto, { autoSelectSingle: false });
                  }}
                  disabled={sessaoFinalizada || !form.produto}
                >
                  Atualizar lotes
                </Button>
              </Group>
            </Stack>
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

          {/* Seção Open Food Facts */}
          <Grid.Col span={12}>
            <Paper withBorder p="sm" bg="gray.0">
              <Stack gap="xs">
                <Group justify="space-between" align="center">
                  <Text size="sm" fw={600}>🌐 Buscar informações externas (Open Food Facts)</Text>
                </Group>
                <Group gap="xs" grow>
                  <TextInput
                    placeholder="Digite nome ou marca do produto"
                    value={openFoodQuery}
                    onChange={(e) => setOpenFoodQuery(e.target.value)}
                    disabled={sessaoFinalizada}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleFetchOpenFood({ byCode: false });
                      }
                    }}
                  />
                  <Button
                    variant="light"
                    leftSection={<FaSearch size={12} />}
                    onClick={() => handleFetchOpenFood({ byCode: false })}
                    loading={openFoodLoading}
                    disabled={sessaoFinalizada || !openFoodQuery.trim()}
                  >
                    Buscar por termo
                  </Button>
                  <Button
                    variant="light"
                    color="blue"
                    leftSection={<FaBarcode size={12} />}
                    onClick={() => handleFetchOpenFood({ byCode: true })}
                    loading={openFoodLoading}
                    disabled={sessaoFinalizada || !form.codigo_barras}
                  >
                    Buscar por código
                  </Button>
                </Group>

                {/* Resultados da busca */}
                {openFoodResults.length > 0 && (
                  <ScrollArea h={200}>
                    <Stack gap="xs">
                      {openFoodResults.map((product, idx) => (
                        <Paper
                          key={idx}
                          withBorder
                          p="xs"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSelectOpenFoodProduct(product)}
                          bg={openFoodSelected?.code === product.code ? 'blue.0' : 'white'}
                        >
                          <Group gap="xs" wrap="nowrap">
                            {product.image_url && (
                              <Image
                                src={product.image_url}
                                alt={product.name}
                                w={40}
                                h={40}
                                fit="contain"
                              />
                            )}
                            <Stack gap={2} style={{ flex: 1 }}>
                              <Text size="sm" fw={500}>{product.name}</Text>
                              <Group gap="xs">
                                {product.brand && (
                                  <Badge size="xs" variant="light">{product.brand}</Badge>
                                )}
                                {product.quantity && (
                                  <Badge size="xs" variant="light" color="blue">{product.quantity}</Badge>
                                )}
                                {product.code && (
                                  <Badge size="xs" variant="outline">{product.code}</Badge>
                                )}
                              </Group>
                              {product.category_suggestion && (
                                <Text size="xs" c="dimmed">Categoria: {product.category_suggestion}</Text>
                              )}
                            </Stack>
                          </Group>
                        </Paper>
                      ))}
                    </Stack>
                  </ScrollArea>
                )}

                {openFoodSelected && (
                  <Paper withBorder p="xs" bg="green.0">
                    <Group gap="xs">
                      <FaCheck size={14} color="green" />
                      <Text size="sm" fw={500}>
                        Produto selecionado: {openFoodSelected.name}
                      </Text>
                    </Group>
                  </Paper>
                )}

                {categoriaSugestao && (
                  <Paper withBorder p="xs" bg="yellow.0">
                    <Text size="sm" c="orange">
                      ⚠️ Categoria sugerida "{categoriaSugestao}" não existe.
                      Selecione outra ou crie manualmente depois.
                    </Text>
                  </Paper>
                )}
              </Stack>
            </Paper>
          </Grid.Col>

          {/* Campos adicionais */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label="Marca"
              placeholder="Ex: Coca-Cola, Nestlé..."
              value={form.marca}
              onChange={(e) => setForm((prev) => ({ ...prev, marca: e.target.value }))}
              disabled={sessaoFinalizada}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Select
              label="Categoria"
              placeholder="Selecione uma categoria"
              data={categorias.map((cat) => ({
                value: cat.id.toString(),
                label: cat.nome,
              }))}
              value={form.categoria}
              onChange={(value) => setForm((prev) => ({ ...prev, categoria: value || '' }))}
              searchable
              clearable
              disabled={sessaoFinalizada}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <NumberInput
              label="Conteúdo - Valor"
              placeholder="Ex: 350, 1.5, 2"
              value={form.conteudo_valor === '' ? '' : Number(form.conteudo_valor)}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, conteudo_valor: value === '' ? '' : value }))
              }
              disabled={sessaoFinalizada}
              decimalScale={2}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label="Conteúdo - Unidade"
              placeholder="Ex: ML, G, L, KG"
              value={form.conteudo_unidade}
              onChange={(e) => setForm((prev) => ({ ...prev, conteudo_unidade: e.target.value.toUpperCase() }))}
              disabled={sessaoFinalizada}
            />
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
          {editingItem && (
            <Button
              variant="light"
              color="red"
              leftSection={<FaTimes size={12} />}
              onClick={handleCancelarEdicao}
              disabled={salvando}
            >
              Cancelar edição
            </Button>
          )}
          {!editingItem && (
            <Button
              variant="default"
              onClick={resetForm}
              disabled={sessaoFinalizada || salvando}
            >
              Limpar
            </Button>
          )}
          <Button
            onClick={handleSalvarItem}
            loading={salvando}
            disabled={sessaoFinalizada}
            leftSection={editingItem ? <FaCheck size={12} /> : <FaPlus size={12} />}
          >
            {editingItem ? 'Salvar alterações' : 'Adicionar contagem'}
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

        <ScrollArea>
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Produto</Table.Th>
                <Table.Th>Marca</Table.Th>
                <Table.Th>Categoria</Table.Th>
                <Table.Th>Conteúdo</Table.Th>
                <Table.Th>Lote</Table.Th>
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
                  <Table.Td colSpan={11}>
                    <Text c="dimmed" ta="center">
                      Nenhum item foi contado ainda.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                itens.map((item) => (
                  <Table.Tr
                    key={item.id}
                    bg={editingItem && editingItem.id === item.id ? 'blue.0' : undefined}
                  >
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
                    <Table.Td>
                      {item.marca ? (
                        <Badge size="xs" variant="dot">{item.marca}</Badge>
                      ) : (
                        <Text size="sm" c="dimmed">—</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {item.categoria_nome ? (
                        <Badge size="xs" color="cyan" variant="light">{item.categoria_nome}</Badge>
                      ) : (
                        <Text size="sm" c="dimmed">—</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {item.conteudo_valor && item.conteudo_unidade ? (
                        <Text size="sm">{item.conteudo_valor} {item.conteudo_unidade}</Text>
                      ) : (
                        <Text size="sm" c="dimmed">—</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {item.lote_numero ? (
                        <Badge size="xs" color="grape" variant="light">{item.lote_numero}</Badge>
                      ) : (
                        <Text size="sm" c="dimmed">—</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{item.codigo_barras || '—'}</Text>
                    </Table.Td>
                    <Table.Td ta="right">{Number(item.quantidade_sistema || 0).toFixed(2)}</Table.Td>
                    <Table.Td ta="right">{Number(item.quantidade_contada || 0).toFixed(2)}</Table.Td>
                    <Table.Td ta="right">
                      <Text c={item.diferenca < 0 ? 'red' : item.diferenca > 0 ? 'green' : 'dimmed'} fw={500}>
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
                            Val: {dayjs(item.validade_informada).format('DD/MM/YYYY')}
                          </Badge>
                        )}
                        {item.custo_informado && (
                          <Badge size="xs" color="blue" variant="light">
                            R$ {Number(item.custo_informado).toFixed(2)}
                          </Badge>
                        )}
                      </Stack>
                    </Table.Td>
                    <Table.Td ta="center">
                      <Group gap="xs" justify="center">
                        <ActionIcon
                          color="blue"
                          variant="light"
                          onClick={() => handleEditItem(item)}
                          disabled={sessaoFinalizada}
                        >
                          <FaEdit size={14} />
                        </ActionIcon>
                        <ActionIcon
                          color="red"
                          variant="light"
                          onClick={() => handleExcluirItem(item)}
                          disabled={sessaoFinalizada || excluindoId === item.id}
                        >
                          {excluindoId === item.id ? <Loader size="xs" /> : <FaTrash size={14} />}
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>

      <BarcodeScanner
        opened={scannerAberto}
        onClose={() => setScannerAberto(false)}
        onScan={handleScan}
        title="Ler código do produto"
      />

      <Modal
        opened={loteModalOpened}
        onClose={() => setLoteModalOpened(false)}
        title="Criar novo lote"
        size="md"
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Produto selecionado:{' '}
            <Text component="span" fw={600}>
              {produtoSelecionado?.nome || '—'}
            </Text>
          </Text>
          <TextInput
            label="Número do lote"
            placeholder="Ex.: LOTE-001"
            value={novoLoteForm.numero_lote}
            onChange={(e) =>
              setNovoLoteForm((prev) => ({ ...prev, numero_lote: e.target.value }))
            }
          />
          <NumberInput
            label="Quantidade"
            placeholder="Ex.: 12"
            precision={2}
            min={0}
            value={
              novoLoteForm.quantidade === '' || novoLoteForm.quantidade === null
                ? ''
                : Number(novoLoteForm.quantidade)
            }
            onChange={(value) =>
              setNovoLoteForm((prev) => ({
                ...prev,
                quantidade: value === '' || value === null ? '' : value,
              }))
            }
          />
          <DatePickerInput
            label="Validade"
            placeholder="Selecione a data"
            value={novoLoteForm.data_validade}
            onChange={(value) =>
              setNovoLoteForm((prev) => ({ ...prev, data_validade: value }))
            }
            clearable
            minDate={new Date()}
          />
          <NumberInput
            label="Custo do lote (opcional)"
            placeholder="0.00"
            precision={2}
            value={
              novoLoteForm.preco_custo_lote === '' ||
              novoLoteForm.preco_custo_lote === null
                ? ''
                : Number(novoLoteForm.preco_custo_lote)
            }
            onChange={(value) =>
              setNovoLoteForm((prev) => ({
                ...prev,
                preco_custo_lote: value === '' || value === null ? '' : value,
              }))
            }
            leftSection="R$"
          />
          <Select
            label="Fornecedor (opcional)"
            placeholder="Selecione um fornecedor"
            data={fornecedorOptions}
            value={novoLoteForm.fornecedor}
            onChange={(value) =>
              setNovoLoteForm((prev) => ({ ...prev, fornecedor: value || '' }))
            }
            clearable
            searchable
          />
          <Textarea
            label="Observações"
            minRows={2}
            placeholder="Informações adicionais sobre este lote"
            value={novoLoteForm.observacoes}
            onChange={(e) =>
              setNovoLoteForm((prev) => ({ ...prev, observacoes: e.target.value }))
            }
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={() => setLoteModalOpened(false)} disabled={salvandoLote}>
              Cancelar
            </Button>
            <Button onClick={handleCriarLote} loading={salvandoLote}>
              Salvar lote
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

export default InventarioDetalhe;

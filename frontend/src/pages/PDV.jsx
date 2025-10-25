import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProdutos, createVenda, getClientes, getCaixaStatus } from '../services/api';
import { localDB } from '../utils/db';
import { syncManager } from '../utils/syncManager';
import { AppShell, Card, TextInput, Stack, Paper, Group, Text, NumberInput, ActionIcon, Select, Button, Title, Center, Modal, ScrollArea, Divider, Badge, Alert, Loader, Grid } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useHotkeys, useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { FaSearch, FaTrash, FaShoppingCart, FaCheck, FaTimes, FaBarcode, FaKeyboard, FaCashRegister } from 'react-icons/fa';
import Comprovante from '../components/Comprovante';
import BarcodeScanner from '../components/BarcodeScanner';
import './PDV.css';

function PDV() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [busca, setBusca] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO');
  const [clienteId, setClienteId] = useState(null);
  const [dataVencimento, setDataVencimento] = useState(null);
  const [valorRecebido, setValorRecebido] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scannerAberto, setScannerAberto] = useState(false);
  const [comprovanteAberto, setComprovanteAberto] = useState(false);
  const [dadosVenda, setDadosVenda] = useState(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [verificandoCaixa, setVerificandoCaixa] = useState(true);
  const [caixaAberto, setCaixaAberto] = useState(false);
  const [caixaStatus, setCaixaStatus] = useState(null);
  const [ultimoProdutoAdicionado, setUltimoProdutoAdicionado] = useState(null);
  const buscaRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const feedbackTimeoutRef = useRef(null);

  useHotkeys([
    ['F2', () => buscaRef.current?.focus()],
    ['F4', () => abrirScanner()],
    ['F9', () => finalizarVenda()],
    ['Escape', () => {
      setCarrinho([]);
      setBusca('');
      setClienteId(null);
      setDataVencimento(null);
      setValorRecebido(null);
    }],
  ]);

  useEffect(() => {
    verificarCaixa();
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  const verificarCaixa = async () => {
    try {
      const response = await getCaixaStatus();
      const status = response.data?.status;
      setCaixaStatus(response.data);
      setCaixaAberto(status === 'ABERTO');
    } catch (error) {
      console.error('Erro ao verificar status do caixa:', error);
      setCaixaStatus({ status: 'FECHADO', message: 'Não foi possível verificar o caixa.' });
      setCaixaAberto(false);
    } finally {
      setVerificandoCaixa(false);
    }
  };

  const loadInitialData = useCallback(async () => {
    if (!caixaAberto) return;
    // CACHE-FIRST: Carrega do cache imediatamente (PDV precisa ser rápido!)
    const [cachedProdutos, cachedClientes] = await Promise.all([
      localDB.getCachedProdutos(),
      localDB.getCachedClientes()
    ]);

    if (cachedProdutos.length > 0) setProdutos(cachedProdutos);
    if (cachedClientes.length > 0) setClientes(cachedClientes);

    // Sincroniza com servidor em background
    try {
      const [produtosData, clientesData] = await Promise.all([
        getProdutos({ ativo: true }).then(res => res.data.results || res.data),
        getClientes({ ativo: true }).then(res => res.data.results || res.data)
      ]);
      setProdutos(produtosData);
      setClientes(clientesData);
      await localDB.cacheProdutos(produtosData);
      await localDB.cacheClientes(clientesData);
    } catch (error) {
      // Mantém dados do cache se servidor falhar
      console.warn('Servidor offline, usando cache local');
    }
  }, [caixaAberto]);

  useEffect(() => {
    if (caixaAberto) {
      loadInitialData();
    }
  }, [caixaAberto, loadInitialData]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const produtosFiltrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) || p.codigo_barras?.includes(busca)
  );

  const adicionarAoCarrinho = (produto) => {
    const itemExistente = carrinho.find(item => item.produto.id === produto.id);
    const quantidadeAtual = itemExistente ? itemExistente.quantidade : 0;
    const novaQuantidade = quantidadeAtual + 1;

    // Validação de estoque em tempo real
    if (novaQuantidade > produto.estoque) {
      notifications.show({
        title: 'Estoque insuficiente',
        message: `${produto.nome} - Disponível: ${produto.estoque}`,
        color: 'red',
        icon: <FaTimes />,
      });
      return;
    }

    if (itemExistente) {
      setCarrinho(carrinho.map(item => item.produto.id === produto.id ? { ...item, quantidade: novaQuantidade } : item));
    } else {
      setCarrinho([...carrinho, { produto, quantidade: 1 }]);
    }

    notifications.show({
      title: 'Produto adicionado',
      message: `${produto.nome} adicionado ao carrinho`,
      color: 'green',
      icon: <FaCheck />,
      autoClose: 2000,
    });

    setUltimoProdutoAdicionado(produto.id);
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = setTimeout(() => {
      setUltimoProdutoAdicionado(null);
    }, 1200);

    setBusca('');
    buscaRef.current?.focus();
  };

  const alterarQuantidade = (produtoId, novaQuantidade) => {
    const quantidade = Number(novaQuantidade) || 0;
    if (quantidade <= 0) {
      removerDoCarrinho(produtoId);
    } else {
      setCarrinho(
        carrinho.map((item) =>
          item.produto.id === produtoId ? { ...item, quantidade } : item
        )
      );
    }
  };

  const removerDoCarrinho = (produtoId) => {
    setCarrinho(carrinho.filter(item => item.produto.id !== produtoId));
  };

  const calcularTotal = () => carrinho.reduce((total, item) => total + (parseFloat(item.produto.preco) * item.quantidade), 0);

  const calcularTroco = () => {
    if (formaPagamento !== 'DINHEIRO' || valorRecebido === null) return 0;
    const troco = Number(valorRecebido) - calcularTotal();
    return troco > 0 ? troco : 0;
  };

  const limparCarrinho = () => {
    setCarrinho([]);
    setBusca('');
    setClienteId(null);
    setDataVencimento(null);
    setValorRecebido(null);
    buscaRef.current?.focus();
  };

  const abrirScanner = () => {
    if (!caixaAberto) {
      notifications.show({
        title: 'Caixa fechado',
        message: 'Abra o caixa antes de usar o leitor.',
        color: 'orange',
        icon: <FaTimes />,
      });
      return;
    }
    setScannerAberto(true);
  };

  const handleBarcodeScanned = (codigoBarras) => {
    // Busca produto pelo código de barras
    const produto = produtos.find(p => p.codigo_barras === codigoBarras);

    if (produto) {
      adicionarAoCarrinho(produto);
      notifications.show({
        title: 'Produto encontrado!',
        message: `${produto.nome} adicionado ao carrinho`,
        color: 'green',
        icon: <FaCheck />,
        autoClose: 3000,
      });
    } else {
      notifications.show({
        title: 'Produto não encontrado',
        message: `Código ${codigoBarras} não cadastrado`,
        color: 'orange',
        icon: <FaTimes />,
        autoClose: 4000,
      });
    }
  };

  const finalizarVenda = async () => {
    if (!caixaAberto) {
      notifications.show({
        title: 'Caixa fechado',
        message: 'Abra o caixa para registrar vendas no PDV.',
        color: 'red',
        icon: <FaTimes />,
      });
      return;
    }

    if (carrinho.length === 0) {
      notifications.show({
        title: 'Carrinho vazio',
        message: 'Adicione produtos ao carrinho antes de finalizar',
        color: 'orange',
        icon: <FaTimes />,
      });
      return;
    }

    if (formaPagamento === 'DINHEIRO') {
      if (valorRecebido === null || Number(valorRecebido) < calcularTotal()) {
        notifications.show({
          title: 'Valor insuficiente',
          message: 'O valor recebido deve ser maior ou igual ao total da venda',
          color: 'orange',
          icon: <FaTimes />,
        });
        return;
      }
    }

    if (formaPagamento === 'FIADO') {
      if (!clienteId) {
        notifications.show({
          title: 'Cliente não selecionado',
          message: 'Selecione um cliente para venda fiado',
          color: 'orange',
          icon: <FaTimes />,
        });
        return;
      }
      if (!dataVencimento) {
        notifications.show({
          title: 'Data de vencimento obrigatória',
          message: 'Informe a data de vencimento para venda fiado',
          color: 'orange',
          icon: <FaTimes />,
        });
        return;
      }
    }

    setLoading(true);

    // Prepara data de vencimento
    let dataVencimentoFormatada = null;
    if (formaPagamento === 'FIADO' && dataVencimento) {
      if (dataVencimento instanceof Date) {
        dataVencimentoFormatada = dataVencimento.toISOString().split('T')[0];
      } else if (typeof dataVencimento === 'string') {
        dataVencimentoFormatada = dataVencimento;
      }
    }

    const vendaData = {
      forma_pagamento: formaPagamento,
      cliente_id: formaPagamento === 'FIADO' ? parseInt(clienteId) : null,
      data_vencimento: dataVencimentoFormatada,
      itens: carrinho.map(item => ({
        produto_id: item.produto.id,
        quantidade: item.quantidade
      }))
    };

    try {
      const response = await createVenda(vendaData);

      // Prepara dados do comprovante
      const vendaCompleta = {
        ...response.data,
        itens: carrinho.map(item => ({
          produto: item.produto,
          produto_nome: item.produto.nome,
          quantidade: item.quantidade,
          preco_unitario: item.produto.preco
        })),
        forma_pagamento: formaPagamento,
        valor_total: calcularTotal(),
        valor_recebido: formaPagamento === 'DINHEIRO' ? Number(valorRecebido) : null,
        cliente: formaPagamento === 'FIADO' ? clientes.find(c => c.id === parseInt(clienteId)) : null,
        cliente_nome: formaPagamento === 'FIADO' ? clientes.find(c => c.id === parseInt(clienteId))?.nome : null,
        data_vencimento: dataVencimentoFormatada,
        created_at: new Date().toISOString()
      };

      // Salva dados da venda e abre comprovante
      setDadosVenda(vendaCompleta);
      setComprovanteAberto(true);

      notifications.show({
        title: 'Venda finalizada!',
        message: `Venda de R$ ${calcularTotal().toFixed(2)} registrada com sucesso`,
        color: 'green',
        icon: <FaCheck />,
        autoClose: 4000,
      });

      // Limpa carrinho e recarrega apenas em caso de sucesso
      setCarrinho([]);
      setBusca('');
      setClienteId(null);
      setDataVencimento(null);
      setValorRecebido(null);
      loadInitialData();
    } catch (error) {
      // Diferencia entre erro de rede e erro de validação
      if (error.response) {
        // Erro de validação do backend (400, 500, etc)
        const errorMsg = error.response.data?.detail
          || error.response.data?.error
          || Object.values(error.response.data || {}).flat().join(', ')
          || 'Erro ao processar venda';

        notifications.show({
          title: 'Erro ao finalizar venda',
          message: errorMsg,
          color: 'red',
          icon: <FaTimes />,
          autoClose: 8000,
        });
      } else if (error.request) {
        // Erro de rede - salva offline
        await localDB.saveVendaPendente(vendaData);
        setTimeout(() => syncManager.syncAll(), 1000);

        notifications.show({
          title: 'Venda salva offline',
          message: 'Sem conexão! Venda será sincronizada automaticamente quando houver internet',
          color: 'blue',
          icon: <FaCheck />,
          autoClose: 6000,
        });

        // Limpa carrinho apenas em caso de venda offline
        setCarrinho([]);
        setBusca('');
        setClienteId(null);
        setDataVencimento(null);
        setValorRecebido(null);
        loadInitialData();
      } else {
        // Outro tipo de erro
        notifications.show({
          title: 'Erro inesperado',
          message: error.message,
          color: 'red',
          icon: <FaTimes />,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const renderCart = () => {
    const totalItens = carrinho.reduce((total, item) => total + item.quantidade, 0);
    const troco = calcularTroco();

    return (
      <Card
        withBorder
        shadow="xl"
        radius="lg"
        padding="xl"
        className="glass-card elevated-card cart-card"
      >
        <Stack gap="md" className="card-stack">
          <Group justify="space-between" align="flex-start" gap="lg" wrap="wrap" className="card-header">
            <div>
              <Title order={4} className="section-title">
                Carrinho
              </Title>
              <Text size="sm" c="dimmed" className="section-subtitle">
                {totalItens === 0
                  ? 'Nenhum item selecionado'
                  : `${totalItens} ${totalItens === 1 ? 'item' : 'itens'} no carrinho`}
              </Text>
            </div>
            {carrinho.length > 0 && (
              <Button
                variant="light"
                color="red"
                size="xs"
                onClick={limparCarrinho}
                className="ghost-button"
              >
                Limpar (Esc)
              </Button>
            )}
          </Group>

          <ScrollArea h={isMobile ? 280 : 400} offsetScrollbars>
            {carrinho.length > 0 ? (
              <Stack gap="md" className="cart-list">
                {carrinho.map((item) => (
                  <Paper
                    withBorder
                    p="sm"
                    radius="md"
                    key={item.produto.id}
                    className="glass-card cart-item"
                  >
                    <Group
                      justify="space-between"
                      align="flex-start"
                      gap="md"
                      wrap="wrap"
                      className="cart-item-row"
                    >
                      <Stack gap={6} style={{ flex: 1, minWidth: 0 }} className="cart-item-info">
                        <Group justify="space-between" align="flex-start" wrap="nowrap">
                          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                            <Text size="sm" fw={600} truncate className="item-title">
                              {item.produto.nome}
                            </Text>
                            <Group gap="xs">
                              <Badge color="gray" variant="light" size="sm" className="badge-soft">
                                R$ {parseFloat(item.produto.preco).toFixed(2)} un
                              </Badge>
                              <Badge color="blue" variant="light" size="sm" className="badge-soft">
                                Estoque: {parseFloat(item.produto.estoque).toFixed(0)}
                              </Badge>
                            </Group>
                          </Stack>
                          <Group gap="sm" wrap="wrap" align="center" className="cart-actions">
                            <NumberInput
                              value={item.quantidade}
                              onChange={(val) =>
                                alterarQuantidade(
                                  item.produto.id,
                                  val === '' || val === null ? 0 : Number(val)
                                )
                              }
                              w={80}
                              min={0}
                              size="sm"
                              thousandSeparator="."
                              decimalSeparator="," 
                            />
                            <Text fw={600} size="sm">
                              R$ {(
                                parseFloat(item.produto.preco) * item.quantidade
                              ).toFixed(2)}
                            </Text>
                            <ActionIcon
                              color="red"
                              variant="subtle"
                              size="lg"
                              onClick={() => removerDoCarrinho(item.produto.id)}
                              className="icon-action remove-action"
                            >
                              <FaTrash size={16} />
                            </ActionIcon>
                          </Group>
                        </Group>
                      </Stack>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Center h={isMobile ? 220 : 340}>
                <Stack align="center" gap="xs">
                  <FaShoppingCart size={52} className="empty-icon" />
                  <Text c="dimmed" size="sm" className="empty-text">
                    Busque um produto e adicione ao carrinho.
                  </Text>
                </Stack>
              </Center>
            )}
          </ScrollArea>

          <Divider className="divider-glow" />

          {carrinho.length > 0 ? (
            <Stack gap="md">
              <Select
                label="Forma de Pagamento"
                value={formaPagamento}
                onChange={(value) => {
                  setFormaPagamento(value);
                  setValorRecebido(null);
                }}
                size="md"
                data={[
                  { value: 'DINHEIRO', label: 'Dinheiro' },
                  { value: 'DEBITO', label: 'Débito' },
                  { value: 'CREDITO', label: 'Crédito' },
                  { value: 'PIX', label: 'PIX' },
                  { value: 'FIADO', label: 'Fiado' },
                ]}
              />

              {formaPagamento === 'DINHEIRO' && (
                <>
                  <NumberInput
                    label="Valor Recebido"
                    placeholder="0,00"
                    value={valorRecebido}
                    onChange={(val) => {
                      if (val === '' || val === null) {
                        setValorRecebido(null);
                      } else {
                        setValorRecebido(Number(val));
                      }
                    }}
                    precision={2}
                    min={0}
                    size="md"
                    leftSection="R$"
                    thousandSeparator="."
                    decimalSeparator="," 
                    required
                  />
                  {troco > 0 && (
                    <Paper
                      p="md"
                      withBorder
                      radius="md"
                      style={{ backgroundColor: '#d3f9d8', borderColor: '#51cf66' }}
                    >
                      <Group justify="space-between">
                        <Text fw={600} c="green.9">
                          Troco
                        </Text>
                        <Text size="lg" fw={700} c="green.9">
                          R$ {troco.toFixed(2)}
                        </Text>
                      </Group>
                    </Paper>
                  )}
                </>
              )}

              {formaPagamento === 'FIADO' && (
                <Stack gap="md">
                  <Select
                    label="Cliente"
                    placeholder="Selecione o cliente"
                    value={clienteId}
                    onChange={setClienteId}
                    size="md"
                    data={clientes.map((c) => ({
                      value: c.id.toString(),
                      label: c.nome,
                    }))}
                    searchable
                    required
                  />
                  <DatePickerInput
                    label="Data de Vencimento"
                    placeholder="Selecione a data"
                    value={dataVencimento}
                    onChange={setDataVencimento}
                    minDate={new Date()}
                    size="md"
                    required
                  />
                </Stack>
              )}

              <Paper withBorder radius="md" p="md">
                <Stack gap={6}>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Forma de pagamento
                    </Text>
                    <Badge color="orange" variant="light">
                      {formaPagamento}
                    </Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Total de itens
                    </Text>
                    <Text fw={600}>{totalItens}</Text>
                  </Group>
                  <Divider />
                  <Group justify="space-between">
                    <Text fw={700} size="sm">
                      Total da venda
                    </Text>
                    <Title order={3} c="orange">
                      R$ {calcularTotal().toFixed(2)}
                    </Title>
                  </Group>
                  {formaPagamento === 'DINHEIRO' && valorRecebido !== null && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Valor recebido
                      </Text>
                      <Text fw={600}>
                        R$ {Number(valorRecebido).toFixed(2)}
                      </Text>
                    </Group>
                  )}
                  {troco > 0 && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Troco
                      </Text>
                      <Text fw={600} c="green.8">
                        R$ {troco.toFixed(2)}
                      </Text>
                    </Group>
                  )}
                </Stack>
              </Paper>

              <Button
                onClick={finalizarVenda}
                loading={loading}
                size="lg"
                fullWidth
                disabled={carrinho.length === 0}
              >
                {isMobile ? 'Finalizar venda' : 'Finalizar venda (F9)'}
              </Button>
            </Stack>
          ) : (
            <Alert color="gray" variant="light" title="Carrinho vazio" className="glass-card shortcut-alert">
              Use <strong>F2</strong> para buscar ou o botão acima para abrir a lista
              de produtos.
            </Alert>
          )}
        </Stack>
      </Card>
    );
  };

  const renderProductSearch = () => (
    <Card
      withBorder
      shadow="xl"
      radius="lg"
      padding="xl"
      className="glass-card elevated-card products-card"
    >
      <Stack gap="md" className="card-stack">
        <Group justify="space-between" align="center" className="card-header" gap="lg" wrap="wrap">
          <div>
            <Title order={4} className="section-title">
              Produtos
            </Title>
            <Text size="sm" c="dimmed" className="section-subtitle">
              {produtosFiltrados.length} encontrados
            </Text>
          </div>
          <Badge color="orange" variant="light" className="badge-pill">
            F4 para leitor
          </Badge>
        </Group>

        <Group gap="sm" align="flex-end" wrap="wrap" className="search-toolbar">
          <TextInput
            ref={buscaRef}
            placeholder="Buscar produto (F2)"
            leftSection={<FaSearch />}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            size="md"
            autoFocus={!isMobile}
            style={{ flex: 1 }}
            className="search-input"
          />
          <ActionIcon
            size={48}
            color="orange"
            variant="filled"
            onClick={abrirScanner}
            title="Ler código de barras (F4)"
            className="icon-action"
          >
            <FaBarcode size={22} />
          </ActionIcon>
        </Group>

        <ScrollArea h={isMobile ? 340 : 560} offsetScrollbars>
          {produtosFiltrados.length > 0 ? (
            <Stack gap="md" className="products-list">
              {produtosFiltrados.slice(0, 20).map((produto) => (
                <Paper
                  shadow="xl"
                  p="md"
                  withBorder
                  key={produto.id}
                  onClick={() => {
                    adicionarAoCarrinho(produto);
                    if (isMobile) setSearchModalOpen(false);
                  }}
                  className={`glass-card produto-card ${
                    ultimoProdutoAdicionado === produto.id ? 'produto-card--added' : ''
                  }`}
                >
                  <Group
                    justify="space-between"
                    align="flex-start"
                    gap="md"
                    wrap="wrap"
                    className="produto-card-row"
                  >
                    <Stack gap={6} style={{ flex: 1, minWidth: 0 }} className="produto-card-info">
                      <Group justify="space-between" align="center">
                        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                          <Text size="sm" fw={600} truncate className="item-title">
                            {produto.nome}
                          </Text>
                          <Group gap="xs">
                            <Badge color="green" variant="light" size="sm" className="badge-soft">
                              R$ {parseFloat(produto.preco).toFixed(2)}
                            </Badge>
                            {produto.estoque !== undefined && (
                              <Badge color="blue" variant="light" size="sm" className="badge-soft">
                                Estoque: {parseFloat(produto.estoque).toFixed(0)}
                              </Badge>
                            )}
                          </Group>
                        </Stack>
                        <Button
                          variant="gradient"
                          size="sm"
                          className="ghost-button add-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            adicionarAoCarrinho(produto);
                            if (isMobile) setSearchModalOpen(false);
                          }}
                        >
                          Adicionar
                        </Button>
                      </Group>
                    </Stack>
                  </Group>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Center h={isMobile ? 280 : 500}>
              <Text c="dimmed" className="empty-text">
                Nenhum produto encontrado.
              </Text>
            </Center>
          )}
        </ScrollArea>

        <Alert
          color="orange"
          variant="light"
          icon={<FaKeyboard size={20} />}
          title="Atalhos rápidos"
          className="glass-card shortcut-alert"
        >
          F2: buscar produto • F4: leitor de código de barras • F9: finalizar venda
        </Alert>
      </Stack>
    </Card>
  );

  if (verificandoCaixa) {
    return (
      <Center style={{ height: '100%' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!caixaAberto) {
    return (
      <Center style={{ height: '100%' }}>
        <Stack align="center" gap="md" p="xl" maw={420}>
          <Alert
            icon={<FaTimes size={16} />}
            title="Caixa fechado"
            color="red"
            variant="light"
          >
            {caixaStatus?.message || 'Abra o caixa para utilizar o PDV.'}
          </Alert>
          <Group gap="sm">
            <Button leftSection={<FaCashRegister size={14} />} onClick={() => navigate('/caixa')}>
              Ir para o Caixa
            </Button>
            <Button variant="subtle" onClick={verificarCaixa}>Recarregar status</Button>
          </Group>
        </Stack>
      </Center>
    );
  }

  return (
    <AppShell header={{ height: 70 }} padding="xl" className="pdv-appshell">
      <AppShell.Header className="pdv-header">
        <Group
          h="100%"
          px={{ base: 'md', sm: 'xl' }}
          justify="space-between"
          align="center"
        >
          <Group gap="sm" align="center">
            <div className="header-icon">
              <FaShoppingCart size={22} />
            </div>
            <Title order={2} className="pdv-title">
              PDV
            </Title>
          </Group>
          <Group gap="lg" align="center">
            <Stack gap={2} align="flex-end">
              <Text size="xs" c="dimmed" className="section-subtitle">
                Total atual
              </Text>
              <Title order={2} className="total-amount">
                R$ {calcularTotal().toFixed(2)}
              </Title>
            </Stack>
            {isMobile && (
              <ActionIcon
                onClick={() => setSearchModalOpen(true)}
                size="lg"
                variant="filled"
                color="blue"
                className="icon-action"
              >
                <FaSearch />
              </ActionIcon>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main className="pdv-main">
        <div className="pdv-immersive-bg">
          <div className="pdv-content">
            {isMobile ? (
              <Stack gap="lg" className="pdv-mobile-stack">
                <Button
                  leftSection={<FaSearch size={18} />}
                  variant="gradient"
                  onClick={() => setSearchModalOpen(true)}
                  className="primary-action"
                >
                  Buscar produtos
                </Button>
                {renderCart()}
              </Stack>
            ) : (
              <>
                <div className="pdv-grid">
                  <div className="pdv-grid-col pdv-grid-col--products">{renderProductSearch()}</div>
                  <div className="pdv-grid-col pdv-grid-col--cart">{renderCart()}</div>
                </div>
                <Grid columns={12} gutter="xl">
                  <Grid.Col span={{ base: 12, lg: 7 }}>{renderProductSearch()}</Grid.Col>
                  <Grid.Col span={{ base: 12, lg: 5 }}>{renderCart()}</Grid.Col>
                </Grid>
              </>
            )}
          </div>
        </div>
      </AppShell.Main>

      <Modal
        opened={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        title="Buscar Produto"
        size="xl"
      >
        {renderProductSearch()}
      </Modal>

      <BarcodeScanner
        opened={scannerAberto}
        onClose={() => setScannerAberto(false)}
        onScan={handleBarcodeScanned}
        title="Ler Código de Barras do Produto"
      />

      <Modal
        opened={comprovanteAberto}
        onClose={() => setComprovanteAberto(false)}
        title=""
        size="lg"
        centered
        padding={0}
        classNames={{
          root: 'comprovante-modal-root',
          content: 'comprovante-modal-content',
          body: 'comprovante-modal-body',
          overlay: 'comprovante-modal-overlay'
        }}
      >
        {dadosVenda && (
          <Comprovante
            venda={dadosVenda}
            onClose={() => setComprovanteAberto(false)}
          />
        )}
      </Modal>
    </AppShell>
  );
}

export default PDV;

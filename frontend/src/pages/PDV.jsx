import { useState, useEffect, useRef } from 'react';
import { getProdutos, createVenda, getClientes } from '../services/api';
import { localDB } from '../utils/db';
import { syncManager } from '../utils/syncManager';
import { Grid, Card, TextInput, Stack, Paper, Group, Text, NumberInput, ActionIcon, Select, Button, Title, Center, Modal } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { FaSearch, FaTrash, FaShoppingCart, FaCheck, FaTimes, FaBarcode } from 'react-icons/fa';
import Comprovante from '../components/Comprovante';
import BarcodeScanner from '../components/BarcodeScanner';

function PDV() {
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [busca, setBusca] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO');
  const [clienteId, setClienteId] = useState(null);
  const [dataVencimento, setDataVencimento] = useState(null);
  const [valorRecebido, setValorRecebido] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannerAberto, setScannerAberto] = useState(false);
  const [comprovanteAberto, setComprovanteAberto] = useState(false);
  const [dadosVenda, setDadosVenda] = useState(null);
  const buscaRef = useRef(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
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
  };

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

    setBusca('');
    buscaRef.current?.focus();
  };

  const alterarQuantidade = (produtoId, novaQuantidade) => {
    if (novaQuantidade <= 0) {
      removerDoCarrinho(produtoId);
    } else {
      setCarrinho(carrinho.map(item => item.produto.id === produtoId ? { ...item, quantidade: parseFloat(novaQuantidade) } : item));
    }
  };

  const removerDoCarrinho = (produtoId) => {
    setCarrinho(carrinho.filter(item => item.produto.id !== produtoId));
  };

  const calcularTotal = () => carrinho.reduce((total, item) => total + (parseFloat(item.produto.preco) * item.quantidade), 0);

  const calcularTroco = () => {
    if (formaPagamento !== 'DINHEIRO' || !valorRecebido) return 0;
    const troco = parseFloat(valorRecebido) - calcularTotal();
    return troco > 0 ? troco : 0;
  };

  const abrirScanner = () => {
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
      if (!valorRecebido || parseFloat(valorRecebido) < calcularTotal()) {
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
        valor_recebido: formaPagamento === 'DINHEIRO' ? valorRecebido : null,
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
      setValorRecebido('');
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
        setValorRecebido('');
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

  return (
    <Grid gutter="md">
      <Grid.Col span={12} md={5}>
        <Stack gap="sm">
          <Group gap="xs">
            <TextInput
              ref={buscaRef}
              placeholder="Buscar produto..."
              leftSection={<FaSearch />}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              size="md"
              autoFocus
              style={{ flex: 1 }}
            />
            <ActionIcon
              size={42}
              color="orange"
              variant="filled"
              onClick={abrirScanner}
              title="Ler código de barras"
            >
              <FaBarcode size={20} />
            </ActionIcon>
          </Group>
          {busca && (
            <Stack gap="xs">
              {produtosFiltrados.length > 0 ? (
                produtosFiltrados.slice(0, 5).map(produto => (
                  <Paper
                    shadow="xs"
                    p="sm"
                    withBorder
                    key={produto.id}
                    onClick={() => adicionarAoCarrinho(produto)}
                    style={{ cursor: 'pointer', minHeight: '60px' }}
                  >
                    <Group justify="space-between">
                      <Text size="sm" fw={500}>{produto.nome}</Text>
                      <Text size="sm" fw={600} c="orange">R$ {parseFloat(produto.preco).toFixed(2)}</Text>
                    </Group>
                  </Paper>
                ))
              ) : (
                <Text ta="center" c="dimmed">Nenhum produto encontrado.</Text>
              )}
            </Stack>
          )}
        </Stack>
      </Grid.Col>

      <Grid.Col span={12} md={7}>
        <Card withBorder radius="md" p="sm">
          <Group justify="space-between" mb="md">
            <Title order={3}>Carrinho</Title>
            <FaShoppingCart size={20} />
          </Group>

          {carrinho.length === 0 ? (
            <Center style={{ minHeight: '200px' }}>
              <Text c="dimmed">Carrinho vazio.</Text>
            </Center>
          ) : (
            <Stack gap="sm">
              {carrinho.map(item => (
                <Paper withBorder p="sm" radius="xs" key={item.produto.id}>
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={500} truncate>{item.produto.nome}</Text>
                      <Text size="xs" c="dimmed">R$ {parseFloat(item.produto.preco).toFixed(2)}</Text>
                    </Stack>
                    <Group gap="xs" wrap="nowrap">
                      <NumberInput
                        value={item.quantidade}
                        onChange={(val) => alterarQuantidade(item.produto.id, val)}
                        w={70}
                        min={0}
                        size="sm"
                      />
                      <ActionIcon
                        color="red"
                        size="lg"
                        onClick={() => removerDoCarrinho(item.produto.id)}
                      >
                        <FaTrash size={14} />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Paper>
              ))}

              <Select
                label="Forma de Pagamento"
                value={formaPagamento}
                onChange={(value) => {
                  setFormaPagamento(value);
                  setValorRecebido(''); // Limpa valor recebido ao trocar forma de pagamento
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
                    placeholder="0.00"
                    value={valorRecebido}
                    onChange={setValorRecebido}
                    precision={2}
                    min={0}
                    size="md"
                    leftSection="R$"
                    required
                  />
                  {valorRecebido && parseFloat(valorRecebido) >= calcularTotal() && (
                    <Paper p="md" withBorder style={{ backgroundColor: '#d3f9d8', borderColor: '#51cf66' }}>
                      <Group justify="space-between">
                        <Text fw={600} c="green.9">TROCO:</Text>
                        <Text size="xl" fw={700} c="green.9">R$ {calcularTroco().toFixed(2)}</Text>
                      </Group>
                    </Paper>
                  )}
                </>
              )}

              {formaPagamento === 'FIADO' && (
                <>
                  <Select
                    label="Cliente"
                    placeholder="Selecione o cliente"
                    value={clienteId}
                    onChange={setClienteId}
                    size="md"
                    data={clientes.map(c => ({ value: c.id.toString(), label: c.nome }))}
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
                </>
              )}

              <Group justify="space-between" mt="md" p="sm" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                <Text size="lg" fw={500}>Total:</Text>
                <Title order={2} c="orange">R$ {calcularTotal().toFixed(2)}</Title>
              </Group>

              <Button onClick={finalizarVenda} loading={loading} size="lg" fullWidth>
                FINALIZAR VENDA
              </Button>
            </Stack>
          )}
        </Card>
      </Grid.Col>

      {/* Modal do Scanner de Código de Barras */}
      <BarcodeScanner
        opened={scannerAberto}
        onClose={() => setScannerAberto(false)}
        onScan={handleBarcodeScanned}
        title="Ler Código de Barras do Produto"
      />

      {/* Modal do Comprovante de Venda */}
      <Modal
        opened={comprovanteAberto}
        onClose={() => setComprovanteAberto(false)}
        title=""
        size="lg"
        centered
        padding={0}
      >
        {dadosVenda && (
          <Comprovante
            venda={dadosVenda}
            onClose={() => setComprovanteAberto(false)}
          />
        )}
      </Modal>
    </Grid>
  );
}

export default PDV;
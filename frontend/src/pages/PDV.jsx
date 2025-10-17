import { useState, useEffect, useRef } from 'react';
import { getProdutos, createVenda, getClientes } from '../services/api';
import { localDB } from '../utils/db';
import { syncManager } from '../utils/syncManager';
import { Grid, Card, TextInput, Stack, Paper, Group, Text, NumberInput, ActionIcon, Select, Button, Title, Center } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { FaSearch, FaTrash, FaShoppingCart } from 'react-icons/fa';

function PDV() {
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [busca, setBusca] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO');
  const [clienteId, setClienteId] = useState(null);
  const [dataVencimento, setDataVencimento] = useState(null);
  const [loading, setLoading] = useState(false);
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
    if (itemExistente) {
      setCarrinho(carrinho.map(item => item.produto.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item));
    } else {
      setCarrinho([...carrinho, { produto, quantidade: 1 }]);
    }
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

  const finalizarVenda = async () => {
    if (carrinho.length === 0) return alert('Carrinho vazio!');
    if (formaPagamento === 'FIADO') {
      if (!clienteId) return alert('Selecione o cliente!');
      if (!dataVencimento) return alert('Informe a data de vencimento!');
    }

    setLoading(true);
    const vendaData = {
      forma_pagamento: formaPagamento,
      cliente_id: formaPagamento === 'FIADO' ? parseInt(clienteId) : null,
      data_vencimento: formaPagamento === 'FIADO' ? dataVencimento.toISOString().split('T')[0] : null,
      itens: carrinho.map(item => ({
        produto_id: item.produto.id,
        quantidade: item.quantidade
      }))
    };

    try {
      await createVenda(vendaData);
      alert('Venda registrada com sucesso!');

      // Limpa carrinho e recarrega apenas em caso de sucesso
      setCarrinho([]);
      setBusca('');
      setClienteId(null);
      setDataVencimento(null);
      loadInitialData();
    } catch (error) {
      // Diferencia entre erro de rede e erro de validação
      if (error.response) {
        // Erro de validação do backend (400, 500, etc)
        const errorMsg = error.response.data?.detail
          || error.response.data?.error
          || Object.values(error.response.data || {}).flat().join(', ')
          || 'Erro ao processar venda';
        alert(`ERRO: ${errorMsg}`);
      } else if (error.request) {
        // Erro de rede - salva offline
        await localDB.saveVendaPendente(vendaData);
        setTimeout(() => syncManager.syncAll(), 1000);
        alert('Sem conexão! Venda salva localmente e será sincronizada quando houver internet.');

        // Limpa carrinho apenas em caso de venda offline
        setCarrinho([]);
        setBusca('');
        setClienteId(null);
        setDataVencimento(null);
        loadInitialData();
      } else {
        // Outro tipo de erro
        alert('Erro inesperado: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid gutter="md">
      <Grid.Col span={12} md={5}>
        <Stack gap="sm">
          <TextInput
            ref={buscaRef}
            placeholder="Buscar produto..."
            leftSection={<FaSearch />}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            size="md"
            autoFocus
          />
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
                onChange={setFormaPagamento}
                size="md"
                data={[
                  { value: 'DINHEIRO', label: 'Dinheiro' },
                  { value: 'DEBITO', label: 'Débito' },
                  { value: 'CREDITO', label: 'Crédito' },
                  { value: 'PIX', label: 'PIX' },
                  { value: 'FIADO', label: 'Fiado' },
                ]}
              />

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
    </Grid>
  );
}

export default PDV;
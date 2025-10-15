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
      console.warn('App offline, carregando dados do cache.');
      const [cachedProdutos, cachedClientes] = await Promise.all([localDB.getCachedProdutos(), localDB.getCachedClientes()]);
      setProdutos(cachedProdutos);
      setClientes(cachedClientes);
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
      cliente_id: formaPagamento === 'FIADO' ? clienteId : null,
      data_vencimento: formaPagamento === 'FIADO' ? dataVencimento.toISOString().split('T')[0] : null,
      itens: carrinho.map(item => ({ produto_id: item.produto.id, quantidade: item.quantidade.toString() }))
    };

    try {
      await createVenda(vendaData);
      alert('Venda registrada com sucesso!');
    } catch (networkError) {
      await localDB.saveVendaPendente(vendaData);
      setTimeout(() => syncManager.syncAll(), 1000);
      alert('Venda salva localmente! Será sincronizada automaticamente.');
    }

    setCarrinho([]);
    setBusca('');
    setClienteId(null);
    setDataVencimento(null);
    setLoading(false);
    loadInitialData();
  };

  return (
    <Grid>
      <Grid.Col lg={5}>
        <Stack>
          <TextInput
            ref={buscaRef}
            placeholder="Buscar produto por nome ou código..."
            icon={<FaSearch />}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            autoFocus
          />
          {busca && (
            <Stack spacing="xs">
              {produtosFiltrados.length > 0 ? (
                produtosFiltrados.slice(0, 5).map(produto => (
                  <Paper shadow="xs" p="xs" withBorder key={produto.id} onClick={() => adicionarAoCarrinho(produto)} style={{ cursor: 'pointer' }}>
                    <Group position="apart">
                      <Text>{produto.nome}</Text>
                      <Text weight={500}>R$ {parseFloat(produto.preco).toFixed(2)}</Text>
                    </Group>
                  </Paper>
                ))
              ) : (
                <Text align="center" color="dimmed">Nenhum produto encontrado.</Text>
              )}
            </Stack>
          )}
        </Stack>
      </Grid.Col>

      <Grid.Col lg={7}>
        <Card withBorder radius="md">
          <Group position="apart" mb="md">
            <Title order={3}>Carrinho</Title>
            <FaShoppingCart />
          </Group>

          {carrinho.length === 0 ? (
            <Center><Text color="dimmed">Carrinho vazio.</Text></Center>
          ) : (
            <Stack>
              {carrinho.map(item => (
                <Paper withBorder p="xs" radius="xs" key={item.produto.id}>
                  <Group position="apart">
                    <Stack spacing={0}>
                      <Text>{item.produto.nome}</Text>
                      <Text size="sm" color="dimmed">R$ {parseFloat(item.produto.preco).toFixed(2)}</Text>
                    </Stack>
                    <Group spacing="xs">
                      <NumberInput value={item.quantidade} onChange={(val) => alterarQuantidade(item.produto.id, val)} style={{ width: 80 }} min={0} />
                      <ActionIcon color="red" onClick={() => removerDoCarrinho(item.produto.id)}><FaTrash /></ActionIcon>
                    </Group>
                  </Group>
                </Paper>
              ))}

              <Select
                label="Forma de Pagamento"
                value={formaPagamento}
                onChange={setFormaPagamento}
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
                    data={clientes.map(c => ({ value: c.id.toString(), label: c.nome }))}
                    searchable
                    required
                  />
                  <DatePickerInput
                    label="Data de Vencimento"
                    placeholder="Selecione a data"
                    value={dataVencimento}
                    onChange={setDataVencimento}
                    required
                  />
                </>
              )}

              <Group position="right" mt="md">
                <Text size="lg" weight={500}>Total:</Text>
                <Title order={2}>R$ {calcularTotal().toFixed(2)}</Title>
              </Group>

              <Button onClick={finalizarVenda} loading={loading} size="lg" uppercase>
                Finalizar Venda
              </Button>
            </Stack>
          )}
        </Card>
      </Grid.Col>
    </Grid>
  );
}

export default PDV;
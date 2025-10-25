import { useState, useEffect, useCallback } from 'react';
import { getProdutos, getVendas } from '../services/api';
import { Card, Grid, Title, Stack, Text, Badge, Table, ScrollArea, Group, Select, Paper, Center } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { FaBox, FaExclamationTriangle, FaClock, FaTimes, FaFire } from 'react-icons/fa';

function GiroEstoque() {
  const [produtos, setProdutos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('30'); // Dias para análise
  const [analise, setAnalise] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [produtosRes, vendasRes] = await Promise.all([
        getProdutos(),
        getVendas()
      ]);

      const produtosData = produtosRes.data.results || produtosRes.data;
      const vendasData = vendasRes.data.results || vendasRes.data;

      setProdutos(produtosData);
      setVendas(vendasData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      notifications.show({
        title: 'Erro ao carregar dados',
        message: 'Não foi possível carregar os dados de giro de estoque',
        color: 'red',
        icon: <FaTimes />,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const calcularGiro = useCallback(() => {
    const diasAnalise = parseInt(periodo);
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - diasAnalise);

    const analiseData = produtos.map(produto => {
      // Filtra vendas do produto no período
      const vendasProduto = vendas.filter(venda => {
        const vendaDate = new Date(venda.created_at);
        return vendaDate >= dataLimite && venda.itens?.some(item =>
          item.produto?.id === produto.id || item.produto_id === produto.id
        );
      });

      // Encontra última venda (independente do período)
      const todasVendasProduto = vendas.filter(venda =>
        venda.itens?.some(item =>
          item.produto?.id === produto.id || item.produto_id === produto.id
        )
      );

      let ultimaVendaData = null;
      let diasSemVender = null;

      if (todasVendasProduto.length > 0) {
        const datasVendas = todasVendasProduto.map(v => new Date(v.created_at));
        ultimaVendaData = new Date(Math.max(...datasVendas));
        diasSemVender = Math.floor((new Date() - ultimaVendaData) / (1000 * 60 * 60 * 24));
      }

      // Calcula total vendido no período
      const totalVendido = vendasProduto.reduce((total, venda) => {
        const item = venda.itens?.find(i =>
          i.produto?.id === produto.id || i.produto_id === produto.id
        );
        return total + (item?.quantidade || 0);
      }, 0);

      // Velocidade de venda (unidades por dia)
      const velocidade = totalVendido / diasAnalise;

      // Tempo estimado para acabar estoque (em dias)
      const tempoEstoque = velocidade > 0 ? (produto.estoque / velocidade) : null;

      // Classificação
      let classificacao = 'PARADO';
      let corClassificacao = 'red';

      if (diasSemVender === null) {
        classificacao = 'NUNCA VENDIDO';
        corClassificacao = 'gray';
      } else if (diasSemVender > 60) {
        classificacao = 'PARADO';
        corClassificacao = 'red';
      } else if (velocidade === 0) {
        classificacao = 'SEM VENDAS';
        corClassificacao = 'orange';
      } else if (velocidade < 0.5) {
        classificacao = 'GIRO LENTO';
        corClassificacao = 'yellow';
      } else if (velocidade < 2) {
        classificacao = 'GIRO MÉDIO';
        corClassificacao = 'blue';
      } else {
        classificacao = 'GIRO RÁPIDO';
        corClassificacao = 'green';
      }

      return {
        id: produto.id,
        nome: produto.nome,
        estoque: produto.estoque,
        preco: produto.preco,
        ultimaVenda: ultimaVendaData,
        diasSemVender,
        totalVendido,
        velocidade,
        tempoEstoque,
        classificacao,
        corClassificacao,
        categoria: produto.categoria_nome || 'Sem categoria'
      };
    });

    // Ordena por velocidade (maior primeiro)
    analiseData.sort((a, b) => b.velocidade - a.velocidade);

    setAnalise(analiseData);
  }, [periodo, produtos, vendas]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (produtos.length > 0 && vendas.length > 0) {
      calcularGiro();
    }
  }, [produtos.length, vendas.length, calcularGiro]);

  const formatDate = (date) => {
    if (!date) return 'Nunca';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Estatísticas
  const produtosParados = analise.filter(a => a.classificacao === 'PARADO' || a.classificacao === 'NUNCA VENDIDO').length;
  const produtosGiroLento = analise.filter(a => a.classificacao === 'GIRO LENTO').length;
  const produtosGiroRapido = analise.filter(a => a.classificacao === 'GIRO RÁPIDO').length;
  const valorEstoqueParado = analise
    .filter(a => a.classificacao === 'PARADO' || a.classificacao === 'NUNCA VENDIDO' || a.diasSemVender > 60)
    .reduce((sum, a) => sum + (a.estoque * parseFloat(a.preco)), 0);

  const rows = analise.map((item) => (
    <Table.Tr key={item.id}>
      <Table.Td>
        <Stack gap={2}>
          <Text size="sm" fw={500}>{item.nome}</Text>
          <Text size="xs" c="dimmed">{item.categoria}</Text>
        </Stack>
      </Table.Td>
      <Table.Td>
        <Badge color={item.corClassificacao} size="sm">
          {item.classificacao}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{formatDate(item.ultimaVenda)}</Text>
        {item.diasSemVender !== null && (
          <Text size="xs" c="dimmed">{item.diasSemVender} dias atrás</Text>
        )}
      </Table.Td>
      <Table.Td>
        <Text size="sm">{item.totalVendido.toFixed(0)} un</Text>
        <Text size="xs" c="dimmed">em {periodo} dias</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" fw={500}>{item.velocidade.toFixed(2)} un/dia</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{parseInt(item.estoque)} un</Text>
      </Table.Td>
      <Table.Td>
        {item.tempoEstoque !== null ? (
          <>
            <Text size="sm" fw={500} c={item.tempoEstoque < 7 ? 'red' : item.tempoEstoque < 30 ? 'orange' : 'green'}>
              {Math.ceil(item.tempoEstoque)} dias
            </Text>
            <Text size="xs" c="dimmed">
              {item.tempoEstoque < 7 && 'URGENTE: Reabastecer!'}
              {item.tempoEstoque >= 7 && item.tempoEstoque < 30 && 'Atenção'}
              {item.tempoEstoque >= 30 && 'OK'}
            </Text>
          </>
        ) : (
          <Text size="sm" c="dimmed">∞ (sem vendas)</Text>
        )}
      </Table.Td>
    </Table.Tr>
  ));

  const cards = analise.map((item) => (
    <Card withBorder radius="md" p="sm" key={item.id}>
      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="sm" fw={500} lineClamp={1}>{item.nome}</Text>
          <Badge color={item.corClassificacao} size="sm">
            {item.classificacao}
          </Badge>
        </Group>
        <Text size="xs" c="dimmed">{item.categoria}</Text>

        <Group justify="space-between">
          <Text size="xs" c="dimmed">Última venda:</Text>
          <Text size="xs">
            {formatDate(item.ultimaVenda)}
            {item.diasSemVender !== null && ` (${item.diasSemVender}d)`}
          </Text>
        </Group>

        <Group justify="space-between">
          <Text size="xs" c="dimmed">Velocidade:</Text>
          <Text size="xs" fw={500}>{item.velocidade.toFixed(2)} un/dia</Text>
        </Group>

        <Group justify="space-between">
          <Text size="xs" c="dimmed">Estoque atual:</Text>
          <Text size="xs">{parseInt(item.estoque)} un</Text>
        </Group>

        <Group justify="space-between">
          <Text size="xs" c="dimmed">Tempo de estoque:</Text>
          {item.tempoEstoque !== null ? (
            <Text size="xs" fw={500} c={item.tempoEstoque < 7 ? 'red' : item.tempoEstoque < 30 ? 'orange' : 'green'}>
              {Math.ceil(item.tempoEstoque)} dias
            </Text>
          ) : (
            <Text size="xs" c="dimmed">∞</Text>
          )}
        </Group>
      </Stack>
    </Card>
  ));

  if (loading) {
    return <Center style={{ height: '400px' }}><Text>Carregando análise...</Text></Center>;
  }

  return (
    <>
      <Title order={2} mb="md">Análise de Giro de Estoque</Title>

      {/* Controle de Período */}
      <Paper p="md" withBorder mb="md">
        <Group align="flex-end">
          <Select
            label="Período de Análise"
            description="Quantidade de dias para calcular velocidade de venda"
            value={periodo}
            onChange={setPeriodo}
            data={[
              { value: '7', label: 'Últimos 7 dias' },
              { value: '15', label: 'Últimos 15 dias' },
              { value: '30', label: 'Últimos 30 dias' },
              { value: '60', label: 'Últimos 60 dias' },
              { value: '90', label: 'Últimos 90 dias' },
            ]}
            style={{ width: '250px' }}
          />
        </Group>
      </Paper>

      {/* Cards de Estatísticas */}
      <Grid mb="md">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder radius="md" p="md" style={{ borderColor: '#fa5252' }}>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Produtos Parados</Text>
                <Text size="xl" fw={700}>{produtosParados}</Text>
                <Text size="xs" c="dimmed" mt="xs">
                  R$ {valorEstoqueParado.toFixed(2)} parados
                </Text>
              </div>
              <FaExclamationTriangle size={30} color="#fa5252" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder radius="md" p="md" style={{ borderColor: '#fab005' }}>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Giro Lento</Text>
                <Text size="xl" fw={700}>{produtosGiroLento}</Text>
                <Text size="xs" c="dimmed" mt="xs">
                  Reduzir compras
                </Text>
              </div>
              <FaClock size={30} color="#fab005" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder radius="md" p="md" style={{ borderColor: '#51cf66' }}>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Giro Rápido</Text>
                <Text size="xl" fw={700}>{produtosGiroRapido}</Text>
                <Text size="xs" c="dimmed" mt="xs">
                  Nunca faltar!
                </Text>
              </div>
              <FaFire size={30} color="#51cf66" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder radius="md" p="md">
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Produtos</Text>
                <Text size="xl" fw={700}>{analise.length}</Text>
                <Text size="xs" c="dimmed" mt="xs">
                  Análise completa
                </Text>
              </div>
              <FaBox size={30} color="#228be6" />
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Tabela Desktop */}
      <div style={{ display: 'none' }}>
        <style>
          {`
            @media (min-width: 768px) {
              .table-desktop { display: block !important; }
              .giro-cards { display: none !important; }
            }
          `}
        </style>
      </div>
      <div className="table-desktop" style={{ display: 'none' }}>
        <ScrollArea>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Produto</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Última Venda</Table.Th>
                <Table.Th>Vendido</Table.Th>
                <Table.Th>Velocidade</Table.Th>
                <Table.Th>Estoque</Table.Th>
                <Table.Th>Duração Estimada</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? rows : (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text c="dimmed" ta="center">Nenhum produto encontrado.</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </div>

      {/* Cards Mobile */}
      <div className="giro-cards">
        <Stack gap="sm">
          {cards.length > 0 ? cards : (
            <Text c="dimmed" ta="center">Nenhum produto encontrado.</Text>
          )}
        </Stack>
      </div>

      {/* Legenda */}
      <Paper p="md" withBorder mt="md" style={{ backgroundColor: '#f8f9fa' }}>
        <Text size="sm" fw={700} mb="xs">Legenda de Classificação:</Text>
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Group gap="xs">
              <Badge color="gray" size="sm">NUNCA VENDIDO</Badge>
              <Text size="xs" c="dimmed">Produto nunca foi vendido</Text>
            </Group>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Group gap="xs">
              <Badge color="red" size="sm">PARADO</Badge>
              <Text size="xs" c="dimmed">Sem vendas há mais de 60 dias</Text>
            </Group>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Group gap="xs">
              <Badge color="orange" size="sm">SEM VENDAS</Badge>
              <Text size="xs" c="dimmed">Sem vendas no período</Text>
            </Group>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Group gap="xs">
              <Badge color="yellow" size="sm">GIRO LENTO</Badge>
              <Text size="xs" c="dimmed">Menos de 0,5 un/dia</Text>
            </Group>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Group gap="xs">
              <Badge color="blue" size="sm">GIRO MÉDIO</Badge>
              <Text size="xs" c="dimmed">0,5 a 2 un/dia</Text>
            </Group>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Group gap="xs">
              <Badge color="green" size="sm">GIRO RÁPIDO</Badge>
              <Text size="xs" c="dimmed">Mais de 2 un/dia</Text>
            </Group>
          </Grid.Col>
        </Grid>
      </Paper>
    </>
  );
}

export default GiroEstoque;

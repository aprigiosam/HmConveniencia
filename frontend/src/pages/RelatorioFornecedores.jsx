import { useState, useEffect } from 'react';
import { getFornecedores, getFornecedorLotes, getFornecedorEstatisticas } from '../services/api';
import {
  Container,
  Title,
  Paper,
  Table,
  Group,
  Text,
  Badge,
  LoadingOverlay,
  Select,
  Stack,
  Grid,
  Card,
  SimpleGrid,
  ScrollArea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { FaBuilding, FaBoxOpen, FaDollarSign, FaShoppingCart, FaTruck } from 'react-icons/fa';

const RelatorioFornecedores = () => {
  const [loading, setLoading] = useState(false);
  const [fornecedores, setFornecedores] = useState([]);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState(null);
  const [lotes, setLotes] = useState([]);
  const [estatisticas, setEstatisticas] = useState(null);

  useEffect(() => {
    carregarFornecedores();
  }, []);

  useEffect(() => {
    if (fornecedorSelecionado) {
      carregarDadosFornecedor();
    }
  }, [fornecedorSelecionado]);

  const carregarFornecedores = async () => {
    try {
      setLoading(true);
      const response = await getFornecedores({ ativo: true });
      const data = response.data.results || response.data;
      setFornecedores(data);

      // Seleciona o primeiro fornecedor automaticamente se houver
      if (data.length > 0) {
        setFornecedorSelecionado(data[0].id.toString());
      }
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível carregar fornecedores',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const carregarDadosFornecedor = async () => {
    if (!fornecedorSelecionado) return;

    try {
      setLoading(true);
      const [lotesRes, statsRes] = await Promise.all([
        getFornecedorLotes(fornecedorSelecionado),
        getFornecedorEstatisticas(fornecedorSelecionado),
      ]);

      setLotes(lotesRes.data);
      setEstatisticas(statsRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados do fornecedor:', error);
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível carregar dados do fornecedor',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const fornecedoresOptions = fornecedores.map(f => ({
    value: f.id.toString(),
    label: f.nome_fantasia ? `${f.nome} (${f.nome_fantasia})` : f.nome,
  }));

  const fornecedorAtual = fornecedores.find(f => f.id.toString() === fornecedorSelecionado);

  return (
    <Container size="xl" py="xl">
      <LoadingOverlay visible={loading} />

      <Stack gap="lg">
        <div>
          <Title order={2}>
            <Group>
              <FaBuilding size={32} />
              Relatório de Compras por Fornecedor
            </Group>
          </Title>
          <Text c="dimmed" size="sm">
            Visualize o histórico de compras e lotes de cada fornecedor
          </Text>
        </div>

        {/* Seleção de Fornecedor */}
        <Paper shadow="sm" p="md" withBorder>
          <Select
            label="Selecione o Fornecedor"
            placeholder="Escolha um fornecedor"
            data={fornecedoresOptions}
            value={fornecedorSelecionado}
            onChange={setFornecedorSelecionado}
            searchable
            leftSection={<FaTruck size={16} />}
            size="md"
          />
        </Paper>

        {/* Estatísticas do Fornecedor */}
        {estatisticas && fornecedorAtual && (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
            <Card shadow="sm" padding="lg" withBorder>
              <Group justify="apart" mb="xs">
                <Text size="sm" c="dimmed">Total de Lotes</Text>
                <FaBoxOpen size={20} color="#228be6" />
              </Group>
              <Text size="xl" fw={700}>{estatisticas.total_lotes}</Text>
            </Card>

            <Card shadow="sm" padding="lg" withBorder>
              <Group justify="apart" mb="xs">
                <Text size="sm" c="dimmed">Total de Compras</Text>
                <FaDollarSign size={20} color="#40c057" />
              </Group>
              <Text size="xl" fw={700} c="green">
                {formatCurrency(estatisticas.total_compras)}
              </Text>
            </Card>

            <Card shadow="sm" padding="lg" withBorder>
              <Group justify="apart" mb="xs">
                <Text size="sm" c="dimmed">Produtos Diferentes</Text>
                <FaShoppingCart size={20} color="#fd7e14" />
              </Group>
              <Text size="xl" fw={700}>{estatisticas.total_produtos_diferentes}</Text>
            </Card>

            <Card shadow="sm" padding="lg" withBorder>
              <Group justify="apart" mb="xs">
                <Text size="sm" c="dimmed">Ticket Médio</Text>
                <FaDollarSign size={20} color="#7950f2" />
              </Group>
              <Text size="xl" fw={700} c="violet">
                {formatCurrency(estatisticas.ticket_medio)}
              </Text>
            </Card>
          </SimpleGrid>
        )}

        {/* Tabela de Lotes */}
        {fornecedorAtual && (
          <Paper shadow="sm" p="md" withBorder>
            <Stack gap="md">
              <div>
                <Text fw={500} size="lg">
                  Lotes de {fornecedorAtual.nome}
                </Text>
                {fornecedorAtual.nome_fantasia && (
                  <Text size="sm" c="dimmed">
                    {fornecedorAtual.nome_fantasia}
                  </Text>
                )}
              </div>

              <ScrollArea>
                <Table striped highlightOnHover withTableBorder withColumnBorders>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Data Entrada</Table.Th>
                      <Table.Th>Produto</Table.Th>
                      <Table.Th>Número Lote</Table.Th>
                      <Table.Th>Quantidade</Table.Th>
                      <Table.Th>Preço Custo</Table.Th>
                      <Table.Th>Total</Table.Th>
                      <Table.Th>Validade</Table.Th>
                      <Table.Th>Status</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {lotes.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={8} style={{ textAlign: 'center' }}>
                          <Text c="dimmed">Nenhum lote cadastrado para este fornecedor</Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      lotes.map((lote) => {
                        const totalLote = (lote.quantidade || 0) * (lote.preco_custo_lote || 0);
                        return (
                          <Table.Tr key={lote.id}>
                            <Table.Td>{formatDate(lote.data_entrada)}</Table.Td>
                            <Table.Td>{lote.produto_nome}</Table.Td>
                            <Table.Td>{lote.numero_lote || `#${lote.id}`}</Table.Td>
                            <Table.Td>{lote.quantidade} un</Table.Td>
                            <Table.Td>{formatCurrency(lote.preco_custo_lote)}</Table.Td>
                            <Table.Td>
                              <Text fw={500}>{formatCurrency(totalLote)}</Text>
                            </Table.Td>
                            <Table.Td>{formatDate(lote.data_validade)}</Table.Td>
                            <Table.Td>
                              {lote.esta_vencido ? (
                                <Badge color="red">Vencido</Badge>
                              ) : lote.dias_para_vencer !== null && lote.dias_para_vencer <= 7 ? (
                                <Badge color="yellow">{lote.dias_para_vencer} dias</Badge>
                              ) : lote.dias_para_vencer !== null ? (
                                <Badge color="green">{lote.dias_para_vencer} dias</Badge>
                              ) : (
                                <Badge color="gray">Sem validade</Badge>
                              )}
                            </Table.Td>
                          </Table.Tr>
                        );
                      })
                    )}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Stack>
          </Paper>
        )}

        {fornecedores.length === 0 && !loading && (
          <Paper shadow="sm" p="xl" withBorder>
            <Text c="dimmed" ta="center">
              Nenhum fornecedor cadastrado. Cadastre fornecedores para visualizar o relatório.
            </Text>
          </Paper>
        )}
      </Stack>
    </Container>
  );
};

export default RelatorioFornecedores;

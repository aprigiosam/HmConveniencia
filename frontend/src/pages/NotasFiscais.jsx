import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Paper,
  Group,
  Text,
  Stack,
  Button,
  Badge,
  LoadingOverlay,
  Table,
  ActionIcon,
  Modal,
  ScrollArea,
  TextInput,
  FileInput,
  Alert,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import {
  FaTrash,
  FaEye,
  FaSearch,
  FaBuilding,
  FaFileUpload,
  FaCheck,
  FaTimes,
  FaInfoCircle,
} from 'react-icons/fa';
import { getNotasFiscais, deleteNotaFiscal, importarNFe } from '../services/api';

function NotasFiscais() {
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [notaSelecionada, setNotaSelecionada] = useState(null);
  const [xmlFile, setXmlFile] = useState(null);
  const [importandoXml, setImportandoXml] = useState(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [detailModalOpened, { open: openDetailModal, close: closeDetailModal }] = useDisclosure(false);
  const [importModalOpened, { open: openImportModal, close: closeImportModal }] = useDisclosure(false);

  useEffect(() => {
    carregarNotas();
  }, []);

  const carregarNotas = async () => {
    try {
      setLoading(true);
      const response = await getNotasFiscais();
      setNotas(response.data.results || response.data);
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível carregar as notas fiscais',
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

      notifications.show({
        title: 'NF-e importada com sucesso',
        message: `Nota ${nota.numero}/${nota.serie} importada com ${nota.itens?.length || 0} item(ns)`,
        color: 'green',
        icon: <FaCheck />,
      });

      setXmlFile(null);
      closeImportModal();
      await carregarNotas();
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

  const handleExcluir = async () => {
    if (!notaSelecionada) return;

    try {
      setLoading(true);
      await deleteNotaFiscal(notaSelecionada.id);

      notifications.show({
        title: 'Nota Excluída',
        message: `NF-e ${notaSelecionada.numero}/${notaSelecionada.serie} excluída e estoque revertido com sucesso`,
        color: 'green',
      });

      closeDeleteModal();
      setNotaSelecionada(null);
      await carregarNotas();
    } catch (error) {
      console.error('Erro ao excluir nota:', error);
      notifications.show({
        title: 'Erro',
        message: error.response?.data?.detail || 'Não foi possível excluir a nota',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (dataStr) => {
    if (!dataStr) return '-';
    const data = new Date(dataStr);
    return data.toLocaleString('pt-BR');
  };

  const formatarValor = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const getBadgeStatus = (status) => {
    const statusMap = {
      AUTORIZADA: { color: 'green', label: 'Autorizada' },
      REJEITADA: { color: 'red', label: 'Rejeitada' },
      CANCELADA: { color: 'gray', label: 'Cancelada' },
      EM_PROCESSAMENTO: { color: 'yellow', label: 'Processando' },
    };

    const config = statusMap[status] || { color: 'gray', label: status };
    return <Badge color={config.color}>{config.label}</Badge>;
  };

  const notasFiltradas = notas.filter((nota) => {
    const termo = busca.toLowerCase();
    return (
      nota.numero?.toString().includes(termo) ||
      nota.chave_acesso?.toLowerCase().includes(termo) ||
      nota.emitente_nome?.toLowerCase().includes(termo) ||
      nota.fornecedor_nome?.toLowerCase().includes(termo)
    );
  });

  return (
    <Container size="xl">
      <LoadingOverlay visible={loading} />

      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Title order={2}>Notas Fiscais Importadas</Title>
            <Text c="dimmed" size="sm">
              Gerencie as notas fiscais de entrada do sistema
            </Text>
          </div>
          <Group gap="xs">
            <Button onClick={openImportModal} leftSection={<FaFileUpload />} color="blue">
              Importar XML
            </Button>
            <Button onClick={carregarNotas} variant="light">
              Atualizar
            </Button>
          </Group>
        </Group>

        <TextInput
          placeholder="Buscar por número, chave ou fornecedor..."
          leftSection={<FaSearch />}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <ScrollArea>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nota</Table.Th>
                <Table.Th>Fornecedor</Table.Th>
                <Table.Th>Data Emissão</Table.Th>
                <Table.Th>Valor Total</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th style={{ width: '120px' }}>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {notasFiltradas.length > 0 ? (
                notasFiltradas.map((nota) => (
                  <Table.Tr key={nota.id}>
                    <Table.Td>
                      <Text fw={500}>{nota.numero}/{nota.serie}</Text>
                      <Text size="xs" c="dimmed">{nota.tipo}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{nota.fornecedor_nome || nota.emitente_nome || '-'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatarData(nota.data_emissao)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500}>{formatarValor(nota.valor_total)}</Text>
                    </Table.Td>
                    <Table.Td>{getBadgeStatus(nota.status)}</Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <ActionIcon
                          color="blue"
                          variant="light"
                          onClick={() => {
                            setNotaSelecionada(nota);
                            openDetailModal();
                          }}
                        >
                          <FaEye />
                        </ActionIcon>
                        <ActionIcon
                          color="red"
                          variant="light"
                          onClick={() => {
                            setNotaSelecionada(nota);
                            openDeleteModal();
                          }}
                        >
                          <FaTrash />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed" ta="center">
                      {busca ? 'Nenhuma nota encontrada' : 'Nenhuma nota fiscal importada'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Stack>

      {/* Modal de Importação de XML */}
      <Modal
        opened={importModalOpened}
        onClose={() => {
          closeImportModal();
          setXmlFile(null);
        }}
        title="Importar NF-e (XML)"
        centered
      >
        <Stack gap="md">
          <Alert color="blue" icon={<FaInfoCircle />}>
            Envie o arquivo XML da NF-e de entrada. O sistema irá:
            <ul style={{ marginTop: '8px', marginBottom: 0 }}>
              <li>Criar ou atualizar produtos automaticamente</li>
              <li>Criar lotes com validade estimada baseada na categoria</li>
              <li>Atualizar o estoque dos produtos</li>
            </ul>
          </Alert>

          <FileInput
            label="Arquivo XML da NF-e"
            placeholder="Selecione o arquivo XML"
            accept=".xml"
            leftSection={<FaFileUpload />}
            value={xmlFile}
            onChange={setXmlFile}
            description="Arquivo XML da nota fiscal eletrônica de entrada"
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => {
                closeImportModal();
                setXmlFile(null);
              }}
              disabled={importandoXml}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImportarXml}
              loading={importandoXml}
              leftSection={<FaFileUpload />}
              color="blue"
            >
              Importar NF-e
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal de Detalhes */}
      <Modal
        opened={detailModalOpened}
        onClose={closeDetailModal}
        title="Detalhes da Nota Fiscal"
        size="xl"
      >
        {notaSelecionada && (
          <Stack gap="md">
            <Paper withBorder p="md">
              <Stack gap="xs">
                <Group justify="apart">
                  <Text size="sm" c="dimmed">Número:</Text>
                  <Text fw={500}>{notaSelecionada.numero}/{notaSelecionada.serie}</Text>
                </Group>
                <Group justify="apart">
                  <Text size="sm" c="dimmed">Tipo:</Text>
                  <Text>{notaSelecionada.tipo}</Text>
                </Group>
                <Group justify="apart">
                  <Text size="sm" c="dimmed">Status:</Text>
                  {getBadgeStatus(notaSelecionada.status)}
                </Group>
                <Group justify="apart">
                  <Text size="sm" c="dimmed">Chave de Acesso:</Text>
                  <Text size="xs" style={{ wordBreak: 'break-all' }}>
                    {notaSelecionada.chave_acesso}
                  </Text>
                </Group>
              </Stack>
            </Paper>

            <Paper withBorder p="md">
              <Title order={5} mb="xs">Emitente/Fornecedor</Title>
              <Stack gap="xs">
                <Group gap="xs">
                  <FaBuilding />
                  <Text>{notaSelecionada.emitente_nome || '-'}</Text>
                </Group>
                <Text size="sm" c="dimmed">
                  {notaSelecionada.emitente_documento || '-'}
                </Text>
              </Stack>
            </Paper>

            <Paper withBorder p="md">
              <Title order={5} mb="xs">Produtos da Nota</Title>
              {notaSelecionada.itens && notaSelecionada.itens.length > 0 ? (
                <ScrollArea>
                  <Table striped highlightOnHover withTableBorder>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Código</Table.Th>
                        <Table.Th>Descrição</Table.Th>
                        <Table.Th>NCM</Table.Th>
                        <Table.Th>Qtd</Table.Th>
                        <Table.Th>Valor Un.</Table.Th>
                        <Table.Th>Total</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {notaSelecionada.itens.map((item) => (
                        <Table.Tr key={item.id}>
                          <Table.Td>
                            <Text size="sm">{item.codigo_produto || '-'}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={500}>{item.descricao}</Text>
                            {item.produto_nome && (
                              <Text size="xs" c="dimmed">Produto: {item.produto_nome}</Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{item.ncm || '-'}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{item.quantidade} {item.unidade}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{formatarValor(item.valor_unitario)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={500}>{formatarValor(item.valor_total)}</Text>
                            {parseFloat(item.valor_desconto) > 0 && (
                              <Text size="xs" c="red">-{formatarValor(item.valor_desconto)}</Text>
                            )}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              ) : (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  Nenhum item encontrado na nota
                </Text>
              )}
            </Paper>

            <Paper withBorder p="md">
              <Title order={5} mb="xs">Valores</Title>
              <Stack gap="xs">
                <Group justify="apart">
                  <Text size="sm">Produtos:</Text>
                  <Text fw={500}>{formatarValor(notaSelecionada.valor_produtos)}</Text>
                </Group>
                <Group justify="apart">
                  <Text size="sm">Descontos:</Text>
                  <Text c="red">{formatarValor(notaSelecionada.valor_descontos)}</Text>
                </Group>
                <Group justify="apart">
                  <Text fw={600}>Total:</Text>
                  <Text fw={600} size="lg">{formatarValor(notaSelecionada.valor_total)}</Text>
                </Group>
              </Stack>
            </Paper>

            <Paper withBorder p="md">
              <Title order={5} mb="xs">Datas</Title>
              <Stack gap="xs">
                <Group justify="apart">
                  <Text size="sm" c="dimmed">Emissão:</Text>
                  <Text size="sm">{formatarData(notaSelecionada.data_emissao)}</Text>
                </Group>
                <Group justify="apart">
                  <Text size="sm" c="dimmed">Autorização:</Text>
                  <Text size="sm">{formatarData(notaSelecionada.data_autorizacao)}</Text>
                </Group>
                <Group justify="apart">
                  <Text size="sm" c="dimmed">Importação:</Text>
                  <Text size="sm">{formatarData(notaSelecionada.created_at)}</Text>
                </Group>
              </Stack>
            </Paper>
          </Stack>
        )}
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title="Excluir Nota Fiscal"
        centered
      >
        {notaSelecionada && (
          <Stack gap="md">
            <Text>
              Tem certeza que deseja excluir a NF-e <strong>{notaSelecionada.numero}/{notaSelecionada.serie}</strong>?
            </Text>
            <Paper p="sm" withBorder bg="yellow.0">
              <Text size="sm" fw={500}>
                ⚠️ Esta ação irá:
              </Text>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li><Text size="sm">Excluir todos os lotes criados por esta nota</Text></li>
                <li><Text size="sm">Reverter o estoque dos produtos</Text></li>
                <li><Text size="sm">Excluir os movimentos de estoque relacionados</Text></li>
              </ul>
              <Text size="sm" c="red">
                Esta ação não pode ser desfeita!
              </Text>
            </Paper>
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeDeleteModal}>
                Cancelar
              </Button>
              <Button color="red" onClick={handleExcluir}>
                Excluir e Reverter Estoque
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}

export default NotasFiscais;

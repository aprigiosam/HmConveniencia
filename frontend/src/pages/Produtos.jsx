import { useState, useEffect, useRef } from 'react';
import { getProdutos, createProduto, updateProduto, deleteProduto, getCategorias } from '../services/api';
import { localDB } from '../utils/db';
import { Table, Button, Modal, TextInput, NumberInput, Select, Group, Title, ActionIcon, Stack, Text, ScrollArea, Card, Badge } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { FaEdit, FaTrash, FaPlus, FaBarcode, FaCheck, FaTimes, FaExclamationTriangle, FaSearch } from 'react-icons/fa';
import { BrowserMultiFormatReader } from '@zxing/browser';
import './Produtos.css';

function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [scannerAberto, setScannerAberto] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [formData, setFormData] = useState({ nome: '', preco: '', preco_custo: '', estoque: '', categoria: '', codigo_barras: '', data_validade: null });
  const scannerRef = useRef(null);
  const leituraEmAndamentoRef = useRef(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const cachedProdutos = await localDB.getCachedProdutos();
    if (cachedProdutos.length > 0) {
      setProdutos(cachedProdutos);
      setLoading(false);
    }

    try {
      const [produtosRes, categoriasRes] = await Promise.all([getProdutos(), getCategorias()]);
      const produtosData = produtosRes.data.results || produtosRes.data;
      const categoriasData = categoriasRes.data.results || categoriasRes.data;

      setProdutos(produtosData);
      setCategorias(categoriasData);
      await localDB.cacheProdutos(produtosData);
    } catch (error) {
      console.error('Servidor offline, usando cache local');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ nome: '', preco: '', preco_custo: '', estoque: '', categoria: '', codigo_barras: '', data_validade: null });
    setEditingProduct(null);
  };

  const handleOpenModal = (produto = null) => {
    if (produto) {
      setEditingProduct(produto);
      setFormData({
        nome: produto.nome,
        preco: produto.preco,
        preco_custo: produto.preco_custo || '',
        estoque: produto.estoque,
        categoria: produto.categoria?.toString() || '',
        codigo_barras: produto.codigo_barras || '',
        data_validade: produto.data_validade ? new Date(produto.data_validade) : null,
      });
    } else {
      resetForm();
    }
    open();
  };

  const handleCloseModal = () => {
    close();
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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

    const dataToSend = {
      ...formData,
      categoria: formData.categoria ? parseInt(formData.categoria) : null,
      data_validade: dataValidadeFormatada
    };
    try {
      if (editingProduct) {
        await updateProduto(editingProduct.id, dataToSend);
      } else {
        await createProduto(dataToSend);
      }
      handleCloseModal();
      loadInitialData();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
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

  const abrirScanner = () => {
    leituraEmAndamentoRef.current = false;
    setScannerAberto(true);
  };

  const fecharScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.reset();
      scannerRef.current = null;
    }
    setScannerAberto(false);
  };

  const processarCodigoBarras = (codigoBarras) => {
    if (leituraEmAndamentoRef.current || !scannerRef.current) return;

    leituraEmAndamentoRef.current = true;
    const scanner = scannerRef.current;
    scannerRef.current = null;

    try {
      scanner.reset();
    } catch (error) {
      console.log('Erro ao parar scanner (ignorado):', error);
    }

    setScannerAberto(false);
    setFormData(prev => ({ ...prev, codigo_barras: codigoBarras }));

    notifications.show({
      title: 'Código capturado!',
      message: `Código ${codigoBarras} adicionado ao formulário`,
      color: 'green',
      icon: <FaCheck />,
      autoClose: 3000,
    });

    setTimeout(() => {
      leituraEmAndamentoRef.current = false;
    }, 1000);
  };

  useEffect(() => {
    if (scannerAberto && !scannerRef.current) {
      const codeReader = new BrowserMultiFormatReader();

      setTimeout(async () => {
        const videoElement = document.getElementById('video-reader-produtos');
        if (!videoElement) {
          console.error('Elemento video não encontrado');
          return;
        }

        try {
          await codeReader.decodeFromVideoDevice(
            undefined,
            videoElement,
            (result, error) => {
              if (result) {
                processarCodigoBarras(result.getText());
              }
            }
          );

          scannerRef.current = codeReader;
        } catch (error) {
          console.error('Erro ao inicializar scanner:', error);
          notifications.show({
            title: 'Erro ao abrir câmera',
            message: error.message || 'Permita o acesso à câmera nas configurações do navegador.',
            color: 'red',
            icon: <FaTimes />,
          });
          setScannerAberto(false);
        }
      }, 100);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.reset();
        scannerRef.current = null;
      }
    };
  }, [scannerAberto]);

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

  const rows = produtosFiltrados.map((produto) => (
    <Table.Tr key={produto.id} style={{ backgroundColor: produto.esta_vencido ? '#fee' : produto.proximo_vencimento ? '#ffeaa7' : 'inherit' }}>
      <Table.Td>
        <Group gap="xs">
          <Text>{produto.nome}</Text>
          {getValidadeBadge(produto)}
        </Group>
      </Table.Td>
      <Table.Td>{produto.codigo_barras || '-'}</Table.Td>
      <Table.Td>R$ {parseFloat(produto.preco).toFixed(2)}</Table.Td>
      <Table.Td>
        {produto.preco_custo && parseFloat(produto.preco_custo) > 0 ? (
          <>
            <Text size="sm">R$ {parseFloat(produto.preco_custo).toFixed(2)}</Text>
            <Text size="xs" c="dimmed">{produto.margem_lucro?.toFixed(1)}%</Text>
          </>
        ) : (
          <Text size="xs" c="red">Não cadastrado</Text>
        )}
      </Table.Td>
      <Table.Td>{parseInt(produto.estoque)}</Table.Td>
      <Table.Td>{produto.categoria_nome || 'Sem categoria'}</Table.Td>
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
  ));

  const cards = produtosFiltrados.map((produto) => (
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
          <Text size="sm" fw={500}>R$ {parseFloat(produto.preco).toFixed(2)}</Text>
        </Group>
        {produto.preco_custo && parseFloat(produto.preco_custo) > 0 ? (
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Preço Custo:</Text>
            <Text size="sm">R$ {parseFloat(produto.preco_custo).toFixed(2)} ({produto.margem_lucro?.toFixed(1)}%)</Text>
          </Group>
        ) : (
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Preço Custo:</Text>
            <Text size="sm" c="red">Não cadastrado</Text>
          </Group>
        )}
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Estoque:</Text>
          <Text size="sm" fw={500}>{parseInt(produto.estoque)}</Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Categoria:</Text>
          <Text size="sm">{produto.categoria_nome || '-'}</Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Cód. Barras:</Text>
          <Text size="sm">{produto.codigo_barras || '-'}</Text>
        </Group>
      </Stack>
    </Card>
  ));

  const categoriaOptions = categorias.map(cat => ({ value: cat.id.toString(), label: cat.nome }));

  return (
    <>
      <Group justify="space-between" mb="md" wrap="wrap" gap="xs">
        <Title order={2}>Produtos</Title>
        <Button leftSection={<FaPlus />} onClick={() => handleOpenModal()} size="md">
          Novo Produto
        </Button>
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
                  onClick={abrirScanner}
                  title="Ler código com câmera"
                >
                  <FaBarcode size={18} />
                </ActionIcon>
              </Group>
              <Text size="xs" c="dimmed">Opcional - Digite ou use a câmera para escanear</Text>
            </Stack>

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
            <Select label="Categoria" placeholder="Selecione uma categoria" data={categoriaOptions} value={formData.categoria} onChange={(value) => setFormData({ ...formData, categoria: value })} clearable size="md" />
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

      <Modal
        opened={scannerAberto}
        onClose={fecharScanner}
        title="Ler Código de Barras"
        size="lg"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Aponte a câmera para o código de barras do produto
          </Text>
          <video
            id="video-reader-produtos"
            style={{
              width: '100%',
              maxHeight: '400px',
              borderRadius: '8px',
              backgroundColor: '#000'
            }}
          />
          <Button onClick={fecharScanner} variant="light" fullWidth>
            Cancelar
          </Button>
        </Stack>
      </Modal>

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
                <Table.Th style={{ width: '120px' }}>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? rows : (
                <Table.Tr>
                  <Table.Td colSpan={7}>
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
    </>
  );
}

export default Produtos;

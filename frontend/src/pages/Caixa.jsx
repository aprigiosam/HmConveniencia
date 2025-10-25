import { useState, useEffect } from 'react';
import { getCaixaStatus, abrirCaixa, getCaixaPreview, fecharCaixa, adicionarMovimentacao } from '../services/api';
import {
  Card,
  Button,
  Modal,
  NumberInput,
  Group,
  Title,
  Text,
  Stack,
  Textarea,
  Select,
  TextInput,
  Paper,
  Divider,
  Badge
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { FaFolder, FaFolderOpen, FaExchangeAlt, FaLock, FaMoneyBill, FaCreditCard, FaQrcode, FaFileInvoice } from 'react-icons/fa';

function Caixa() {
  const [caixa, setCaixa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [valorInicial, setValorInicial] = useState(0);
  const [valorFinal, setValorFinal] = useState(0);
  const [observacoes, setObservacoes] = useState('');
  const [movimentacao, setMovimentacao] = useState({ tipo: 'SANGRIA', valor: 0, descricao: '' });
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [fecharModalOpened, { open: openFecharModal, close: closeFecharModal }] = useDisclosure(false);
  const [movModalOpened, { open: openMovModal, close: closeMovModal }] = useDisclosure(false);

  useEffect(() => {
    loadCaixaStatus();
  }, []);

  const loadCaixaStatus = async () => {
    setLoading(true);
    try {
      const response = await getCaixaStatus();
      setCaixa(response.data);
    } catch (error) {
      setCaixa({ status: 'FECHADO' });
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirCaixa = async (e) => {
    e.preventDefault();
    try {
      await abrirCaixa({ valor_inicial: valorInicial });
      setValorInicial(0);
      loadCaixaStatus();
    } catch (error) {
      alert('Não foi possível abrir o caixa.');
    }
  };

  const handleOpenFecharModal = async () => {
    setLoadingPreview(true);
    openFecharModal();
    try {
      const response = await getCaixaPreview(caixa.id);
      setPreview(response.data);
      // Pre-preenche com o valor esperado
      setValorFinal(Number(response.data.valor_esperado_caixa));
    } catch (error) {
      console.error('Erro ao carregar preview:', error);
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleFecharCaixa = async (e) => {
    e.preventDefault();
    try {
      await fecharCaixa(caixa.id, { valor_final_informado: valorFinal, observacoes });
      closeFecharModal();
      setValorFinal(0);
      setObservacoes('');
      setPreview(null);
      loadCaixaStatus();
    } catch (error) {
      alert('Erro ao fechar o caixa.');
    }
  };

  const handleMovimentacao = async (e) => {
    e.preventDefault();
    try {
      await adicionarMovimentacao(caixa.id, movimentacao);
      closeMovModal();
      setMovimentacao({ tipo: 'SANGRIA', valor: 0, descricao: '' });
      loadCaixaStatus();
    } catch (error) {
      alert('Erro ao registrar movimentação.');
    }
  };

  const formatCurrency = (value) => {
    const num = Number(value) || 0;
    return `R$ ${num.toFixed(2)}`;
  };

  if (loading) return <Text>Carregando...</Text>;

  // Caixa Fechado
  if (caixa?.status !== 'ABERTO') {
    return (
      <>
        <Title order={2} mb="md">Gestão de Caixa</Title>
        <Card withBorder radius="md" p="md">
          <Stack align="center" gap="md">
            <FaFolder size={40} color="gray" />
            <Text size="lg" fw={500}>Caixa Fechado</Text>
            <Text c="dimmed" ta="center">Não há nenhum caixa aberto no momento.</Text>
            <form onSubmit={handleAbrirCaixa} style={{width: '100%', maxWidth: 400}}>
              <Stack gap="sm">
                <NumberInput label="Valor inicial (troco)" value={valorInicial} onChange={setValorInicial} precision={2} min={0} size="md" required autoFocus />
                <Button type="submit" fullWidth size="lg">Abrir Caixa</Button>
              </Stack>
            </form>
          </Stack>
        </Card>
      </>
    );
  }

  // Caixa Aberto
  return (
    <>
      <Group justify="space-between" mb="md" wrap="wrap" gap="xs">
        <Title order={2}>Gestão de Caixa</Title>
        <Group gap="xs" wrap="wrap">
          <Button variant="outline" leftSection={<FaExchangeAlt />} onClick={openMovModal} size="sm">
            Nova Movimentação
          </Button>
          <Button color="red" leftSection={<FaLock />} onClick={handleOpenFecharModal} size="sm">
            Fechar Caixa
          </Button>
        </Group>
      </Group>

      <Card withBorder radius="md" p="md">
        <Group justify="space-between" align="center" mb="md">
          <Title order={3}>Caixa Aberto</Title>
          <FaFolderOpen size={24} color="green" />
        </Group>
        <Stack gap="xs">
          <Text size="sm">Aberto em: <strong>{new Date(caixa.data_abertura).toLocaleString('pt-BR')}</strong></Text>
          <Text size="sm">Valor Inicial (Troco): <strong>R$ {parseFloat(caixa.valor_inicial).toFixed(2)}</strong></Text>
        </Stack>
      </Card>

      {/* Modal Fechar Caixa com Preview */}
      <Modal opened={fecharModalOpened} onClose={closeFecharModal} title="Fechar Caixa" size="lg">
        <form onSubmit={handleFecharCaixa}>
          <Stack gap="md">
            {loadingPreview ? (
              <Text ta="center" c="dimmed">Carregando resumo...</Text>
            ) : preview ? (
              <>
                {/* Resumo de Vendas */}
                <Paper withBorder p="md" radius="md">
                  <Text fw={700} size="lg" mb="md">📊 Resumo de Vendas</Text>
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Group gap="xs">
                        <FaMoneyBill color="green" />
                        <Text>Dinheiro</Text>
                      </Group>
                      <Text fw={600}>{formatCurrency(preview.total_dinheiro)}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Group gap="xs">
                        <FaCreditCard color="blue" />
                        <Text>Débito</Text>
                      </Group>
                      <Text fw={600}>{formatCurrency(preview.total_debito)}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Group gap="xs">
                        <FaCreditCard color="purple" />
                        <Text>Crédito</Text>
                      </Group>
                      <Text fw={600}>{formatCurrency(preview.total_credito)}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Group gap="xs">
                        <FaQrcode color="teal" />
                        <Text>PIX</Text>
                      </Group>
                      <Text fw={600}>{formatCurrency(preview.total_pix)}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Group gap="xs">
                        <FaFileInvoice color="orange" />
                        <Text>Fiado</Text>
                      </Group>
                      <Text fw={600}>{formatCurrency(preview.total_fiado)}</Text>
                    </Group>
                    <Divider my="sm" />
                    <Group justify="space-between">
                      <Text fw={700} size="lg">TOTAL DE VENDAS</Text>
                      <Badge size="xl" color="blue">{formatCurrency(preview.total_vendas)}</Badge>
                    </Group>
                  </Stack>
                </Paper>

                {/* Movimentações */}
                {(preview.total_sangrias > 0 || preview.total_suprimentos > 0) && (
                  <Paper withBorder p="md" radius="md">
                    <Text fw={700} size="md" mb="md">💸 Movimentações</Text>
                    <Stack gap="xs">
                      {preview.total_suprimentos > 0 && (
                        <Group justify="space-between">
                          <Text c="green">+ Suprimentos</Text>
                          <Text c="green" fw={600}>{formatCurrency(preview.total_suprimentos)}</Text>
                        </Group>
                      )}
                      {preview.total_sangrias > 0 && (
                        <Group justify="space-between">
                          <Text c="red">- Sangrias</Text>
                          <Text c="red" fw={600}>{formatCurrency(preview.total_sangrias)}</Text>
                        </Group>
                      )}
                    </Stack>
                  </Paper>
                )}

                {/* Valor Esperado em Caixa */}
                <Paper withBorder p="md" radius="md" bg="blue.0">
                  <Group justify="space-between" align="center">
                    <div>
                      <Text fw={700} size="lg">💵 Valor Esperado em Caixa</Text>
                      <Text size="xs" c="dimmed">
                        (Inicial + Dinheiro + Suprimentos - Sangrias)
                      </Text>
                    </div>
                    <Badge size="xl" color="blue">{formatCurrency(preview.valor_esperado_caixa)}</Badge>
                  </Group>
                </Paper>

                <Divider />

                {/* Formulário de Fechamento */}
                <Text size="sm" fw={500}>
                  Agora conte todo o dinheiro físico em caixa e confirme o valor abaixo:
                </Text>
              </>
            ) : null}

            <NumberInput
              label="Valor Total Contado (Dinheiro em Caixa)"
              description="Conte todo o dinheiro físico e insira o total"
              required
              value={valorFinal}
              onChange={setValorFinal}
              precision={2}
              min={0}
              size="lg"
              autoFocus
            />

            <Textarea
              label="Observações"
              placeholder="Alguma observação sobre o fechamento"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              size="md"
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeFecharModal}>Cancelar</Button>
              <Button type="submit" color="red" size="lg">Confirmar Fechamento</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal Nova Movimentação */}
      <Modal opened={movModalOpened} onClose={closeMovModal} title="Nova Movimentação" size="md">
        <form onSubmit={handleMovimentacao}>
          <Stack gap="sm">
            <Select label="Tipo" required value={movimentacao.tipo} onChange={(value) => setMovimentacao({ ...movimentacao, tipo: value })} data={[{ value: 'SANGRIA', label: 'Sangria (Retirada)' }, { value: 'SUPRIMENTO', label: 'Suprimento (Adição)' }]} size="md" />
            <NumberInput label="Valor" required value={movimentacao.valor} onChange={(value) => setMovimentacao({ ...movimentacao, valor: value })} precision={2} min={0.01} size="md" />
            <TextInput label="Descrição" required value={movimentacao.descricao} onChange={(e) => setMovimentacao({ ...movimentacao, descricao: e.target.value })} size="md" />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeMovModal}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}

export default Caixa;

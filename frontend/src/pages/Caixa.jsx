import { useState, useEffect } from 'react';
import { getCaixaStatus, abrirCaixa, fecharCaixa, adicionarMovimentacao } from '../services/api';
import { Card, Button, Modal, NumberInput, Group, Title, Text, Stack, Textarea, Select } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { FaFolder, FaFolderOpen, FaExchangeAlt, FaLock } from 'react-icons/fa';

function Caixa() {
  const [caixa, setCaixa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [valorInicial, setValorInicial] = useState(0);
  const [valorFinal, setValorFinal] = useState(0);
  const [observacoes, setObservacoes] = useState('');
  const [movimentacao, setMovimentacao] = useState({ tipo: 'SANGRIA', valor: 0, descricao: '' });

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

  const handleFecharCaixa = async (e) => {
    e.preventDefault();
    try {
      await fecharCaixa(caixa.id, { valor_final_informado: valorFinal, observacoes });
      closeFecharModal();
      setValorFinal(0);
      setObservacoes('');
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

  if (loading) return <Text>Carregando...</Text>;

  // Caixa Fechado
  if (caixa?.status !== 'ABERTO') {
    return (
      <>
        <Title order={2} mb="lg">Gestão de Caixa</Title>
        <Card withBorder radius="md" p="lg">
          <Group position="center" direction="column">
            <FaFolder size={40} color="gray" />
            <Text size="lg" weight={500}>Caixa Fechado</Text>
            <Text color="dimmed">Não há nenhum caixa aberto no momento.</Text>
            <form onSubmit={handleAbrirCaixa} style={{width: '100%', maxWidth: 400, marginTop: 20}}>
              <Stack>
                <NumberInput label="Valor inicial (troco)" value={valorInicial} onChange={setValorInicial} precision={2} min={0} required autoFocus />
                <Button type="submit" fullWidth>Abrir Caixa</Button>
              </Stack>
            </form>
          </Group>
        </Card>
      </>
    );
  }

  // Caixa Aberto
  return (
    <>
      <Group position="apart" mb="lg">
        <Title order={2}>Gestão de Caixa</Title>
        <Group>
          <Button variant="outline" leftIcon={<FaExchangeAlt />} onClick={openMovModal}>Nova Movimentação</Button>
          <Button color="red" leftIcon={<FaLock />} onClick={openFecharModal}>Fechar Caixa</Button>
        </Group>
      </Group>

      <Card withBorder radius="md" p="lg">
        <Group position="apart" align="center">
          <Title order={3}>Caixa Aberto</Title>
          <FaFolderOpen size={24} color="green" />
        </Group>
        <Text mt="md">Aberto em: <strong>{new Date(caixa.data_abertura).toLocaleString('pt-BR')}</strong></Text>
        <Text>Valor Inicial (Troco): <strong>R$ {parseFloat(caixa.valor_inicial).toFixed(2)}</strong></Text>
      </Card>

      {/* Modal Fechar Caixa */}
      <Modal opened={fecharModalOpened} onClose={closeFecharModal} title="Fechar Caixa">
        <form onSubmit={handleFecharCaixa}>
          <Stack>
            <Text>Conte todo o dinheiro em caixa e insira o valor total abaixo.</Text>
            <NumberInput label="Valor Total Contado" required value={valorFinal} onChange={setValorFinal} precision={2} min={0} autoFocus />
            <Textarea label="Observações" placeholder="Alguma observação sobre o fechamento" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            <Group position="right" mt="md">
              <Button variant="default" onClick={closeFecharModal}>Cancelar</Button>
              <Button type="submit" color="red">Confirmar Fechamento</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal Nova Movimentação */}
      <Modal opened={movModalOpened} onClose={closeMovModal} title="Nova Movimentação">
        <form onSubmit={handleMovimentacao}>
          <Stack>
            <Select label="Tipo" required value={movimentacao.tipo} onChange={(value) => setMovimentacao({ ...movimentacao, tipo: value })} data={[{ value: 'SANGRIA', label: 'Sangria (Retirada)' }, { value: 'SUPRIMENTO', label: 'Suprimento (Adição)' }]} />
            <NumberInput label="Valor" required value={movimentacao.valor} onChange={(value) => setMovimentacao({ ...movimentacao, valor: value })} precision={2} min={0.01} autoFocus />
            <TextInput label="Descrição" required value={movimentacao.descricao} onChange={(e) => setMovimentacao({ ...movimentacao, descricao: e.target.value })} />
            <Group position="right" mt="md">
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
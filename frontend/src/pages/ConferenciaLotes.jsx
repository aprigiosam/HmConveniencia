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
  Card,
  Grid,
  TextInput,
  ActionIcon,
  Alert,
  ThemeIcon,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaCalendar,
  FaBarcode,
  FaInfoCircle,
  FaCheckCircle,
} from 'react-icons/fa';
import { getLotesNaoConferidos, marcarLoteConferido } from '../services/api';

function ConferenciaLotes() {
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editandoLote, setEditandoLote] = useState(null);
  const [formData, setFormData] = useState({
    numero_lote: '',
    data_validade: null,
  });

  useEffect(() => {
    carregarLotes();
  }, []);

  const carregarLotes = async () => {
    try {
      setLoading(true);
      const response = await getLotesNaoConferidos();
      setLotes(response.data);
    } catch (error) {
      console.error('Erro ao carregar lotes:', error);
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível carregar os lotes para conferência',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const iniciarEdicao = (lote) => {
    setEditandoLote(lote.id);
    setFormData({
      numero_lote: lote.numero_lote || '',
      data_validade: lote.data_validade ? new Date(lote.data_validade) : null,
    });
  };

  const cancelarEdicao = () => {
    setEditandoLote(null);
    setFormData({
      numero_lote: '',
      data_validade: null,
    });
  };

  const confirmarLote = async (lote, comEdicao = false) => {
    try {
      setLoading(true);

      const payload = {};

      if (comEdicao) {
        if (formData.numero_lote) {
          payload.numero_lote = formData.numero_lote;
        }
        if (formData.data_validade) {
          const year = formData.data_validade.getFullYear();
          const month = String(formData.data_validade.getMonth() + 1).padStart(2, '0');
          const day = String(formData.data_validade.getDate()).padStart(2, '0');
          payload.data_validade = `${year}-${month}-${day}`;
        }
      }

      await marcarLoteConferido(lote.id, payload);

      notifications.show({
        title: 'Conferido!',
        message: `Lote de ${lote.produto_nome} conferido com sucesso`,
        color: 'green',
        icon: <FaCheckCircle />,
      });

      // Remove da lista
      setLotes(lotes.filter(l => l.id !== lote.id));
      cancelarEdicao();

    } catch (error) {
      console.error('Erro ao confirmar lote:', error);
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível confirmar o lote',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (dataStr) => {
    if (!dataStr) return 'Não informada';
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR');
  };

  return (
    <Container size="lg">
      <LoadingOverlay visible={loading} />

      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Title order={2}>Conferência de Lotes</Title>
            <Text c="dimmed" size="sm">
              Confira os lotes recebidos para validar validades e números de lote
            </Text>
          </div>
          <Button onClick={carregarLotes} variant="light">
            Atualizar
          </Button>
        </Group>

        {lotes.length === 0 && !loading && (
          <Alert icon={<FaInfoCircle />} title="Nenhum lote pendente" color="blue">
            Todos os lotes foram conferidos! 🎉
          </Alert>
        )}

        {lotes.length > 0 && (
          <Alert icon={<FaExclamationTriangle />} title={`${lotes.length} lote(s) aguardando conferência`} color="yellow">
            Confira os lotes abaixo para validar as informações de validade e número de lote.
          </Alert>
        )}

        <Grid>
          {lotes.map((lote) => (
            <Grid.Col key={lote.id} span={{ base: 12, md: 6, lg: 4 }}>
              <Card shadow="sm" padding="lg" withBorder>
                <Stack gap="sm">
                  <div>
                    <Text fw={600} size="lg">{lote.produto_nome}</Text>
                    <Text size="sm" c="dimmed">
                      Lote #{lote.id} • {lote.quantidade} unidades
                    </Text>
                  </div>

                  {editandoLote === lote.id ? (
                    <>
                      <TextInput
                        label="Número do Lote"
                        placeholder="Ex: L-2024-11"
                        leftSection={<FaBarcode />}
                        value={formData.numero_lote}
                        onChange={(e) => setFormData({ ...formData, numero_lote: e.target.value })}
                      />

                      <DateInput
                        label="Data de Validade"
                        placeholder="Selecione a data"
                        leftSection={<FaCalendar />}
                        value={formData.data_validade}
                        onChange={(val) => setFormData({ ...formData, data_validade: val })}
                        valueFormat="DD/MM/YYYY"
                        clearable
                      />

                      <Group grow>
                        <Button
                          color="green"
                          leftSection={<FaCheck />}
                          onClick={() => confirmarLote(lote, true)}
                        >
                          Confirmar
                        </Button>
                        <Button
                          variant="light"
                          color="gray"
                          leftSection={<FaTimes />}
                          onClick={cancelarEdicao}
                        >
                          Cancelar
                        </Button>
                      </Group>
                    </>
                  ) : (
                    <>
                      <Paper withBorder p="xs">
                        <Stack gap="xs">
                          <Group justify="apart">
                            <Text size="xs" c="dimmed">Lote:</Text>
                            <Text size="sm" fw={500}>
                              {lote.numero_lote || 'Não informado'}
                            </Text>
                          </Group>

                          <Group justify="apart">
                            <Text size="xs" c="dimmed">Validade:</Text>
                            <Group gap="xs">
                              <Text size="sm" fw={500}>
                                {formatarData(lote.data_validade)}
                              </Text>
                              {lote.validade_estimada && (
                                <Badge color="yellow" size="xs">
                                  ESTIMADA
                                </Badge>
                              )}
                            </Group>
                          </Group>

                          {lote.fornecedor_nome && (
                            <Group justify="apart">
                              <Text size="xs" c="dimmed">Fornecedor:</Text>
                              <Text size="sm">{lote.fornecedor_nome}</Text>
                            </Group>
                          )}
                        </Stack>
                      </Paper>

                      {lote.validade_estimada && (
                        <Alert icon={<FaInfoCircle />} color="yellow" p="xs">
                          <Text size="xs">
                            Validade calculada automaticamente. Confira a embalagem!
                          </Text>
                        </Alert>
                      )}

                      <Group grow>
                        <Button
                          color="green"
                          leftSection={<FaCheck />}
                          onClick={() => confirmarLote(lote, false)}
                          variant="light"
                        >
                          OK
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => iniciarEdicao(lote)}
                        >
                          Editar
                        </Button>
                      </Group>
                    </>
                  )}
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      </Stack>
    </Container>
  );
}

export default ConferenciaLotes;

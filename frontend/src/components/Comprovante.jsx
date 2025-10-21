import { Paper, Text, Group, Stack, Divider, Button } from '@mantine/core';
import { FaPrint, FaTimes, FaWhatsapp } from 'react-icons/fa';
import { compartilharComprovante } from '../utils/whatsapp';
import './Comprovante.css';

function Comprovante({ venda, onClose }) {
  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFormaPagamentoLabel = (forma) => {
    const labels = {
      'DINHEIRO': 'Dinheiro',
      'DEBITO': 'Cartão de Débito',
      'CREDITO': 'Cartão de Crédito',
      'PIX': 'PIX',
      'FIADO': 'Fiado'
    };
    return labels[forma] || forma;
  };

  const handleWhatsApp = () => {
    compartilharComprovante(venda);
  };

  return (
    <div className="comprovante-container">
      <div className="comprovante-actions no-print">
        <Group justify="space-between" mb="md">
          <Text size="lg" fw={700}>Comprovante de Venda</Text>
          <Group gap="xs">
            <Button leftSection={<FaWhatsapp />} onClick={handleWhatsApp} color="green">
              WhatsApp
            </Button>
            <Button leftSection={<FaPrint />} onClick={handlePrint} color="blue">
              Imprimir
            </Button>
            <Button leftSection={<FaTimes />} onClick={onClose} variant="light">
              Fechar
            </Button>
          </Group>
        </Group>
      </div>

      <Paper className="comprovante-paper" p="xl" withBorder>
        <Stack gap="md">
          {/* Cabeçalho */}
          <div className="comprovante-header">
            <Text size="xl" fw={700} ta="center">HM CONVENIÊNCIA</Text>
            <Text size="sm" c="dimmed" ta="center">Sistema de Gestão</Text>
            <Text size="xs" c="dimmed" ta="center" mt="xs">
              {formatDate(venda.created_at || new Date())}
            </Text>
          </div>

          <Divider />

          {/* Número da Venda */}
          <Group justify="space-between">
            <Text size="sm" fw={600}>Venda Nº:</Text>
            <Text size="sm">#{venda.id || '---'}</Text>
          </Group>

          <Divider />

          {/* Itens da Venda */}
          <div>
            <Text size="sm" fw={700} mb="sm">ITENS:</Text>
            <Stack gap="xs">
              {venda.itens?.map((item, index) => (
                <div key={index}>
                  <Group justify="space-between" align="flex-start">
                    <div style={{ flex: 1 }}>
                      <Text size="sm" fw={500}>{item.produto?.nome || item.produto_nome}</Text>
                      <Text size="xs" c="dimmed">
                        {item.quantidade} x R$ {parseFloat(item.preco_unitario || item.produto?.preco || 0).toFixed(2)}
                      </Text>
                    </div>
                    <Text size="sm" fw={600}>
                      R$ {(parseFloat(item.quantidade) * parseFloat(item.preco_unitario || item.produto?.preco || 0)).toFixed(2)}
                    </Text>
                  </Group>
                </div>
              ))}
            </Stack>
          </div>

          <Divider />

          {/* Total */}
          <Group justify="space-between">
            <Text size="lg" fw={700}>TOTAL:</Text>
            <Text size="xl" fw={700}>R$ {parseFloat(venda.valor_total || venda.total || 0).toFixed(2)}</Text>
          </Group>

          <Divider />

          {/* Forma de Pagamento */}
          <Group justify="space-between">
            <Text size="sm" fw={600}>Forma de Pagamento:</Text>
            <Text size="sm">{getFormaPagamentoLabel(venda.forma_pagamento)}</Text>
          </Group>

          {/* Detalhes específicos por forma de pagamento */}
          {venda.forma_pagamento === 'DINHEIRO' && venda.valor_recebido && (
            <>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Valor Recebido:</Text>
                <Text size="sm">R$ {parseFloat(venda.valor_recebido).toFixed(2)}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Troco:</Text>
                <Text size="sm" fw={600} c="green">
                  R$ {(parseFloat(venda.valor_recebido) - parseFloat(venda.valor_total || venda.total || 0)).toFixed(2)}
                </Text>
              </Group>
            </>
          )}

          {venda.forma_pagamento === 'FIADO' && (
            <>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Cliente:</Text>
                <Text size="sm">{venda.cliente?.nome || venda.cliente_nome || 'N/A'}</Text>
              </Group>
              {venda.data_vencimento && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Vencimento:</Text>
                  <Text size="sm">{new Date(venda.data_vencimento).toLocaleDateString('pt-BR')}</Text>
                </Group>
              )}
            </>
          )}

          <Divider />

          {/* Rodapé */}
          <div className="comprovante-footer">
            <Text size="xs" c="dimmed" ta="center">
              Obrigado pela preferência!
            </Text>
            <Text size="xs" c="dimmed" ta="center" mt="xs">
              Volte sempre!
            </Text>
          </div>
        </Stack>
      </Paper>
    </div>
  );
}

export default Comprovante;

import { useState, useEffect } from 'react';
import { getHistoricoCaixa } from '../services/api';
import { Table, Title, Text, Badge } from '@mantine/core';

function HistoricoCaixa() {
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistorico();
  }, []);

  const loadHistorico = async () => {
    setLoading(true);
    try {
      const response = await getHistoricoCaixa();
      setHistorico(response.data);
    } catch (error) {
      console.error('Erro ao carregar histórico de caixa:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    const number = parseFloat(value);
    return isNaN(number) ? 'R$ 0.00' : `R$ ${number.toFixed(2)}`;
  };

  const rows = historico.map((caixa) => {
    const diferenca = parseFloat(caixa.diferenca);
    const corDiferenca = diferenca < 0 ? 'red' : 'green';
    return (
      <tr key={caixa.id}>
        <td>{new Date(caixa.data_abertura).toLocaleString('pt-BR')}</td>
        <td>{new Date(caixa.data_fechamento).toLocaleString('pt-BR')}</td>
        <td>{formatCurrency(caixa.valor_inicial)}</td>
        <td>{formatCurrency(caixa.valor_final_sistema)}</td>
        <td>{formatCurrency(caixa.valor_final_informado)}</td>
        <td>
          <Badge color={corDiferenca} variant="filled">
            {formatCurrency(caixa.diferenca)}
          </Badge>
        </td>
      </tr>
    );
  });

  return (
    <>
      <Title order={2} mb="lg">Histórico de Caixas</Title>
      <Table striped highlightOnHover withBorder withColumnBorders>
        <thead>
          <tr>
            <th>Abertura</th>
            <th>Fechamento</th>
            <th>Valor Inicial</th>
            <th>Valor Sistema</th>
            <th>Valor Informado</th>
            <th>Diferença</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? rows : (
            <tr>
              <td colSpan={6}><Text color="dimmed" align="center">Nenhum caixa fechado ainda.</Text></td>
            </tr>
          )}
        </tbody>
      </Table>
    </>
  );
}

export default HistoricoCaixa;
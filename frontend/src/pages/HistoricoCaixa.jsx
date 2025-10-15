
import { useState, useEffect } from 'react';
import { getHistoricoCaixa } from '../services/api';
import './HistoricoCaixa.css';

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
      alert('Erro ao carregar histórico.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    const number = parseFloat(value);
    return isNaN(number) ? 'R$ 0.00' : `R$ ${number.toFixed(2)}`;
  };

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  return (
    <div className="historico-caixa-page">
      <h2>Histórico de Caixas</h2>

      <div className="card">
        {historico.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            Nenhum caixa fechado ainda.
          </p>
        ) : (
          <table>
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
              {historico.map(caixa => (
                <tr key={caixa.id}>
                  <td>{new Date(caixa.data_abertura).toLocaleString('pt-BR')}</td>
                  <td>{new Date(caixa.data_fechamento).toLocaleString('pt-BR')}</td>
                  <td>{formatCurrency(caixa.valor_inicial)}</td>
                  <td>{formatCurrency(caixa.valor_final_sistema)}</td>
                  <td>{formatCurrency(caixa.valor_final_informado)}</td>
                  <td className={parseFloat(caixa.diferenca) < 0 ? 'diferenca-negativa' : 'diferenca-positiva'}>
                    {formatCurrency(caixa.diferenca)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default HistoricoCaixa;

import { useState, useEffect } from 'react';
import { getHistoricoCaixa } from '../services/api';
import { FaHistory } from 'react-icons/fa';

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

  const InfoLine = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: '500' }}>{value}</span>
    </div>
  );

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="historico-caixa-page">
      <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Histórico de Caixas</h2>

      <div className="item-list">
        {historico.length > 0 ? (
          historico.map(caixa => {
            const diferenca = parseFloat(caixa.diferenca);
            const corDiferenca = diferenca < 0 ? 'var(--error)' : 'var(--success)';
            return (
              <div className="card" key={caixa.id}>
                <div className="card-header">
                  <h3 className="card-title">Caixa de {new Date(caixa.data_abertura).toLocaleDateString('pt-BR')}</h3>
                </div>
                <InfoLine label="Abertura" value={new Date(caixa.data_abertura).toLocaleString('pt-BR')} />
                <InfoLine label="Fechamento" value={new Date(caixa.data_fechamento).toLocaleString('pt-BR')} />
                <InfoLine label="Valor Inicial" value={formatCurrency(caixa.valor_inicial)} />
                <InfoLine label="Valor Sistema" value={formatCurrency(caixa.valor_final_sistema)} />
                <InfoLine label="Valor Informado" value={formatCurrency(caixa.valor_final_informado)} />
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Diferença</span>
                  <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: corDiferenca }}>
                    {formatCurrency(caixa.diferenca)}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-state">
            <FaHistory className="empty-icon" />
            <p className="empty-text">Nenhum caixa foi fechado ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default HistoricoCaixa;
import { useState, useEffect } from 'react';
import { getContasReceber, receberPagamento } from '../services/api';
import { FaFileInvoiceDollar, FaCheck } from 'react-icons/fa';

function ContasReceber() {
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContas();
  }, []);

  const loadContas = async () => {
    setLoading(true);
    try {
      const response = await getContasReceber();
      setContas(response.data.results || response.data);
    } catch (error) {
      console.error('Erro ao carregar contas a receber:', error);
      alert('Erro ao carregar contas.');
    } finally {
      setLoading(false);
    }
  };

  const handleReceber = async (vendaId) => {
    if (!confirm('Confirmar recebimento desta conta?')) return;
    try {
      await receberPagamento(vendaId);
      loadContas();
      alert('Pagamento recebido com sucesso!');
    } catch (error) {
      console.error('Erro ao receber pagamento:', error);
      alert('Erro ao processar recebimento.');
    }
  };

  const isVencida = (dataVencimento) => {
    if (!dataVencimento) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return new Date(dataVencimento) < hoje;
  };

  const totalDevedor = contas.reduce((sum, venda) => sum + parseFloat(venda.total), 0);

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="contas-receber-page">
      <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Contas a Receber</h2>

      <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Total a Receber</p>
        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)', margin: '0.5rem 0 0 0' }}>
          R$ {totalDevedor.toFixed(2)}
        </p>
      </div>

      <div className="item-list">
        {contas.length > 0 ? (
          contas.map(venda => {
            const vencida = isVencida(venda.data_vencimento);
            return (
              <div className="item-card" key={venda.id} style={{ borderLeft: vencida ? '4px solid var(--error)' : '4px solid var(--warning)' }}>
                <div className="item-info">
                  <p className="item-name">{venda.cliente_nome}</p>
                  <p className="item-details">Venda: {venda.numero}</p>
                  <p className="item-details">
                    Vencimento: {venda.data_vencimento ? new Date(venda.data_vencimento).toLocaleDateString('pt-BR') : 'N/A'}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="item-price">R$ {parseFloat(venda.total).toFixed(2)}</p>
                  <button className="btn-primary" style={{width: 'auto', padding: '0.5rem 1rem'}} onClick={() => handleReceber(venda.id)}>
                    <FaCheck style={{marginRight: '0.5rem'}}/>
                    Receber
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-state">
            <FaFileInvoiceDollar className="empty-icon" />
            <p className="empty-text">Nenhuma conta pendente. Tudo em dia!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ContasReceber;
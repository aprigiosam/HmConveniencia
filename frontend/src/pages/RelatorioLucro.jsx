import { useState, useEffect } from 'react';
import { getProdutosMaisLucrativos } from '../services/api';
import { FaChartLine } from 'react-icons/fa';

function RelatorioLucro() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProdutosLucrativos();
  }, []);

  const loadProdutosLucrativos = async () => {
    try {
      const response = await getProdutosMaisLucrativos();
      setProdutos(response.data);
    } catch (error) {
      console.error('Erro ao carregar relatório de lucro:', error);
      alert('Erro ao carregar relatório.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    const number = parseFloat(value);
    return isNaN(number) ? 'R$ 0.00' : `R$ ${number.toFixed(2)}`;
  };

  const totalLucro = produtos.reduce((sum, p) => sum + parseFloat(p.lucro_total), 0);

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
    <div className="relatorio-lucro-page">
      <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Relatório de Lucratividade</h2>

      <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Lucro Total (Período)</p>
        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)', margin: '0.5rem 0 0 0' }}>
          {formatCurrency(totalLucro)}
        </p>
      </div>

      <div className="item-list">
        {produtos.length > 0 ? (
          produtos.map((produto, index) => (
            <div className="card" key={index}>
              <div className="card-header">
                <h3 className="card-title">{produto.nome_produto}</h3>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success)' }}>
                  Lucro: {formatCurrency(produto.lucro_total)}
                </span>
              </div>
              <InfoLine label="Qtd. Vendida" value={parseInt(produto.total_vendido)} />
              <InfoLine label="Receita Total" value={formatCurrency(produto.receita_total)} />
              <InfoLine label="Custo Total" value={formatCurrency(produto.custo_total)} />
              <InfoLine label="Preço Médio Venda" value={formatCurrency(produto.preco_venda)} />
            </div>
          ))
        ) : (
          <div className="empty-state">
            <FaChartLine className="empty-icon" />
            <p className="empty-text">Não há dados de lucro para exibir.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RelatorioLucro;
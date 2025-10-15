
import { useState, useEffect } from 'react';
import { getProdutosMaisLucrativos } from '../services/api';
import './RelatorioLucro.css';

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
      console.error('Erro ao carregar produtos mais lucrativos:', error);
      alert('Erro ao carregar relatório de lucro.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    const number = parseFloat(value);
    return isNaN(number) ? 'R$ 0.00' : `R$ ${number.toFixed(2)}`;
  };

  const formatPercentage = (value) => {
    const number = parseFloat(value);
    return isNaN(number) ? '0.00%' : `${number.toFixed(2)}%`;
  };

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  return (
    <div className="relatorio-lucro-page">
      <h2>📈 Relatório: Produtos Mais Lucrativos</h2>

      <div className="card">
        {produtos.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            Nenhum produto com lucro registrado ainda.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Preço Venda</th>
                <th>Preço Custo</th>
                <th>Margem Lucro</th>
                <th>Qtd. Vendida</th>
                <th>Receita Total</th>
                <th>Custo Total</th>
                <th>Lucro Total</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((produto, index) => (
                <tr key={index}>
                  <td>{produto.nome_produto}</td>
                  <td>{formatCurrency(produto.preco_venda)}</td>
                  <td>{formatCurrency(produto.preco_custo)}</td>
                  <td>{formatPercentage((produto.lucro_total / produto.custo_total) * 100)}</td>
                  <td>{parseFloat(produto.total_vendido).toFixed(0)}</td>
                  <td>{formatCurrency(produto.receita_total)}</td>
                  <td>{formatCurrency(produto.custo_total)}</td>
                  <td>{formatCurrency(produto.lucro_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default RelatorioLucro;

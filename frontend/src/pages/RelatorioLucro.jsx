import { useState, useEffect } from 'react';
import { getProdutosMaisLucrativos } from '../services/api';
import { Table, Title, Text, Card } from '@mantine/core';

function RelatorioLucro() {
  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    loadProdutosLucrativos();
  }, []);

  const loadProdutosLucrativos = async () => {
    try {
      const response = await getProdutosMaisLucrativos();
      setProdutos(response.data);
    } catch (error) {
      console.error('Erro ao carregar relatório de lucro:', error);
    }
  };

  const formatCurrency = (value) => {
    const number = parseFloat(value);
    return isNaN(number) ? 'R$ 0.00' : `R$ ${number.toFixed(2)}`;
  };

  const totalLucro = produtos.reduce((sum, p) => sum + parseFloat(p.lucro_total), 0);

  const rows = produtos.map((produto, index) => (
    <tr key={index}>
      <td>{produto.nome_produto}</td>
      <td>{formatCurrency(produto.preco_venda)}</td>
      <td>{parseInt(produto.total_vendido)}</td>
      <td>{formatCurrency(produto.receita_total)}</td>
      <td>{formatCurrency(produto.custo_total)}</td>
      <td>{formatCurrency(produto.lucro_total)}</td>
    </tr>
  ));

  return (
    <>
      <Title order={2} mb="lg">Relatório de Lucratividade</Title>

      <Card withBorder p="lg" radius="md" mb="lg">
        <Text align="center" size="lg" weight={500} color="dimmed">Lucro Total</Text>
        <Title order={1} align="center" color="green">{formatCurrency(totalLucro)}</Title>
      </Card>

      <Table striped highlightOnHover withBorder withColumnBorders>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Preço Venda</th>
            <th>Qtd. Vendida</th>
            <th>Receita Total</th>
            <th>Custo Total</th>
            <th>Lucro Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? rows : (
            <tr>
              <td colSpan={6}><Text color="dimmed" align="center">Nenhum dado de lucro para exibir.</Text></td>
            </tr>
          )}
        </tbody>
      </Table>
    </>
  );
}

export default RelatorioLucro;

import { useState, useEffect, useRef } from 'react';
import { getProdutos, createVenda, getClientes } from '../services/api';
import { localDB } from '../utils/db';
import { syncManager } from '../utils/syncManager';
import { FaSearch, FaTrash, FaShoppingCart } from 'react-icons/fa';

function PDV() {
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [busca, setBusca] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO');
  const [clienteId, setClienteId] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [loading, setLoading] = useState(false);
  const buscaRef = useRef(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [produtosData, clientesData] = await Promise.all([
        getProdutos({ ativo: true }).then(res => res.data.results || res.data),
        getClientes({ ativo: true }).then(res => res.data.results || res.data)
      ]);
      setProdutos(produtosData);
      setClientes(clientesData);
      await localDB.cacheProdutos(produtosData);
      await localDB.cacheClientes(clientesData);
    } catch (error) {
      console.warn('App parece estar offline, carregando dados do cache...');
      try {
        const [cachedProdutos, cachedClientes] = await Promise.all([localDB.getCachedProdutos(), localDB.getCachedClientes()]);
        setProdutos(cachedProdutos);
        setClientes(cachedClientes);
      } catch (cacheError) {
        console.error('Falha ao carregar dados do cache:', cacheError);
        alert('Erro ao carregar dados. Verifique sua conexão.');
      }
    }
  };

  const produtosFiltrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.codigo_barras?.includes(busca)
  );

  const adicionarAoCarrinho = (produto) => {
    const itemExistente = carrinho.find(item => item.produto.id === produto.id);
    if (itemExistente) {
      setCarrinho(carrinho.map(item =>
        item.produto.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item
      ));
    } else {
      setCarrinho([...carrinho, { produto, quantidade: 1 }]);
    }
    setBusca('');
    buscaRef.current?.focus();
  };

  const alterarQuantidade = (produtoId, novaQuantidade) => {
    if (novaQuantidade <= 0) {
      removerDoCarrinho(produtoId);
      return;
    }
    setCarrinho(carrinho.map(item =>
      item.produto.id === produtoId ? { ...item, quantidade: parseFloat(novaQuantidade) } : item
    ));
  };

  const removerDoCarrinho = (produtoId) => {
    setCarrinho(carrinho.filter(item => item.produto.id !== produtoId));
  };

  const calcularTotal = () => {
    return carrinho.reduce((total, item) => total + (parseFloat(item.produto.preco) * item.quantidade), 0);
  };

  const finalizarVenda = async () => {
    if (carrinho.length === 0) return alert('Carrinho vazio!');
    if (formaPagamento === 'FIADO') {
      if (!clienteId) return alert('Selecione o cliente para venda fiado!');
      if (!dataVencimento) return alert('Informe a data de vencimento!');
    }

    setLoading(true);
    const vendaData = {
      forma_pagamento: formaPagamento,
      cliente_id: formaPagamento === 'FIADO' ? clienteId : null,
      data_vencimento: formaPagamento === 'FIADO' ? dataVencimento : null,
      itens: carrinho.map(item => ({ produto_id: item.produto.id, quantidade: item.quantidade.toString() }))
    };

    try {
      await createVenda(vendaData);
      alert('Venda registrada com sucesso!');
    } catch (networkError) {
      console.log('Falha na rede, salvando venda localmente.');
      await localDB.saveVendaPendente(vendaData);
      setTimeout(() => syncManager.syncAll(), 1000);
      alert('Venda salva localmente! Será sincronizada quando houver conexão.');
    }

    setCarrinho([]);
    setBusca('');
    setClienteId('');
    setDataVencimento('');
    setLoading(false);
    loadInitialData(); // Recarrega produtos para atualizar estoque
  };

  return (
    <div className="pdv-page">
      {/* Card de Busca */}
      <div className="card">
        <div className="search-bar">
          <FaSearch className="search-icon" />
          <input
            ref={buscaRef}
            type="text"
            className="form-control"
            placeholder="Buscar produto por nome ou código..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            autoFocus
          />
        </div>
        {busca && (
          <div className="item-list" style={{ marginTop: '1rem' }}>
            {produtosFiltrados.length > 0 ? (
              produtosFiltrados.slice(0, 5).map(produto => (
                <div className="item-card" key={produto.id} onClick={() => adicionarAoCarrinho(produto)} style={{ cursor: 'pointer' }}>
                  <div className="item-info">
                    <p className="item-name">{produto.nome}</p>
                    <p className="item-details">Estoque: {parseInt(produto.estoque)}</p>
                  </div>
                  <p className="item-price">R$ {parseFloat(produto.preco).toFixed(2)}</p>
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', padding: '1rem' }}>Nenhum produto encontrado.</p>
            )}
          </div>
        )}
      </div>

      {/* Card do Carrinho */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Carrinho</h3>
          <FaShoppingCart />
        </div>
        {carrinho.length === 0 ? (
          <div className="empty-state" style={{ padding: '1rem 0' }}>
            <p className="empty-text">Seu carrinho está vazio.</p>
          </div>
        ) : (
          <div className="item-list">
            {carrinho.map(item => (
              <div className="item-card" key={item.produto.id}>
                <div className="item-info">
                  <p className="item-name">{item.produto.nome}</p>
                  <p className="item-details">R$ {parseFloat(item.produto.preco).toFixed(2)}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    className="form-control"
                    value={item.quantidade}
                    onChange={(e) => alterarQuantidade(item.produto.id, e.target.value)}
                    style={{ width: '70px', textAlign: 'center' }}
                  />
                  <button onClick={() => removerDoCarrinho(item.produto.id)} className="btn-secondary" style={{padding: '0.5rem'}}><FaTrash /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card de Pagamento */}
      {carrinho.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Pagamento</h3>
          </div>
          <div className="form-group">
            <label className="form-label">Forma de Pagamento</label>
            <select className="form-control" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="DEBITO">Débito</option>
              <option value="CREDITO">Crédito</option>
              <option value="PIX">PIX</option>
              <option value="FIADO">Fiado</option>
            </select>
          </div>

          {formaPagamento === 'FIADO' && (
            <>
              <div className="form-group">
                <label className="form-label">Cliente</label>
                <select className="form-control" value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
                  <option value="">Selecione...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Data de Vencimento</label>
                <input type="date" className="form-control" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} required />
              </div>
            </>
          )}

          <div style={{ textAlign: 'right', margin: '1.5rem 0' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Total:</span>
            <h2 style={{ fontSize: '2rem', color: 'var(--primary)', margin: 0 }}>R$ {calcularTotal().toFixed(2)}</h2>
          </div>

          <button className="btn-primary" onClick={finalizarVenda} disabled={loading}>
            {loading ? 'Processando...' : 'Finalizar Venda'}
          </button>
        </div>
      )}
    </div>
  );
}

export default PDV;
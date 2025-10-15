import { useState, useEffect, useRef } from 'react'
import { getProdutos, createVenda, getClientes } from '../services/api'
import './PDV.css'

function PDV() {
  const [produtos, setProdutos] = useState([])
  const [clientes, setClientes] = useState([])
  const [carrinho, setCarrinho] = useState([])
  const [busca, setBusca] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO')
  const [clienteId, setClienteId] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')
  const [loading, setLoading] = useState(false)
  const buscaRef = useRef(null)

  useEffect(() => {
    loadProdutos()
    loadClientes()
  }, [])

  const loadProdutos = async () => {
    try {
      const response = await getProdutos({ ativo: true })
      setProdutos(response.data.results || response.data)
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
      alert('Erro ao carregar produtos')
    }
  }

  const loadClientes = async () => {
    try {
      const response = await getClientes({ ativo: true })
      setClientes(response.data.results || response.data)
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    }
  }

  const produtosFiltrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.codigo_barras?.includes(busca)
  )

  const adicionarAoCarrinho = (produto) => {
    const itemExistente = carrinho.find(item => item.produto.id === produto.id)

    if (itemExistente) {
      setCarrinho(carrinho.map(item =>
        item.produto.id === produto.id
          ? { ...item, quantidade: item.quantidade + 1 }
          : item
      ))
    } else {
      setCarrinho([...carrinho, { produto, quantidade: 1 }])
    }

    setBusca('')
    buscaRef.current?.focus()
  }

  const alterarQuantidade = (produtoId, novaQuantidade) => {
    if (novaQuantidade <= 0) {
      removerDoCarrinho(produtoId)
      return
    }

    setCarrinho(carrinho.map(item =>
      item.produto.id === produtoId
        ? { ...item, quantidade: parseFloat(novaQuantidade) }
        : item
    ))
  }

  const removerDoCarrinho = (produtoId) => {
    setCarrinho(carrinho.filter(item => item.produto.id !== produtoId))
  }

  const calcularTotal = () => {
    return carrinho.reduce((total, item) =>
      total + (parseFloat(item.produto.preco) * item.quantidade), 0
    )
  }

  const finalizarVenda = async () => {
    if (carrinho.length === 0) {
      alert('Carrinho vazio!')
      return
    }

    if (!formaPagamento) {
      alert('Selecione a forma de pagamento!')
      return
    }

    if (formaPagamento === 'FIADO') {
      if (!clienteId) {
        alert('Selecione o cliente para venda fiado!')
        return
      }
      if (!dataVencimento) {
        alert('Informe a data de vencimento!')
        return
      }
    }

    setLoading(true)

    try {
      const itens = carrinho.map(item => ({
        produto_id: item.produto.id,
        quantidade: item.quantidade.toString()
      }))

      const vendaData = {
        forma_pagamento: formaPagamento,
        desconto: 0,
        observacoes: '',
        itens
      }

      if (formaPagamento === 'FIADO') {
        vendaData.cliente_id = clienteId
        vendaData.data_vencimento = dataVencimento
      }

      await createVenda(vendaData)

      alert('Venda finalizada com sucesso!')
      setCarrinho([])
      setBusca('')
      setClienteId('')
      setDataVencimento('')
      loadProdutos() // Atualiza o estoque
    } catch (error) {
      console.error('Erro ao finalizar venda:', error)
      const errorMsg = error.response?.data?.detail ||
        error.response?.data?.itens?.[0] ||
        error.response?.data?.cliente_id?.[0] ||
        'Erro ao finalizar venda'
      alert(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pdv-page">
      <h2>🛒 PDV - Ponto de Venda</h2>

      <div className="pdv-container">
        {/* Lado esquerdo - Busca e Produtos */}
        <div className="pdv-left">
          <div className="card">
            <h3>Buscar Produto</h3>
            <input
              ref={buscaRef}
              type="text"
              placeholder="Digite o nome ou código..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              autoFocus
              style={{ width: '100%', marginBottom: '15px' }}
            />

            <div className="produtos-list">
              {busca && produtosFiltrados.length === 0 && (
                <p style={{textAlign: 'center', padding: '20px', color: '#666'}}>
                  Nenhum produto encontrado
                </p>
              )}

              {busca && produtosFiltrados.slice(0, 10).map(produto => (
                <div
                  key={produto.id}
                  className="produto-item"
                  onClick={() => adicionarAoCarrinho(produto)}
                >
                  <div>
                    <strong>{produto.nome}</strong>
                    <small>Estoque: {parseFloat(produto.estoque).toFixed(0)}</small>
                  </div>
                  <span className="preco">R$ {parseFloat(produto.preco).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lado direito - Carrinho */}
        <div className="pdv-right">
          <div className="card">
            <h3>Carrinho</h3>

            {carrinho.length === 0 ? (
              <p style={{textAlign: 'center', padding: '40px', color: '#666'}}>
                Carrinho vazio
              </p>
            ) : (
              <>
                <div className="carrinho-items">
                  {carrinho.map(item => (
                    <div key={item.produto.id} className="carrinho-item">
                      <div className="item-info">
                        <strong>{item.produto.nome}</strong>
                        <span>R$ {parseFloat(item.produto.preco).toFixed(2)}</span>
                      </div>

                      <div className="item-controls">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.quantidade}
                          onChange={(e) => alterarQuantidade(item.produto.id, e.target.value)}
                          style={{width: '70px'}}
                        />
                        <button
                          className="btn-icon btn-delete"
                          onClick={() => removerDoCarrinho(item.produto.id)}
                        >
                          🗑️
                        </button>
                      </div>

                      <div className="item-subtotal">
                        R$ {(parseFloat(item.produto.preco) * item.quantidade).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="total-section">
                  <div className="total">
                    <span>TOTAL:</span>
                    <strong>R$ {calcularTotal().toFixed(2)}</strong>
                  </div>

                  <div className="form-group">
                    <label>Forma de Pagamento:</label>
                    <select
                      value={formaPagamento}
                      onChange={(e) => setFormaPagamento(e.target.value)}
                      style={{width: '100%'}}
                    >
                      <option value="DINHEIRO">Dinheiro</option>
                      <option value="DEBITO">Cartão Débito</option>
                      <option value="CREDITO">Cartão Crédito</option>
                      <option value="PIX">PIX</option>
                      <option value="FIADO">Fiado (Anotar)</option>
                    </select>
                  </div>

                  {formaPagamento === 'FIADO' && (
                    <>
                      <div className="form-group">
                        <label>Cliente:</label>
                        <select
                          value={clienteId}
                          onChange={(e) => setClienteId(e.target.value)}
                          style={{width: '100%'}}
                          required
                        >
                          <option value="">Selecione o cliente...</option>
                          {clientes.map(cliente => (
                            <option key={cliente.id} value={cliente.id}>
                              {cliente.nome} - Deve: R$ {parseFloat(cliente.saldo_devedor || 0).toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Data de Vencimento:</label>
                        <input
                          type="date"
                          value={dataVencimento}
                          onChange={(e) => setDataVencimento(e.target.value)}
                          style={{width: '100%'}}
                          required
                        />
                      </div>
                    </>
                  )}

                  <button
                    className="btn btn-success btn-finalizar"
                    onClick={finalizarVenda}
                    disabled={loading}
                  >
                    {loading ? 'Processando...' : '✓ Finalizar Venda'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PDV

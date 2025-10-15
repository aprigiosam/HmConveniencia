import { useState, useEffect } from 'react'
import { getProdutos, createProduto, updateProduto, deleteProduto } from '../services/api'
import './Produtos.css'

function Produtos() {
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [formData, setFormData] = useState({
    nome: '',
    preco: '',
    estoque: '',
    codigo_barras: ''
  })

  useEffect(() => {
    loadProdutos()
  }, [])

  const loadProdutos = async () => {
    try {
      const response = await getProdutos()
      setProdutos(response.data.results || response.data)
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
      alert('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (editingProduct) {
        await updateProduto(editingProduct.id, formData)
      } else {
        await createProduto(formData)
      }

      setShowModal(false)
      resetForm()
      loadProdutos()
    } catch (error) {
      console.error('Erro ao salvar produto:', error)
      alert('Erro ao salvar produto')
    }
  }

  const handleEdit = (produto) => {
    setEditingProduct(produto)
    setFormData({
      nome: produto.nome,
      preco: produto.preco,
      estoque: produto.estoque,
      codigo_barras: produto.codigo_barras || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return

    try {
      await deleteProduto(id)
      loadProdutos()
    } catch (error) {
      console.error('Erro ao excluir produto:', error)
      alert('Erro ao excluir produto')
    }
  }

  const resetForm = () => {
    setFormData({ nome: '', preco: '', estoque: '', codigo_barras: '' })
    setEditingProduct(null)
  }

  if (loading) {
    return <div className="loading">Carregando...</div>
  }

  return (
    <div className="produtos-page">
      <div className="page-header">
        <h2>📦 Produtos</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          + Novo Produto
        </button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Preço</th>
              <th>Estoque</th>
              <th>Código</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map(produto => (
              <tr key={produto.id}>
                <td>{produto.nome}</td>
                <td>R$ {parseFloat(produto.preco).toFixed(2)}</td>
                <td>{parseFloat(produto.estoque).toFixed(0)}</td>
                <td>{produto.codigo_barras || '-'}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-icon btn-edit"
                      onClick={() => handleEdit(produto)}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon btn-delete"
                      onClick={() => handleDelete(produto.id)}
                      title="Excluir"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {produtos.length === 0 && (
          <p style={{textAlign: 'center', padding: '40px', color: '#666'}}>
            Nenhum produto cadastrado
          </p>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h3>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nome *</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  required
                  autoFocus
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Preço (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.preco}
                    onChange={(e) => setFormData({...formData, preco: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Estoque *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.estoque}
                    onChange={(e) => setFormData({...formData, estoque: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Código de Barras</label>
                <input
                  type="text"
                  value={formData.codigo_barras}
                  onChange={(e) => setFormData({...formData, codigo_barras: e.target.value})}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success">
                  {editingProduct ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Produtos

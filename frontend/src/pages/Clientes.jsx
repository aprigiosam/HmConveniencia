import { useState, useEffect } from 'react'
import { getClientes, createCliente, updateCliente, deleteCliente } from '../services/api'
import './Produtos.css'

function Clientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCliente, setEditingCliente] = useState(null)
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    cpf: '',
    endereco: '',
    limite_credito: '0'
  })

  useEffect(() => {
    loadClientes()
  }, [])

  const loadClientes = async () => {
    try {
      const response = await getClientes()
      setClientes(response.data.results || response.data)
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
      alert('Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (editingCliente) {
        await updateCliente(editingCliente.id, formData)
      } else {
        await createCliente(formData)
      }

      setShowModal(false)
      resetForm()
      loadClientes()
    } catch (error) {
      console.error('Erro ao salvar cliente:', error)
      alert('Erro ao salvar cliente')
    }
  }

  const handleEdit = (cliente) => {
    setEditingCliente(cliente)
    setFormData({
      nome: cliente.nome,
      telefone: cliente.telefone || '',
      cpf: cliente.cpf || '',
      endereco: cliente.endereco || '',
      limite_credito: cliente.limite_credito
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return

    try {
      await deleteCliente(id)
      loadClientes()
    } catch (error) {
      console.error('Erro ao excluir cliente:', error)
      alert('Erro ao excluir cliente')
    }
  }

  const resetForm = () => {
    setFormData({ nome: '', telefone: '', cpf: '', endereco: '', limite_credito: '0' })
    setEditingCliente(null)
  }

  if (loading) {
    return <div className="loading">Carregando...</div>
  }

  return (
    <div className="produtos-page">
      <div className="page-header">
        <h2>👥 Clientes</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          + Novo Cliente
        </button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>CPF</th>
              <th>Deve</th>
              <th>Limite</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map(cliente => (
              <tr key={cliente.id}>
                <td>{cliente.nome}</td>
                <td>{cliente.telefone || '-'}</td>
                <td>{cliente.cpf || '-'}</td>
                <td style={{color: cliente.saldo_devedor > 0 ? '#dc3545' : '#28a745'}}>
                  R$ {parseFloat(cliente.saldo_devedor || 0).toFixed(2)}
                </td>
                <td>R$ {parseFloat(cliente.limite_credito).toFixed(2)}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-icon btn-edit"
                      onClick={() => handleEdit(cliente)}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon btn-delete"
                      onClick={() => handleDelete(cliente.id)}
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

        {clientes.length === 0 && (
          <p style={{textAlign: 'center', padding: '40px', color: '#666'}}>
            Nenhum cliente cadastrado
          </p>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingCliente ? 'Editar Cliente' : 'Novo Cliente'}</h3>

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
                  <label>Telefone</label>
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>CPF</label>
                  <input
                    type="text"
                    value={formData.cpf}
                    onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Endereço</label>
                <textarea
                  value={formData.endereco}
                  onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Limite de Crédito (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.limite_credito}
                  onChange={(e) => setFormData({...formData, limite_credito: e.target.value})}
                />
                <small style={{color: '#666', display: 'block', marginTop: '5px'}}>
                  0 = sem limite
                </small>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success">
                  {editingCliente ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Clientes

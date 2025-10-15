import { useState, useEffect } from 'react';
import { getClientes, createCliente, updateCliente, deleteCliente } from '../services/api';
import { FaUserPlus, FaSearch, FaEdit, FaTrash, FaTimes, FaUserFriends } from 'react-icons/fa';

function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    cpf: '',
    endereco: '',
    limite_credito: '0'
  });

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    setLoading(true);
    try {
      const response = await getClientes();
      setClientes(response.data.results || response.data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      alert('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCliente) {
        await updateCliente(editingCliente.id, formData);
      } else {
        await createCliente(formData);
      }
      closeModal();
      loadClientes();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      alert('Erro ao salvar cliente');
    }
  };

  const handleEdit = (cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nome: cliente.nome,
      telefone: cliente.telefone || '',
      cpf: cliente.cpf || '',
      endereco: cliente.endereco || '',
      limite_credito: cliente.limite_credito
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
      await deleteCliente(id);
      loadClientes();
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      alert('Erro ao excluir cliente');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCliente(null);
    setFormData({ nome: '', telefone: '', cpf: '', endereco: '', limite_credito: '0' });
  };

  const filteredClientes = clientes.filter(c =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div>Carregando...</div>; // TODO: Criar componente de Loading
  }

  return (
    <div className="clientes-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>Meus Clientes</h2>
        <button className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setShowModal(true)}>
          <FaUserPlus />
          Novo Cliente
        </button>
      </div>

      <div className="search-bar">
        <FaSearch className="search-icon" />
        <input
          type="text"
          className="form-control"
          placeholder="Buscar cliente por nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="item-list">
        {filteredClientes.length > 0 ? (
          filteredClientes.map(cliente => (
            <div className="item-card" key={cliente.id}>
              <div className="item-info">
                <p className="item-name">{cliente.nome}</p>
                <p className="item-details">Telefone: {cliente.telefone || 'N/A'}</p>
                <p className="item-details">Limite: R$ {parseFloat(cliente.limite_credito).toFixed(2)}</p>
              </div>
              <div className="item-price" style={{ color: cliente.saldo_devedor > 0 ? 'var(--error)' : 'var(--success)' }}>
                R$ {parseFloat(cliente.saldo_devedor || 0).toFixed(2)}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                <button onClick={() => handleEdit(cliente)} style={{background: 'none', border: 'none', cursor: 'pointer'}}><FaEdit size={20} color="var(--text-secondary)" /></button>
                <button onClick={() => handleDelete(cliente.id)} style={{background: 'none', border: 'none', cursor: 'pointer'}}><FaTrash size={20} color="var(--text-secondary)" /></button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <FaUserFriends className="empty-icon" />
            <p className="empty-text">Nenhum cliente encontrado.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal active">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editingCliente ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button className="close-btn" onClick={closeModal}><FaTimes /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nome *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Limite de Crédito (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={formData.limite_credito}
                  onChange={(e) => setFormData({ ...formData, limite_credito: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingCliente ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Clientes;
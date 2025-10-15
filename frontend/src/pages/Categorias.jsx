import { useState, useEffect } from 'react';
import { getCategorias, createCategoria, updateCategoria, deleteCategoria } from '../services/api';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaTags } from 'react-icons/fa';

function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ nome: '', ativo: true });

  useEffect(() => {
    loadCategorias();
  }, []);

  const loadCategorias = async () => {
    setLoading(true);
    try {
      const response = await getCategorias();
      setCategorias(response.data.results || response.data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      alert('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await updateCategoria(editingCategory.id, formData);
      } else {
        await createCategoria(formData);
      }
      closeModal();
      loadCategorias();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      alert('Erro ao salvar categoria');
    }
  };

  const handleEdit = (categoria) => {
    setEditingCategory(categoria);
    setFormData({ nome: categoria.nome, ativo: categoria.ativo });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
    try {
      await deleteCategoria(id);
      loadCategorias();
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      alert('Erro ao excluir categoria');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ nome: '', ativo: true });
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="categorias-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>Categorias</h2>
        <button className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setShowModal(true)}>
          <FaPlus />
          Nova Categoria
        </button>
      </div>

      <div className="item-list">
        {categorias.length > 0 ? (
          categorias.map(categoria => (
            <div className="item-card" key={categoria.id}>
              <div className="item-info">
                <p className="item-name">{categoria.nome}</p>
                <p className="item-details" style={{ color: categoria.ativo ? 'var(--success)' : 'var(--error)' }}>
                  {categoria.ativo ? 'Ativa' : 'Inativa'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => handleEdit(categoria)} style={{background: 'none', border: 'none', cursor: 'pointer'}}><FaEdit size={20} color="var(--text-secondary)" /></button>
                <button onClick={() => handleDelete(categoria.id)} style={{background: 'none', border: 'none', cursor: 'pointer'}}><FaTrash size={20} color="var(--text-secondary)" /></button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <FaTags className="empty-icon" />
            <p className="empty-text">Nenhuma categoria cadastrada.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal active">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</h3>
              <button className="close-btn" onClick={closeModal}><FaTimes /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nome *</label>
                <input type="text" className="form-control" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required autoFocus />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="ativo" checked={formData.ativo} onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })} style={{width: 'auto', height: 'auto'}}/>
                <label htmlFor="ativo" className="form-label" style={{marginBottom: 0}}>Ativo</label>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn-primary">{editingCategory ? 'Salvar' : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Categorias;
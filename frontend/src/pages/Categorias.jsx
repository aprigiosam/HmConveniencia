
import { useState, useEffect } from 'react';
import { getCategorias, createCategoria, updateCategoria, deleteCategoria } from '../services/api';
import './Categorias.css';

function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    ativo: true,
  });

  useEffect(() => {
    loadCategorias();
  }, []);

  const loadCategorias = async () => {
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

      setShowModal(false);
      resetForm();
      loadCategorias();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      alert('Erro ao salvar categoria');
    }
  };

  const handleEdit = (categoria) => {
    setEditingCategory(categoria);
    setFormData({
      nome: categoria.nome,
      ativo: categoria.ativo,
    });
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

  const resetForm = () => {
    setFormData({ nome: '', ativo: true });
    setEditingCategory(null);
  };

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  return (
    <div className="categorias-page">
      <div className="page-header">
        <h2>🏷️ Categorias</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          + Nova Categoria
        </button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Ativo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((categoria) => (
              <tr key={categoria.id}>
                <td>{categoria.nome}</td>
                <td>{categoria.ativo ? 'Sim' : 'Não'}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-icon btn-edit"
                      onClick={() => handleEdit(categoria)}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon btn-delete"
                      onClick={() => handleDelete(categoria.id)}
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

        {categorias.length === 0 && (
          <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            Nenhuma categoria cadastrada
          </p>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</h3>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="nome">Nome *</label>
                <input
                  type="text"
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group checkbox-group">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                />
                <label htmlFor="ativo">Ativo</label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success">
                  {editingCategory ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Categorias;

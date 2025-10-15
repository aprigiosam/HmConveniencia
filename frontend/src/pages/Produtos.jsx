import { useState, useEffect } from 'react';
import { getProdutos, createProduto, updateProduto, deleteProduto, getCategorias } from '../services/api';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaTimes, FaBoxOpen } from 'react-icons/fa';

function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    preco: '',
    preco_custo: '',
    estoque: '',
    codigo_barras: '',
    categoria: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [produtosRes, categoriasRes] = await Promise.all([getProdutos(), getCategorias()]);
      setProdutos(produtosRes.data.results || produtosRes.data);
      setCategorias(categoriasRes.data.results || categoriasRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar produtos e categorias');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dataToSend = { ...formData, preco: parseFloat(formData.preco), estoque: parseInt(formData.estoque, 10) };
    if (dataToSend.categoria === '') {
      dataToSend.categoria = null;
    } else {
      dataToSend.categoria = parseInt(dataToSend.categoria, 10);
    }

    try {
      if (editingProduct) {
        await updateProduto(editingProduct.id, dataToSend);
      } else {
        await createProduto(dataToSend);
      }
      closeModal();
      loadData();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      alert('Erro ao salvar produto');
    }
  };

  const handleEdit = (produto) => {
    setEditingProduct(produto);
    setFormData({
      nome: produto.nome,
      preco: produto.preco,
      preco_custo: produto.preco_custo || '',
      estoque: produto.estoque,
      codigo_barras: produto.codigo_barras || '',
      categoria: produto.categoria || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
      await deleteProduto(id);
      loadData();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      alert('Erro ao excluir produto');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({ nome: '', preco: '', preco_custo: '', estoque: '', codigo_barras: '', categoria: '' });
  };

  const filteredProdutos = produtos.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="produtos-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>Meus Produtos</h2>
        <button className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setShowModal(true)}>
          <FaPlus />
          Novo Produto
        </button>
      </div>

      <div className="search-bar">
        <FaSearch className="search-icon" />
        <input
          type="text"
          className="form-control"
          placeholder="Buscar produto por nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="item-list">
        {filteredProdutos.length > 0 ? (
          filteredProdutos.map(produto => (
            <div className="item-card" key={produto.id}>
              <div className="item-info">
                <p className="item-name">{produto.nome}</p>
                <p className="item-details">Estoque: {parseInt(produto.estoque)}</p>
                <p className="item-details">{produto.categoria_nome || 'Sem Categoria'}</p>
              </div>
              <div className="item-price">
                R$ {parseFloat(produto.preco).toFixed(2)}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                <button onClick={() => handleEdit(produto)} style={{background: 'none', border: 'none', cursor: 'pointer'}}><FaEdit size={20} color="var(--text-secondary)" /></button>
                <button onClick={() => handleDelete(produto.id)} style={{background: 'none', border: 'none', cursor: 'pointer'}}><FaTrash size={20} color="var(--text-secondary)" /></button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <FaBoxOpen className="empty-icon" />
            <p className="empty-text">Nenhum produto encontrado.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal active">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button className="close-btn" onClick={closeModal}><FaTimes /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nome *</label>
                <input type="text" className="form-control" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required autoFocus />
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                <div className="form-group">
                  <label className="form-label">Preço (R$) *</label>
                  <input type="number" step="0.01" className="form-control" value={formData.preco} onChange={(e) => setFormData({ ...formData, preco: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Estoque *</label>
                  <input type="number" className="form-control" value={formData.estoque} onChange={(e) => setFormData({ ...formData, estoque: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select className="form-control" value={formData.categoria} onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}>
                  <option value="">Selecione...</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>
              {/* Campos adicionais podem ser adicionados aqui conforme necessário */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn-primary">{editingProduct ? 'Salvar' : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Produtos;
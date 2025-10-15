import { useState, useEffect } from 'react';
import { getCaixaStatus, abrirCaixa, fecharCaixa, adicionarMovimentacao } from '../services/api';
import { FaPlus, FaTimes, FaFolderOpen, FaFolder, FaExchangeAlt } from 'react-icons/fa';

function Caixa() {
  const [caixa, setCaixa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [valorInicial, setValorInicial] = useState('');
  const [valorFinal, setValorFinal] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [showFecharModal, setShowFecharModal] = useState(false);
  const [showMovimentacaoModal, setShowMovimentacaoModal] = useState(false);
  const [movimentacao, setMovimentacao] = useState({ tipo: 'SANGRIA', valor: '', descricao: '' });

  useEffect(() => {
    loadCaixaStatus();
  }, []);

  const loadCaixaStatus = async () => {
    setLoading(true);
    try {
      const response = await getCaixaStatus();
      setCaixa(response.data);
    } catch (error) {
      setCaixa({ status: 'FECHADO' });
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirCaixa = async (e) => {
    e.preventDefault();
    try {
      await abrirCaixa({ valor_inicial: valorInicial || 0 });
      setValorInicial('');
      loadCaixaStatus();
    } catch (error) {
      alert('Não foi possível abrir o caixa. Verifique se já não há um aberto.');
    }
  };

  const handleFecharCaixa = async (e) => {
    e.preventDefault();
    try {
      await fecharCaixa(caixa.id, { valor_final_informado: valorFinal, observacoes });
      setShowFecharModal(false);
      setValorFinal('');
      setObservacoes('');
      loadCaixaStatus();
    } catch (error) {
      alert('Erro ao fechar o caixa.');
    }
  };

  const handleMovimentacao = async (e) => {
    e.preventDefault();
    try {
      await adicionarMovimentacao(caixa.id, movimentacao);
      setShowMovimentacaoModal(false);
      setMovimentacao({ tipo: 'SANGRIA', valor: '', descricao: '' });
      loadCaixaStatus();
    } catch (error) {
      alert('Erro ao registrar movimentação.');
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  // Estado: Caixa Fechado
  if (caixa?.status !== 'ABERTO') {
    return (
      <div className="caixa-page">
        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Gestão de Caixa</h2>
        <div className="card empty-state">
          <FaFolder className="empty-icon" />
          <p className="empty-text">Nenhum caixa aberto no momento.</p>
          <form onSubmit={handleAbrirCaixa} style={{ maxWidth: '400px', margin: '0 auto' }}>
            <div className="form-group">
              <input
                type="number"
                step="0.01"
                className="form-control"
                placeholder="Valor inicial (troco)"
                value={valorInicial}
                onChange={(e) => setValorInicial(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" className="btn-primary">Abrir Caixa</button>
          </form>
        </div>
      </div>
    );
  }

  // Estado: Caixa Aberto
  return (
    <div className="caixa-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>Gestão de Caixa</h2>
        <div>
          <button className="btn-secondary" style={{width: 'auto', marginRight: '0.5rem'}} onClick={() => setShowMovimentacaoModal(true)}><FaExchangeAlt /> Movimentação</button>
          <button className="btn-primary" style={{width: 'auto'}} onClick={() => setShowFecharModal(true)}>Fechar Caixa</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Caixa Aberto</h3>
          <FaFolderOpen color="var(--success)"/>
        </div>
        <p>Aberto em: <strong>{new Date(caixa.data_abertura).toLocaleString('pt-BR')}</strong></p>
        <p>Valor Inicial (Troco): <strong>R$ {parseFloat(caixa.valor_inicial).toFixed(2)}</strong></p>
      </div>

      {/* Modal de Fechamento */}
      {showFecharModal && (
        <div className="modal active">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Fechar Caixa</h3>
              <button className="close-btn" onClick={() => setShowFecharModal(false)}><FaTimes /></button>
            </div>
            <form onSubmit={handleFecharCaixa}>
              <p>Conte o dinheiro em caixa e insira o valor total contado.</p>
              <div className="form-group">
                <label className="form-label">Valor Contado</label>
                <input type="number" step="0.01" className="form-control" value={valorFinal} onChange={(e) => setValorFinal(e.target.value)} required autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea className="form-control" value={observacoes} onChange={(e) => setObservacoes(e.target.value)}></textarea>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowFecharModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Confirmar Fechamento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Movimentação */}
      {showMovimentacaoModal && (
        <div className="modal active">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Nova Movimentação</h3>
              <button className="close-btn" onClick={() => setShowMovimentacaoModal(false)}><FaTimes /></button>
            </div>
            <form onSubmit={handleMovimentacao}>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-control" value={movimentacao.tipo} onChange={(e) => setMovimentacao({ ...movimentacao, tipo: e.target.value })}>
                  <option value="SANGRIA">Sangria (Retirada)</option>
                  <option value="SUPRIMENTO">Suprimento (Adição)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Valor</label>
                <input type="number" step="0.01" className="form-control" value={movimentacao.valor} onChange={(e) => setMovimentacao({ ...movimentacao, valor: e.target.value })} required autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Descrição</label>
                <input type="text" className="form-control" value={movimentacao.descricao} onChange={(e) => setMovimentacao({ ...movimentacao, descricao: e.target.value })} required />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowMovimentacaoModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Caixa;
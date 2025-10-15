
import { useState, useEffect } from 'react';
import { getCaixaStatus, abrirCaixa, fecharCaixa, adicionarMovimentacao } from '../services/api';
import './Caixa.css';

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
      console.error('Erro ao carregar status do caixa:', error);
      // Se der 404 (ou outro erro) significa que não tem caixa, o que é esperado
      setCaixa({ status: 'FECHADO' });
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirCaixa = async (e) => {
    e.preventDefault();
    if (parseFloat(valorInicial) < 0) {
      alert('Valor inicial não pode ser negativo.');
      return;
    }
    try {
      await abrirCaixa({ valor_inicial: valorInicial });
      setValorInicial('');
      loadCaixaStatus();
    } catch (error) {
      console.error('Erro ao abrir caixa:', error);
      alert('Não foi possível abrir o caixa. Verifique se já não há um aberto.');
    }
  };

  const handleFecharCaixa = async (e) => {
    e.preventDefault();
    if (parseFloat(valorFinal) < 0) {
      alert('Valor final não pode ser negativo.');
      return;
    }
    try {
      await fecharCaixa(caixa.id, { valor_final_informado: valorFinal, observacoes });
      setShowFecharModal(false);
      setValorFinal('');
      setObservacoes('');
      loadCaixaStatus();
    } catch (error) {
      console.error('Erro ao fechar caixa:', error);
      alert('Erro ao fechar o caixa.');
    }
  };

  const handleMovimentacao = async (e) => {
    e.preventDefault();
    if (parseFloat(movimentacao.valor) <= 0) {
      alert('Valor da movimentação deve ser positivo.');
      return;
    }
    try {
      await adicionarMovimentacao(caixa.id, movimentacao);
      setShowMovimentacaoModal(false);
      setMovimentacao({ tipo: 'SANGRIA', valor: '', descricao: '' });
      loadCaixaStatus(); // Recarrega para atualizar valores
    } catch (error) {
      console.error('Erro ao adicionar movimentação:', error);
      alert('Erro ao registrar movimentação.');
    }
  };

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  if (caixa?.status !== 'ABERTO') {
    return (
      <div className="caixa-page">
        <div className="card">
          <h2>Abrir Caixa</h2>
          <p>Não há nenhum caixa aberto no momento.</p>
          <form onSubmit={handleAbrirCaixa} className="form-abrir-caixa">
            <input
              type="number"
              step="0.01"
              placeholder="Valor inicial (troco)"
              value={valorInicial}
              onChange={(e) => setValorInicial(e.target.value)}
              required
              autoFocus
            />
            <button type="submit" className="btn btn-success">Abrir Caixa</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="caixa-page">
      <div className="page-header">
        <h2>Gestão de Caixa</h2>
        <div className="header-buttons">
          <button className="btn btn-warning" onClick={() => setShowMovimentacaoModal(true)}>+ Movimentação</button>
          <button className="btn btn-danger" onClick={() => setShowFecharModal(true)}>Fechar Caixa</button>
        </div>
      </div>

      <div className="card">
        <h3>Caixa Aberto</h3>
        <div className="caixa-info">
          <p><strong>Aberto em:</strong> {new Date(caixa.data_abertura).toLocaleString('pt-BR')}</p>
          <p><strong>Valor Inicial (Troco):</strong> R$ {parseFloat(caixa.valor_inicial).toFixed(2)}</p>
        </div>
      </div>

      {/* Modal de Fechamento */}
      {showFecharModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Fechar Caixa</h3>
            <form onSubmit={handleFecharCaixa}>
              <p>Conte todo o dinheiro físico no caixa e insira o valor total abaixo.</p>
              <input
                type="number"
                step="0.01"
                placeholder="Valor total contado"
                value={valorFinal}
                onChange={(e) => setValorFinal(e.target.value)}
                required
                autoFocus
              />
              <textarea
                placeholder="Observações (opcional)"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              ></textarea>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setShowFecharModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-danger">Confirmar Fechamento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Movimentação */}
      {showMovimentacaoModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Nova Movimentação</h3>
            <form onSubmit={handleMovimentacao}>
              <select
                value={movimentacao.tipo}
                onChange={(e) => setMovimentacao({ ...movimentacao, tipo: e.target.value })}
              >
                <option value="SANGRIA">Sangria (Retirada)</option>
                <option value="SUPRIMENTO">Suprimento (Adição)</option>
              </select>
              <input
                type="number"
                step="0.01"
                placeholder="Valor"
                value={movimentacao.valor}
                onChange={(e) => setMovimentacao({ ...movimentacao, valor: e.target.value })}
                required
                autoFocus
              />
              <input
                type="text"
                placeholder="Descrição"
                value={movimentacao.descricao}
                onChange={(e) => setMovimentacao({ ...movimentacao, descricao: e.target.value })}
                required
              />
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setShowMovimentacaoModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-success">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Caixa;

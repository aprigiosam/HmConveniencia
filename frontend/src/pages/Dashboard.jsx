import { useState, useEffect } from 'react'
import { getDashboard, getVendas, triggerBackup } from '../services/api'
import './Dashboard.css'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [backupLoading, setBackupLoading] = useState(false)

  useEffect(() => {
    loadData()
    // Atualiza a cada 30 segundos
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const statsRes = await getDashboard()
      setStats(statsRes.data)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      if (!stats) { // Só mostra erro na primeira carga
        alert('Erro ao carregar dados do dashboard')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleBackup = async () => {
    if (!confirm('Deseja realmente iniciar um backup do banco de dados?')) return;

    setBackupLoading(true);
    try {
      await triggerBackup();
      alert('Backup iniciado com sucesso! Verifique os logs do servidor para detalhes.');
    } catch (error) {
      console.error('Erro ao iniciar backup:', error);
      alert('Erro ao iniciar backup. Verifique a conexão e os logs.');
    } finally {
      setBackupLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Carregando...</div>
  }

  return (
    <div className="dashboard">
      <h2>📊 Dashboard</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Vendas Hoje</h3>
            <p className="stat-value">R$ {stats?.vendas_hoje?.total?.toFixed(2) || '0.00'}</p>
            <span className="stat-label">{stats?.vendas_hoje?.quantidade || 0} vendas</span>
          </div>
        </div>

        {/* ALERTA VERMELHO: Contas Vencidas */}
        {stats?.contas_receber?.vencidas?.quantidade > 0 && (
          <div className="stat-card stat-danger">
            <div className="stat-icon">🚨</div>
            <div className="stat-content">
              <h3>Contas Vencidas</h3>
              <p className="stat-value">R$ {stats?.contas_receber?.vencidas?.total?.toFixed(2) || '0.00'}</p>
              <span className="stat-label">{stats?.contas_receber?.vencidas?.quantidade} contas atrasadas</span>
            </div>
          </div>
        )}

        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>Contas a Receber</h3>
            <p className="stat-value">R$ {stats?.contas_receber?.total?.toFixed(2) || '0.00'}</p>
            <span className="stat-label">{stats?.contas_receber?.quantidade || 0} pendentes</span>
            {stats?.contas_receber?.vencendo_hoje?.quantidade > 0 && (
              <span className="stat-warning">⚠️ {stats.contas_receber.vencendo_hoje.quantidade} vencendo hoje</span>
            )}
          </div>
        </div>

        {stats?.caixa && (
          <div className="stat-card stat-success">
            <div className="stat-icon">💵</div>
            <div className="stat-content">
              <h3>Caixa Aberto</h3>
              <p className="stat-value">R$ {stats.caixa.valor_atual?.toFixed(2) || '0.00'}</p>
              <span className="stat-label">Inicial: R$ {stats.caixa.valor_inicial?.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <h3>Estoque Baixo</h3>
            <p className="stat-value">{stats?.estoque_baixo || 0}</p>
            <span className="stat-label">produtos</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Manutenção</h3>
        <button
          className="btn btn-secondary"
          onClick={handleBackup}
          disabled={backupLoading}
        >
          {backupLoading ? 'Iniciando Backup...' : '☁️ Fazer Backup Agora'}
        </button>
        <small style={{marginLeft: '15px', color: '#666'}}>
          Atualização automática a cada 30 segundos
        </small>
      </div>
    </div>
  )
}

export default Dashboard

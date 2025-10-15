import { useState, useEffect } from 'react'
import { getDashboard, getVendas } from '../services/api'
import './Dashboard.css'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [vendas, setVendas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [statsRes, vendasRes] = await Promise.all([
        getDashboard(),
        getVendas({ periodo: 'hoje' })
      ])
      setStats(statsRes.data)
      setVendas(vendasRes.data.results || vendasRes.data)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      alert('Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }

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

        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <h3>Estoque Baixo</h3>
            <p className="stat-value">{stats?.estoque_baixo || 0}</p>
            <span className="stat-label">produtos</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>📝 Últimas Vendas</h3>
        {vendas.length === 0 ? (
          <p style={{textAlign: 'center', padding: '20px', color: '#666'}}>
            Nenhuma venda hoje
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Número</th>
                <th>Hora</th>
                <th>Pagamento</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {vendas.map(venda => (
                <tr key={venda.id}>
                  <td>{venda.numero}</td>
                  <td>{new Date(venda.created_at).toLocaleTimeString('pt-BR')}</td>
                  <td>{venda.forma_pagamento}</td>
                  <td>R$ {parseFloat(venda.total).toFixed(2)}</td>
                  <td>
                    <span className={`badge badge-${venda.status.toLowerCase()}`}>
                      {venda.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Dashboard

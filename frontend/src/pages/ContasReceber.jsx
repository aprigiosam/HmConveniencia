import { useState, useEffect } from 'react'
import { getContasReceber, receberPagamento } from '../services/api'
import './ContasReceber.css'

function ContasReceber() {
  const [contas, setContas] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalDevedor, setTotalDevedor] = useState(0)

  useEffect(() => {
    loadContas()
  }, [])

  const loadContas = async () => {
    try {
      const response = await getContasReceber()
      const data = response.data.results || response.data
      setContas(data)

      // Calcula total devedor
      const total = data.reduce((sum, venda) => sum + parseFloat(venda.total), 0)
      setTotalDevedor(total)
    } catch (error) {
      console.error('Erro ao carregar contas:', error)
      alert('Erro ao carregar contas a receber')
    } finally {
      setLoading(false)
    }
  }

  const handleReceber = async (vendaId) => {
    if (!confirm('Confirmar recebimento desta conta?')) return

    try {
      await receberPagamento(vendaId)
      loadContas() // Recarrega a lista
      alert('Pagamento recebido com sucesso!')
    } catch (error) {
      console.error('Erro ao receber pagamento:', error)
      alert('Erro ao receber pagamento')
    }
  }

  const isVencida = (dataVencimento) => {
    if (!dataVencimento) return false
    const hoje = new Date()
    const vencimento = new Date(dataVencimento)
    return vencimento < hoje
  }

  if (loading) {
    return <div className="loading">Carregando...</div>
  }

  return (
    <div className="contas-receber-page">
      <div className="page-header">
        <h2>💰 Contas a Receber</h2>
        <div className="total-box">
          <span>Total a Receber:</span>
          <strong>R$ {totalDevedor.toFixed(2)}</strong>
        </div>
      </div>

      <div className="card">
        {contas.length === 0 ? (
          <p style={{textAlign: 'center', padding: '40px', color: '#666'}}>
            Nenhuma conta pendente
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Venda</th>
                <th>Cliente</th>
                <th>Data Venda</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {contas.map(venda => {
                const vencida = isVencida(venda.data_vencimento)
                return (
                  <tr key={venda.id} className={vencida ? 'row-vencida' : ''}>
                    <td>{venda.numero}</td>
                    <td>{venda.cliente_nome}</td>
                    <td>{new Date(venda.created_at).toLocaleDateString('pt-BR')}</td>
                    <td>
                      {venda.data_vencimento
                        ? new Date(venda.data_vencimento).toLocaleDateString('pt-BR')
                        : '-'
                      }
                    </td>
                    <td style={{fontWeight: 'bold'}}>
                      R$ {parseFloat(venda.total).toFixed(2)}
                    </td>
                    <td>
                      {vencida ? (
                        <span className="badge badge-vencida">VENCIDA</span>
                      ) : (
                        <span className="badge badge-pendente">PENDENTE</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleReceber(venda.id)}
                      >
                        ✓ Receber
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default ContasReceber

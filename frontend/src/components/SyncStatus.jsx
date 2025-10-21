import { useState, useEffect } from 'react'
import { syncManager } from '../utils/syncManager'
import './SyncStatus.css'

function SyncStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSync, setLastSync] = useState(null)

  useEffect(() => {
    updateStatus()

    // Atualiza status a cada 30 segundos (otimizado)
    const interval = setInterval(updateStatus, 30000)

    // Listeners de rede
    const handleOnline = () => {
      setIsOnline(true)
      updateStatus()
    }

    const handleOffline = () => {
      setIsOnline(false)
      updateStatus()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Listener de sincronização
    syncManager.addListener((data) => {
      if (data.type === 'SYNC_COMPLETE') {
        setLastSync(new Date())
        updateStatus()
      } else if (data.type === 'VENDA_SYNCED') {
        updateStatus()
      }
    })

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const updateStatus = async () => {
    try {
      const status = await syncManager.getStatus()
      setIsOnline(status.isOnline)
      setIsSyncing(status.isSyncing)
      setPendingCount(status.pendingCount)
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    }
  }

  const handleManualSync = async () => {
    if (isOnline && !isSyncing) {
      await syncManager.syncAll()
    }
  }

  // Não mostra nada se está online e não tem vendas pendentes
  if (isOnline && pendingCount === 0) {
    return null
  }

  return (
    <div className={`sync-status ${isOnline ? 'online' : 'offline'}`}>
      <div className="sync-status-content">
        {/* Status da conexão */}
        <div className="connection-status">
          <span className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? '🟢' : '🔴'}
          </span>
          <span className="status-text">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Vendas pendentes */}
        {pendingCount > 0 && (
          <div className="pending-count">
            <span className="badge-warning">
              {pendingCount} venda{pendingCount !== 1 ? 's' : ''} pendente{pendingCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Status de sincronização */}
        {isSyncing && (
          <div className="syncing-indicator">
            <span className="spinner">⟳</span>
            <span>Sincronizando...</span>
          </div>
        )}

        {/* Botão de sincronização manual */}
        {isOnline && pendingCount > 0 && !isSyncing && (
          <button
            className="btn-sync"
            onClick={handleManualSync}
            title="Sincronizar agora"
          >
            🔄 Sincronizar
          </button>
        )}

        {/* Última sincronização */}
        {lastSync && (
          <div className="last-sync">
            Última sinc: {lastSync.toLocaleTimeString('pt-BR')}
          </div>
        )}
      </div>

      {/* Mensagem de offline */}
      {!isOnline && (
        <div className="offline-message">
          As vendas estão sendo salvas localmente e serão enviadas quando a conexão for restaurada.
        </div>
      )}
    </div>
  )
}

export default SyncStatus

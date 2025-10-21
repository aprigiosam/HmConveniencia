import { localDB } from './db'
import { createVenda } from '../services/api'
import { notificationManager } from './notifications'

// Helper para logging condicional (apenas em desenvolvimento)
const isDev = import.meta.env.DEV
const log = (...args) => isDev && console.log(...args)

class SyncManager {
  constructor() {
    this.isSyncing = false
    this.syncInterval = null
    this.listeners = []
  }

  // Inicializar sincronização automática
  init() {
    log('[SyncManager] Inicializando...')

    // Sincroniza quando ficar online
    window.addEventListener('online', () => {
      log('[SyncManager] Conexão restaurada, sincronizando...')
      this.syncAll()
    })

    // Verifica a cada 30 segundos se há vendas pendentes
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.syncAll()
      }
    }, 30000)

    // Tenta sincronizar ao iniciar
    if (navigator.onLine) {
      setTimeout(() => this.syncAll(), 2000)
    }

    // Escuta mensagens do Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_VENDAS') {
          this.syncAll()
        }
      })
    }
  }

  // Adicionar listener para mudanças de status
  addListener(callback) {
    this.listeners.push(callback)
  }

  // Notificar listeners
  notifyListeners(data) {
    this.listeners.forEach((callback) => callback(data))
  }

  // Sincronizar todas as vendas pendentes
  async syncAll() {
    if (this.isSyncing) {
      log('[SyncManager] Já está sincronizando...')
      return
    }

    if (!navigator.onLine) {
      log('[SyncManager] Offline, aguardando conexão...')
      return
    }

    this.isSyncing = true

    try {
      const vendasPendentes = await localDB.getVendasPendentes()

      if (vendasPendentes.length === 0) {
        log('[SyncManager] Nenhuma venda pendente')
        this.isSyncing = false
        return
      }

      log(`[SyncManager] Sincronizando ${vendasPendentes.length} venda(s)...`)

      let syncedCount = 0
      let failedCount = 0

      for (const venda of vendasPendentes) {
        try {
          // Remove campos internos antes de enviar
          const { id, timestamp, synced, syncedAt, ...vendaData } = venda

          // Envia para o backend
          await createVenda(vendaData)

          // Marca como sincronizada
          await localDB.deleteVendaSynced(id)

          syncedCount++
          log(`[SyncManager] Venda ${id} sincronizada com sucesso`)

          // Notifica listeners
          this.notifyListeners({
            type: 'VENDA_SYNCED',
            vendaId: id,
            syncedCount,
            totalPendentes: vendasPendentes.length
          })
        } catch (error) {
          failedCount++
          console.error(`[SyncManager] Erro ao sincronizar venda ${venda.id}:`, error)

          // Se erro de validação, marca como erro permanente
          if (error.response && error.response.status === 400) {
            venda.syncError = error.response.data
            await localDB.markVendaSynced(venda.id)
          }
        }
      }

      log(`[SyncManager] Sincronização concluída: ${syncedCount} sucesso, ${failedCount} falhas`)

      // Envia notificação push sobre conclusão
      if (syncedCount > 0) {
        notificationManager.notifySyncCompleted(syncedCount)
      }

      if (failedCount > 0) {
        notificationManager.notifySyncError(failedCount)
      }

      // Notifica conclusão
      this.notifyListeners({
        type: 'SYNC_COMPLETE',
        syncedCount,
        failedCount,
        total: vendasPendentes.length
      })
    } catch (error) {
      console.error('[SyncManager] Erro na sincronização:', error)
    } finally {
      this.isSyncing = false
    }
  }

  // Verificar status de sincronização
  async getStatus() {
    const pendingCount = await localDB.countVendasPendentes()
    return {
      isOnline: navigator.onLine,
      isSyncing: this.isSyncing,
      pendingCount
    }
  }

  // Parar sincronização automática
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }
}

export const syncManager = new SyncManager()

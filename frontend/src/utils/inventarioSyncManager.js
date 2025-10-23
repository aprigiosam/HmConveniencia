// Gerenciador de sincronização de inventário
import { localDB } from './db'
import { addInventarioItem } from '../services/api'

class InventarioSyncManager {
  constructor() {
    this.syncing = false
    this.syncInterval = null
  }

  // Iniciar sincronização automática
  startAutoSync(intervalMs = 30000) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    // Sincroniza imediatamente
    this.syncAll()

    // Configura sincronização automática
    this.syncInterval = setInterval(() => {
      this.syncAll()
    }, intervalMs)

    console.log('[InventarioSync] Auto-sync iniciado (intervalo: ' + intervalMs + 'ms)')
  }

  // Parar sincronização automática
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      console.log('[InventarioSync] Auto-sync parado')
    }
  }

  // Sincronizar todos os itens pendentes
  async syncAll() {
    if (this.syncing) {
      console.log('[InventarioSync] Sincronização já em andamento, pulando...')
      return { success: 0, failed: 0, skipped: true }
    }

    this.syncing = true
    console.log('[InventarioSync] Iniciando sincronização de itens de inventário...')

    try {
      // Busca total de itens pendentes
      const count = await localDB.countInventarioItensPendentes()

      if (count === 0) {
        console.log('[InventarioSync] Nenhum item pendente para sincronizar')
        this.syncing = false
        return { success: 0, failed: 0, pending: 0 }
      }

      console.log(`[InventarioSync] ${count} itens pendentes encontrados`)

      let successCount = 0
      let failedCount = 0

      // Busca todos os itens pendentes agrupados por sessão
      const itensPendentes = await this.getAllPendingItems()

      for (const item of itensPendentes) {
        try {
          await this.syncItem(item)
          successCount++
        } catch (error) {
          console.error('[InventarioSync] Erro ao sincronizar item:', error)
          failedCount++
        }
      }

      console.log(`[InventarioSync] Sincronização concluída. Sucesso: ${successCount}, Falhas: ${failedCount}`)

      this.syncing = false
      return { success: successCount, failed: failedCount, pending: count }

    } catch (error) {
      console.error('[InventarioSync] Erro durante sincronização:', error)
      this.syncing = false
      return { success: 0, failed: 0, error: error.message }
    }
  }

  // Buscar todos os itens pendentes
  async getAllPendingItems() {
    const db = await localDB.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['inventario_itens_pendentes'], 'readonly')
      const store = transaction.objectStore('inventario_itens_pendentes')
      const request = store.getAll()

      request.onsuccess = () => {
        const itens = request.result.filter(item => !item.synced)
        resolve(itens)
      }
      request.onerror = () => reject(request.error)
    })
  }

  // Sincronizar um item específico
  async syncItem(item) {
    try {
      console.log(`[InventarioSync] Sincronizando item:`, item)

      // Prepara dados para envio
      const itemData = {
        produto: item.produto,
        quantidade_contada: item.quantidade_contada,
        custo_informado: item.custo_informado,
        validade_informada: item.validade_informada,
        observacao: item.observacao || ''
      }

      // Envia para o backend
      await addInventarioItem(item.sessao_id, itemData)

      // Marca como sincronizado
      await localDB.markInventarioItemSynced(item.localId)

      // Aguarda 500ms antes de deletar para garantir que foi salvo
      setTimeout(async () => {
        await localDB.deleteInventarioItemSynced(item.localId)
      }, 500)

      console.log(`[InventarioSync] Item ${item.localId} sincronizado e removido do cache`)

      return true
    } catch (error) {
      console.error(`[InventarioSync] Falha ao sincronizar item ${item.localId}:`, error)
      throw error
    }
  }

  // Adicionar item para sincronização offline
  async addItemOffline(sessaoId, itemData) {
    try {
      const localId = await localDB.saveInventarioItemPendente({
        sessao_id: sessaoId,
        ...itemData
      })

      console.log(`[InventarioSync] Item salvo offline com ID local ${localId}`)

      // Tenta sincronizar imediatamente
      setTimeout(() => {
        this.syncAll()
      }, 1000)

      return localId
    } catch (error) {
      console.error('[InventarioSync] Erro ao salvar item offline:', error)
      throw error
    }
  }

  // Verificar status da sincronização
  async getStatus() {
    const pendingCount = await localDB.countInventarioItensPendentes()
    return {
      syncing: this.syncing,
      pendingItems: pendingCount,
      autoSyncEnabled: this.syncInterval !== null
    }
  }

  // Limpar itens sincronizados antigos (mais de 24h)
  async cleanupSyncedItems() {
    const db = await localDB.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['inventario_itens_pendentes'], 'readwrite')
      const store = transaction.objectStore('inventario_itens_pendentes')
      const request = store.getAll()

      request.onsuccess = () => {
        const now = new Date()
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

        let deletedCount = 0

        request.result.forEach(item => {
          if (item.synced && item.syncedAt) {
            const syncedAt = new Date(item.syncedAt)
            if (syncedAt < oneDayAgo) {
              store.delete(item.localId)
              deletedCount++
            }
          }
        })

        transaction.oncomplete = () => {
          console.log(`[InventarioSync] ${deletedCount} itens sincronizados antigos removidos`)
          resolve(deletedCount)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }
}

export const inventarioSyncManager = new InventarioSyncManager()

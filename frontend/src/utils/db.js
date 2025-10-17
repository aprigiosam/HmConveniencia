// IndexedDB para armazenamento local offline
const DB_NAME = 'HMConvenienciaDB'
const DB_VERSION = 2 // Incrementado para adicionar categorias_cache

class LocalDB {
  constructor() {
    this.db = null
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result

        // Store para vendas pendentes de sincronização
        if (!db.objectStoreNames.contains('vendas_pendentes')) {
          const vendasStore = db.createObjectStore('vendas_pendentes', {
            keyPath: 'id',
            autoIncrement: true
          })
          vendasStore.createIndex('timestamp', 'timestamp', { unique: false })
          vendasStore.createIndex('synced', 'synced', { unique: false })
        }

        // Store para cache de produtos
        if (!db.objectStoreNames.contains('produtos_cache')) {
          const produtosStore = db.createObjectStore('produtos_cache', {
            keyPath: 'id'
          })
          produtosStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Store para cache de clientes
        if (!db.objectStoreNames.contains('clientes_cache')) {
          const clientesStore = db.createObjectStore('clientes_cache', {
            keyPath: 'id'
          })
          clientesStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Store para cache de categorias
        if (!db.objectStoreNames.contains('categorias_cache')) {
          const categoriasStore = db.createObjectStore('categorias_cache', {
            keyPath: 'id'
          })
          categoriasStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  // Salvar venda pendente
  async saveVendaPendente(vendaData) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['vendas_pendentes'], 'readwrite')
      const store = transaction.objectStore('vendas_pendentes')

      const venda = {
        ...vendaData,
        timestamp: new Date().toISOString(),
        synced: false
      }

      const request = store.add(venda)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Buscar vendas não sincronizadas
  async getVendasPendentes() {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['vendas_pendentes'], 'readonly')
      const store = transaction.objectStore('vendas_pendentes')
      const index = store.index('synced')

      const request = index.getAll(false)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Marcar venda como sincronizada
  async markVendaSynced(id) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['vendas_pendentes'], 'readwrite')
      const store = transaction.objectStore('vendas_pendentes')

      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const venda = getRequest.result
        if (venda) {
          venda.synced = true
          venda.syncedAt = new Date().toISOString()
          const updateRequest = store.put(venda)
          updateRequest.onsuccess = () => resolve(true)
          updateRequest.onerror = () => reject(updateRequest.error)
        } else {
          resolve(false)
        }
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  // Deletar venda sincronizada
  async deleteVendaSynced(id) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['vendas_pendentes'], 'readwrite')
      const store = transaction.objectStore('vendas_pendentes')

      const request = store.delete(id)

      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(request.error)
    })
  }

  // Cachear produtos
  async cacheProdutos(produtos) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['produtos_cache'], 'readwrite')
      const store = transaction.objectStore('produtos_cache')

      // Limpa cache antigo
      store.clear()

      // Adiciona novos produtos
      produtos.forEach((produto) => {
        store.add({
          ...produto,
          timestamp: new Date().toISOString()
        })
      })

      transaction.oncomplete = () => resolve(true)
      transaction.onerror = () => reject(transaction.error)
    })
  }

  // Buscar produtos do cache
  async getCachedProdutos() {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['produtos_cache'], 'readonly')
      const store = transaction.objectStore('produtos_cache')

      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Cachear clientes
  async cacheClientes(clientes) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['clientes_cache'], 'readwrite')
      const store = transaction.objectStore('clientes_cache')

      // Limpa cache antigo
      store.clear()

      // Adiciona novos clientes
      clientes.forEach((cliente) => {
        store.add({
          ...cliente,
          timestamp: new Date().toISOString()
        })
      })

      transaction.oncomplete = () => resolve(true)
      transaction.onerror = () => reject(transaction.error)
    })
  }

  // Buscar clientes do cache
  async getCachedClientes() {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['clientes_cache'], 'readonly')
      const store = transaction.objectStore('clientes_cache')

      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Contar vendas pendentes
  async countVendasPendentes() {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['vendas_pendentes'], 'readonly')
      const store = transaction.objectStore('vendas_pendentes')
      const index = store.index('synced')

      const request = index.count(false)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Cachear categorias
  async cacheCategorias(categorias) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['categorias_cache'], 'readwrite')
      const store = transaction.objectStore('categorias_cache')

      // Limpa cache antigo
      store.clear()

      // Adiciona novas categorias
      categorias.forEach((categoria) => {
        store.add({
          ...categoria,
          timestamp: new Date().toISOString()
        })
      })

      transaction.oncomplete = () => resolve(true)
      transaction.onerror = () => reject(transaction.error)
    })
  }

  // Buscar categorias do cache
  async getCachedCategorias() {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['categorias_cache'], 'readonly')
      const store = transaction.objectStore('categorias_cache')

      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
}

export const localDB = new LocalDB()

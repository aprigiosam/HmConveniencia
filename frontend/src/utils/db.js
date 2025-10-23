// IndexedDB para armazenamento local offline
const DB_NAME = 'HMConvenienciaDB'
const DB_VERSION = 4 // Incrementado para adicionar inventario_cache e itens_pendentes

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

        // Store para cache de fornecedores
        if (!db.objectStoreNames.contains('fornecedores_cache')) {
          const fornecedoresStore = db.createObjectStore('fornecedores_cache', {
            keyPath: 'id'
          })
          fornecedoresStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Store para cache de inventários
        if (!db.objectStoreNames.contains('inventarios_cache')) {
          const inventariosStore = db.createObjectStore('inventarios_cache', {
            keyPath: 'id'
          })
          inventariosStore.createIndex('timestamp', 'timestamp', { unique: false })
          inventariosStore.createIndex('status', 'status', { unique: false })
        }

        // Store para itens de inventário pendentes de sincronização
        if (!db.objectStoreNames.contains('inventario_itens_pendentes')) {
          const itensStore = db.createObjectStore('inventario_itens_pendentes', {
            keyPath: 'localId',
            autoIncrement: true
          })
          itensStore.createIndex('sessao_id', 'sessao_id', { unique: false })
          itensStore.createIndex('timestamp', 'timestamp', { unique: false })
          itensStore.createIndex('synced', 'synced', { unique: false })
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

      // Busca todas as vendas e filtra no JavaScript
      // (valores booleanos não funcionam bem com índices em alguns navegadores)
      const request = store.getAll()

      request.onsuccess = () => {
        const vendas = request.result.filter(venda => !venda.synced)
        resolve(vendas)
      }
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

      // Busca todas as vendas e conta no JavaScript
      // (valores booleanos não funcionam bem com índices em alguns navegadores)
      const request = store.getAll()

      request.onsuccess = () => {
        const count = request.result.filter(venda => !venda.synced).length
        resolve(count)
      }
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

  // Cachear fornecedores
  async cacheFornecedores(fornecedores) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['fornecedores_cache'], 'readwrite')
      const store = transaction.objectStore('fornecedores_cache')

      // Limpa cache antigo
      store.clear()

      // Adiciona novos fornecedores
      fornecedores.forEach((fornecedor) => {
        store.add({
          ...fornecedor,
          timestamp: new Date().toISOString()
        })
      })

      transaction.oncomplete = () => resolve(true)
      transaction.onerror = () => reject(transaction.error)
    })
  }

  // Buscar fornecedores do cache
  async getCachedFornecedores() {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['fornecedores_cache'], 'readonly')
      const store = transaction.objectStore('fornecedores_cache')

      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // ========== INVENTÁRIO ==========

  // Cachear inventários
  async cacheInventarios(inventarios) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['inventarios_cache'], 'readwrite')
      const store = transaction.objectStore('inventarios_cache')

      // Limpa cache antigo
      store.clear()

      // Adiciona novos inventários
      inventarios.forEach((inventario) => {
        store.add({
          ...inventario,
          timestamp: new Date().toISOString()
        })
      })

      transaction.oncomplete = () => resolve(true)
      transaction.onerror = () => reject(transaction.error)
    })
  }

  // Buscar inventários do cache
  async getCachedInventarios() {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['inventarios_cache'], 'readonly')
      const store = transaction.objectStore('inventarios_cache')

      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Salvar item de inventário pendente de sincronização
  async saveInventarioItemPendente(itemData) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['inventario_itens_pendentes'], 'readwrite')
      const store = transaction.objectStore('inventario_itens_pendentes')

      const item = {
        ...itemData,
        timestamp: new Date().toISOString(),
        synced: false
      }

      const request = store.add(item)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Buscar itens pendentes de uma sessão
  async getInventarioItensPendentes(sessaoId) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['inventario_itens_pendentes'], 'readonly')
      const store = transaction.objectStore('inventario_itens_pendentes')
      const index = store.index('sessao_id')

      const request = index.getAll(sessaoId)

      request.onsuccess = () => {
        const itens = request.result.filter(item => !item.synced)
        resolve(itens)
      }
      request.onerror = () => reject(request.error)
    })
  }

  // Marcar item de inventário como sincronizado
  async markInventarioItemSynced(localId) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['inventario_itens_pendentes'], 'readwrite')
      const store = transaction.objectStore('inventario_itens_pendentes')

      const getRequest = store.get(localId)

      getRequest.onsuccess = () => {
        const item = getRequest.result
        if (item) {
          item.synced = true
          item.syncedAt = new Date().toISOString()
          const updateRequest = store.put(item)
          updateRequest.onsuccess = () => resolve(true)
          updateRequest.onerror = () => reject(updateRequest.error)
        } else {
          resolve(false)
        }
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  // Deletar item sincronizado
  async deleteInventarioItemSynced(localId) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['inventario_itens_pendentes'], 'readwrite')
      const store = transaction.objectStore('inventario_itens_pendentes')

      const request = store.delete(localId)

      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(request.error)
    })
  }

  // Contar itens pendentes de sincronização
  async countInventarioItensPendentes() {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['inventario_itens_pendentes'], 'readonly')
      const store = transaction.objectStore('inventario_itens_pendentes')

      const request = store.getAll()

      request.onsuccess = () => {
        const count = request.result.filter(item => !item.synced).length
        resolve(count)
      }
      request.onerror = () => reject(request.error)
    })
  }
}

export const localDB = new LocalDB()

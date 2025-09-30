/**
 * IndexedDB Manager para armazenamento offline
 * Gerencia vendas pendentes, produtos em cache e sincronização
 */

const DB_NAME = 'comercio-pro-db';
const DB_VERSION = 1;

export interface PendingSale {
  id: string;
  data: any;
  timestamp: number;
  synced: boolean;
}

export interface CachedProduct {
  id: number;
  sku: string;
  nome: string;
  preco_venda: number;
  estoque_total: number;
  cached_at: number;
}

export interface SyncStatus {
  lastSync: number;
  pendingCount: number;
  failedCount: number;
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Erro ao abrir IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB inicializado com sucesso');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store para vendas pendentes
        if (!db.objectStoreNames.contains('pending-sales')) {
          const salesStore = db.createObjectStore('pending-sales', {
            keyPath: 'id',
            autoIncrement: false,
          });
          salesStore.createIndex('timestamp', 'timestamp', { unique: false });
          salesStore.createIndex('synced', 'synced', { unique: false });
        }

        // Store para produtos em cache
        if (!db.objectStoreNames.contains('cached-products')) {
          const productsStore = db.createObjectStore('cached-products', {
            keyPath: 'id',
            autoIncrement: false,
          });
          productsStore.createIndex('sku', 'sku', { unique: true });
          productsStore.createIndex('cached_at', 'cached_at', { unique: false });
        }

        // Store para status de sincronização
        if (!db.objectStoreNames.contains('sync-status')) {
          db.createObjectStore('sync-status', {
            keyPath: 'key',
          });
        }

        console.log('IndexedDB estrutura criada');
      };
    });
  }

  private ensureDB(): IDBDatabase {
    if (!this.db) {
      throw new Error('IndexedDB não inicializado. Chame init() primeiro.');
    }
    return this.db;
  }

  // ==================== VENDAS PENDENTES ====================

  async addPendingSale(sale: Omit<PendingSale, 'id' | 'timestamp' | 'synced'>): Promise<string> {
    const db = this.ensureDB();
    const id = `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const pendingSale: PendingSale = {
      id,
      data: sale.data,
      timestamp: Date.now(),
      synced: false,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pending-sales'], 'readwrite');
      const store = transaction.objectStore('pending-sales');
      const request = store.add(pendingSale);

      request.onsuccess = () => {
        console.log('Venda adicionada à fila offline:', id);
        resolve(id);
      };

      request.onerror = () => {
        console.error('Erro ao salvar venda offline:', request.error);
        reject(request.error);
      };
    });
  }

  async getPendingSales(): Promise<PendingSale[]> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pending-sales'], 'readonly');
      const store = transaction.objectStore('pending-sales');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async markSaleAsSynced(id: string): Promise<void> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pending-sales'], 'readwrite');
      const store = transaction.objectStore('pending-sales');
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('Venda sincronizada e removida:', id);
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async clearPendingSales(): Promise<void> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pending-sales'], 'readwrite');
      const store = transaction.objectStore('pending-sales');
      const request = store.clear();

      request.onsuccess = () => {
        console.log('Todas as vendas pendentes foram removidas');
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // ==================== PRODUTOS EM CACHE ====================

  async cacheProducts(products: any[]): Promise<void> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['cached-products'], 'readwrite');
      const store = transaction.objectStore('cached-products');

      const now = Date.now();

      products.forEach((product) => {
        const cachedProduct: CachedProduct = {
          id: product.id,
          sku: product.sku,
          nome: product.nome,
          preco_venda: parseFloat(product.preco_venda) || 0,
          estoque_total: product.estoque_total ?? 0,
          cached_at: now,
        };
        store.put(cachedProduct);
      });

      transaction.oncomplete = () => {
        console.log(`${products.length} produtos cacheados`);
        resolve();
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  }

  async getCachedProducts(searchTerm?: string): Promise<CachedProduct[]> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['cached-products'], 'readonly');
      const store = transaction.objectStore('cached-products');
      const request = store.getAll();

      request.onsuccess = () => {
        let products = request.result || [];

        // Filtrar por termo de busca se fornecido
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          products = products.filter(
            (p) =>
              p.sku.toLowerCase().includes(term) ||
              p.nome.toLowerCase().includes(term)
          );
        }

        resolve(products);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getCachedProductBySku(sku: string): Promise<CachedProduct | null> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['cached-products'], 'readonly');
      const store = transaction.objectStore('cached-products');
      const index = store.index('sku');
      const request = index.get(sku);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async clearCachedProducts(): Promise<void> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['cached-products'], 'readwrite');
      const store = transaction.objectStore('cached-products');
      const request = store.clear();

      request.onsuccess = () => {
        console.log('Cache de produtos limpo');
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // ==================== STATUS DE SINCRONIZAÇÃO ====================

  async updateSyncStatus(status: Partial<SyncStatus>): Promise<void> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sync-status'], 'readwrite');
      const store = transaction.objectStore('sync-status');

      const data = {
        key: 'main',
        ...status,
      };

      const request = store.put(data);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getSyncStatus(): Promise<SyncStatus | null> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sync-status'], 'readonly');
      const store = transaction.objectStore('sync-status');
      const request = store.get('main');

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          const { key, ...status } = result;
          resolve(status as SyncStatus);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // ==================== UTILITÁRIOS ====================

  async clearAll(): Promise<void> {
    await this.clearPendingSales();
    await this.clearCachedProducts();
    console.log('Todos os dados locais foram limpos');
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('IndexedDB fechado');
    }
  }
}

// Singleton
export const dbManager = new IndexedDBManager();
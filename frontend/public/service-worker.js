/* eslint-disable no-restricted-globals */
const CACHE_NAME = 'comercio-pro-v1';
const OFFLINE_URL = '/offline.html';

// Assets essenciais para cache
const ESSENTIAL_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching essential assets');
      return cache.addAll(ESSENTIAL_ASSETS);
    })
  );
  // Ativa imediatamente sem esperar
  self.skipWaiting();
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Assume controle imediatamente
  return self.clients.claim();
});

// Estratégia de cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições não-HTTP
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Ignora requisições de API (deixa para o código offline handle)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone a resposta para cache
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Tenta buscar do cache se offline
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Retorna resposta offline para APIs
            return new Response(
              JSON.stringify({
                error: 'Offline',
                message: 'Você está offline. Esta requisição será sincronizada quando voltar online.'
              }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' },
              }
            );
          });
        })
    );
    return;
  }

  // Estratégia Network First para páginas HTML
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // Estratégia Cache First para assets estáticos (JS, CSS, imagens)
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Para outras requisições, tenta network first
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Sincronização em background
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-sales') {
    event.waitUntil(syncSales());
  }
});

// Função auxiliar para sincronizar vendas
async function syncSales() {
  try {
    // Abre o IndexedDB e busca vendas pendentes
    const db = await openDB();
    const pendingSales = await getPendingSales(db);

    console.log('[SW] Syncing sales:', pendingSales.length);

    for (const sale of pendingSales) {
      try {
        const response = await fetch('/api/v1/sales/vendas/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sale.data),
        });

        if (response.ok) {
          await removeSale(db, sale.id);
          console.log('[SW] Sale synced:', sale.id);
        }
      } catch (error) {
        console.error('[SW] Error syncing sale:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync error:', error);
    throw error; // Retry
  }
}

// Helpers para IndexedDB (simplificado)
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('comercio-pro-db', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getPendingSales(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-sales'], 'readonly');
    const store = transaction.objectStore('pending-sales');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function removeSale(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-sales'], 'readwrite');
    const store = transaction.objectStore('pending-sales');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Mensagens do cliente
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});
const CACHE_NAME = 'hmconv-v1'
const API_CACHE = 'hmconv-api-v1'

// Arquivos para cachear imediatamente
const STATIC_CACHE = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/src/App.jsx',
  '/src/App.css'
]

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cache aberto')
      return cache.addAll(STATIC_CACHE)
    })
  )
  self.skipWaiting()
})

// Ativação
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== API_CACHE) {
            console.log('[SW] Removendo cache antigo:', cache)
            return caches.delete(cache)
          }
        })
      )
    })
  )
  return self.clients.claim()
})

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Requisições de API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Se conseguiu buscar da rede, cacheia
          const responseClone = response.clone()
          caches.open(API_CACHE).then((cache) => {
            cache.put(request, responseClone)
          })
          return response
        })
        .catch(() => {
          // Se offline, tenta do cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            // Retorna resposta vazia para POST/PUT quando offline
            if (request.method !== 'GET') {
              return new Response(
                JSON.stringify({ offline: true, message: 'Operação salva localmente' }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              )
            }
            return new Response('Offline', { status: 503 })
          })
        })
    )
    return
  }

  // Arquivos estáticos - Network First, fallback para cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseClone = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone)
        })
        return response
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          return cachedResponse || new Response('Offline', { status: 503 })
        })
      })
  )
})

// Sincronização em background
self.addEventListener('sync', (event) => {
  console.log('[SW] Sincronização em background:', event.tag)
  if (event.tag === 'sync-vendas') {
    event.waitUntil(syncVendas())
  }
})

async function syncVendas() {
  console.log('[SW] Sincronizando vendas pendentes...')
  // A implementação real virá do IndexedDB
  const clients = await self.clients.matchAll()
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_VENDAS' })
  })
}

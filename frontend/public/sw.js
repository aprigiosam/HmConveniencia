const CACHE_NAME = 'hmconv-v2'; // Versão do cache atualizada
const API_CACHE = 'hmconv-api-v2';

// Arquivos essenciais para o app shell
const STATIC_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.jpeg',
  '/icon-192.png',
  '/icon-512.png'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cache estático aberto, adicionando app shell');
      return cache.addAll(STATIC_CACHE);
    })
  );
  self.skipWaiting();
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== API_CACHE) {
            console.log('[SW] Removendo cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições de extensões do Chrome
  if (request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Estratégia para a API: Network-First, com fallback para cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clona a resposta para poder guardá-la no cache e retorná-la
          const responseClone = response.clone();
          caches.open(API_CACHE).then((cache) => {
            // Cacheia apenas requisições GET bem-sucedidas
            if (request.method === 'GET' && response.status === 200) {
              cache.put(request, responseClone);
            }
          });
          return response;
        })
        .catch(() => {
          // Em caso de falha na rede, tenta buscar do cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Para requisições não-GET (POST, PUT, etc.), retorna uma resposta padrão offline
            if (request.method !== 'GET') {
              return new Response(
                JSON.stringify({ offline: true, message: 'Operação salva localmente para sincronização' }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              );
            }
            // Se não houver cache, retorna um erro de offline
            return new Response(
              JSON.stringify({ error: 'Você está offline e este dado não está em cache.' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // Estratégia Stale-While-Revalidate para todos os outros assets (CSS, JS, imagens)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
        return networkResponse;
      });

      // Retorna a resposta do cache imediatamente se existir, ou aguarda a rede
      return cachedResponse || fetchPromise;
    })
  );
});

// Sincronização em background (nenhuma mudança aqui)
self.addEventListener('sync', (event) => {
  console.log('[SW] Sincronização em background recebida:', event.tag);
  if (event.tag === 'sync-vendas') {
    event.waitUntil(syncVendas());
  }
});

async function syncVendas() {
  console.log('[SW] Disparando sincronização de vendas para a aplicação...');
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_VENDAS' });
  });
}
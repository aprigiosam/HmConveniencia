import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { dbManager } from './utils/indexedDB'

// Inicializa IndexedDB
dbManager.init().then(() => {
  console.log('✅ IndexedDB inicializado');
}).catch((error) => {
  console.error('❌ Erro ao inicializar IndexedDB:', error);
});

// Registra Service Worker (apenas em produção)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker registrado:', registration);

        // Checa por atualizações
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Nova versão disponível
                if (confirm('Nova versão disponível! Deseja atualizar?')) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                }
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('❌ Erro ao registrar Service Worker:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)


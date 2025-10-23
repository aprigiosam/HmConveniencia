import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import App from './App';

// Importar estilos do Mantine
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/modals/styles.css';

// Tema customizado com as cores do HM Conveniência
const theme = createTheme({
  primaryColor: 'orange',
  colors: {
    orange: [
      '#FFF5F0',
      '#FFE8DB',
      '#FFD6C1',
      '#FFC4A7',
      '#FFB28D',
      '#FF6B35', // Cor principal do logo
      '#E65F2E',
      '#CC5327',
      '#B34720',
      '#993B19',
    ],
  },
  defaultRadius: 'md',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <ModalsProvider>
        <Notifications position="top-right" zIndex={1000} />
        <App />
      </ModalsProvider>
    </MantineProvider>
  </React.StrictMode>,
);

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(() => {
        // Service Worker registration failed, app will still work without offline support
      });
  });
}
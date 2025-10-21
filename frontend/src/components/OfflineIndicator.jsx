import { useState, useEffect } from 'react';
import { Badge, Tooltip } from '@mantine/core';
import { FaWifi, FaExclamationTriangle } from 'react-icons/fa';

/**
 * Indicador de status de conexão
 * Mostra se o app está online ou offline
 */
function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Mostra indicador temporariamente quando voltar online
      setShowIndicator(true);
      setTimeout(() => setShowIndicator(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showIndicator) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '70px',
      right: '16px',
      zIndex: 1000,
      animation: 'slideIn 0.3s ease-out'
    }}>
      <Tooltip
        label={isOnline ? 'Conectado ao servidor' : 'Modo offline - dados serão sincronizados quando voltar online'}
        position="left"
      >
        <Badge
          size="lg"
          color={isOnline ? 'green' : 'orange'}
          leftSection={isOnline ? <FaWifi /> : <FaExclamationTriangle />}
          variant="filled"
          style={{
            paddingLeft: '8px',
            paddingRight: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
      </Tooltip>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

export default OfflineIndicator;

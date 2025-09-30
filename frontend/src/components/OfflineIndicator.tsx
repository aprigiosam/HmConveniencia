import { useOfflineSync } from '../hooks/useOfflineSync';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

/**
 * Indicador visual de status online/offline
 * Mostra sincronização pendente e permite sincronização manual
 */
export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount, lastSync, error, syncNow } = useOfflineSync();

  if (isOnline && pendingCount === 0 && !error) {
    return null; // Não mostrar quando tudo OK
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div
        className={`
          rounded-lg shadow-lg p-4 transition-all duration-300
          ${!isOnline ? 'bg-yellow-50 border-2 border-yellow-400' : ''}
          ${isOnline && pendingCount > 0 ? 'bg-blue-50 border-2 border-blue-400' : ''}
          ${error ? 'bg-red-50 border-2 border-red-400' : ''}
        `}
      >
        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-2">
          {!isOnline ? (
            <>
              <WifiOff className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-semibold text-yellow-800">Modo Offline</p>
                <p className="text-xs text-yellow-600">
                  Sem conexão com o servidor
                </p>
              </div>
            </>
          ) : isSyncing ? (
            <>
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
              <div>
                <p className="font-semibold text-blue-800">Sincronizando...</p>
                <p className="text-xs text-blue-600">
                  {pendingCount} venda(s) pendente(s)
                </p>
              </div>
            </>
          ) : pendingCount > 0 ? (
            <>
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-800">Pendente</p>
                <p className="text-xs text-blue-600">
                  {pendingCount} venda(s) aguardando sincronização
                </p>
              </div>
            </>
          ) : error ? (
            <>
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">Erro</p>
                <p className="text-xs text-red-600">{error}</p>
              </div>
            </>
          ) : null}
        </div>

        {/* Informações adicionais */}
        {!isOnline && (
          <div className="mt-3 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
            <p className="font-medium mb-1">🔒 Suas vendas estão seguras!</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Vendas salvas localmente</li>
              <li>Sincronização automática ao voltar online</li>
              <li>Produtos em cache disponíveis</li>
            </ul>
          </div>
        )}

        {/* Botão de sincronização manual */}
        {isOnline && pendingCount > 0 && !isSyncing && (
          <button
            onClick={syncNow}
            className="
              mt-3 w-full flex items-center justify-center gap-2
              bg-blue-600 hover:bg-blue-700 text-white
              px-4 py-2 rounded-lg text-sm font-medium
              transition-colors duration-200
            "
          >
            <RefreshCw className="w-4 h-4" />
            Sincronizar Agora
          </button>
        )}

        {/* Última sincronização */}
        {lastSync && isOnline && (
          <p className="mt-2 text-xs text-gray-500 text-center">
            Última sincronização: {new Date(lastSync).toLocaleTimeString('pt-BR')}
          </p>
        )}

        {/* Status online limpo */}
        {isOnline && pendingCount === 0 && !error && (
          <div className="flex items-center gap-2 text-green-600">
            <Wifi className="w-4 h-4" />
            <p className="text-sm font-medium">Tudo sincronizado!</p>
          </div>
        )}
      </div>
    </div>
  );
}
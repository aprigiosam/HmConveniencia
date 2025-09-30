import { useState } from 'react';
import { usePrinter } from '../hooks/usePrinter';
import { PrinterConfig } from '../utils/printer';
import { Printer, Wifi, Usb, Server, Check, X } from 'lucide-react';

/**
 * Componente de configuração de impressora térmica
 */
export function PrinterSettings() {
  const {
    config,
    isConnected,
    isConnecting,
    isPrinting,
    lastError,
    configurePrinter,
    connect,
    disconnect,
    printTest,
    clearError,
  } = usePrinter();

  const [formData, setFormData] = useState<PrinterConfig>(
    config || {
      type: 'webusb',
      encoding: 'utf-8',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    configurePrinter(formData);
  };

  const handleConnect = async () => {
    await connect();
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  const handleTestPrint = async () => {
    await printTest();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-6">
        <Printer className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Configuração da Impressora</h2>
      </div>

      {/* Status da Conexão */}
      <div className="mb-6 p-4 rounded-lg border-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
              }`}
            />
            <span className="font-medium">
              {isConnected ? 'Conectada' : 'Desconectada'}
            </span>
          </div>

          <div className="flex gap-2">
            {!isConnected ? (
              <button
                onClick={handleConnect}
                disabled={isConnecting || !config}
                className="
                  px-4 py-2 bg-blue-600 hover:bg-blue-700
                  text-white rounded-lg text-sm font-medium
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors
                "
              >
                {isConnecting ? 'Conectando...' : 'Conectar'}
              </button>
            ) : (
              <>
                <button
                  onClick={handleTestPrint}
                  disabled={isPrinting}
                  className="
                    px-4 py-2 bg-green-600 hover:bg-green-700
                    text-white rounded-lg text-sm font-medium
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors
                  "
                >
                  {isPrinting ? 'Imprimindo...' : 'Teste'}
                </button>
                <button
                  onClick={handleDisconnect}
                  className="
                    px-4 py-2 bg-red-600 hover:bg-red-700
                    text-white rounded-lg text-sm font-medium
                    transition-colors
                  "
                >
                  Desconectar
                </button>
              </>
            )}
          </div>
        </div>

        {lastError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2">
            <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800">{lastError}</p>
            </div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Formulário de Configuração */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tipo de Conexão */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Conexão
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'webusb' })}
              className={`
                p-4 rounded-lg border-2 text-center transition-all
                ${
                  formData.type === 'webusb'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <Usb className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm font-medium">WebUSB</span>
              <p className="text-xs text-gray-500 mt-1">
                USB direto (Chrome/Edge)
              </p>
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'network' })}
              className={`
                p-4 rounded-lg border-2 text-center transition-all
                ${
                  formData.type === 'network'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <Wifi className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm font-medium">Rede</span>
              <p className="text-xs text-gray-500 mt-1">
                IP da impressora
              </p>
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'local-server' })}
              className={`
                p-4 rounded-lg border-2 text-center transition-all
                ${
                  formData.type === 'local-server'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <Server className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm font-medium">Servidor</span>
              <p className="text-xs text-gray-500 mt-1">
                Servidor local
              </p>
            </button>
          </div>
        </div>

        {/* Configurações específicas de Rede */}
        {formData.type === 'network' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endereço IP
              </label>
              <input
                type="text"
                value={formData.ipAddress || ''}
                onChange={(e) =>
                  setFormData({ ...formData, ipAddress: e.target.value })
                }
                placeholder="192.168.1.100"
                className="
                  w-full px-4 py-2 border border-gray-300 rounded-lg
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent
                "
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Porta
              </label>
              <input
                type="number"
                value={formData.port || 9100}
                onChange={(e) =>
                  setFormData({ ...formData, port: parseInt(e.target.value) })
                }
                placeholder="9100"
                className="
                  w-full px-4 py-2 border border-gray-300 rounded-lg
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent
                "
              />
            </div>
          </div>
        )}

        {/* Configurações específicas de Servidor Local */}
        {formData.type === 'local-server' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL do Servidor
            </label>
            <input
              type="text"
              value={formData.serverUrl || ''}
              onChange={(e) =>
                setFormData({ ...formData, serverUrl: e.target.value })
              }
              placeholder="http://localhost:9100/print"
              className="
                w-full px-4 py-2 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
              "
            />
            <p className="mt-2 text-sm text-gray-500">
              💡 Servidor local necessário. Veja documentação para instalação.
            </p>
          </div>
        )}

        {/* Nome do Dispositivo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome do Dispositivo (opcional)
          </label>
          <input
            type="text"
            value={formData.deviceName || ''}
            onChange={(e) =>
              setFormData({ ...formData, deviceName: e.target.value })
            }
            placeholder="Impressora PDV"
            className="
              w-full px-4 py-2 border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
            "
          />
        </div>

        {/* Botão Salvar */}
        <button
          type="submit"
          className="
            w-full flex items-center justify-center gap-2
            px-6 py-3 bg-blue-600 hover:bg-blue-700
            text-white rounded-lg font-medium
            transition-colors
          "
        >
          <Check className="w-5 h-5" />
          Salvar Configuração
        </button>
      </form>

      {/* Informações */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">
          📋 Impressoras Suportadas
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Epson TM-T20, TM-T88</li>
          <li>• Bematech MP-4200, MP-100</li>
          <li>• Elgin i7, i9</li>
          <li>• Qualquer impressora compatível com ESC/POS</li>
        </ul>
      </div>
    </div>
  );
}
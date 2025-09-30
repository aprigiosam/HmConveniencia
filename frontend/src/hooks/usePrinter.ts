import { useState, useCallback, useEffect } from 'react';
import { getPrinter, resetPrinter, PrinterConfig, Receipt, ThermalPrinter } from '../utils/printer';
import toast from 'react-hot-toast';

export interface PrinterState {
  isConnected: boolean;
  isConnecting: boolean;
  isPrinting: boolean;
  lastError: string | null;
  config: PrinterConfig | null;
}

/**
 * Hook para gerenciar impressora térmica
 */
export function usePrinter() {
  const [state, setState] = useState<PrinterState>({
    isConnected: false,
    isConnecting: false,
    isPrinting: false,
    lastError: null,
    config: null,
  });

  // Carrega configuração do localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('printer-config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig) as PrinterConfig;
        setState((prev) => ({ ...prev, config }));
      } catch (error) {
        console.error('Erro ao carregar configuração da impressora:', error);
      }
    }
  }, []);

  /**
   * Configura a impressora
   */
  const configurePrinter = useCallback((config: PrinterConfig) => {
    setState((prev) => ({ ...prev, config }));
    localStorage.setItem('printer-config', JSON.stringify(config));
    resetPrinter();
    toast.success('Configuração da impressora salva!');
  }, []);

  /**
   * Conecta à impressora
   */
  const connect = useCallback(async () => {
    if (!state.config) {
      toast.error('Configure a impressora antes de conectar');
      return false;
    }

    setState((prev) => ({ ...prev, isConnecting: true, lastError: null }));

    try {
      const printer = getPrinter(state.config);

      if (state.config.type === 'webusb') {
        await printer.connectWebUSB();
      }

      setState((prev) => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
      }));

      toast.success('Impressora conectada com sucesso!');
      return true;
    } catch (error: any) {
      const errorMessage = error.message || 'Erro ao conectar impressora';
      setState((prev) => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        lastError: errorMessage,
      }));

      toast.error(errorMessage);
      return false;
    }
  }, [state.config]);

  /**
   * Desconecta da impressora
   */
  const disconnect = useCallback(async () => {
    try {
      if (state.config) {
        const printer = getPrinter(state.config);
        await printer.disconnect();
      }

      setState((prev) => ({
        ...prev,
        isConnected: false,
      }));

      toast.success('Impressora desconectada');
    } catch (error: any) {
      console.error('Erro ao desconectar:', error);
      toast.error('Erro ao desconectar impressora');
    }
  }, [state.config]);

  /**
   * Imprime um cupom
   */
  const printReceipt = useCallback(
    async (receipt: Receipt) => {
      if (!state.config) {
        toast.error('Configure a impressora primeiro');
        return false;
      }

      setState((prev) => ({ ...prev, isPrinting: true, lastError: null }));

      try {
        const printer = getPrinter(state.config);

        // Se não estiver conectado via WebUSB, tenta conectar
        if (state.config.type === 'webusb' && !state.isConnected) {
          await printer.connectWebUSB();
          setState((prev) => ({ ...prev, isConnected: true }));
        }

        await printer.printReceipt(receipt);

        setState((prev) => ({ ...prev, isPrinting: false }));
        toast.success('Cupom impresso com sucesso!');
        return true;
      } catch (error: any) {
        const errorMessage = error.message || 'Erro ao imprimir cupom';
        setState((prev) => ({
          ...prev,
          isPrinting: false,
          lastError: errorMessage,
        }));

        toast.error(errorMessage);
        return false;
      }
    },
    [state.config, state.isConnected]
  );

  /**
   * Teste de impressão
   */
  const printTest = useCallback(async () => {
    if (!state.config) {
      toast.error('Configure a impressora primeiro');
      return false;
    }

    setState((prev) => ({ ...prev, isPrinting: true, lastError: null }));

    try {
      const printer = getPrinter(state.config);

      if (state.config.type === 'webusb' && !state.isConnected) {
        await printer.connectWebUSB();
        setState((prev) => ({ ...prev, isConnected: true }));
      }

      await printer.printTest();

      setState((prev) => ({ ...prev, isPrinting: false }));
      toast.success('Teste de impressão enviado!');
      return true;
    } catch (error: any) {
      const errorMessage = error.message || 'Erro ao imprimir teste';
      setState((prev) => ({
        ...prev,
        isPrinting: false,
        lastError: errorMessage,
      }));

      toast.error(errorMessage);
      return false;
    }
  }, [state.config, state.isConnected]);

  /**
   * Limpa erros
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, lastError: null }));
  }, []);

  return {
    ...state,
    configurePrinter,
    connect,
    disconnect,
    printReceipt,
    printTest,
    clearError,
  };
}
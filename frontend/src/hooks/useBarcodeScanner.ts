import { useEffect, useRef, useCallback } from "react";

type UseBarcodeScannerOptions = {
  enabled?: boolean;
  minLength?: number;
  maxLength?: number;
  onScan: (code: string) => void;
  timeout?: number;
  prefix?: string; // Prefixo opcional do scanner
  suffix?: string; // Sufixo opcional (padrão: Enter)
  ignoreInputs?: boolean; // Se deve ignorar quando foco está em inputs
};

const isCharacterKey = (event: KeyboardEvent) => {
  if (event.key.length === 1) {
    return true;
  }
  return false;
};

const shouldIgnoreEvent = (event: KeyboardEvent, ignoreInputs: boolean): boolean => {
  if (!ignoreInputs) return false;

  const target = event.target as HTMLElement;
  const tagName = target.tagName;

  // Ignora se estiver em input/textarea, exceto se marcado com data-allow-scanner
  if (
    (tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable) &&
    !target.hasAttribute('data-allow-scanner')
  ) {
    return true;
  }

  return false;
};

/**
 * Captura entradas rápidas vindas de leitores de código de barras que simulam teclado.
 *
 * Melhorias FASE 2:
 * - Suporte a prefixo/sufixo configurável
 * - Tamanho máximo
 * - Opção de ignorar inputs
 * - Buffer com limpeza automática
 * - Feedback visual (console log)
 */
export const useBarcodeScanner = ({
  enabled = true,
  minLength = 3,
  maxLength = 50,
  onScan,
  timeout = 100,
  prefix = '',
  suffix = 'Enter',
  ignoreInputs = false,
}: UseBarcodeScannerOptions) => {
  const bufferRef = useRef("");
  const lastTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const processBuffer = useCallback(() => {
    let code = bufferRef.current.trim();

    // Remove prefixo se configurado
    if (prefix && code.startsWith(prefix)) {
      code = code.substring(prefix.length);
    }

    // Valida tamanho
    if (code.length >= minLength && code.length <= maxLength) {
      console.log('📟 Código de barras escaneado:', code);
      onScan(code);
    } else {
      console.warn('📟 Código ignorado (tamanho inválido):', code);
    }

    // Limpa buffer
    bufferRef.current = "";
  }, [minLength, maxLength, onScan, prefix]);

  const clearBuffer = useCallback(() => {
    bufferRef.current = "";
    lastTimeRef.current = 0;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      clearBuffer();
      return () => {};
    }

    const handleKeydown = (event: KeyboardEvent) => {
      // Ignora se necessário
      if (shouldIgnoreEvent(event, ignoreInputs)) {
        return;
      }

      const now = Date.now();
      const timeSinceLast = now - lastTimeRef.current;

      // Limpa buffer se passou muito tempo (provavelmente digitação manual)
      if (timeSinceLast > timeout && bufferRef.current.length > 0) {
        bufferRef.current = "";
      }

      // Detecta sufixo (Enter por padrão)
      if (event.key === suffix || event.key === "Enter" || event.key === "NumpadEnter") {
        if (bufferRef.current.length >= minLength) {
          event.preventDefault(); // Previne ação padrão do Enter
          processBuffer();
        }
        clearBuffer();
        return;
      }

      // Ignora teclas especiais
      if (!isCharacterKey(event)) {
        return;
      }

      // Adiciona caractere ao buffer
      bufferRef.current += event.key;
      lastTimeRef.current = now;

      // Auto-processa se atingir tamanho máximo
      if (bufferRef.current.length >= maxLength) {
        processBuffer();
        return;
      }

      // Timer de segurança para auto-processar
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        if (bufferRef.current.length >= minLength) {
          processBuffer();
        }
      }, timeout * 3);
    };

    window.addEventListener("keydown", handleKeydown, true);

    return () => {
      window.removeEventListener("keydown", handleKeydown, true);
      clearBuffer();
    };
  }, [enabled, minLength, maxLength, onScan, timeout, suffix, prefix, ignoreInputs, processBuffer, clearBuffer]);

  return {
    clearBuffer,
  };
};

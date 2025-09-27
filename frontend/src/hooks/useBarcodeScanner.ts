import { useEffect, useRef } from "react";

type UseBarcodeScannerOptions = {
  enabled?: boolean;
  minLength?: number;
  onScan: (code: string) => void;
  timeout?: number;
};

const isCharacterKey = (event: KeyboardEvent) => {
  if (event.key.length === 1) {
    return true;
  }
  return false;
};

/**
 * Captura entradas rápidas vindas de leitores de código de barras que simulam teclado.
 */
export const useBarcodeScanner = ({
  enabled = true,
  minLength = 3,
  onScan,
  timeout = 100,
}: UseBarcodeScannerOptions) => {
  const bufferRef = useRef("");
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      bufferRef.current = "";
      return () => {};
    }

    const handleKeydown = (event: KeyboardEvent) => {
      const now = Date.now();
      const timeSinceLast = now - lastTimeRef.current;

      if (timeSinceLast > timeout) {
        bufferRef.current = "";
      }

      if (event.key === "Enter" || event.key === "NumpadEnter") {
        if (bufferRef.current.length >= minLength) {
          onScan(bufferRef.current);
        }
        bufferRef.current = "";
        lastTimeRef.current = 0;
        return;
      }

      if (!isCharacterKey(event)) {
        return;
      }

      bufferRef.current += event.key;
      lastTimeRef.current = now;
    };

    window.addEventListener("keydown", handleKeydown, true);

    return () => {
      window.removeEventListener("keydown", handleKeydown, true);
    };
  }, [enabled, minLength, onScan, timeout]);
};

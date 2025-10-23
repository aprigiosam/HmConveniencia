import { useEffect, useRef } from 'react';

/**
 * Hook para detectar gestos de swipe (deslizar)
 * @param {Object} options - Configurações do swipe
 * @param {Function} options.onSwipeLeft - Callback quando deslizar para esquerda
 * @param {Function} options.onSwipeRight - Callback quando deslizar para direita
 * @param {number} options.minSwipeDistance - Distância mínima para considerar swipe (padrão: 50px)
 * @param {number} options.maxVerticalDistance - Distância vertical máxima para swipe horizontal (padrão: 100px)
 */
export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  minSwipeDistance = 50,
  maxVerticalDistance = 100,
} = {}) {
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const touchEndX = useRef(null);
  const touchEndY = useRef(null);

  useEffect(() => {
    const handleTouchStart = (e) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      touchEndX.current = e.touches[0].clientX;
      touchEndY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = () => {
      if (
        touchStartX.current === null ||
        touchStartY.current === null ||
        touchEndX.current === null ||
        touchEndY.current === null
      ) {
        return;
      }

      const deltaX = touchEndX.current - touchStartX.current;
      const deltaY = touchEndY.current - touchStartY.current;

      // Verifica se o movimento vertical não foi muito grande
      if (Math.abs(deltaY) > maxVerticalDistance) {
        // Reset
        touchStartX.current = null;
        touchStartY.current = null;
        touchEndX.current = null;
        touchEndY.current = null;
        return;
      }

      // Swipe para esquerda
      if (deltaX < -minSwipeDistance && onSwipeLeft) {
        onSwipeLeft();
      }

      // Swipe para direita
      if (deltaX > minSwipeDistance && onSwipeRight) {
        onSwipeRight();
      }

      // Reset
      touchStartX.current = null;
      touchStartY.current = null;
      touchEndX.current = null;
      touchEndY.current = null;
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, minSwipeDistance, maxVerticalDistance]);
}

/**
 * Hook para detectar swipe especificamente na borda da tela
 * Útil para abrir menu lateral deslizando da borda
 */
export function useEdgeSwipe({ onSwipeFromLeft, edgeWidth = 30 } = {}) {
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  useEffect(() => {
    const handleTouchStart = (e) => {
      const touch = e.touches[0];

      // Verifica se o toque começou na borda esquerda
      if (touch.clientX <= edgeWidth) {
        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (touchStartX.current === null) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = Math.abs(touch.clientY - touchStartY.current);

      // Se deslizou para direita com movimento majoritariamente horizontal
      if (deltaX > 50 && deltaY < 100) {
        if (onSwipeFromLeft) {
          onSwipeFromLeft();
        }
        touchStartX.current = null;
        touchStartY.current = null;
      }
    };

    const handleTouchEnd = () => {
      touchStartX.current = null;
      touchStartY.current = null;
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeFromLeft, edgeWidth]);
}

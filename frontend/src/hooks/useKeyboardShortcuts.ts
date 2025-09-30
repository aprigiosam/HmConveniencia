/**
 * Hook para gerenciar atalhos de teclado globais do sistema
 * Suporta combinações com Ctrl, Alt, Shift
 */

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
  disabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  ignoreInputs?: boolean; // Ignora quando focus está em inputs
}

/**
 * Hook para registrar atalhos de teclado
 *
 * @example
 * useKeyboardShortcuts([
 *   { key: 'F1', description: 'Ajuda', action: () => showHelp() },
 *   { key: 'n', ctrl: true, description: 'Nova venda', action: () => newSale() },
 *   { key: 's', ctrl: true, shift: true, description: 'Salvar rascunho', action: () => saveDraft() }
 * ]);
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const {
    enabled = true,
    preventDefault = true,
    ignoreInputs = true,
  } = options;

  const shortcutsRef = useRef(shortcuts);

  // Atualiza ref quando shortcuts mudam
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignora se focus está em input/textarea/select
      if (ignoreInputs) {
        const target = event.target as HTMLElement;
        const tagName = target.tagName.toLowerCase();
        const isEditable = target.isContentEditable;

        if (
          tagName === 'input' ||
          tagName === 'textarea' ||
          tagName === 'select' ||
          isEditable
        ) {
          // Exceto se o input tiver data-allow-shortcuts
          if (!target.hasAttribute('data-allow-shortcuts')) {
            return;
          }
        }
      }

      // Procura por atalho correspondente
      const matchedShortcut = shortcutsRef.current.find((shortcut) => {
        if (shortcut.disabled) return false;

        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;

        return keyMatch && ctrlMatch && altMatch && shiftMatch;
      });

      if (matchedShortcut) {
        if (preventDefault) {
          event.preventDefault();
          event.stopPropagation();
        }

        matchedShortcut.action();
      }
    },
    [enabled, preventDefault, ignoreInputs]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

/**
 * Hook para obter mapa de atalhos registrados
 * Útil para exibir lista de atalhos disponíveis
 */
export function useShortcutsMap(shortcuts: KeyboardShortcut[]): Map<string, KeyboardShortcut> {
  const map = new Map<string, KeyboardShortcut>();

  shortcuts.forEach((shortcut) => {
    const key = formatShortcutKey(shortcut);
    map.set(key, shortcut);
  });

  return map;
}

/**
 * Formata atalho para exibição
 * Ex: Ctrl+Shift+S
 */
export function formatShortcutKey(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.shift) parts.push('Shift');

  // Formata a tecla
  let key = shortcut.key;
  if (key.length === 1) {
    key = key.toUpperCase();
  } else if (key.startsWith('F') && !isNaN(Number(key.slice(1)))) {
    // Teclas F1-F12
    key = key.toUpperCase();
  } else {
    // Outras teclas especiais
    key = key.charAt(0).toUpperCase() + key.slice(1);
  }

  parts.push(key);

  return parts.join('+');
}

/**
 * Componente helper para exibir lista de atalhos
 */
export function getShortcutsList(shortcuts: KeyboardShortcut[]): Array<{
  key: string;
  description: string;
  disabled: boolean;
}> {
  return shortcuts
    .filter(s => !s.disabled)
    .map((shortcut) => ({
      key: formatShortcutKey(shortcut),
      description: shortcut.description,
      disabled: shortcut.disabled || false,
    }));
}

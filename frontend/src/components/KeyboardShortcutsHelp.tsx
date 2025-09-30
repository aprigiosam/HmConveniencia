/**
 * Componente para exibir ajuda de atalhos de teclado
 * Modal acionado por F1 ou ?
 */

import { useState, useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';
import { useKeyboardShortcuts, getShortcutsList, KeyboardShortcut } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[];
  isOpen?: boolean;
  onClose?: () => void;
}

export function KeyboardShortcutsHelp({ shortcuts, isOpen, onClose }: KeyboardShortcutsHelpProps) {
  const [open, setOpen] = useState(isOpen || false);

  useEffect(() => {
    if (isOpen !== undefined) {
      setOpen(isOpen);
    }
  }, [isOpen]);

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  // Agrupa atalhos por categoria (baseado no primeiro palavra da descrição)
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    // Tenta identificar categoria pela descrição
    let category = 'Geral';

    if (shortcut.description.toLowerCase().includes('nova') ||
        shortcut.description.toLowerCase().includes('criar')) {
      category = 'Ações';
    } else if (shortcut.description.toLowerCase().includes('busca') ||
               shortcut.description.toLowerCase().includes('pesquisa')) {
      category = 'Navegação';
    } else if (shortcut.description.toLowerCase().includes('salvar') ||
               shortcut.description.toLowerCase().includes('finalizar')) {
      category = 'Operações';
    } else if (shortcut.description.toLowerCase().includes('relatório') ||
               shortcut.description.toLowerCase().includes('fechar caixa')) {
      category = 'Relatórios';
    }

    if (!acc[category]) {
      acc[category] = [];
    }

    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Keyboard className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Atalhos de Teclado</h2>
                <p className="text-blue-100 text-sm">Aumente sua produtividade</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Fechar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">
                {category}
              </h3>
              <div className="space-y-2">
                {getShortcutsList(categoryShortcuts).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-lg"
                  >
                    <span className="text-gray-700">{item.description}</span>
                    <kbd className="px-3 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono font-semibold text-gray-800 shadow-sm">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Rodapé */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <p className="text-sm text-gray-600 text-center">
            Pressione <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono font-semibold">F1</kbd> ou{' '}
            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono font-semibold">?</kbd> a qualquer momento para ver esta ajuda
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Componente standalone que adiciona atalho F1 automaticamente
 */
export function KeyboardShortcutsHelpButton({ shortcuts }: { shortcuts: KeyboardShortcut[] }) {
  const [isOpen, setIsOpen] = useState(false);

  // Adiciona F1 e ? como atalhos para abrir ajuda
  useKeyboardShortcuts([
    {
      key: 'F1',
      description: 'Abrir ajuda de atalhos',
      action: () => setIsOpen(true),
    },
    {
      key: '?',
      shift: true,
      description: 'Abrir ajuda de atalhos',
      action: () => setIsOpen(true),
    },
  ]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-colors z-40"
        title="Atalhos de teclado (F1)"
      >
        <Keyboard className="w-5 h-5" />
      </button>

      <KeyboardShortcutsHelp
        shortcuts={shortcuts}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
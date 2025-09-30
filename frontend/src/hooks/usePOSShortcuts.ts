/**
 * Hook com atalhos específicos do PDV
 * Centraliza todos os atalhos de teclado do sistema de vendas
 */

import { useKeyboardShortcuts, KeyboardShortcut } from './useKeyboardShortcuts';

interface UsePOSShortcutsOptions {
  onNewSale?: () => void;
  onSearchProduct?: () => void;
  onFinalizeSale?: () => void;
  onCancelSale?: () => void;
  onOpenCashDrawer?: () => void;
  onPrintLastReceipt?: () => void;
  onAddDiscount?: () => void;
  onRemoveLastItem?: () => void;
  onOpenReports?: () => void;
  onCloseCash?: () => void;
  onQuickPay?: (method: string) => void;
  enabled?: boolean;
}

/**
 * Hook que registra todos os atalhos do PDV
 * Baseado nos atalhos do Odoo POS
 */
export function usePOSShortcuts(options: UsePOSShortcutsOptions) {
  const {
    onNewSale,
    onSearchProduct,
    onFinalizeSale,
    onCancelSale,
    onOpenCashDrawer,
    onPrintLastReceipt,
    onAddDiscount,
    onRemoveLastItem,
    onOpenReports,
    onCloseCash,
    onQuickPay,
    enabled = true,
  } = options;

  const shortcuts: KeyboardShortcut[] = [
    // Ações principais
    {
      key: 'n',
      ctrl: true,
      description: 'Nova venda',
      action: () => onNewSale?.(),
      disabled: !onNewSale,
    },
    {
      key: 'f',
      ctrl: true,
      description: 'Buscar produto',
      action: () => onSearchProduct?.(),
      disabled: !onSearchProduct,
    },
    {
      key: 'Enter',
      ctrl: true,
      description: 'Finalizar venda',
      action: () => onFinalizeSale?.(),
      disabled: !onFinalizeSale,
    },
    {
      key: 'Escape',
      description: 'Cancelar venda atual',
      action: () => onCancelSale?.(),
      disabled: !onCancelSale,
    },

    // Operações de itens
    {
      key: 'Backspace',
      ctrl: true,
      description: 'Remover último item',
      action: () => onRemoveLastItem?.(),
      disabled: !onRemoveLastItem,
    },
    {
      key: 'd',
      ctrl: true,
      description: 'Aplicar desconto',
      action: () => onAddDiscount?.(),
      disabled: !onAddDiscount,
    },

    // Pagamentos rápidos
    {
      key: 'F2',
      description: 'Pagamento em Dinheiro',
      action: () => onQuickPay?.('dinheiro'),
      disabled: !onQuickPay,
    },
    {
      key: 'F3',
      description: 'Pagamento em Cartão Débito',
      action: () => onQuickPay?.('debito'),
      disabled: !onQuickPay,
    },
    {
      key: 'F4',
      description: 'Pagamento em Cartão Crédito',
      action: () => onQuickPay?.('credito'),
      disabled: !onQuickPay,
    },
    {
      key: 'F5',
      description: 'Pagamento em PIX',
      action: () => onQuickPay?.('pix'),
      disabled: !onQuickPay,
    },

    // Caixa e relatórios
    {
      key: 'F6',
      description: 'Abrir gaveta de dinheiro',
      action: () => onOpenCashDrawer?.(),
      disabled: !onOpenCashDrawer,
    },
    {
      key: 'F7',
      description: 'Reimprimir último cupom',
      action: () => onPrintLastReceipt?.(),
      disabled: !onPrintLastReceipt,
    },
    {
      key: 'F8',
      description: 'Abrir relatórios',
      action: () => onOpenReports?.(),
      disabled: !onOpenReports,
    },
    {
      key: 'F9',
      description: 'Fechar caixa',
      action: () => onCloseCash?.(),
      disabled: !onCloseCash,
    },

    // Navegação
    {
      key: 'p',
      ctrl: true,
      description: 'Imprimir venda atual',
      action: () => onPrintLastReceipt?.(),
      disabled: !onPrintLastReceipt,
    },
  ];

  useKeyboardShortcuts(shortcuts, { enabled });

  return shortcuts;
}

/**
 * Atalhos padrão do sistema (sem contexto específico)
 */
export function useGlobalShortcuts(options: {
  onHelp?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
  enabled?: boolean;
}) {
  const { onHelp, onSettings, onLogout, enabled = true } = options;

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'F1',
      description: 'Ajuda',
      action: () => onHelp?.(),
      disabled: !onHelp,
    },
    {
      key: ',',
      ctrl: true,
      description: 'Configurações',
      action: () => onSettings?.(),
      disabled: !onSettings,
    },
    {
      key: 'q',
      ctrl: true,
      shift: true,
      description: 'Sair',
      action: () => onLogout?.(),
      disabled: !onLogout,
    },
  ];

  useKeyboardShortcuts(shortcuts, { enabled });

  return shortcuts;
}
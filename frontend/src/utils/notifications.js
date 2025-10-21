/**
 * Gerenciamento de notificações push
 */

class NotificationManager {
  constructor() {
    this.permission = 'default';
  }

  /**
   * Verifica se notificações são suportadas
   */
  isSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Solicita permissão para enviar notificações
   */
  async requestPermission() {
    if (!this.isSupported()) {
      console.warn('[Notifications] Notificações não suportadas neste navegador');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('[Notifications] Erro ao solicitar permissão:', error);
      return false;
    }
  }

  /**
   * Envia uma notificação local
   */
  async send(title, options = {}) {
    if (!this.isSupported()) {
      console.warn('[Notifications] Notificações não suportadas');
      return null;
    }

    // Solicita permissão se ainda não foi concedida
    if (Notification.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn('[Notifications] Permissão negada pelo usuário');
        return null;
      }
    }

    const defaultOptions = {
      icon: '/logo.jpeg',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'hmconv-notification',
      requireInteraction: false,
      ...options
    };

    try {
      // Usa Service Worker se disponível
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        return await registration.showNotification(title, defaultOptions);
      } else {
        // Fallback para notificação direta
        return new Notification(title, defaultOptions);
      }
    } catch (error) {
      console.error('[Notifications] Erro ao enviar notificação:', error);
      return null;
    }
  }

  /**
   * Notifica sobre produto com estoque baixo
   */
  async notifyLowStock(produto) {
    return await this.send('⚠️ Estoque Baixo', {
      body: `${produto.nome} está com apenas ${produto.quantidade} unidades`,
      tag: `low-stock-${produto.id}`,
      data: { type: 'low_stock', produto_id: produto.id, url: '/produtos' },
      actions: [
        { action: 'view', title: 'Ver Produto' },
        { action: 'dismiss', title: 'Dispensar' }
      ]
    });
  }

  /**
   * Notifica sobre produto vencido ou próximo ao vencimento
   */
  async notifyExpiring(produto, diasRestantes) {
    const urgencia = diasRestantes <= 0 ? 'Vencido' : `Vence em ${diasRestantes} dias`;
    return await this.send(`⚠️ ${urgencia}`, {
      body: `${produto.nome} - ${urgencia}`,
      tag: `expiring-${produto.id}`,
      data: { type: 'expiring', produto_id: produto.id, url: '/produtos' },
      requireInteraction: diasRestantes <= 0, // Requer ação se já venceu
      actions: [
        { action: 'view', title: 'Ver Produto' },
        { action: 'dismiss', title: 'Dispensar' }
      ]
    });
  }

  /**
   * Notifica sobre conta a receber vencida
   */
  async notifyOverdueAccount(cliente, valor, diasAtrasados) {
    return await this.send('💰 Conta Vencida', {
      body: `${cliente} - R$ ${valor.toFixed(2)} (${diasAtrasados} dias de atraso)`,
      tag: `overdue-${cliente}`,
      data: { type: 'overdue_account', cliente, url: '/contas-receber' },
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'Ver Contas' },
        { action: 'dismiss', title: 'Dispensar' }
      ]
    });
  }

  /**
   * Notifica quando vendas offline forem sincronizadas
   */
  async notifySyncCompleted(quantidade) {
    return await this.send('✅ Sincronização Completa', {
      body: `${quantidade} venda(s) sincronizada(s) com sucesso`,
      tag: 'sync-completed',
      data: { type: 'sync_completed' },
      requireInteraction: false
    });
  }

  /**
   * Notifica sobre erro na sincronização
   */
  async notifySyncError(quantidade) {
    return await this.send('❌ Erro na Sincronização', {
      body: `Falha ao sincronizar ${quantidade} venda(s). Tentaremos novamente.`,
      tag: 'sync-error',
      data: { type: 'sync_error' },
      requireInteraction: true,
      actions: [
        { action: 'retry', title: 'Tentar Novamente' },
        { action: 'dismiss', title: 'Fechar' }
      ]
    });
  }

  /**
   * Notifica sobre abertura/fechamento de caixa
   */
  async notifyCaixa(tipo, valor = null) {
    const messages = {
      abertura: { title: '🟢 Caixa Aberto', body: `Caixa aberto com R$ ${valor?.toFixed(2) || '0.00'}` },
      fechamento: { title: '🔴 Caixa Fechado', body: `Caixa fechado. Total: R$ ${valor?.toFixed(2) || '0.00'}` }
    };

    const msg = messages[tipo] || { title: 'Caixa', body: 'Atualização de caixa' };

    return await this.send(msg.title, {
      body: msg.body,
      tag: `caixa-${tipo}`,
      data: { type: `caixa_${tipo}`, url: '/caixa' }
    });
  }
}

export const notificationManager = new NotificationManager();

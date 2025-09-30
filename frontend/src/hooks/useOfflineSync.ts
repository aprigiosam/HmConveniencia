import { useEffect, useState, useCallback } from 'react';
import { dbManager, PendingSale } from '../utils/indexedDB';
import api from '../services/api';
import toast from 'react-hot-toast';

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSync: Date | null;
  error: string | null;
}

/**
 * Hook para gerenciar sincronização offline/online
 * Monitora status de conexão e sincroniza vendas pendentes
 */
export function useOfflineSync() {
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: 0,
    lastSync: null,
    error: null,
  });

  // Atualiza contador de vendas pendentes
  const updatePendingCount = useCallback(async () => {
    try {
      const pendingSales = await dbManager.getPendingSales();
      setSyncState((prev) => ({
        ...prev,
        pendingCount: pendingSales.filter((s) => !s.synced).length,
      }));
    } catch (error) {
      console.error('Erro ao contar vendas pendentes:', error);
    }
  }, []);

  // Sincroniza vendas pendentes com o servidor
  const syncPendingSales = useCallback(async () => {
    if (!navigator.onLine) {
      console.log('Offline - aguardando conexão para sincronizar');
      return;
    }

    setSyncState((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      const pendingSales = await dbManager.getPendingSales();
      const unsyncedSales = pendingSales.filter((s) => !s.synced);

      if (unsyncedSales.length === 0) {
        console.log('Nenhuma venda pendente para sincronizar');
        setSyncState((prev) => ({
          ...prev,
          isSyncing: false,
          lastSync: new Date(),
        }));
        return;
      }

      console.log(`Sincronizando ${unsyncedSales.length} vendas pendentes...`);

      let syncedCount = 0;
      let failedCount = 0;

      for (const sale of unsyncedSales) {
        try {
          // Envia venda para o servidor
          const response = await api.post('/sales/vendas/', sale.data);

          if (response.status >= 200 && response.status < 300) {
            // Remove da fila local após sucesso
            await dbManager.markSaleAsSynced(sale.id);
            syncedCount++;
            console.log(`Venda ${sale.id} sincronizada com sucesso`);
          } else {
            failedCount++;
            console.error(`Falha ao sincronizar venda ${sale.id}:`, response);
          }
        } catch (error: any) {
          failedCount++;
          console.error(`Erro ao sincronizar venda ${sale.id}:`, error);

          // Se erro 4xx (exceto 408 timeout), remover da fila (dados inválidos)
          if (error.response && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 408) {
            console.warn(`Removendo venda ${sale.id} com dados inválidos`);
            await dbManager.markSaleAsSynced(sale.id);
          }
        }
      }

      // Atualiza status de sincronização
      await dbManager.updateSyncStatus({
        lastSync: Date.now(),
        pendingCount: failedCount,
        failedCount,
      });

      // Exibe notificação
      if (syncedCount > 0) {
        toast.success(`${syncedCount} venda(s) sincronizada(s) com sucesso!`, {
          duration: 4000,
          icon: '✅',
        });
      }

      if (failedCount > 0) {
        toast.error(
          `${failedCount} venda(s) falharam na sincronização. Tentaremos novamente.`,
          {
            duration: 5000,
          }
        );
      }

      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        lastSync: new Date(),
        error: failedCount > 0 ? `${failedCount} vendas falharam` : null,
      }));

      // Atualiza contador
      await updatePendingCount();
    } catch (error: any) {
      console.error('Erro durante sincronização:', error);
      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        error: error.message || 'Erro desconhecido durante sincronização',
      }));

      toast.error('Erro ao sincronizar vendas. Tentaremos novamente em breve.', {
        duration: 5000,
      });
    }
  }, [updatePendingCount]);

  // Monitora mudanças de status online/offline
  useEffect(() => {
    const handleOnline = () => {
      console.log('✅ Online - iniciando sincronização');
      setSyncState((prev) => ({ ...prev, isOnline: true, error: null }));
      toast.success('Conexão restabelecida! Sincronizando vendas...', {
        icon: '🌐',
        duration: 3000,
      });
      syncPendingSales();
    };

    const handleOffline = () => {
      console.log('❌ Offline - modo offline ativo');
      setSyncState((prev) => ({ ...prev, isOnline: false }));
      toast.error(
        'Sem conexão! Vendas serão salvas localmente e sincronizadas depois.',
        {
          icon: '📡',
          duration: 4000,
        }
      );
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingSales]);

  // Sincronização periódica (a cada 30 segundos se online)
  useEffect(() => {
    if (!syncState.isOnline) return;

    const interval = setInterval(() => {
      if (navigator.onLine && !syncState.isSyncing) {
        syncPendingSales();
      }
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [syncState.isOnline, syncState.isSyncing, syncPendingSales]);

  // Atualiza contador inicial
  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  return {
    ...syncState,
    syncNow: syncPendingSales,
    updatePendingCount,
  };
}
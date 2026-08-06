import db, { supabase } from "./db";
import { SyncManager } from "../../types/sync/syncManager";
import { syncManagerService } from "./sync";
import { getSyncQueueInstitutionId, groupByTable, processarRegistrosUnicos, cleanRecordForSupabase, processedRecords, removeBatchDuplicates } from "../../utils/syncManagerUtils";

const AUTO_SYNC_INTERVAL_MS = 30000;
const DASHBOARD_ROUTE_PREFIX = '/dashboard';

let autoSyncInitialized = false;
let autoSyncInFlight = false;
let autoSyncInterval: ReturnType<typeof setInterval> | null = null;
let cleanupInterval: ReturnType<typeof setInterval> | null = null;
let integrityInterval: ReturnType<typeof setInterval> | null = null;
let onlineSyncHandler: (() => Promise<void>) | null = null;
let quickSyncHandler: (() => void) | null = null;
let quickSyncTimeout: ReturnType<typeof setTimeout> | null = null;

const getCurrentPathname = () => {
  if (typeof window === 'undefined') return '';
  return window.location.pathname || '';
};

const getLastSyncDateForTable = (tableName: string): Date => {
  const saved = localStorage.getItem(`last_sync_${tableName}`);
  if (!saved) return new Date(0);
  const parsed = new Date(saved);
  return Number.isFinite(parsed.getTime()) ? parsed : new Date(0);
};

const getScopedTablesForRoute = (pathname: string): string[] | null => {
  const path = pathname.toLowerCase();

  if (path.startsWith(DASHBOARD_ROUTE_PREFIX)) return null;
  if (path.startsWith('/alunos')) return ['alunos'];
  if (path.startsWith('/turmas')) return ['turmas'];
  if (path.startsWith('/cursos')) return ['cursos'];
  if (path.startsWith('/aulas')) return ['aulas', 'plano_aulas'];
  if (path.startsWith('/notas')) return ['avaliacoes'];
  if (path.startsWith('/frequencia')) return ['frequencias'];
  if (path.startsWith('/financeiro')) return ['transacoes', 'propina', 'alocacao'];
  if (path.startsWith('/estrategia')) return ['metas', 'tarefas', 'rotinas', 'planeamentos'];

  return [];
};

const runScopedSyncForCurrentRoute = async () => {
  if (autoSyncInFlight || !navigator.onLine) return;

  autoSyncInFlight = true;
  try {
    const pathname = getCurrentPathname();
    const scopedTables = getScopedTablesForRoute(pathname);

    if (scopedTables === null) {
      await syncManager.uploadBatch();
      await syncManager.downloadBatch();
      return;
    }

    if (scopedTables.length === 0) return;

    for (const tableName of scopedTables) {
      await syncManager.uploadTableBatch(tableName);
      await syncManager.downloadTableBatch(tableName, getLastSyncDateForTable(tableName));
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  } catch (error) {
    console.error('❌ Erro na sincronização por rota:', error);
  } finally {
    autoSyncInFlight = false;
  }
};

export const setupAutoSync = () => {
  if (onlineSyncHandler) {
    window.removeEventListener('online', onlineSyncHandler);
  }

  const GHOST_CLEANUP_INTERVAL = 7 * 24 * 60 * 60 * 1000; 

  let ghostCleanupInterval: ReturnType<typeof setInterval> | null = null;

  if (ghostCleanupInterval) {
    clearInterval(ghostCleanupInterval);
  }

  ghostCleanupInterval = setInterval(async () => {
    if (navigator.onLine) {
      console.log('🧹 Executando limpeza programada de dados fantasmas...');
      await syncManager.safeGhostDataCleanup({
        tables: ['alunos', 'turmas', 'cursos', 'aulas', 'frequencias', 'avaliacoes']
      });
    }
  }, GHOST_CLEANUP_INTERVAL);

  
  const onlineHandler = async () => {
    await syncManager.safeGhostDataCleanup({
      tables: ['alunos', 'turmas', 'cursos']
    });
    await runScopedSyncForCurrentRoute();
  };


  onlineSyncHandler = async () => {
    await runScopedSyncForCurrentRoute();
  };
  window.addEventListener('online', onlineSyncHandler);

  if (quickSyncHandler) {
    window.removeEventListener('sync-queue-enqueued', quickSyncHandler);
  }
  quickSyncHandler = () => {
    if (quickSyncTimeout) {
      clearTimeout(quickSyncTimeout);
    }
    quickSyncTimeout = setTimeout(async () => {
      quickSyncTimeout = null;
      await runScopedSyncForCurrentRoute();
    }, 1200);
  };
  window.addEventListener('sync-queue-enqueued', quickSyncHandler);

  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
  }
  autoSyncInterval = setInterval(async () => {
    await runScopedSyncForCurrentRoute();
  }, AUTO_SYNC_INTERVAL_MS);

  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  cleanupInterval = setInterval(async () => {
    await syncManager.cleanupOldItems(24);
    await syncManager.verifyQueueIntegrity();
  }, 24 * 60 * 60 * 1000);

  if (integrityInterval) {
    clearInterval(integrityInterval);
  }
  integrityInterval = setInterval(async () => {
    await syncManager.verifyQueueIntegrity();
  }, 60 * 60 * 1000);

  return {
    stop: () => {
      if (autoSyncInterval) clearInterval(autoSyncInterval);
      if (cleanupInterval) clearInterval(cleanupInterval);
      if (integrityInterval) clearInterval(integrityInterval);
      if (onlineSyncHandler) window.removeEventListener('online', onlineSyncHandler);
      if (quickSyncHandler) window.removeEventListener('sync-queue-enqueued', quickSyncHandler);
      if (quickSyncTimeout) clearTimeout(quickSyncTimeout);
      if (ghostCleanupInterval) clearInterval(ghostCleanupInterval);
      autoSyncInterval = null;
      cleanupInterval = null;
      integrityInterval = null;
      onlineSyncHandler = null;
      quickSyncHandler = null;
      quickSyncTimeout = null;
      autoSyncInitialized = false;
      autoSyncInFlight = false;
    }
  };
};

export const createSyncMonitor = () => {
  let lastStats: any = null;

  return {
    async monitor() {
      const stats = await syncManager.getSyncStats();
      const changed = JSON.stringify(stats) !== JSON.stringify(lastStats);

      if (changed) {
        lastStats = stats;

        
        const event = new CustomEvent('sync-stats-update', { detail: stats });
        window.dispatchEvent(event);
      }

      return stats;
    },

    startMonitoring(intervalMs: number = 5000) {
      const interval = setInterval(() => this.monitor(), intervalMs);
      return () => clearInterval(interval);
    }
  };
};

export const initializeSyncSystem = async () => {
  try {
    if (autoSyncInitialized) {
      return;
    }

    await syncManagerService.migrateLegacyLocalIdMap();

    setupAutoSync();
    autoSyncInitialized = true;

    if (navigator.onLine) {
      await runScopedSyncForCurrentRoute();
    }

    } catch (error) {

    console.error('❌ Erro ao inicializar sistema de sincronização:', error);
  }
}

export const syncManager: SyncManager = {
  ...syncManagerService,


  async checkExistingNotificacao(record: any): Promise<any> {
    try {
      if (record.titulo && record.data_envio && record.destinatario_tipo) {
        const { data, error } = await supabase
          .from('notificacao')
          .select('*')
          .eq('titulo', record.titulo)
          .eq('data_envio', record.data_envio)
          .eq('destinatario_tipo', record.destinatario_tipo)
          .maybeSingle();

        if (!error && data) return data;
      }

      
      if (record.referencia_id) {
        const { data, error } = await supabase
          .from('notificacao')
          .select('*')
          .eq('referencia_id', record.referencia_id)
          .maybeSingle();

        if (!error && data) return data;
      }

      return null;
    } catch (error) {
      console.error('Erro ao verificar notificacao:', error);
      return null;
    }
  },


  async getSyncStats() {
    const instituicaoId = getSyncQueueInstitutionId();
    const allItems = instituicaoId
      ? await db.syncQueue.where('instituicao_id').equals(instituicaoId).toArray()
      : [];

    const stats = {
      total: allItems.length,
      byStatus: allItems.reduce((acc: Record<string, number>, item) => {
        const status = item.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}),
      byTable: allItems.reduce((acc: Record<string, number>, item) => {
        const table = item.table;
        acc[table] = (acc[table] || 0) + 1;
        return acc;
      }, {}),
      pendingInserts: allItems.filter(item =>
        item.status === 'pending' &&
        item.operation === 'upsert' &&
        item.record_id.startsWith('local_')
      ).length,
      pendingUpdates: allItems.filter(item =>
        item.status === 'pending' &&
        item.operation === 'upsert' &&
        !item.record_id.startsWith('local_')
      ).length,
      pendingDeletes: allItems.filter(item =>
        item.status === 'pending' &&
        item.operation === 'delete'
      ).length,
    };

    return stats;
  },

  async cleanupOldItems(maxAgeHours: number = 24) {
    try {
      const instituicaoId = getSyncQueueInstitutionId();
      if (!instituicaoId) return;
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - maxAgeHours);

      const oldItems = await db.syncQueue
        .where('instituicao_id')
        .equals(instituicaoId)
        .filter(item => {
          const itemDate = item.created_at ? new Date(item.created_at) : new Date(0);
          return itemDate < cutoffDate && item.status === 'synced';
        })
        .toArray();

      if (oldItems.length > 0) {
        const ids = oldItems.map(item => item.id!).filter(Boolean);
        await db.syncQueue.bulkDelete(ids);
      }
    } catch (error) {
      console.error('❌ Erro ao limpar itens antigos:', error);
    }
  },
  
  async verifyQueueIntegrity():Promise<any> {
    const issues = [];
    const instituicaoId = getSyncQueueInstitutionId();
    const allItems = instituicaoId
      ? await db.syncQueue.where('instituicao_id').equals(instituicaoId).toArray()
      : [];

    for (const item of allItems) {
      
      if (!item.id) {
        issues.push({ item, problem: 'Sem ID' });
        continue;
      }

      
      if (!item.table) {
        issues.push({ item, problem: 'Sem tabela' });
        continue;
      }

      
      if (!item.record_id) {
        issues.push({ item, problem: 'Sem record_id' });
        continue;
      }

      
      try {
        const tableExists = db.tables.some(t => t.name === item.table);
        if (!tableExists) {
          issues.push({ item, problem: `Tabela "${item.table}" não existe` });
        }
      } catch {
        issues.push({ item, problem: 'Erro ao verificar tabela' });
      }
    }

    if (issues.length > 0) {
      console.warn(`⚠️ Encontrados ${issues.length} problemas de integridade:`, issues);
      return { ok: false, issues };
    }

    return { ok: true, issues: [] };
  },


  async resetSyncQueue() {
    if (!confirm('⚠️ Tem certeza que deseja resetar completamente a fila de sincronização? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await db.syncQueue.clear();
      
      const tables = ['alunos', 'turmas', 'cursos', 'aulas', 'professores', 'transacoes'];
      for (const tableName of tables) {
        const table = db.table(tableName);
        const records = await table.toArray();

        const updates = records.map(record => ({
          ...record,
          sync_status: 'pending'
        }));

        await table.bulkPut(updates);
      }

      } catch (error) {
      console.error('❌ Erro ao resetar syncQueue:', error);
    }
  },

  async forceCleanSyncQueue(tableName?: string) {
    try {
      const instituicaoId = getSyncQueueInstitutionId();
      if (!instituicaoId) return;
      const items = await db.syncQueue
        .where('instituicao_id')
        .equals(instituicaoId)
        .and((item) => !tableName || item.table === tableName)
        .toArray();
      
      const batchSize = 50;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const ids = batch.map(item => item.id!).filter(Boolean);

        if (ids.length > 0) {
          await db.syncQueue.bulkDelete(ids);
          }
      }

      } catch (error) {
      console.error('❌ Erro na limpeza forçada:', error);
    }
  },

  groupByTable,

  processarRegistrosUnicos,

  cleanRecordForSupabase,

  processedRecords,

  removeBatchDuplicates,

  

};
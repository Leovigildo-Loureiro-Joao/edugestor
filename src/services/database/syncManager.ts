import { alunosService, aulaService, frequenciaService, turmaService } from ".";
import { SyncQueueItem } from "../../types/base";
import { avaliacaoService } from "./avaliacao";
import db, { supabase } from "./db";
import { emitDbChanged } from "../../utils/emitPendingSync";
import { instituicaoIdValue, isValidInstituicaoId } from "../../utils/getInsitituicaoID";
import { auditLogService } from "../audit/auditLogService";
import { SyncManager } from "../../types/sync/syncManager";
import { syncManagerService } from "./sync";
import { getSyncQueueInstitutionId, normalizeCourseName } from "../../utils/syncManagerUtils";
import { useSyncAuthInManager } from "../../hooks/useSyncAuthInManager";
import { localIdMapper } from "./sync/localIdMapper";

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

  async prepareInsertRecords(tableName: string, items: SyncQueueItem[]) {
    const records = [];
    const itemsToProcess = [];

    
    const orderedItems = [...items].sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      if (aTime !== bTime) return aTime - bTime;
      return (a.id || 0) - (b.id || 0);
    });
    const latestItemByRecordId = new Map<string, SyncQueueItem>();
    orderedItems.forEach((item) => {
      latestItemByRecordId.set(item.record_id, item);
    });

    const duplicatedQueueItems = orderedItems.filter((item) => {
      const latestItem = latestItemByRecordId.get(item.record_id);
      return latestItem && latestItem.id !== item.id;
    });

    if (duplicatedQueueItems.length > 0) {
      const duplicateIds = duplicatedQueueItems
        .map((item) => item.id)
        .filter((id): id is number => typeof id === 'number');
      if (duplicateIds.length > 0) {
        await db.syncQueue.bulkDelete(duplicateIds);
        console.warn(`⚠️ Removidos ${duplicateIds.length} itens duplicados da fila em ${tableName}`);
      }
    }

    const uniqueItems = Array.from(latestItemByRecordId.values());

    for (const item of uniqueItems) {
      try {
        
        let record = await this.getRecordFromTable(tableName, item.record_id);

        if (!record) {
          console.warn(`🗑️  Registro não encontrado, removendo: ${item.record_id}`);
          await db.syncQueue.delete(item.id!);
          continue;
        }

        const resolvedInsert = localIdMapper.applyLocalIdMappings(tableName, record);
        if (resolvedInsert.changed) {
          try {
            const now = new Date().toISOString();
            await db.table(tableName).update(record.id, {
              ...resolvedInsert.record,
              updated_at: now,
              sync_status: 'pending'
            });
            record = resolvedInsert.record;
          } catch {
            
          }
        }

        if (localIdMapper.hasPendingParent(tableName, record)) {
          continue;
        }

        if (tableName === 'cursos') {
          const instituicaoId = record.instituicao_id || getSyncQueueInstitutionId();
          const nomeKey = normalizeCourseName(record.nome);

          if (nomeKey && instituicaoId) {
            const localMatch = await db.cursos
              .filter(
                (r) =>
                  !r.deleted &&
                  normalizeCourseName(r.nome) === nomeKey &&
                  (r.instituicao_id || '') === instituicaoId
              )
              .first();

            if (
              localMatch &&
              localMatch.id &&
              localMatch.id !== record.id &&
              !String(localMatch.id).startsWith('local_')
            ) {
              await this.convertInsertToUpdate(tableName, item, localMatch.id);
              continue;
            }

            const remoteMatch = await this.checkExistingUniqueConstraint(tableName, {
              nome: record.nome,
              instituicao_id: instituicaoId
            });

            if (remoteMatch?.id && remoteMatch.id !== record.id) {
              await this.convertInsertToUpdate(tableName, item, remoteMatch.id);
              continue;
            }
          }
        }

        
        if (
          tableName === 'propina' &&
          typeof record.transacao_id === 'string' &&
          record.transacao_id.startsWith('local_')
        ){
          continue;
        }

        
        if (record.id && !record.id.toString().startsWith('local_')) {
          await db.syncQueue.delete(item.id!);
          continue;
        }

        
        const cleanRecord = this.cleanRecordForSupabase(record);

        records.push(cleanRecord);
        itemsToProcess.push(item);

      } catch (error:any) {
        console.error(`❌ Erro ao preparar item ${item.id}:`, error);
        await this.markItemAsError(item, error);
      }
    }

    return { records, itemsToProcess };
  }

  , async executeUpsertToSupabase(tableName: string, records: any[]) {
    
    let onConflict = 'id';
     const processedRecords = this.processedRecords(records,tableName);

    
    const uniqueRecords = this.processarRegistrosUnicos(processedRecords, tableName);

    const { data, error } = await supabase
      .from(tableName)
      .upsert(uniqueRecords, { onConflict })
      .select();

    if (error) {
      console.error(`❌ Erro no upsert ${tableName}:`, error);

      
      if (error.code === '42501' || error.code === '23505') {
        const { data: retryData, error: retryError } = await supabase
          .from(tableName)
          .upsert(uniqueRecords)
          .select();

        if (retryError) throw retryError;
        return { data: retryData, error: null };
      }

      throw error;
    }

    return { data, error: null };
  },

  async executeUpdateToSupabase(tableName: string, records: any[],record_id:string) {

    const processedRecords = this.processedRecords(records,tableName);
    
    const uniqueRecords = this.processarRegistrosUnicos(processedRecords, tableName);

    const { data, error } = await supabase
      .from(tableName)
      .update(uniqueRecords)
      .eq('id', record_id)
      .select();

    if (error) {
      console.error(`❌ Erro no update ${tableName}:`, error);

      
      if (error.code === '42501' || error.code === '23505') {
        const { data: retryData, error: retryError } = await supabase
          .from(tableName)
          .upsert(uniqueRecords)
          .select();

        if (retryError) throw retryError;
        return { data: retryData, error: null };
      }

      throw error;
    }

    return { data, error: null };
  },

  async executeDeleteToSupabase(tableName: string, recordId: string) {
    const { data, error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', recordId)
      .select();

    if (error) {
      console.error(`❌ Erro no delete ${tableName}:`, error);
      throw error;
    }

    return { data: data ?? null, error: null };
  },

  async processSuccessResult(tableName: string, items: SyncQueueItem[], supabaseData: any[]) {
    const promises = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const supabaseRecord = supabaseData[i];

      if (!supabaseRecord || !supabaseRecord.id) {
        console.warn(`⚠️ Sem dados retornados para item ${item.record_id}`);
        continue;
      }

      
      promises.push(
        this.updateLocalId(tableName, item.record_id, supabaseRecord.id)
          .catch(err => console.error(`Erro ao atualizar ID:`, err))
      );

      
      if (tableName === 'turmas' || tableName === 'cursos') {
        promises.push(
          this.updateDependentRecords(tableName, supabaseRecord.id, item.record_id)
            .catch((err:any) => console.error(`Erro dependências:`, err))
        );
      }

      
      promises.push(
        db.syncQueue.delete(item.id!)
          .then(() => {
            })
          .catch(async (err) => {
            console.error(`❌ Erro ao remover ${item.id}:`, err);

            
            await db.syncQueue.update(item.id!, {
              status: 'synced',
              error: ""
            }).catch(() => {});
          })
      );
    }

    
    await Promise.allSettled(promises);

  },

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

  async checkExistingUniqueConstraint(tableName: string, record: any): Promise<any> {
    try {
      
      if (tableName === 'system_config' && record.category && record.key_name && record.instituicao_id) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('category', record.category)
          .eq('key_name', record.key_name)
          .eq('instituicao_id', record.instituicao_id)
          .maybeSingle();

        if (!error && data) {
          return data;
        }
      }

      if (tableName === 'cursos' && record.nome && record.instituicao_id) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('nome', record.nome)
          .eq('instituicao_id', record.instituicao_id)
          .maybeSingle();

        if (!error && data) {
          return data;
        }
      }

      
      return null;
    } catch (error) {
      console.error('Erro ao verificar constraint única:', error);
      return null;
    }
  },

  async convertInsertToUpdate(tableName: string, item: SyncQueueItem, existingId: string) {
    try {
      
      await this.updateLocalId(tableName, item.record_id, existingId);

      
      await db.syncQueue.update(item.id!, {
        operation: 'upsert',
        record_id: existingId 
      });

      } catch (error) {
      console.error('Erro ao converter INSERT para UPDATE:', error);
    }
  },

  async processSingleUpdate(tableName: string, item: SyncQueueItem) {
    const { getAuthData } = useSyncAuthInManager();
    const authData = getAuthData();

    try {
      let record = await this.getRecordFromTable(tableName, item.record_id);
      if (!record) {
        await db.syncQueue.delete(item.id!);
        return;
      }

      const resolvedUpdate = localIdMapper.applyLocalIdMappings(tableName, record);
      if (resolvedUpdate.changed) {
        try {
          const now = new Date().toISOString();
          await db.table(tableName).update(record.id, {
            ...resolvedUpdate.record,
            updated_at: now,
            sync_status: 'pending'
          });
          record = resolvedUpdate.record;
        } catch {
          
        }
      }

      if (localIdMapper.hasPendingParent(tableName, record)) {
        return;
      }

      
      const { id, sync_status, deleted, createdAt, updated_at, ...cleanRecord } = record;

      

      const recordWithRLS = {
        ...cleanRecord,
        updated_at: new Date().toISOString(),
        created_at: createdAt || record.created_at || new Date().toISOString(),
        };
      const supabaseResult = await this.executeUpdateToSupabase(tableName, [recordWithRLS], item.record_id);

      if (supabaseResult.error) throw supabaseResult.error;

      
      await this.markAsSynced(tableName, item.record_id);
      await db.syncQueue.delete(item.id!);

      } catch (error) {
      console.error(`❌ Erro atualizando ${tableName} ${item.record_id}:`, error);
      await this.handleSyncError(item, error);
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
  }

};
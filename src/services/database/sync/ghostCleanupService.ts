import { useSyncAuthInManager } from "../../../hooks/useSyncAuthInManager";
import { GhostDataCleanupResult, GhostDataOptions } from "../../../types/sync/syncManager";
import { getSyncQueueInstitutionId } from "../../../utils/syncManagerUtils";
import { auditLogService } from "../../audit/auditLogService";
import db from "../db";
import { conflictResolver } from "./conflictResolver";

export const ghostCleanUpService={
    async cleanupGhostData(options: GhostDataOptions = {}): Promise<GhostDataCleanupResult> {
      const {
        tables = ['alunos', 'turmas', 'cursos', 'aulas', 'frequencias', 'avaliacoes', 'propina', 'transacoes'],
        dryRun = false,
        force = false,
        batchSize = 50,
        excludeTables = ['profiles', 'instituicao', 'system_config'] 
      } = options;
    
      
      if (!navigator.onLine && !force) {
        throw new Error(' Limpeza de dados fantasmas requer conexão online para verificar existência remota');
      }
    
      const { getAuthData } = useSyncAuthInManager();
      const authData = getAuthData();
    
      if (!authData.isAuthenticated && !force) {
        throw new Error(' Limpeza de dados fantasmas requer autenticação');
      }
    
      const instituicaoId = getSyncQueueInstitutionId();
      const startTime = Date.now();
    
      const result: GhostDataCleanupResult = {
        totalScanned: 0,
        ghostsFound: 0,
        ghostsRemoved: 0,
        byTable: {},
        errors: [],
        timestamp: new Date().toISOString()
      };
    
      
      const tablesToProcess = tables.filter(table => !excludeTables.includes(table));
    
      for (const tableName of tablesToProcess) {
        try {
          
          const tableExists = db.tables.some(t => t.name === tableName);
          if (!tableExists) continue;
    
          const table = db.table<any>(tableName);
    
          
          const localRecords = await table
            .filter(record =>
              record.sync_status === 'synced' &&
              !String(record.id || '').startsWith('local_') &&
              !record.deleted &&
              (tableName === 'profiles' || tableName === 'instituicao' || !instituicaoId || record.instituicao_id === instituicaoId)
            )
            .toArray();
    
          if (localRecords.length === 0) {
            result.byTable[tableName] = { found: 0, removed: 0 };
            continue;
          }
    
          result.totalScanned += localRecords.length;
    
          
          const ghostsInTable: string[] = [];
    
          for (let i = 0; i < localRecords.length; i += batchSize) {
            const batch = localRecords.slice(i, i + batchSize);
    
            
            const existenceChecks = await Promise.allSettled(
              batch.map(async (record) => {
                try {
                  const exists = await conflictResolver.checkRemoteExistence(tableName, record.id);
                  return { recordId: record.id, exists };
                } catch (error) {
                  return {
                    recordId: record.id,
                    exists: false,
                    error: error instanceof Error ? error.message : String(error)
                  };
                }
              })
            );
    
            
            for (const check of existenceChecks) {
              if (check.status === 'fulfilled') {
                if (!check.value.exists) {
                  ghostsInTable.push(check.value.recordId);
                }
              } else {
                
                result.errors.push({
                  table: tableName,
                  recordId: 'unknown',
                  error: check.reason?.message || 'Erro na verificação'
                });
              }
            }
    
            
            if (i + batchSize < localRecords.length) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
    
          
          result.byTable[tableName] = {
            found: ghostsInTable.length,
            removed: 0
          };
    
          result.ghostsFound += ghostsInTable.length;
    
          
          if (!dryRun && ghostsInTable.length > 0) {
            const removedCount = await this.removeGhostRecords(tableName, ghostsInTable);
            result.byTable[tableName].removed = removedCount;
            result.ghostsRemoved += removedCount;
          }
    
        } catch (error) {
          console.error(`❌ Erro ao processar tabela ${tableName}:`, error);
          result.errors.push({
            table: tableName,
            recordId: 'batch_error',
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    
      
      const executionTime = Date.now() - startTime;
      await auditLogService.log('GHOST_DATA_CLEANUP', {
        ...result,
        executionTimeMs: executionTime,
        dryRun,
        force,
        online: navigator.onLine
      });
    
      
      if (!dryRun && result.ghostsRemoved > 0) {
        const event = new CustomEvent('ghost-data-cleanup', {
          detail: {
            count: result.ghostsRemoved,
            tables: Object.entries(result.byTable)
              .filter(([_, stats]) => stats.removed > 0)
              .map(([table, stats]) => `${table}: ${stats.removed}`)
          }
        });
        window.dispatchEvent(event);
      }
    
      return result;
    },

    async removeGhostRecords(tableName: string, recordIds: string[]): Promise<number> {
      if (recordIds.length === 0) return 0;
    
      try {
        const table = db.table<any>(tableName);
        const instituicaoId = getSyncQueueInstitutionId();
    
        
        
        const recordsToDelete: string[] = [];
    
        for (const recordId of recordIds) {
          const record = await table.get(recordId);
    
          
          if (record &&
              record.sync_status === 'synced' &&
              !String(record.id).startsWith('local_') &&
              (!instituicaoId || record.instituicao_id === instituicaoId)) {
    
            
            const stillMissing = !(await conflictResolver.checkRemoteExistence(tableName, recordId));
    
            if (stillMissing) {
              recordsToDelete.push(recordId);
            }
          }
        }
    
        if (recordsToDelete.length === 0) return 0;
    
        
        await db.transaction('rw', table, db.syncQueue, async () => {
          
          await table.bulkDelete(recordsToDelete);
    
          
          await db.syncQueue
            .where('table')
            .equals(tableName as any)
            .filter(item => recordsToDelete.includes(item.record_id))
            .delete();
        });
    
        console.log(`🧹 Removidos ${recordsToDelete.length} registros fantasmas de ${tableName}:`, recordsToDelete);
    
        return recordsToDelete.length;
    
      } catch (error) {
        console.error(`❌ Erro ao remover registros fantasmas de ${tableName}:`, error);
    
        
        let removedCount = 0;
        for (const recordId of recordIds) {
          try {
            await db.table(tableName).delete(recordId);
            removedCount++;
          } catch (singleError) {
            console.error(`❌ Falha ao deletar ${tableName}/${recordId}:`, singleError);
          }
        }
    
        return removedCount;
      }
    },
    

    async safeGhostDataCleanup(options: Omit<GhostDataOptions, 'dryRun' | 'force'> = {}) {
      
      if (!navigator.onLine) {
        console.log('📱 Offline: pulando limpeza de dados fantasmas');
        return { skipped: true, reason: 'offline' };
      }
    
      
      const lastCleanupKey = `ghost_cleanup_last_run`;
      const lastRun = localStorage.getItem(lastCleanupKey);
      const now = Date.now();
    
      
      if (lastRun && (now - parseInt(lastRun)) < 24 * 60 * 60 * 1000 ) {
        return { skipped: true, reason: 'throttled' };
      }
    
      try {
        
        const result = await this.cleanupGhostData({
          ...options,
          dryRun: false,
          force: false
        });
    
        
        localStorage.setItem(lastCleanupKey, now.toString());
    
        return result;
    
      } catch (error) {
        console.error('❌ Erro na limpeza segura de dados fantasmas:', error);
        return {
          error: error instanceof Error ? error.message : String(error),
          skipped: true
        };
      }
    },
    

    async diagnoseGhostData(options: Omit<GhostDataOptions, 'dryRun'> = {}) {
      return this.cleanupGhostData({
        ...options,
        dryRun: true
      });
    },
    
}
import { useSyncAuthInManager } from "../../../hooks/useSyncAuthInManager";
import { SyncQueueItem } from "../../../types/base";
import { UploadSync } from "../../../types/sync/uploadSync";
import { DELETE_TABLE_ORDER, getSyncQueueInstitutionId, getTableOrderIndex, groupByTable, isLegacyInstituicaoId, UPSERT_TABLE_ORDER, normalizeCourseName, processedRecords, processarRegistrosUnicos, cleanRecordForSupabase } from "../../../utils/syncManagerUtils";
import { auditLogService } from "../../audit/auditLogService";
import db, { supabase } from "../db";
import { conflictResolver } from "./conflictResolver";
import { localIdMapper } from "./localIdMapper";


export const uploadService = {
    async uploadBatch() {
        try {
          await localIdMapper.cleanupLocalIdMap();
          await localIdMapper.cleanupLegacyLocalDuplicates(['alunos', 'turmas', 'aulas', 'cursos']);
          const { getAuthData } = useSyncAuthInManager();
          const authData = getAuthData();
          if (!authData.isAuthenticated) {
            console.warn('⚠️ Sessão não encontrada no storage; tentando sincronizar mesmo assim.');
          }
    
          const instituicaoId = getSyncQueueInstitutionId();
          if (!instituicaoId) {
            console.warn('⚠️ Sem instituicao_id ativa para processar syncQueue.');
            return;
          }
    
          
          const pendingItems = await db.syncQueue
            .filter((item) =>
              item.status === 'pending' &&
              (item.instituicao_id === instituicaoId || isLegacyInstituicaoId(item.instituicao_id))
            )
            .toArray();
    
          if (pendingItems.length === 0) {
            return;
          }
    
          const deleteItems = pendingItems.filter((item) => item.operation === 'delete');
          const upsertItems = pendingItems.filter((item) => item.operation === 'upsert');
    
          const deleteByTable = groupByTable(deleteItems);
          const upsertByTable = groupByTable(upsertItems);
    
          
          const deleteTableEntries = Object.entries(deleteByTable).sort(
            ([tableA], [tableB]) =>
              getTableOrderIndex(tableA, DELETE_TABLE_ORDER) - getTableOrderIndex(tableB, DELETE_TABLE_ORDER)
          );
    
          for (const [tableName, items] of deleteTableEntries) {
            await conflictResolver.processDeleteBatch(tableName, items);
          }
    
          
          const upsertTableEntries = Object.entries(upsertByTable).sort(
            ([tableA], [tableB]) =>
              getTableOrderIndex(tableA, UPSERT_TABLE_ORDER) - getTableOrderIndex(tableB, UPSERT_TABLE_ORDER)
          );
    
          for (const [tableName, items] of upsertTableEntries) {
            await conflictResolver.processTableBatch(tableName, items);
          }
    
          } catch (error) {
          console.error('❌ Erro no upload batch:', error);
          throw error;
        }
      
    },
    async uploadFailedItems() {
      try {
        const { getAuthData } = useSyncAuthInManager();
        const authData = getAuthData();
    
        if (!authData.isAuthenticated) {
          console.warn('⚠️ Sessão não encontrada no storage; tentando upload mesmo assim.');
        }
    
        const instituicaoId = getSyncQueueInstitutionId();
        if (!instituicaoId) {
          console.warn('⚠️ Sem instituicao_id ativa para processar itens com falha.');
          return { success: false, message: 'Sem instituição ativa' };
        }
    
        
        const failedItems = await db.syncQueue
          .filter((item) =>
            item.status === 'failed' &&
            (item.instituicao_id === instituicaoId || isLegacyInstituicaoId(item.instituicao_id))
          )
          .toArray();
    
        if (failedItems.length === 0) {
          return {
            success: true,
            message: 'Nenhum item com falha encontrado',
            total: 0
          };
        }
    
        
        const byTable = failedItems.reduce((acc: Record<string, number>, item) => {
          const table = item.table || 'unknown';
          acc[table] = (acc[table] || 0) + 1;
          return acc;
        }, {});
    
        
        const itemsByTable = groupByTable(failedItems);
    
        let totalProcessados = 0;
        let totalErros = 0;
        const resultados: Record<string, { success: number; failed: number }> = {};
    
        
        for (const [tableName, items] of Object.entries(itemsByTable)) {
          
          const ids = items.map(item => item.id!).filter(Boolean);
          await db.syncQueue
            .where('id')
            .anyOf(ids)
            .modify({
              status: 'pending',
              error: ""
            });
    
          
          try {
            await conflictResolver.processTableBatch(tableName, items);
    
            
            const aindaFalhos = await db.syncQueue
              .where('instituicao_id')
              .equals(instituicaoId)
              .and((item) => item.status === 'failed' && item.table === tableName)
              .toArray();
    
            const sucessos = items.length - aindaFalhos.length;
            const falhas = aindaFalhos.length;
    
            totalProcessados += sucessos;
            totalErros += falhas;
    
            resultados[tableName] = { success: sucessos, failed: falhas };
    
            } catch (error) {
            console.error(`❌ Erro ao processar tabela ${tableName}:`, error);
    
            
            await db.syncQueue
              .where('id')
              .anyOf(ids)
              .modify({
                status: 'failed',
                error: `Erro catastrófico: ${error instanceof Error ? error.message : String(error)}`,
                data: new Date().toISOString()
              });
    
            totalErros += items.length;
            resultados[tableName] = { success: 0, failed: items.length };
          }
    
          
          await new Promise(resolve => setTimeout(resolve, 500));
        }
    
        
        await auditLogService.log('SYNC_FAILED_ITEMS_UPLOAD', {
          total_processados: totalProcessados,
          total_erros: totalErros,
          resultados,
          timestamp: new Date().toISOString()
        });
    
        return {
          success: true,
          total: failedItems.length,
          processados: totalProcessados,
          erros: totalErros,
          resultados
        };
    
      } catch (error) {
        console.error('❌ Erro ao processar upload de itens com falha:', error);
    
        await auditLogService.log('SYNC_FAILED_ITEMS_ERROR', {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
    
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    },
    async uploadTableBatch(tableName: string): Promise<void> {
    try {
      const instituicaoId = getSyncQueueInstitutionId();
      if (!instituicaoId) {
        console.warn('⚠️ Sem instituicao_id ativa para processar syncQueue.');
        return;
      }

      const pendingItems = await db.syncQueue
        .filter((item) =>
          item.table === tableName &&
          item.status === 'pending' &&
          (item.instituicao_id === instituicaoId || (item.instituicao_id === 'local_default_instituicao' || item.instituicao_id === ''))
        )
        .toArray();

      if (pendingItems.length === 0) {
        return;
      }

      const deleteItems = pendingItems.filter((item) => item.operation === 'delete');
      const upsertItems = pendingItems.filter((item) => item.operation === 'upsert');

      if (deleteItems.length > 0) {
        await conflictResolver.processDeleteBatch(tableName, deleteItems);
      }

      if (upsertItems.length > 0) {
        await conflictResolver.processTableBatch(tableName, upsertItems);
      }
    } catch (error) {
      console.error(`❌ Erro no upload da tabela ${tableName}:`, error);
      throw error;
    }
  },

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
          
      let record = await conflictResolver.getRecordFromTable(tableName, item.record_id);

      if (!record) {
        console.warn(`🗑️  Registro não encontrado, removendo: ${item.record_id}`);
            await db.syncQueue.delete(item.id!);
            continue;
          }
  
          const resolvedInsert = await localIdMapper.applyLocalIdMappings(tableName, record);
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
                await conflictResolver.convertInsertToUpdate(tableName, item, localMatch.id);
                continue;
              }

              const remoteMatch = await conflictResolver.checkExistingUniqueConstraint(tableName, {
                nome: record.nome,
                instituicao_id: instituicaoId
              });

              if (remoteMatch?.id && remoteMatch.id !== record.id) {
                await conflictResolver.convertInsertToUpdate(tableName, item, remoteMatch.id);
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
  
          
          const cleanRecord = cleanRecordForSupabase(record);
  
          records.push(cleanRecord);
          itemsToProcess.push(item);
  
        } catch (error:any) {
          console.error(`❌ Erro ao preparar item ${item.id}:`, error);
          await conflictResolver.markItemAsError(item, error);
        }
      }
  
      return { records, itemsToProcess };
    }
  
    , async executeUpsertToSupabase(tableName: string, records: any[]) {
      
      let onConflict = 'id';
const registosProcessados = processedRecords(records,tableName);
  
      
      const uniqueRecords = processarRegistrosUnicos(registosProcessados, tableName);
  
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

      async processSingleUpdate(tableName: string, item: SyncQueueItem) {
        const { getAuthData } = useSyncAuthInManager();
        const authData = getAuthData();
    
        try {
          let record = await conflictResolver.getRecordFromTable(tableName, item.record_id);
          if (!record) {
            await db.syncQueue.delete(item.id!);
            return;
          }
    
          const resolvedUpdate = await localIdMapper.applyLocalIdMappings(tableName, record);
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
    
          
          await conflictResolver.markAsSynced(tableName, item.record_id);
          await db.syncQueue.delete(item.id!);
    
          } catch (error) {
          console.error(`❌ Erro atualizando ${tableName} ${item.record_id}:`, error);
          await conflictResolver.handleSyncError(item, error);
        }
      },
  
    async executeUpdateToSupabase(tableName: string, records: any[],record_id:string) {
  
      const registosProcessados = processedRecords(records,tableName);
      
      const uniqueRecords = processarRegistrosUnicos(registosProcessados, tableName);
  
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
          localIdMapper.updateLocalId(tableName, item.record_id, supabaseRecord.id)
            .catch(err => console.error(`Erro ao atualizar ID:`, err))        );
  
        
        if (tableName === 'turmas' || tableName === 'cursos') {
          promises.push(
            conflictResolver.updateDependentRecords(tableName, supabaseRecord.id, item.record_id)
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
  
    }
  

}
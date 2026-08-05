import { useSyncAuthInManager } from "../../../hooks/useSyncAuthInManager";
import { UploadSync } from "../../../types/sync/uploadSync";
import { DELETE_TABLE_ORDER, getSyncQueueInstitutionId, getTableOrderIndex, groupByTable, isLegacyInstituicaoId, UPSERT_TABLE_ORDER } from "../../../utils/syncManagerUtils";
import { auditLogService } from "../../audit/auditLogService";
import db from "../db";
import { conflictResolver } from "./conflictResolver";
import { localIdMapper } from "./localIdMapper";


export const uploadService:UploadSync= {
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

}
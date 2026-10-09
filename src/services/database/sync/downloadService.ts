import { useSyncAuthInManager } from "../../../hooks/useSyncAuthInManager";
import { emitDbChanged } from "../../../utils/emitPendingSync";
import { getSyncQueueInstitutionId, HARD_DELETE_RECONCILE_TABLES } from "../../../utils/syncManagerUtils";
import db, { supabase } from "../db";
import { conflictResolver } from "./conflictResolver";

export const downloadService={
    async downloadBatch() {
    try {
      const { connectivityService } = await import('../connectivityService');
      if (!connectivityService.shouldAttemptSync()) {
        return;
      }
      const { getAuthData } = useSyncAuthInManager();
      const authData = getAuthData();

      if (!authData.isAuthenticated) {
        console.warn('⚠️ Sessão não encontrada no storage; tentando download mesmo assim.');
      }

      
      const lastSync = localStorage.getItem(`last_sync_global`);
      const lastSyncDate = lastSync ? new Date(lastSync) : new Date(0);

      
      const { hasPermission } = useSyncAuthInManager();

      const tables = [
        'cursos', 'turmas', 'alunos', 'alocacao', 'transacoes', 'aulas',
        'propina', 'frequencias', 'tarefas', 'metas', 'rotinas',
        'evento', 'profiles', 'instituicao', 'notificacao','avaliacoes','turma_horarios',"planeamentos","plano_aulas"
      ];

      let anyTableOk = false;
      for (const tableName of tables) {
        
        if (tableName === 'profiles' || tableName === 'instituicao') {
          if (!hasPermission('admin')) {
            continue;
          }
        }

        // Se o Supabase caiu a meio do lote, pára sem martelar as restantes
        if (!connectivityService.shouldAttemptSync()) break;

        const tableLastSync = localStorage.getItem(`last_sync_${tableName}`);
        const tableLastSyncDate = tableLastSync ? new Date(tableLastSync) : lastSyncDate;
        const ok = await this.downloadTableBatch(tableName, tableLastSyncDate);
        if (ok) anyTableOk = true;
        await new Promise(resolve => setTimeout(resolve, 300)); 
      }

      // Só avança o cursor global se pelo menos uma tabela teve sucesso.
      // Antes atualizava sempre e podia saltar dados após outage.
      if (anyTableOk) {
        localStorage.setItem('last_sync_global', new Date().toISOString());
        connectivityService.reportSuccess();
      }

      } catch (error) {
      const { connectivityService } = await import('../connectivityService');
      connectivityService.reportFailure(error);
      console.error('❌ Erro no download batch:', error);
    }
    },

  
    async downloadTableBatch(tableName: string, since: Date): Promise<boolean> {
        try {
        const { connectivityService } = await import('../connectivityService');
        if (!connectivityService.shouldAttemptSync()) return false;
        const localCount = await db.table(tableName).count();
        const shouldForceFullSync = localCount === 0;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        let remoteData: any[] | null = null;
        let queryError: any = null;
        try {
          let query = supabase
              .from(tableName)
              .select('*')
              .order('updated_at', { ascending: true })
              .limit(500)
              .abortSignal(controller.signal);

          if (!shouldForceFullSync && since && Number.isFinite(since.getTime()) && since.getTime() > 0) {
              query = query.gt('updated_at', since.toISOString());
          } else if (shouldForceFullSync) {
              }

          
          
          if (tableName !== 'profiles' && tableName !== 'instituicao') {
              const instituicaoId = getSyncQueueInstitutionId();
              if (instituicaoId) {
              query = query.eq('instituicao_id', instituicaoId);
              }
          }

          const res = await query;
          remoteData = res.data;
          queryError = res.error;
        } finally {
          clearTimeout(timeout);
        }

        if (queryError) {
            console.error(`❌ Erro buscando ${tableName}:`, queryError);
            connectivityService.reportFailure(queryError);
            // NÃO reconcilia nem avança cursor em caso de erro:
            // remoteData vazio por falha ≠ registos apagados no servidor.
            return false;
        }

        if (!remoteData || remoteData.length === 0) {
            if (HARD_DELETE_RECONCILE_TABLES.has(tableName)) {
            await conflictResolver.reconcileHardDeletes(tableName);
            emitDbChanged(tableName, 'download');
            }
            localStorage.setItem(`last_sync_${tableName}`, new Date().toISOString());
            const { connectivityService: csOk } = await import('../connectivityService');
            csOk.reportSuccess();
            return true;
        }

        
        const batchSize = 50;
        for (let i = 0; i < remoteData.length; i += batchSize) {
            const batch = remoteData.slice(i, i + batchSize);
            await this.processDownloadBatch(tableName, batch);
        }

        
        if (HARD_DELETE_RECONCILE_TABLES.has(tableName)) {
            await conflictResolver.reconcileHardDeletes(tableName);
        }

        const latestUpdatedAt = remoteData.reduce((acc, record) => {
            const updatedAt = new Date(record.updated_at || record.created_at || 0);
            return updatedAt > acc ? updatedAt : acc;
        }, new Date(0));

        localStorage.setItem(
            `last_sync_${tableName}`,
            (latestUpdatedAt.getTime() > 0 ? latestUpdatedAt : new Date()).toISOString()
        );

        emitDbChanged(tableName, 'download');
        const { connectivityService: csOk2 } = await import('../connectivityService');
        csOk2.reportSuccess();
        return true;

        } catch (error) {
        const { connectivityService } = await import('../connectivityService');
        connectivityService.reportFailure(error);
        console.error(`❌ Erro baixando ${tableName}:`, error);
        return false;
        }
    },

    
    async processDownloadBatch(tableName: string, batch: any[]) {
        const table = db.table<any>(tableName);
        const pendingQueueRecordIds = new Set(
        (await db.syncQueue
            .where('table')
            .equals(tableName as any)
            .and((item) => item.status === 'pending' || item.status === 'failed' || item.status === 'conflict')
            .toArray())
            .map((item) => item.record_id)
        );

        
        await db.transaction('rw', table, async () => {
        for (const remoteRecord of batch) {
            try {
            
            const localRecord = await table.get(remoteRecord.id);

            if (!localRecord) {
                
                await table.put({
                ...remoteRecord,
                sync_status: 'synced',
                deleted: Boolean(remoteRecord.deleted)
                });
            } else {
                const localUpdated = new Date(localRecord.updated_at || localRecord.created_at || 0);
                const remoteUpdated = new Date(remoteRecord.updated_at || remoteRecord.created_at || 0);
                const hasQueueForRecord = pendingQueueRecordIds.has(localRecord.id);
                const localPendingWithoutQueue = localRecord.sync_status !== 'synced' && !hasQueueForRecord;
                const remoteIsNewer = remoteUpdated > localUpdated;
                const shouldApplyRemote =
                (localRecord.sync_status === 'synced' && remoteIsNewer) ||
                (localPendingWithoutQueue && (remoteIsNewer || Boolean(remoteRecord.deleted)));

                if (shouldApplyRemote) {
                await table.put({
                    ...localRecord,
                    ...remoteRecord,
                    sync_status: 'synced'
                });
                }
            }

            } catch (recordError) {
            console.error(`❌ Erro processando registro ${remoteRecord.id}:`, recordError);
            }
        }
        });
    }

}
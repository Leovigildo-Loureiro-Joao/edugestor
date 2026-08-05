import { alunosService } from "..";
import { useSyncAuthInManager } from "../../../hooks/useSyncAuthInManager";
import { SyncQueueItem } from "../../../types/base";
import { getSyncQueueInstitutionId, groupByTable, isSeedRecordId } from "../../../utils/syncManagerUtils";
import { auditLogService } from "../../audit/auditLogService";
import { aulaService } from "../aulaService";
import { avaliacaoService } from "../avaliacao";
import db, { supabase } from "../db";
import { turmaService } from "../turmas";
import { localIdMapper } from "./localIdMapper";

export const conflictResolver={



  
  async retryFailedItems(maxRetries: number = 3) {
    try {
      const instituicaoId = getSyncQueueInstitutionId();
      if (!instituicaoId) return;
      const failedItems = await db.syncQueue
        .where('instituicao_id').equals(instituicaoId)
        .filter(item => item.status === 'failed' && (item.retry_count || 0) < maxRetries)
        .toArray();

      if (failedItems.length === 0) {
        return;
      }

      
      const itemsByTable = groupByTable(failedItems);

      for (const [tableName, items] of Object.entries(itemsByTable)) {
        
        const ids = items.map(item => item.id!).filter(Boolean);
        await db.syncQueue
          .where('id')
          .anyOf(ids)
          .modify({
            status: 'pending',
            data: "",
            error: ""
          });

        
        await this.processTableBatch(tableName, items);
      }

    } catch (error) {
      console.error('❌ Erro na retentativa:', error);
    }
  },

  async processDeleteBatch(tableName: string, items: SyncQueueItem[]) {
    
    if (tableName === 'profiles' || tableName === 'instituicao') {
      const { hasPermission } = useSyncAuthInManager();
      if (!hasPermission('admin')) {
        console.error(`❌ Permissão insuficiente para deletar ${tableName}`);
        await auditLogService.log('PERMISSION_DENIED_OPERATION', {
          area: 'syncManager',
          table: tableName,
          operation: 'delete_batch',
          message: 'Permissão insuficiente para deletar registros protegidos'
        });
        throw new Error(`Permissão insuficiente para deletar ${tableName}`);
      }
    }

    
    for (const item of items) {
      if (!item.record_id.startsWith('local_')) continue;
      await localIdMapper.deleteLocalRecord(tableName, item.record_id);
      await db.syncQueue.delete(item.id!);
    }

    
    const remoteItems = items.filter((item) => !item.record_id.startsWith('local_'));
    for (const item of remoteItems) {
      try {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', item.record_id);

        if (error) throw error;

        await localIdMapper.deleteLocalRecord(tableName, item.record_id);
        await db.syncQueue.delete(item.id!);
      } catch (error: any) {
        if (error?.code === '23503') {
          await db.syncQueue.update(item.id!, {
            status: 'failed',
            retry_count: (item.retry_count || 0) + 1,
            error: `FK_CONFLICT:${tableName}:${item.record_id}:${error.message || 'registro dependente encontrado'}`,
            data: new Date().toISOString()
          });
          continue;
        }

        await this.handleSyncError(item, error);
      }
    }

    },

  
  async getRecordFromTable(tableName: string, recordId: string) {
    const table = db.table(tableName);
    return await table.get(recordId);
  },

  async markAsSynced(tableName: string, recordId: string) {
    const table = db.table<any>(tableName);
    await table.update(recordId, {
      sync_status: 'synced',
      updated_at: new Date().toISOString()
    });
  },


  async handleSyncError(item: SyncQueueItem, error: any) {
    const novasTentativas = (item.retry_count || 0) + 1;
    const errorCode = error?.code || error?.status || 'unknown';

    if (novasTentativas >= 3) {
      
      await db.syncQueue.update(item.id!, {
        status: 'failed',
        error: error.message,
        retry_count: novasTentativas,
        data: new Date().toISOString()
      });
      await auditLogService.log('SYNC_FAILED_PERMANENT', {
        table: item.table,
        record_id: item.record_id,
        retry_count: novasTentativas,
        error_code: errorCode,
        error_message: error?.message || String(error)
      });
    } else {
      
      await db.syncQueue.update(item.id!, {
        retry_count: novasTentativas,
        status: 'pending',
        data: new Date().toISOString()
      });
      if (errorCode === '42501' || errorCode === '403') {
        await auditLogService.log('SYNC_PERMISSION_DENIED', {
          table: item.table,
          record_id: item.record_id,
          retry_count: novasTentativas,
          error_code: errorCode,
          error_message: error?.message || String(error)
        });
      }
    }
  }

  
  , async reconcileHardDeletes(tableName: string) {
    try {
      const instituicaoId = getSyncQueueInstitutionId();

      let from = 0;
      const pageSize = 1000;
      const remoteIds = new Set<string>();

      while (true) {
        let query = supabase
          .from(tableName)
          .select('id')
          .order('id', { ascending: true })
          .range(from, from + pageSize - 1);

        if (tableName !== 'profiles' && tableName !== 'instituicao' && instituicaoId) {
          query = query.eq('instituicao_id', instituicaoId);
        }

        const { data, error } = await query;
        if (error) {
          console.error(`❌ Erro ao reconciliar deleções em ${tableName}:`, error);
          return;
        }

        const ids = (data || [])
          .map((row: any) => row?.id)
          .filter((id: any): id is string => typeof id === 'string');

        ids.forEach((id) => remoteIds.add(id));

        if (!data || data.length < pageSize) break;
        from += pageSize;
      }

      const localRecords = await db.table<any>(tableName).toArray();
      const staleLocalIds = localRecords
        .filter((record) => {
          if (!record || typeof record.id !== 'string') return false;
          if (record.id.startsWith('local_')) return false;
          if (record.sync_status !== 'synced') return false;
          if (record.deleted) return false;
          if (tableName !== 'profiles' && tableName !== 'instituicao' && instituicaoId && record.instituicao_id !== instituicaoId) {
            return false;
          }
          return !remoteIds.has(record.id);
        })
        .map((record) => record.id);

      if (staleLocalIds.length === 0) return;

      await db.transaction('rw', db.table(tableName), db.syncQueue, async () => {
        await db.table(tableName).bulkDelete(staleLocalIds);
        await db.syncQueue.where('table').equals(tableName as any).and((item) => staleLocalIds.includes(item.record_id)).delete();
      });
    } catch (error) {
      console.error(`❌ Erro ao reconciliar hard-deletes de ${tableName}:`, error);
    }
  }


  ,async updateDependentRecords(tableName: string, newId: string, oldId: string) {
    try {
      switch (tableName) {
        case 'cursos':
          
          const turmasDoCurso = await turmaService.getTurmasPorCurso(oldId);
          for (const turma of turmasDoCurso) {
            await turmaService.editTurma(turma.id, {
              ...turma,
              curso_id: newId
            });
          }
          break;

        case 'turmas':
          
          await Promise.all([
            
            alunosService.getAlunosPorTurma(oldId).then(alunos => {
              const promises = alunos.map(aluno =>
                alunosService.updateStudent(aluno.id, {
                  ...aluno,
                  turma_id: newId
                })
              );
              return Promise.allSettled(promises);
            }),

            
            aulaService.getAulasPorTurma(oldId).then(aulas => {
              const promises = aulas.map(aula =>
                aulaService.atualizarAula(aula.id, {
                  ...aula,
                  turma_id: newId
                })
              );
              return Promise.allSettled(promises);
            }),

            
            turmaService.getHorarios(oldId).then(horarios => {
              const promises = horarios.map(horario =>
                turmaService.updateHorario(horario.id, {
                  ...horario,
                  turma_id: newId
                })
              );
              return Promise.allSettled(promises);
            }),

            
            avaliacaoService.getAvaliacoesByTurma(oldId).then(avaliacoes => {
              const promises = avaliacoes.map(avaliacao =>
                avaliacaoService.atualizarAvaliacao(avaliacao.id, {
                  ...avaliacao,
                  turma_id: newId
                })
              );
              return Promise.allSettled(promises);
            }),

          ]);
          break;

        default:
          }
    } catch (error) {
      console.error(`❌ Erro ao atualizar dependências de ${tableName}:`, error);
    }
  },

  
  async verifyAndCleanSyncQueue() {
    try {
      const instituicaoId = getSyncQueueInstitutionId();
      if (!instituicaoId) return { total: 0, byStatus: {}, cleaned: 0 };

      
      const allItems = await db.syncQueue
        .where('instituicao_id')
        .equals(instituicaoId)
        .toArray();

      const byStatus = allItems.reduce((acc: Record<string, number>, item) => {
        const status = item.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      
      const syncedItems = allItems.filter(item => item.status === 'synced');

      if (syncedItems.length > 0) {
        console.warn(`⚠️ Encontrados ${syncedItems.length} itens "synced" não removidos!`);

        
        const idsToDelete = syncedItems.map(item => item.id!).filter(Boolean);

        if (idsToDelete.length > 0) {
          await db.syncQueue.bulkDelete(idsToDelete);
          }
      }

      
      const failedItems = allItems.filter(item =>
        (item.retry_count || 0) > 5 &&
        item.status === 'failed'
      );

      if (failedItems.length > 0) {
        console.warn(`⚠️ ${failedItems.length} itens com +5 tentativas falhas`);
        
        const idsToClean = failedItems.map(item => item.id!).filter(Boolean);
        await db.syncQueue.bulkDelete(idsToClean);
        }

      
      const orphanCleanup = await this.cleanupOrphanedSyncQueue({
        statuses: ['failed'],
        dryRun: false
      });
      if (orphanCleanup.deletedCount > 0) {
        }

      return {
        total: allItems.length,
        byStatus,
        cleaned: syncedItems.length,
        cleanedFailedWithManyRetries: failedItems.length,
        cleanedOrphanFailed: orphanCleanup.deletedCount || 0
      };

    } catch (error:any) {
      console.error('❌ Erro ao verificar syncQueue:', error);
      return { error: error.message };
    }
  },

  async findOrphanedSyncQueueItems(options: {
    statuses?: string[];
    tableName?: string;
    includeAllInstituicoes?: boolean;
  } = {}) {
    const {
      statuses,
      tableName,
      includeAllInstituicoes = false
    } = options;
    const instituicaoId = getSyncQueueInstitutionId();

    let items = includeAllInstituicoes || !instituicaoId
      ? await db.syncQueue.toArray()
      : await db.syncQueue.where('instituicao_id').equals(instituicaoId).toArray();

    if (tableName) {
      items = items.filter((item) => item.table === tableName);
    }

    if (statuses && statuses.length > 0) {
      const statusSet = new Set(statuses);
      items = items.filter((item) => statusSet.has(item.status || 'unknown'));
    }

    const checks = await Promise.all(
      items.map(async (item) => {
        const tableExists = db.tables.some((t) => t.name === item.table);
        if (!tableExists) return { item, orphan: true, reason: `Tabela inexistente: ${item.table}` };

        const exists = await this.checkIfRecordExists(item.table, item.record_id);
        if (!exists) return { item, orphan: true, reason: `Registro ${item.record_id} não encontrado` };

        return { item, orphan: false, reason: '' };
      })
    );

    const orphanItems = checks.filter((c) => c.orphan);
    const byTable = orphanItems.reduce((acc: Record<string, number>, current) => {
      const key = current.item.table || 'sem_tabela';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const byStatus = orphanItems.reduce((acc: Record<string, number>, current) => {
      const key = current.item.status || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return {
      totalScanned: items.length,
      orphanCount: orphanItems.length,
      byTable,
      byStatus,
      orphanItems
    };
  },

  async cleanupOrphanedSyncQueue(options: {
    statuses?: string[];
    tableName?: string;
    dryRun?: boolean;
    includeAllInstituicoes?: boolean;
  } = {}) {
    const { dryRun = false, ...findOptions } = options;
    const diagnosis = await this.findOrphanedSyncQueueItems(findOptions);

    if (dryRun) {
      return {
        ...diagnosis,
        deletedCount: 0,
        dryRun: true
      };
    }

    const idsToDelete = diagnosis.orphanItems
      .map((entry: any) => entry.item?.id)
      .filter((id: any) => typeof id === 'number');

    if (idsToDelete.length > 0) {
      await db.syncQueue.bulkDelete(idsToDelete);
    }

    return {
      ...diagnosis,
      deletedCount: idsToDelete.length,
      dryRun: false
    };
  },

  
  async debugSyncQueueIssue(tableName: string) {
    const instituicaoId = getSyncQueueInstitutionId();

    const items = await db.syncQueue
      .where('table').equals(tableName)
      .and((item) => !instituicaoId || item.instituicao_id === instituicaoId)
      .toArray();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      const exists = await this.checkIfRecordExists(tableName, item.record_id);
      if (!exists) {
        console.warn(`    ⚠️ Registro ${item.record_id} não existe mais!`);
        
        await db.syncQueue.delete(item.id!);
        }
    }
  },

  async checkIfRecordExists(tableName: string, recordId: string): Promise<boolean> {
    try {
      const table = db.table(tableName);
      const record = await table.get(recordId);
      return !!record;
    } catch {
      return false;
    }
  },

  async checkRemoteExistence(tableName: string, recordId: string): Promise<boolean> {
    try {
      
      const { data, error, status } = await supabase
        .from(tableName)
        .select('id')
        .eq('id', recordId)
        .maybeSingle();
  
      if (error) {
        
        if (status === 404 || error.code === 'PGRST116') {
          return false;
        }
        
        if (error.code === '42501' || error.code === '403') {
          console.warn(`⚠️ Permissão negada ao verificar ${tableName}/${recordId}`);
          return true; 
        }
        throw error;
      }
  
      return !!data;
  
    } catch (error) {
      console.error(`❌ Erro ao verificar existência remota de ${tableName}/${recordId}:`, error);
      
      return true;
    }
  },
  
  
  async verifyDataHealth(options: { tables?: string[]; sample?: number } = {}) {
    const {
      tables = ['alunos', 'turmas', 'cursos'],
      sample = 10 
    } = options;
  
    if (!navigator.onLine) {
      return { online: false, message: 'Offline: não é possível verificar saúde dos dados' };
    }
  
    const health: Record<string, { local: number; remote: number; mismatches: any[] }> = {};
  
    for (const tableName of tables) {
      try {
        
        const localSynced = await db.table(tableName)
          .filter(r => r.sync_status === 'synced' && !String(r.id).startsWith('local_'))
          .count();
  
        
        const instituicaoId = getSyncQueueInstitutionId();
        let query = supabase
          .from(tableName)
          .select('id', { count: 'exact', head: true });
  
        if (tableName !== 'profiles' && tableName !== 'instituicao' && instituicaoId) {
          query = query.eq('instituicao_id', instituicaoId);
        }
  
        const { count: remoteCount, error } = await query;
  
        if (error) throw error;
  
        health[tableName] = {
          local: localSynced,
          remote: remoteCount || 0,
          mismatches: []
        };
  
        
        if (Math.abs(localSynced - (remoteCount || 0)) > 10 && sample > 0) {
          const sampleSize = Math.min(sample, localSynced);
          const localSample = await db.table(tableName)
            .filter(r => r.sync_status === 'synced' && !String(r.id).startsWith('local_'))
            .limit(sampleSize)
            .toArray();
  
          
          for (const record of localSample) {
            const exists = await this.checkRemoteExistence(tableName, record.id);
            if (!exists) {
              health[tableName].mismatches.push({
                id: record.id,
                nome: record.nome_completo || record.nome_turma || record.nome || 'N/A'
              });
            }
          }
        }
  
      } catch (error) {
        health[tableName] = {
          local: 0,
          remote: 0,
          mismatches: [{ error: error instanceof Error ? error.message : String(error) }]
        };
      }
    }
  
    return health;
  },
  
  
    async rentryErrorsTable (tableName: string) {
      const instituicaoId = getSyncQueueInstitutionId();
      if (!instituicaoId) return;
      const pendingItems = await db.syncQueue
          .where('instituicao_id')
          .equals(instituicaoId)
          .and(item => item.status === 'failed' && item.table === tableName )
          .toArray();
        await this.processTableBatch(tableName, pendingItems);
  
    },
  
    
    async processTableBatch(tableName: string, items: SyncQueueItem[]) {
      try {
        const { getAuthData } = useSyncAuthInManager();
        const authData = getAuthData();
  
        
        const seedItems = items.filter((item) => isSeedRecordId(item.record_id));
        if (seedItems.length > 0) {
          const queueIds = seedItems
            .map((item) => item.id)
            .filter((id): id is number => typeof id === 'number');
  
          if (queueIds.length > 0) {
            await db.syncQueue.bulkDelete(queueIds);
          }
  
          for (const item of seedItems) {
            try {
              await this.markAsSynced(tableName, item.record_id);
            } catch {
              
            }
          }
        }
  
        const validItems = items.filter((item) => !isSeedRecordId(item.record_id));
        if (validItems.length === 0) {
          return;
        }
  
        
        const inserts = validItems.filter(item => item.operation === 'upsert' && item.record_id.startsWith('local_'));
        const updates = validItems.filter(item => item.operation === 'upsert' && !item.record_id.startsWith('local_'));
        const deletes = validItems.filter(item => item.operation === 'delete');
  
        
        if (deletes.length > 0) {
          await this.processDeleteBatch(tableName, deletes);
        }
  
        
        for (const item of updates) {
          await this.processSingleUpdate(tableName, item);
        }
  
        
        if (inserts.length > 0) {
          await this.processInsertBatch(tableName, inserts);
        }
  
  
  
      } catch (error) {
        console.error(`❌ Erro processando batch de ${tableName}:`, error);
        throw error;
      }
    },
  
  
   async processInsertBatch(tableName: string, items: SyncQueueItem[]) {
      const { getAuthData } = useSyncAuthInManager();
      const authData = getAuthData();
  
      if (!authData.isAuthenticated) {
        console.warn(`⚠️ Sessão não encontrada no storage; tentando INSERTs em ${tableName} mesmo assim.`);
      }
  
      try {
        
        const { records, itemsToProcess } = await this.prepareInsertRecords(tableName, items);
  
        if (records.length === 0) {
          return;
        }
  
        
        let sucesso = 0;
        const concorrencia = tableName === 'frequencias' ? 8 : 1;
        let cursor = 0;
  
        const worker = async () => {
          while (true) {
            const index = cursor++;
            if (index >= itemsToProcess.length) return;
  
            const item = itemsToProcess[index];
            const record = records[index];
  
            try {
              const supabaseResult = await this.executeUpsertToSupabase(tableName, [record]);
              const supabaseRecord = supabaseResult.data?.[0];
  
              if (!supabaseRecord?.id) {
                throw new Error(`Nenhum ID retornado do Supabase para ${tableName}:${item.record_id}`);
              }
  
              await localIdMapper.updateLocalId(tableName, item.record_id, supabaseRecord.id);
  
              if (tableName === 'turmas' || tableName === 'cursos') {
                await this.updateDependentRecords(tableName, supabaseRecord.id, item.record_id);
              }
  
              await db.syncQueue.delete(item.id!);
              sucesso++;
            } catch (error) {
              await this.handleSyncError(item, error);
            }
          }
        };
  
        const workers = Array.from(
          { length: Math.min(concorrencia, itemsToProcess.length) },
          () => worker()
        );
        await Promise.all(workers);
  
        } catch (error) {
        await this.handleInsertError(tableName, items, error);
      }
    }

      , async enqueuePendingUpsertIfNeeded(tableName: string, recordId: string, instituicaoId: string, now: string) {
    if (!recordId) return;

    const hasPendingDelete = await db.syncQueue
      .where('table')
      .equals(tableName)
      .filter(
        (item) =>
          item.instituicao_id === instituicaoId &&
          item.record_id === recordId &&
          item.operation === 'delete' &&
          item.status === 'pending'
      )
      .first();

    if (hasPendingDelete) return;

    const hasPendingUpsert = await db.syncQueue
      .where('table')
      .equals(tableName)
      .filter(
        (item) =>
          item.instituicao_id === instituicaoId &&
          item.record_id === recordId &&
          item.operation === 'upsert' &&
          item.status === 'pending'
      )
      .first();

    if (!hasPendingUpsert) {
      await db.syncQueue.add({
        instituicao_id: instituicaoId,
        table: tableName as  "turmas" | "alunos" | "aulas" | "cursos" | "propina" | "alocacao" | "transacoes" | "frequencias" | "tarefas" | "metas" | "rotinas" | "evento" | "profiles" | "system_config" | "instituicao" | "notificacao" | "avaliacoes" | "turma_horarios" | "planeamentos" | "plano_aulas",
        record_id: recordId,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });
    }
  }
   , async updateFrequenciasAulaReferences(oldAulaId: string, newAulaId: string) {
      try {
        const instituicaoId = getSyncQueueInstitutionId();
        const frequencias = await db.frequencias
          .where('aula_id')
          .equals(oldAulaId)
          .toArray();
  
        if (frequencias.length === 0) return;
  
        const now = new Date().toISOString();
  
        for (const frequencia of frequencias) {
          if (frequencia.deleted) continue;
  
          await db.frequencias.update(frequencia.id, {
            aula_id: newAulaId,
            updated_at: now,
            sync_status: 'pending'
          });
  
          const hasPendingDelete = await db.syncQueue
            .where('table')
            .equals('frequencias')
            .filter(
              (item) =>
                item.instituicao_id === instituicaoId &&
                item.record_id === frequencia.id &&
                item.operation === 'delete' &&
                item.status === 'pending'
            )
            .first();
  
          if (hasPendingDelete) {
            continue;
          }
  
          const hasPendingUpsert = await db.syncQueue
            .where('table')
            .equals('frequencias')
            .filter(
              (item) =>
                item.instituicao_id === instituicaoId &&
                item.record_id === frequencia.id &&
                item.operation === 'upsert' &&
                item.status === 'pending'
            )
            .first();
  
          if (!hasPendingUpsert) {
            await db.syncQueue.add({
              instituicao_id: instituicaoId,
              table: 'frequencias',
              record_id: frequencia.id,
              operation: 'upsert',
              status: 'pending',
              created_at: now
            });
          }
        }
  
  
      } catch (error) {
        console.error('❌ Erro ao atualizar aula_id em frequências:', error);
      }
    }
  
    , async handleInsertError(tableName: string, items: SyncQueueItem[], error: any) {
      console.error(`❌ Erro fatal em ${tableName}:`, error);
  
      
      for (const item of items) {
        try {
          await db.syncQueue.update(item.id!, {
            status: 'failed',
            error: error.message?.substring(0, 200) || 'Erro desconhecido',
            retry_count: (item.retry_count || 0) + 1,
            data: new Date().toISOString()
          });
        } catch (updateError) {
          console.error(`❌ Não consegui marcar erro no item ${item.id}:`, updateError);
        }
      }
    },
      async markItemAsError(item: SyncQueueItem, error: Error) {
        try {
          await db.syncQueue.update(item.id!, {
            status: 'failed',
            error: error.message?.substring(0, 200) || 'Erro ao preparar',
            retry_count: (item.retry_count || 0) + 1,
            data: new Date().toISOString()
          });
        } catch (updateError) {
          console.error(`❌ Falha ao marcar erro no item ${item.id}:`, updateError);
        }
      },

  
    async handleDuplicateInsert(tableName: string, records: any[], items: SyncQueueItem[], authData: any) {
        
        for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const item = items[i];

        try {
            let result;

            
            if (tableName === 'system_config') {
            const { data, error } = await supabase
                .from(tableName)
                .upsert(record, {
                onConflict: 'id'
                })
                .select()
                .single();

            if (error) throw error;
            result = data;

            } else if (tableName === 'notificacao') {
            
            const { data, error } = await supabase
                .from(tableName)
                .upsert(record)
                .select()
                .single();

            if (error) throw error;
            result = data;

            } else {
            
            const { data, error } = await supabase
                .from(tableName)
                .upsert(record, {
                onConflict: 'id'
                })
                .select()
                .single();

            if (error) throw error;
            result = data;
            }

            if (result) {
            await localIdMapper.updateLocalId(tableName, item.record_id, result.id);
            await db.syncQueue.delete(item.id!);
            }

        } catch (error) {
            console.error(`❌ Erro processando registro individual em ${tableName}:`, error);
            await this.handleSyncError(item, error);
        }
        }
    },

}
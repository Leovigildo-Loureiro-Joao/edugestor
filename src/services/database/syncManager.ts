// src/services/database/syncManager.ts
import { alunosService, aulaService, frequenciaService, turmaService } from ".";
import { SyncQueueItem } from "../../types/base";
import { avaliacaoService } from "./avaliacao";
import db, { supabase } from "./db";
import { emitDbChanged } from "../../utils/emitPendingSync";
import { instituicaoIdValue } from "../../utils/getInsitituicaoID";
import { auditLogService } from "../audit/auditLogService";


// Interface para o serviço de sincronização
interface SyncManager {
  uploadBatch(): Promise<void>;
  downloadBatch(): Promise<void>;
  groupByTable(items: SyncQueueItem[]): Record<string, SyncQueueItem[]>;
  processTableBatch(tableName: string, items: SyncQueueItem[]): Promise<void>;
  processInsertBatch(tableName: string, items: SyncQueueItem[]): Promise<void>;
  processSingleUpdate(tableName: string, item: SyncQueueItem): Promise<void>;
  processDeleteBatch(tableName: string, items: SyncQueueItem[]): Promise<void>;
  getRecordFromTable(tableName: string, recordId: string): Promise<any>;
  updateLocalId(tableName: string, oldId: string, newId: string): Promise<void>;
  enqueuePendingUpsertIfNeeded(tableName: string, recordId: string, instituicaoId: string, now: string): Promise<void>;
  updateLocalIdRelatedReferences(tableName: string, localId: string, supabaseId: string): Promise<void>;
  updatePlanoAulasLocalReferences(oldAulaId: string, newAulaId: string): Promise<void>;
  updateFrequenciasAulaReferences(oldAulaId: string, newAulaId: string): Promise<void>;
  markAsSynced(tableName: string, recordId: string): Promise<void>;
  deleteLocalRecord(tableName: string, recordId: string): Promise<void>;
  processarRegistrosUnicos(records: any[], tabela: string): any[];
  handleSyncError(item: SyncQueueItem, error: any): Promise<void>;
  downloadTableBatch(tableName: string, since: Date): Promise<void>;
  uploadTableBatch(tableName: string): Promise<void>;
  rentryErrorsTable(tableName: string): Promise<void>;
  processDownloadBatch(tableName: string, batch: any[]): Promise<void>;
  prepareInsertRecords(tableName: string, items: SyncQueueItem[]): Promise<{ records: any[]; itemsToProcess: SyncQueueItem[] }>;
  cleanRecordForSupabase(record: any): any;
  executeUpsertToSupabase(tableName: string, records: any[]): Promise<{ data: any[] | null; error: any | null }>;
  processSuccessResult(tableName: string, items: SyncQueueItem[], supabaseData: any[]): Promise<void>;
  handleInsertError(tableName: string, items: SyncQueueItem[], error: any): Promise<void>;
  markItemAsError(item: SyncQueueItem, error: Error): Promise<void>;
  checkExistingNotificacao(record: any): Promise<any>;
  handleDuplicateInsert(tableName: string, records: any[], items: SyncQueueItem[], authData: any): Promise<void>;
  checkExistingUniqueConstraint(tableName: string, record: any): Promise<any>;
  convertInsertToUpdate(tableName: string, item: SyncQueueItem, existingId: string): Promise<void>;
  removeBatchDuplicates(tableName:string,records:any[]):any;
  updateDependentRecords(tableName:string,supabaseId:string,record_id:string):any;
  verifyAndCleanSyncQueue():any;
  findOrphanedSyncQueueItems(options?: { statuses?: string[]; tableName?: string; includeAllInstituicoes?: boolean }): Promise<any>;
  cleanupOrphanedSyncQueue(options?: { statuses?: string[]; tableName?: string; dryRun?: boolean; includeAllInstituicoes?: boolean }): Promise<any>;
  debugSyncQueueIssue(tableName:string):any;
  cleanupOldItems(maxAgeHours:number):any;
  executeDeleteToSupabase(tableName: string, recordId: string): Promise<{ data: any | null; error: any | null }>;
  executeUpdateToSupabase(tableName: string, records: any[],record_id:string): Promise<{ data: any[] | null; error: any | null }>;
  checkIfRecordExists(tableName: string, recordId: string): Promise<boolean>;
  forceCleanSyncQueue(tableName?: string):any
  retryFailedItems(maxRetries: number):any
  getSyncStats():Promise<any>
  uploadFailedItems():Promise<any>
  verifyQueueIntegrity():Promise<any>
  processedRecords(records:any[],tableName:string):any[]
  cleanupLegacyLocalDuplicates(tables?: string[]): Promise<void>
}

// Hook personalizado para usar dentro do manager
const useSyncAuthInManager = () => {
  const tryParseJSON = (value: string | null): any | null => {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const extractTokenFromAnyShape = (raw: any): string | null => {
    if (!raw) return null;
    if (typeof raw === 'string' && raw.split('.').length === 3) return raw;
    if (Array.isArray(raw)) {
      for (const item of raw) {
        const token = extractTokenFromAnyShape(item);
        if (token) return token;
      }
      return null;
    }
    if (typeof raw === 'object') {
      if (typeof raw.access_token === 'string') return raw.access_token;
      if (raw.session) return extractTokenFromAnyShape(raw.session);
      if (raw.currentSession) return extractTokenFromAnyShape(raw.currentSession);
      if (raw.data) return extractTokenFromAnyShape(raw.data);
    }
    return null;
  };

  const getFallbackTokenFromStorage = (): string | null => {
    const sessionToken = extractTokenFromAnyShape(
      tryParseJSON(localStorage.getItem('supabase.auth.session'))
    );
    if (sessionToken) return sessionToken;

    const supabaseInternalKey = Object.keys(localStorage).find((key) =>
      key.startsWith('sb-') && key.endsWith('-auth-token')
    );
    if (supabaseInternalKey) {
      return extractTokenFromAnyShape(tryParseJSON(localStorage.getItem(supabaseInternalKey)));
    }

    return null;
  };

  // Esta função simula o hook, mas pode ser chamada em qualquer lugar
  const getAuthData = () => {
    // Tentar obter do localStorage primeiro (para contexto não React)
    console.log(localStorage.getItem('user_role'))
    const token = localStorage.getItem('jwt_token') || getFallbackTokenFromStorage();
    if (token && !localStorage.getItem('jwt_token')) {
      try {
        localStorage.setItem('jwt_token', token);
      } catch {
        // ignora erro de quota/storage indisponível
      }
    }
    const userRole = localStorage.getItem('user_role') || 'user';
    const localProfile = localStorage.getItem('user_profile');
    let userId=localStorage.getItem("user_id") || null;
    if (localProfile) {
      const profile =JSON.parse(localProfile);
      userId= profile.id;  
    }  
    
    
    return {
      authToken: token,
      userRole,
      userId,
      isAuthenticated: !!token || !!localStorage.getItem('supabase.auth.session')
    };
  };

  const getAuthHeaders = () => {
    const token = getAuthData().authToken;
    if (!token) return {};
    
    return {
      'Authorization': `Bearer ${token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  };

  const hasPermission = (requiredRole: string): boolean => {
    const { userRole } = getAuthData();
    
    const roleHierarchy: Record<string, number> = {
      'user': 0,
      'teacher': 1,
      'manager': 2,
      'admin': 3
    };
    
    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
  };

  return {
    getAuthData,
    getAuthHeaders,
    hasPermission
  };
};

const getSyncQueueInstitutionId = (): string => instituicaoIdValue();
const isUuid = (value?: string | null): boolean =>
  !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const isSeedRecordId = (value?: string | null): boolean =>
  !!value && value.startsWith('seed_');

// Instância do SyncManager
export const syncManager: SyncManager = {
  // ✅ UPLOAD em BATCH (otimizado)
  async uploadBatch() {
    try {
      await this.cleanupLegacyLocalDuplicates(['alunos', 'turmas', 'aulas']);
      const { getAuthData } = useSyncAuthInManager();
      
      const authData = getAuthData();
      console.log(authData)
      if (!authData.isAuthenticated) {
        console.warn('⚠️ Sessão não encontrada no storage; tentando sincronizar mesmo assim.');
      }
      
      console.log('🔄 Iniciando upload em batch...');
      const instituicaoId = getSyncQueueInstitutionId();
      if (!instituicaoId) {
        console.warn('⚠️ Sem instituicao_id ativa para processar syncQueue.');
        return;
      }
      
      // 1. Agrupar itens por tabela
      const pendingItems = await db.syncQueue
        .where('instituicao_id')
        .equals(instituicaoId)
        .and((item) => item.status === 'pending')
        .toArray();
      
      if (pendingItems.length === 0) {
        console.log('📭 Nenhum item pendente para upload');
        return;
      }
      
      // 2. Agrupar por tabela
      const itemsByTable = this.groupByTable(pendingItems);
      
      // 3. Processar cada tabela em batch
      for (const [tableName, items] of Object.entries(itemsByTable)) {
        console.log(`📤 Processando batch de ${items.length} ${tableName}...`);
        await this.processTableBatch(tableName, items);
      }
      
      console.log('✅ Upload batch concluído');
      
    } catch (error) {
      console.error('❌ Erro no upload batch:', error);
      throw error;
    }
  },
   async uploadTableBatch (tableName: string) {
    const instituicaoId = getSyncQueueInstitutionId();
    if (!instituicaoId) return;
    const pendingItems = await db.syncQueue
        .where('instituicao_id')
        .equals(instituicaoId)
        .and(item => item.status === 'pending' && item.table === tableName )
        .toArray();
      console.log(`📤 Processando batch de ${pendingItems.length} ${tableName}...`);
      await this.processTableBatch(tableName, pendingItems);
      
  }

// Adicione esta função ao objeto syncManager

, async uploadFailedItems() {
  try {
    console.log('🔄 Iniciando upload de itens com falha...');
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
    
    // Buscar TODOS os itens com status 'failed' (qualquer número de tentativas)
    const failedItems = await db.syncQueue
      .where('instituicao_id')
      .equals(instituicaoId)
      .and((item) => item.status === 'failed')
      .toArray();
    
    if (failedItems.length === 0) {
      console.log('✅ Nenhum item com falha encontrado');
      return { 
        success: true, 
        message: 'Nenhum item com falha encontrado',
        total: 0 
      };
    }
    
    console.log(`📊 Encontrados ${failedItems.length} itens com falha para processar`);
    
    // Estatísticas por tabela
    const byTable = failedItems.reduce((acc: Record<string, number>, item) => {
      const table = item.table || 'unknown';
      acc[table] = (acc[table] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📋 Distribuição por tabela:', byTable);
    
    // Agrupar por tabela para processamento em batch
    const itemsByTable = this.groupByTable(failedItems);
    
    let totalProcessados = 0;
    let totalErros = 0;
    const resultados: Record<string, { success: number; failed: number }> = {};
    
    // Processar cada tabela
    for (const [tableName, items] of Object.entries(itemsByTable)) {
      console.log(`\n📤 Processando ${items.length} itens com falha em ${tableName}...`);
      
      // Resetar status para 'pending' antes de processar
      const ids = items.map(item => item.id!).filter(Boolean);
      await db.syncQueue.bulkUpdate(ids, {
        status: 'pending',
        error: "",
        data: new Date().toISOString()
      });
      
      // Tentar processar novamente
      try {
        await this.processTableBatch(tableName, items);
        
        // Verificar quantos foram bem-sucedidos
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
        
        console.log(`✅ ${tableName}: ${sucessos} sucessos, ${falhas} falhas`);
        
      } catch (error) {
        console.error(`❌ Erro ao processar tabela ${tableName}:`, error);
        
        // Reverter para failed se houver erro catastrófico
        await db.syncQueue.bulkUpdate(ids, {
          status: 'failed',
          error: `Erro catastrófico: ${error instanceof Error ? error.message : String(error)}`,
          data: new Date().toISOString()
        });
        
        totalErros += items.length;
        resultados[tableName] = { success: 0, failed: items.length };
      }
      
      // Pequena pausa entre tabelas para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n🎯 Resumo do upload de itens com falha:');
    console.log(`✅ Total processados: ${totalProcessados}`);
    console.log(`❌ Total com erro: ${totalErros}`);
    console.log('📊 Resultados por tabela:', resultados);
    
    // Registrar no log de auditoria
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
  async rentryErrorsTable (tableName: string) {
    const instituicaoId = getSyncQueueInstitutionId();
    if (!instituicaoId) return;
    const pendingItems = await db.syncQueue
        .where('instituicao_id')
        .equals(instituicaoId)
        .and(item => item.status === 'failed' && item.table === tableName )
        .toArray();
      console.log(`📤 Processando batch de ${pendingItems.length} ${tableName}...`);
      await this.processTableBatch(tableName, pendingItems);
      
  },

  // ✅ Agrupar itens por tabela
  groupByTable(items: SyncQueueItem[]) {
    const groups: Record<string, SyncQueueItem[]> = {};
    
    items.forEach(item => {
      if (!groups[item.table]) {
        groups[item.table] = [];
      }
      groups[item.table].push(item);
    });
    
    return groups;
  },
  
  // ✅ Processar tabela em batch
  async processTableBatch(tableName: string, items: SyncQueueItem[]) {
    try {
      const { getAuthData } = useSyncAuthInManager();
      const authData = getAuthData();

      // Registros de teste (seed_*) não devem ser sincronizados com o Supabase.
      const seedItems = items.filter((item) => isSeedRecordId(item.record_id));
      if (seedItems.length > 0) {
        const queueIds = seedItems
          .map((item) => item.id)
          .filter((id): id is number => typeof id === 'number');

        if (queueIds.length > 0) {
          await db.syncQueue.bulkDelete(queueIds);
          console.log(`🧹 ${queueIds.length} item(ns) seed removido(s) da syncQueue em ${tableName}`);
        }

        for (const item of seedItems) {
          try {
            await this.markAsSynced(tableName, item.record_id);
          } catch {
            // Registro pode ter sido removido localmente; ignorar.
          }
        }
      }

      const validItems = items.filter((item) => !isSeedRecordId(item.record_id));
      if (validItems.length === 0) {
        return;
      }
      
      // Separar INSERTs e UPDATEs
      const inserts = validItems.filter(item => item.operation === 'upsert' && item.record_id.startsWith('local_'));
      const updates = validItems.filter(item => item.operation === 'upsert' && !item.record_id.startsWith('local_'));
      const deletes = validItems.filter(item => item.operation === 'delete');

      // Processar DELETEs em batch
      if (deletes.length > 0) {
        await this.processDeleteBatch(tableName, deletes);
      }
      
      // Processar UPDATEs em batch (um por um por segurança)
      for (const item of updates) {
        await this.processSingleUpdate(tableName, item);
      }

      // Processar INSERTs em batch
      if (inserts.length > 0) {
        await this.processInsertBatch(tableName, inserts);
      }
      
      
      
    } catch (error) {
      console.error(`❌ Erro processando batch de ${tableName}:`, error);
      throw error;
    }
  },

  // Função para processar registros duplicados
 processarRegistrosUnicos(records: any[], tabela: string): any[] {
  this.debugSyncQueueIssue(tabela)
  const registrosUnicos = new Map();
  
  records.forEach(record => {
    let chaveUnica;
    
    switch(tabela) {
      case 'alunos':
        // Para alunos, usa numero_estudante como chave única
        chaveUnica = record.numero_estudante;
        break;
        
      case 'turmas':
        // Para turmas, usa nome_turma + ano_letivo
        chaveUnica = `${record.nome_turma}_${record.ano_letivo}`;
        break;
        
      case 'professores':
        // Para professores, usa email ou BI
        chaveUnica = record.email || record.numero_bi;
        break;
      
      case 'aulas':
        // Para aulas, usa uma identidade estável para evitar inserts duplicados no mesmo sync.
        chaveUnica = [
          record.turma_id || '',
          record.data_aula || '',
          record.hora_inicio || '',
          record.hora_fim || '',
          record.disciplina || '',
          record.tema_aula || ''
        ].join('|');
        break;
        
      default:
        // Para outras tabelas, usa ID se existir
        chaveUnica = record.id || Math.random().toString();
    }
    
    // Se não tem chave única, gera uma aleatória
    if (!chaveUnica) {
      chaveUnica = `temp_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Verifica se já existe registro com mesma chave
    const existente = registrosUnicos.get(chaveUnica);
    if (existente) {
      // Mantém o registro mais recente (compara updated_at)
      const dataAtual = record.updated_at || record.created_at;
      const dataExistente = existente.updated_at || existente.created_at;
      
      if (dataAtual && dataExistente) {
        const isMaisRecente = new Date(dataAtual) > new Date(dataExistente);
        if (isMaisRecente) {
          registrosUnicos.set(chaveUnica, record);
        }
      } else if (dataAtual && !dataExistente) {
        // Se o atual tem data mas o existente não, usa o atual
        registrosUnicos.set(chaveUnica, record);
      }
    } else {
      registrosUnicos.set(chaveUnica, record);
    }
  });
  
  return Array.from(registrosUnicos.values());
},
  
// ✅ Processar INSERTs em batch - CORRIGIDO
 async processInsertBatch(tableName: string, items: SyncQueueItem[]) {
    const { getAuthData } = useSyncAuthInManager();
    const authData = getAuthData();
    
    if (!authData.isAuthenticated) {
      console.warn(`⚠️ Sessão não encontrada no storage; tentando INSERTs em ${tableName} mesmo assim.`);
    }
    
    try {
      console.log(`🔄 Processando ${items.length} INSERTs em ${tableName}`);
      
      // PASSO 1: Preparar registros válidos
      const { records, itemsToProcess } = await this.prepareInsertRecords(tableName, items);
      
      if (records.length === 0) {
        console.log(`✅ Nada para sincronizar em ${tableName}`);
        return;
      }

      // PASSO 2: Sincronizar com concorrência controlada.
      // Para frequências, paraleliza para reduzir latência com turmas grandes.
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

            await this.updateLocalId(tableName, item.record_id, supabaseRecord.id);

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

      console.log(`✅ Sincronização concluída: ${sucesso}/${records.length} registros em ${tableName}`);

    } catch (error) {
      await this.handleInsertError(tableName, items, error);
    }
  }

  // ============ MÉTODOS AUXILIARES ============

  , async prepareInsertRecords(tableName: string, items: SyncQueueItem[]) {
    const records = [];
    const itemsToProcess = [];
    
    // Mantém apenas o item mais recente por record_id para evitar múltiplos inserts do mesmo registro.
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
        // 1. Buscar registro do IndexedDB
        const record = await this.getRecordFromTable(tableName, item.record_id);
        
        if (!record) {
          console.warn(`🗑️  Registro não encontrado, removendo: ${item.record_id}`);
          await db.syncQueue.delete(item.id!);
          continue;
        }

        // Dependência: propina só pode sincronizar quando transacao_id já for remoto.
        if (
          tableName === 'propina' &&
          typeof record.transacao_id === 'string' &&
          record.transacao_id.startsWith('local_')
        ) {
          console.log(
            `⏳ Propina ${record.id} aguardando transação válida (${record.transacao_id}) antes do sync`
          );
          continue;
        }
        
        // 2. Verificar se já foi sincronizado (tem ID do Supabase)
        if (record.id && !record.id.toString().startsWith('local_')) {
          console.log(`✅ Já sincronizado, removendo: ${record.id}`);
          await db.syncQueue.delete(item.id!);
          continue;
        }
        
        // 3. Preparar registro para envio
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

  , cleanRecordForSupabase(record: any) {
    // Remove campos internos do Dexie
    const { sync_status, deleted, ...cleanRecord } = record;
    
    // Garante timestamps no formato ISO
    return {
      ...cleanRecord,
      created_at: record.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      
      // Remove ID local se existir
      ...(record.id && record.id.toString().startsWith('local_') 
        ? { id: undefined } 
        : {})
    };
  }

  , async executeUpsertToSupabase(tableName: string, records: any[]) {
    console.log(`📤 Enviando ${records.length} registros para ${tableName}`);
    
    // Define estratégia de upsert por tabela
    let onConflict = 'id';
     const processedRecords = this.processedRecords(records,tableName);
    
    // Remove duplicatas dentro do batch
    const uniqueRecords = this.processarRegistrosUnicos(processedRecords, tableName);
    
    console.log(`🔄 Upsert config:`, { tableName, onConflict, count: uniqueRecords.length });
    
    const { data, error } = await supabase
      .from(tableName)
      .upsert(uniqueRecords, { onConflict })
      .select();
    
    if (error) {
      console.error(`❌ Erro no upsert ${tableName}:`, error);
      
      // Tenta upsert sem onConflict se falhar
      if (error.code === '42501' || error.code === '23505') {
        console.log('🔄 Tentando upsert sem onConflict...');
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

  processedRecords(records:any[],tableName:string){
    switch (tableName) {
      case 'turmas':
        // Remove campos que não existem na tabela
        return records.map(record => {
          const { id,aulas, horarios, ...rest } = record;
          return rest;
        });
        
      case 'alunos':
        // Remove avaliação (se existir)
        return records.map(record => {
          const { id,avaliacao,curso, ...rest } = record;
          return rest;
        });
        // IMPORTANTE: Se tiver constraint unique no número do estudante
        
      case 'aulas':
        // Remove avaliação (se existir)
        return records.map(record => {
          const {id, registro,turmas, ...rest } = record;
          return rest;
        });

      case 'frequencias':
        return records.map(record => {
          const { id, ...rest } = record;
          return {
            ...rest,
            instituicao_id: rest.instituicao_id || instituicaoIdValue()
          };
        });
     case 'avaliacoes':
        return records.map(record => {
          const { id, peso,...rest } = record;
          return {
            ...rest,
            instituicao_id: rest.instituicao_id || instituicaoIdValue()
          };
        }); 
      case 'cursos':
        // Remove avaliação (se existir)
        return records.map(record => {
          const {id, alunos,has_active_turmas,turmas,turmas_count, ...rest } = record;
          return rest;
        });
      case 'system_config':
        return records.map((record) => {
          const { id, updated_by, ...rest } = record;
          return {
            ...rest,
            ...(isUuid(updated_by) ? { updated_by } : {})
          };
        });
        
      default:
        return records.map(record => {
          const {id, ...rest } = record;
          return rest;
        });
    }
  } 

  , async executeUpdateToSupabase(tableName: string, records: any[],record_id:string) {
    
    const processedRecords = this.processedRecords(records,tableName);
    // Remove duplicatas dentro do batch
    const uniqueRecords = this.processarRegistrosUnicos(processedRecords, tableName);
    
    console.log(`🔄 Update config:`, { tableName, count: uniqueRecords.length });
    
    const { data, error } = await supabase
      .from(tableName)
      .update(uniqueRecords)
      .eq('id', record_id)
      .select();
    
    if (error) {
      console.error(`❌ Erro no update ${tableName}:`, error);
      
      // Tenta upsert sem onConflict se falhar
      if (error.code === '42501' || error.code === '23505') {
        console.log('🔄 Tentando upsert sem onConflict...');
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
  }

  , removeBatchDuplicates(tableName: string, records: any[]) {
    const uniqueMap = new Map();
    const duplicates = [];
    
    records.forEach(record => {
      let key = record.id;
      
      if (tableName === 'alunos' && record.numero_estudante) {
        key = `aluno_${record.numero_estudante}`;
      } else if (tableName === 'turmas' && record.nome_turma && record.ano_letivo) {
        key = `turma_${record.nome_turma}_${record.ano_letivo}`;
      }
      
      if (key && uniqueMap.has(key)) {
        duplicates.push({ key, record });
      } else if (key) {
        uniqueMap.set(key, record);
      }
    });
    
    if (duplicates.length > 0) {
      console.warn(`⚠️ Removidas ${duplicates.length} duplicatas do batch ${tableName}`);
    }
    
    return Array.from(uniqueMap.values());
  }

  , async processSuccessResult(tableName: string, items: SyncQueueItem[], supabaseData: any[]) {
    console.log(`✅ Upsert bem-sucedido! Processando ${items.length} itens...`);
    
    const promises = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const supabaseRecord = supabaseData[i];
      
      if (!supabaseRecord || !supabaseRecord.id) {
        console.warn(`⚠️ Sem dados retornados para item ${item.record_id}`);
        continue;
      }
      
      // 1. Atualizar ID local no IndexedDB
      promises.push(
        this.updateLocalId(tableName, item.record_id, supabaseRecord.id)
          .catch(err => console.error(`Erro ao atualizar ID:`, err))
      );
      
      // 2. Processar dependências (turmas, cursos, etc.)
      if (tableName === 'turmas' || tableName === 'cursos') {
        promises.push(
          this.updateDependentRecords(tableName, supabaseRecord.id, item.record_id)
            .catch((err:any) => console.error(`Erro dependências:`, err))
        );
      }
      
      // 3. CRÍTICO: REMOVER DO SYNC QUEUE
      promises.push(
        db.syncQueue.delete(item.id!)
          .then(() => {
            console.log(`🗑️  Removido da fila: ${tableName} - ${item.id}`);
          })
          .catch(async (err) => {
            console.error(`❌ Erro ao remover ${item.id}:`, err);
            
            // Se não conseguir deletar, pelo menos marca como sincronizado
            await db.syncQueue.update(item.id!, { 
              status: 'synced',
              error: ""
            }).catch(() => {});
          })
      );
    }
    
    // Aguarda TODAS as promessas
    await Promise.allSettled(promises);
    
    console.log(`🎉 ${items.length} itens processados e removidos da fila!`);
  }

  , async updateLocalId(tableName: string, localId: string, supabaseId: string) {
    try {
      const instituicaoId = getSyncQueueInstitutionId();
      if (!localId || !supabaseId) return;
      if (localId === supabaseId) return;

      const table = db.table<any>(tableName);
      const localRecord = await table.get(localId);
      if (!localRecord) return;

      const existingRemoteRecord = await table.get(supabaseId);
      const now = new Date().toISOString();

      const mergedRecord = existingRemoteRecord
        ? {
            ...localRecord,
            ...existingRemoteRecord,
            id: supabaseId,
            sync_status: 'synced',
            deleted: false,
            updated_at: now
          }
        : {
            ...localRecord,
            id: supabaseId,
            sync_status: 'synced',
            deleted: false,
            updated_at: now
          };

      await db.transaction('rw', table, db.syncQueue, async () => {
        await table.put(mergedRecord);
        await table.delete(localId);

        const queueRefs = await db.syncQueue
          .where('record_id')
          .equals(localId)
          .and((item) => !instituicaoId || item.instituicao_id === instituicaoId)
          .toArray();

        for (const item of queueRefs) {
          await db.syncQueue.update(item.id!, { record_id: supabaseId });
        }
      });

      console.log(`🔄 ID migrado: ${localId} → ${supabaseId} (${tableName})`);

      await this.updateLocalIdRelatedReferences(tableName, localId, supabaseId);
    } catch (error) {
      console.error(`❌ Falha ao atualizar ID local ${localId}:`, error);
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
        table: tableName,
        record_id: recordId,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });
    }
  }

  , async updateLocalIdRelatedReferences(tableName: string, localId: string, supabaseId: string) {
    try {
      const instituicaoId = getSyncQueueInstitutionId();
      const now = new Date().toISOString();

      if (!instituicaoId) return;
      if (!localId || !supabaseId || localId === supabaseId) return;

      if (tableName === 'aulas') {
        await this.updateFrequenciasAulaReferences(localId, supabaseId);
        await this.updatePlanoAulasLocalReferences(localId, supabaseId);
        return;
      }

      if (tableName === 'alunos') {
        const [avaliacoes, frequencias, propinas, notificacoes] = await Promise.all([
          db.avaliacoes.where('aluno_id').equals(localId).and((r) => !r.deleted).toArray(),
          db.frequencias.where('aluno_id').equals(localId).and((r) => !r.deleted).toArray(),
          db.propina.where('aluno_id').equals(localId).and((r) => !r.deleted).toArray(),
          db.notificacao.where('aluno_id').equals(localId).and((r) => !r.deleted).toArray()
        ]);

        for (const av of avaliacoes) {
          await db.avaliacoes.update(av.id, { aluno_id: supabaseId, updated_at: now, sync_status: 'pending' });
          await this.enqueuePendingUpsertIfNeeded('avaliacoes', av.id, instituicaoId, now);
        }
        for (const fr of frequencias) {
          await db.frequencias.update(fr.id, { aluno_id: supabaseId, updated_at: now, sync_status: 'pending' });
          await this.enqueuePendingUpsertIfNeeded('frequencias', fr.id, instituicaoId, now);
        }
        for (const pp of propinas) {
          await db.propina.update(pp.id, { aluno_id: supabaseId, updated_at: now, sync_status: 'pending' });
          await this.enqueuePendingUpsertIfNeeded('propina', pp.id, instituicaoId, now);
        }
        for (const nt of notificacoes) {
          await db.notificacao.update(nt.id, { aluno_id: supabaseId, updated_at: now, sync_status: 'pending' });
          await this.enqueuePendingUpsertIfNeeded('notificacao', nt.id, instituicaoId, now);
        }
        return;
      }

      if (tableName === 'transacoes') {
        const propinas = await db.propina
          .filter((r) => !r.deleted && r.transacao_id === localId)
          .toArray();

        for (const pp of propinas) {
          await db.propina.update(pp.id, {
            transacao_id: supabaseId,
            updated_at: now,
            sync_status: 'pending'
          });
          await this.enqueuePendingUpsertIfNeeded('propina', pp.id, instituicaoId, now);
        }
        return;
      }

      if (tableName === 'turmas') {
        const [alunos, aulas, horarios, avaliacoes, eventos, notificacoes, planos] = await Promise.all([
          db.alunos.where('turma_id').equals(localId).and((r) => !r.deleted).toArray(),
          db.aulas.where('turma_id').equals(localId).and((r) => !r.deleted).toArray(),
          db.turma_horarios.where('turma_id').equals(localId).and((r) => !r.deleted).toArray(),
          db.avaliacoes.where('turma_id').equals(localId).and((r) => !r.deleted).toArray(),
          db.evento.where('turma_id').equals(localId).and((r) => !r.deleted).toArray(),
          db.notificacao.where('turma_id').equals(localId).and((r) => !r.deleted).toArray(),
          db.plano_aulas
            .filter((plano) => !plano.deleted && Array.isArray(plano.turma_ids) && plano.turma_ids.includes(localId))
            .toArray()
        ]);

        for (const al of alunos) {
          await db.alunos.update(al.id, { turma_id: supabaseId, updated_at: now, sync_status: 'pending' });
          await this.enqueuePendingUpsertIfNeeded('alunos', al.id, instituicaoId, now);
        }
        for (const au of aulas) {
          await db.aulas.update(au.id, { turma_id: supabaseId, updated_at: now, sync_status: 'pending' });
          await this.enqueuePendingUpsertIfNeeded('aulas', au.id, instituicaoId, now);
        }
        for (const hr of horarios) {
          await db.turma_horarios.update(hr.id, { turma_id: supabaseId, updated_at: now, sync_status: 'pending' });
          await this.enqueuePendingUpsertIfNeeded('turma_horarios', hr.id, instituicaoId, now);
        }
        for (const av of avaliacoes) {
          await db.avaliacoes.update(av.id, { turma_id: supabaseId, updated_at: now, sync_status: 'pending' });
          await this.enqueuePendingUpsertIfNeeded('avaliacoes', av.id, instituicaoId, now);
        }
        for (const ev of eventos) {
          await db.evento.update(ev.id, { turma_id: supabaseId, updated_at: now, sync_status: 'pending' });
          await this.enqueuePendingUpsertIfNeeded('evento', ev.id, instituicaoId, now);
        }
        for (const nt of notificacoes) {
          await db.notificacao.update(nt.id, { turma_id: supabaseId, updated_at: now, sync_status: 'pending' });
          await this.enqueuePendingUpsertIfNeeded('notificacao', nt.id, instituicaoId, now);
        }
        for (const plano of planos) {
          const turmaIds = Array.from(
            new Set((plano.turma_ids || []).map((turmaId: string) => (turmaId === localId ? supabaseId : turmaId)))
          );
          await db.plano_aulas.update(plano.id, { turma_ids: turmaIds, updated_at: now, sync_status: 'pending' });
          await this.enqueuePendingUpsertIfNeeded('plano_aulas', plano.id, instituicaoId, now);
        }
        return;
      }

      if (tableName === 'cursos') {
        const turmas = await db.turmas
          .where('curso_id')
          .equals(localId)
          .and((r) => !r.deleted)
          .toArray();

        for (const turma of turmas) {
          await db.turmas.update(turma.id, { curso_id: supabaseId, updated_at: now, sync_status: 'pending' });
          await this.enqueuePendingUpsertIfNeeded('turmas', turma.id, instituicaoId, now);
        }
      }
    } catch (error) {
      console.error(`❌ Erro ao atualizar referências locais para ${tableName}:`, error);
    }
  }

  , async updatePlanoAulasLocalReferences(oldAulaId: string, newAulaId: string) {
    try {
      const instituicaoId = getSyncQueueInstitutionId();
      const planos = await db.plano_aulas
        .filter((plano) =>
          !plano.deleted &&
          Array.isArray(plano.aulas_geradas) &&
          plano.aulas_geradas.includes(oldAulaId)
        )
        .toArray();

      if (planos.length === 0) return;

      const now = new Date().toISOString();

      for (const plano of planos) {
        const aulasAtualizadas = Array.from(
          new Set(
            (plano.aulas_geradas || []).map((aulaId) =>
              aulaId === oldAulaId ? newAulaId : aulaId
            )
          )
        );

        await db.plano_aulas.update(plano.id, {
          aulas_geradas: aulasAtualizadas,
          updated_at: now,
          sync_status: 'pending'
        });

        const hasPendingUpsert = await db.syncQueue
          .where('table')
          .equals('plano_aulas')
          .filter(
            (item) =>
              item.instituicao_id === instituicaoId &&
              item.record_id === plano.id &&
              item.operation === 'upsert' &&
              item.status === 'pending'
          )
          .first();

        if (!hasPendingUpsert) {
          await db.syncQueue.add({
            instituicao_id: instituicaoId,
            table: 'plano_aulas',
            record_id: plano.id,
            operation: 'upsert',
            status: 'pending',
            created_at: now
          });
        }
      }

      console.log(
        `🔗 Referências de plano atualizadas para aula: ${oldAulaId} → ${newAulaId} (${planos.length} plano(s))`
      );
    } catch (error) {
      console.error('❌ Erro ao atualizar referências de aulas em plano_aulas:', error);
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

      console.log(
        `🔗 Referências de frequência atualizadas para aula: ${oldAulaId} → ${newAulaId} (${frequencias.length} frequência(s))`
      );
    } catch (error) {
      console.error('❌ Erro ao atualizar aula_id em frequências:', error);
    }
  }

  , async handleInsertError(tableName: string, items: SyncQueueItem[], error: any) {
    console.error(`❌ Erro fatal em ${tableName}:`, error);
    
    // Para cada item, marca como erro (para retentativa posterior)
    for (const item of items) {
      try {
        await db.syncQueue.update(item.id!, {
          status: 'failed',
          error: error.message?.substring(0, 200) || 'Erro desconhecido',
          retryCount: (item.retryCount || 0) + 1,
          data: new Date().toISOString()
        });
      } catch (updateError) {
        console.error(`❌ Não consegui marcar erro no item ${item.id}:`, updateError);
      }
    }
  }

  , async markItemAsError(item: SyncQueueItem, error: Error) {
    try {
      await db.syncQueue.update(item.id!, {
        status: 'failed',
        error: error.message?.substring(0, 200) || 'Erro ao preparar',
        retryCount: (item.retryCount || 0) + 1,
        data: new Date().toISOString()
      });
    } catch (updateError) {
      console.error(`❌ Falha ao marcar erro no item ${item.id}:`, updateError);
    }
  },

  async checkExistingNotificacao(record: any): Promise<any> {
    try {
      // ✅ Verificar se já existe uma notificação similar
      // Pode usar combinação de campos únicos como referência
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
      
      // Se tiver um ID de referência, verificar por ele
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

  async handleDuplicateInsert(tableName: string, records: any[], items: SyncQueueItem[], authData: any) {
    // Processar registros individualmente para tratar duplicidades
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const item = items[i];
      
      try {
        let result;
        
        // ✅ CORREÇÃO: Configurações específicas por tabela
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
          // ✅ CORREÇÃO: Para notificacao, upsert normal
          const { data, error } = await supabase
            .from(tableName)
            .upsert(record)
            .select()
            .single();
          
          if (error) throw error;
          result = data;
          
        } else {
          // Para outras tabelas, upsert padrão
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
          await this.updateLocalId(tableName, item.record_id, result.id);
          await db.syncQueue.delete(item.id!);
        }
        
      } catch (error) {
        console.error(`❌ Erro processando registro individual em ${tableName}:`, error);
        await this.handleSyncError(item, error);
      }
    }
  },


  // Métodos auxiliares adicionais:

  async checkExistingUniqueConstraint(tableName: string, record: any): Promise<any> {
    try {
      // Para system_config, verificar pelo par category/key_name + instituicao_id
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
      
      // Adicionar verificações para outras tabelas conforme necessário
      return null;
    } catch (error) {
      console.error('Erro ao verificar constraint única:', error);
      return null;
    }
  },

  async convertInsertToUpdate(tableName: string, item: SyncQueueItem, existingId: string) {
    try {
      // Atualizar o ID local para o ID existente
      await this.updateLocalId(tableName, item.record_id, existingId);
      
      // Mudar o tipo de operação na fila de INSERT para UPDATE
      await db.syncQueue.update(item.id!, {
        operation: 'upsert',
        record_id: existingId // Usar o ID existente
      });
      
      console.log(`🔄 Convertido INSERT para UPDATE: ${tableName} - ID: ${existingId}`);
    } catch (error) {
      console.error('Erro ao converter INSERT para UPDATE:', error);
    }
  },
  
  // ✅ Processar UPDATE individual (mais seguro)
  async processSingleUpdate(tableName: string, item: SyncQueueItem) {
    const { getAuthData } = useSyncAuthInManager();
    const authData = getAuthData();
    
    try {
      const record = await this.getRecordFromTable(tableName, item.record_id);
      if (!record) {
        await db.syncQueue.delete(item.id!);
        return;
      }
      
      // Remover campos internos do Dexie
      const { id, sync_status, deleted, createdAt, updated_at, ...cleanRecord } = record;
      
      // ✅ ADICIONAR CAMPOS PARA RLS

      const recordWithRLS = {
        ...cleanRecord,
        updated_at: new Date().toISOString(),
        created_at: createdAt || record.created_at || new Date().toISOString(),
        };
      const supabaseResult = await this.executeUpdateToSupabase(tableName, [recordWithRLS], item.record_id);
      
      if (supabaseResult.error) throw supabaseResult.error;
      
      // Marcar como sincronizado
      await this.markAsSynced(tableName, item.record_id);
      await db.syncQueue.delete(item.id!);
      
      console.log(`✅ ${tableName} ${item.record_id} atualizado`);
      
    } catch (error) {
      console.error(`❌ Erro atualizando ${tableName} ${item.record_id}:`, error);
      await this.handleSyncError(item, error);
    }
  },
  
  // ✅ Processar DELETEs em batch
  async processDeleteBatch(tableName: string, items: SyncQueueItem[]) {
    const { getAuthData } = useSyncAuthInManager();
    const authData = getAuthData();
    
    // Filtrar apenas IDs que não são locais
    const idsToDelete = items
      .filter(item => !item.record_id.startsWith('local_'))
      .map(item => item.record_id);
    
    
    if (idsToDelete.length === 0) {
      // Apenas deletar localmente
      for (const item of items) {
        await this.deleteLocalRecord(tableName, item.record_id);
        await db.syncQueue.delete(item.id!);
      }
      return;
    }
    
    // Verificar permissões para deletar
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
    
    // Deletar no Supabase em batch
    const { error } = await supabase
      .from(tableName)
      .delete()
      .in('id', idsToDelete);
    
    if (error) {
      console.error(`❌ Erro deletando batch de ${tableName}:`, error);
      throw error;
    }
    
    // Deletar localmente
    for (const item of items) {
      await this.deleteLocalRecord(tableName, item.record_id);
      await db.syncQueue.delete(item.id!);
    }
    
    console.log(`✅ ${idsToDelete.length} registros deletados de ${tableName}`);
  },
  
  // ✅ Funções auxiliares
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
  
  async deleteLocalRecord(tableName: string, recordId: string) {
    const table = db.table<any>(tableName);
    await table.delete(recordId);
  },
  
  async handleSyncError(item: SyncQueueItem, error: any) {
    const novasTentativas = (item.retryCount || 0) + 1;
    const errorCode = error?.code || error?.status || 'unknown';
    
    if (novasTentativas >= 3) {
      // Marcar como falha permanente
      await db.syncQueue.update(item.id!, {
        status: 'failed',
        error: error.message,
        retryCount: novasTentativas,
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
      // Tentar novamente mais tarde
      await db.syncQueue.update(item.id!, {
        retryCount: novasTentativas,
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
  },
  
  async downloadBatch() {
    try {
      const { getAuthData } = useSyncAuthInManager();
      const authData = getAuthData();
      
      if (!authData.isAuthenticated) {
        console.warn('⚠️ Sessão não encontrada no storage; tentando download mesmo assim.');
      }
      
      console.log('📥 Iniciando download em batch...');
      
      // 1. Buscar timestamp da última sincronização
      const lastSync = localStorage.getItem(`last_sync_global`);
      const lastSyncDate = lastSync ? new Date(lastSync) : new Date(0);
      
      // 2. Baixar cada tabela em batch (com base nas permissões)
      const { hasPermission } = useSyncAuthInManager();
      
      const tables = [
        'cursos', 'turmas', 'alunos', 'transacoes', 'aulas', 
        'propina', 'frequencias', 'tarefas', 'metas', 'rotinas',
        'evento', 'profiles', 'instituicao', 'notificacao','avaliacoes','turma_horarios',"planeamentos","plano_aulas"
      ];
      
      for (const tableName of tables) {
        // Verificar permissões para tabelas sensíveis
        if (tableName === 'profiles' || tableName === 'instituicao') {
          if (!hasPermission('admin')) {
            console.log(`⏭️  Pulando ${tableName} (permissão insuficiente)`);
            continue;
          }
        }
        
        console.log(`📥 Baixando ${tableName}...`);
        const tableLastSync = localStorage.getItem(`last_sync_${tableName}`);
        const tableLastSyncDate = tableLastSync ? new Date(tableLastSync) : lastSyncDate;
        await this.downloadTableBatch(tableName, tableLastSyncDate);
        await new Promise(resolve => setTimeout(resolve, 300)); // Pausa entre tabelas
      }
      
      // 3. Atualizar timestamp global
      localStorage.setItem('last_sync_global', new Date().toISOString());
      
      console.log('✅ Download batch concluído');
      
    } catch (error) {
      console.error('❌ Erro no download batch:', error);
    }
  },
  
  // ✅ Baixar tabela específica em batch
  async downloadTableBatch(tableName: string, since: Date) {
    try {
      const { getAuthData, hasPermission } = useSyncAuthInManager();
      const authData = getAuthData();
      const localCount = await db.table(tableName).count();
      const shouldForceFullSync = localCount === 0;
      
      // Buscar dados do Supabase (após a última sincronização)
      let query = supabase
        .from(tableName)
        .select('*')
        .order('updated_at', { ascending: true })
        .limit(500);

      if (!shouldForceFullSync && since && Number.isFinite(since.getTime()) && since.getTime() > 0) {
        query = query.gt('updated_at', since.toISOString());
      } else if (shouldForceFullSync) {
        console.log(`♻️ ${tableName}: tabela local vazia, executando full sync`);
      }
      
      // Filtrar por instituição se não for admin
      if (tableName !== 'profiles' && tableName !== 'instituicao' && !hasPermission('admin')) {
        const instituicaoId = localStorage.getItem('active_instituicao_id');
        if (instituicaoId) {
          query = query.eq('instituicao_id', instituicaoId);
        }
      }
      
      const { data: remoteData, error } = await query;
      
      if (error) {
        console.error(`❌ Erro buscando ${tableName}:`, error);
        return;
      }
      
      if (!remoteData || remoteData.length === 0) {
        console.log(`📭 Nenhum dado novo em ${tableName}`);
        localStorage.setItem(`last_sync_${tableName}`, new Date().toISOString());
        return;
      }
      
      console.log(`📥 ${remoteData.length} registros encontrados em ${tableName}`);
      
      // Processar em lotes menores para não sobrecarregar o IndexedDB
      const batchSize = 50;
      for (let i = 0; i < remoteData.length; i += batchSize) {
        const batch = remoteData.slice(i, i + batchSize);
        await this.processDownloadBatch(tableName, batch);
        console.log(`   Processado ${Math.min(i + batchSize, remoteData.length)}/${remoteData.length}`);
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
      
    } catch (error) {
      console.error(`❌ Erro baixando ${tableName}:`, error);
    }
  },
  
  // ✅ Processar lote de download
  async processDownloadBatch(tableName: string, batch: any[]) {
    const table = db.table<any>(tableName);
    
    // Usar transaction para melhor performance
    await db.transaction('rw', table, async () => {
      for (const remoteRecord of batch) {
        try {
          // Verificar se já existe localmente
          const localRecord = await table.get(remoteRecord.id);
          
          if (!localRecord) {
            // Novo registro - inserir
            await table.put({
              ...remoteRecord,
              sync_status: 'synced',
              deleted: false
            });
          } else if (localRecord.sync_status === 'synced') {
            // Atualizar apenas se já estiver sincronizado
            const localUpdated = new Date(localRecord.updated_at || 0);
            const remoteUpdated = new Date(remoteRecord.updated_at || 0);
            
            if (remoteUpdated > localUpdated) {
              // Manter campos de controle do Dexie
              await table.put({
                ...localRecord,
                ...remoteRecord,
                sync_status: 'synced'
              });
            }
          }
          // Se está 'pending', mantém as alterações locais
          
        } catch (recordError) {
          console.error(`❌ Erro processando registro ${remoteRecord.id}:`, recordError);
        }
      }
    });
  }


  ,async updateDependentRecords(tableName: string, newId: string, oldId: string) {
    try {
      switch (tableName) {
        case 'cursos':
          console.log('🔄 Atualizando dependências do curso:', newId);
          // Atualizar turmas associadas a este curso
          const turmasDoCurso = await turmaService.getTurmasPorCurso(oldId);
          for (const turma of turmasDoCurso) {
            await turmaService.editTurma(turma.id, {
              ...turma,
              curso_id: newId
            });
          }
          break;

        case 'turmas':
          console.log('🔄 Atualizando dependências da turma:', newId);
          // Atualizar múltiplas entidades dependentes
          await Promise.all([
            // Alunos
            alunosService.getAlunosPorTurma(oldId).then(alunos => {
              const promises = alunos.map(aluno => 
                alunosService.updateStudent(aluno.id, {
                  ...aluno,
                  turma_id: newId
                })
              );
              return Promise.allSettled(promises);
            }),
            
            // Aulas
            aulaService.getAulasPorTurma(oldId).then(aulas => {
              const promises = aulas.map(aula => 
                aulaService.atualizarAula(aula.id, {
                  ...aula,
                  turma_id: newId
                })
              );
              return Promise.allSettled(promises);
            }),
            
            // Horários
            turmaService.getHorarios(oldId).then(horarios => {
              const promises = horarios.map(horario => 
                turmaService.updateHorario(horario.id, {
                  ...horario,
                  turma_id: newId
                })
              );
              return Promise.allSettled(promises);
            }),
            
            // Avaliações
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
          console.log(`ℹ️ Nenhuma dependência conhecida para ${tableName}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao atualizar dependências de ${tableName}:`, error);
    }
  },

  // Função para verificar e limpar syncQueue manualmente
  async verifyAndCleanSyncQueue() {
    console.log('🔍 Verificando estado do syncQueue...');
    
    try {
      const instituicaoId = getSyncQueueInstitutionId();
      if (!instituicaoId) return { total: 0, byStatus: {}, cleaned: 0 };

      // 1. Contar itens por status
      const allItems = await db.syncQueue
        .where('instituicao_id')
        .equals(instituicaoId)
        .toArray();
      
      const byStatus = allItems.reduce((acc: Record<string, number>, item) => {
        const status = item.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      
      console.log('📊 Status do syncQueue:', byStatus);
      
      // 2. Verificar itens "synced" que não foram removidos (BUG)
      const syncedItems = allItems.filter(item => item.status === 'synced');
      
      if (syncedItems.length > 0) {
        console.warn(`⚠️ Encontrados ${syncedItems.length} itens "synced" não removidos!`);
        
        // Remove todos os itens marcados como synced
        const idsToDelete = syncedItems.map(item => item.id!).filter(Boolean);
        
        if (idsToDelete.length > 0) {
          await db.syncQueue.bulkDelete(idsToDelete);
          console.log(`🗑️  Removidos ${idsToDelete.length} itens "synced" pendentes`);
        }
      }
      
      // 3. Verificar itens com muitas tentativas falhas
      const failedItems = allItems.filter(item => 
        (item.retryCount || 0) > 5 && 
        item.status === 'failed'
      );
      
      if (failedItems.length > 0) {
        console.warn(`⚠️ ${failedItems.length} itens com +5 tentativas falhas`);
        // Você pode decidir remover ou marcar como permanente
        const idsToClean = failedItems.map(item => item.id!).filter(Boolean);
        await db.syncQueue.bulkDelete(idsToClean);
        console.log(`🧹 Limpados ${idsToClean.length} itens com muitas falhas`);
      }

      // 4. Limpar órfãos failed (registros que já não existem no Dexie)
      const orphanCleanup = await this.cleanupOrphanedSyncQueue({
        statuses: ['failed'],
        dryRun: false
      });
      if (orphanCleanup.deletedCount > 0) {
        console.log(`🧹 Limpados ${orphanCleanup.deletedCount} órfãos failed da syncQueue`);
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

  // Debug para identificar problemas
  async debugSyncQueueIssue(tableName: string) {
    console.log(`🔍 DEBUG: Investigando syncQueue para ${tableName}`);
    const instituicaoId = getSyncQueueInstitutionId();
    
    const items = await db.syncQueue
      .where('table').equals(tableName)
      .and((item) => !instituicaoId || item.instituicao_id === instituicaoId)
      .toArray();
    
    console.log(`📋 ${items.length} itens na fila para ${tableName}:`);
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`  ${i + 1}. ID: ${item.id}, Status: ${item.status}, Tentativas: ${item.retryCount || 0}, Operação: ${item.operation}`);
      
      // Verificar se o registro ainda existe
      const exists = await this.checkIfRecordExists(tableName, item.record_id);
      if (!exists) {
        console.warn(`    ⚠️ Registro ${item.record_id} não existe mais!`);
        // Remove item órfão
        await db.syncQueue.delete(item.id!);
        console.log(`    🗑️  Item removido por ser órfão`);
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

  // Limpeza forçada do syncQueue
  async forceCleanSyncQueue(tableName?: string) {
    try {
      const instituicaoId = getSyncQueueInstitutionId();
      if (!instituicaoId) return;
      const items = await db.syncQueue
        .where('instituicao_id')
        .equals(instituicaoId)
        .and((item) => !tableName || item.table === tableName)
        .toArray();
      console.log(`🧹 Limpando ${items.length} itens do syncQueue...`);
      
      // Remove em batches para evitar timeout
      const batchSize = 50;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const ids = batch.map(item => item.id!).filter(Boolean);
        
        if (ids.length > 0) {
          await db.syncQueue.bulkDelete(ids);
          console.log(`✅ Batch ${i/batchSize + 1}: ${ids.length} itens removidos`);
        }
      }
      
      console.log(`🎉 Limpeza concluída!`);
      
    } catch (error) {
      console.error('❌ Erro na limpeza forçada:', error);
    }
  },

  // Retentativa de itens com erro
  async retryFailedItems(maxRetries: number = 3) {
    try {
      const instituicaoId = getSyncQueueInstitutionId();
      if (!instituicaoId) return;
      const failedItems = await db.syncQueue
        .where('instituicao_id').equals(instituicaoId)
        .filter(item => item.status === 'failed' && (item.retryCount || 0) < maxRetries)
        .toArray();
      
      if (failedItems.length === 0) {
        console.log('✅ Nenhum item para retentativa');
        return;
      }
      
      console.log(`🔄 Tentando novamente ${failedItems.length} itens com erro...`);
      
      // Agrupar por tabela e processar
      const itemsByTable = this.groupByTable(failedItems);
      
      for (const [tableName, items] of Object.entries(itemsByTable)) {
        // Resetar status para pending
        const ids = items.map(item => item.id!).filter(Boolean);
        await db.syncQueue.bulkUpdate(ids, {          
          status: 'pending',
          data: "",
          error: ""
        });
        
        // Processar a tabela novamente
        await this.processTableBatch(tableName, items);
      }
      
    } catch (error) {
      console.error('❌ Erro na retentativa:', error);
    }
  },

  // Método para obter estatísticas de sincronização
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

  // Método para limpar itens antigos da fila
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
        console.log(`🧹 Limpados ${ids.length} itens antigos (>${maxAgeHours}h)`);
      }
    } catch (error) {
      console.error('❌ Erro ao limpar itens antigos:', error);
    }
  },

  // Método para verificar integridade da fila
  async verifyQueueIntegrity():Promise<any> {
    console.log('🔍 Verificando integridade do syncQueue...');
    
    const issues = [];
    const instituicaoId = getSyncQueueInstitutionId();
    const allItems = instituicaoId
      ? await db.syncQueue.where('instituicao_id').equals(instituicaoId).toArray()
      : [];
    
    for (const item of allItems) {
      // Verificar se tem ID
      if (!item.id) {
        issues.push({ item, problem: 'Sem ID' });
        continue;
      }
      
      // Verificar se tem tabela
      if (!item.table) {
        issues.push({ item, problem: 'Sem tabela' });
        continue;
      }
      
      // Verificar se tem record_id
      if (!item.record_id) {
        issues.push({ item, problem: 'Sem record_id' });
        continue;
      }
      
      // Verificar se a tabela existe no banco local
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
    
    console.log('✅ Integridade do syncQueue verificada');
    return { ok: true, issues: [] };
  },

  // Método para resetar completamente a fila (usar com cuidado!)
  async resetSyncQueue() {
    if (!confirm('⚠️ Tem certeza que deseja resetar completamente a fila de sincronização? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      await db.syncQueue.clear();
      console.log('🗑️  SyncQueue resetada completamente');
      
      // Opcional: marcar todos os registros como não sincronizados
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
      
      console.log('✅ Reset completo concluído');
    } catch (error) {
      console.error('❌ Erro ao resetar syncQueue:', error);
    }
  }
,
  async cleanupLegacyLocalDuplicates(tables: string[] = ['alunos', 'turmas', 'aulas']) {
    const instituicaoId = getSyncQueueInstitutionId();
    const buildFingerprint = (tableName: string, record: any): string | null => {
      if (!record || record.deleted) return null;

      switch (tableName) {
        case 'alunos':
          if (!record.numero_estudante) return null;
          return `aluno:${record.numero_estudante}`;
        case 'turmas':
          if (!record.nome_turma || !record.ano_letivo) return null;
          return `turma:${record.nome_turma}|${record.ano_letivo}|${record.curso_id || ''}`;
        case 'aulas':
          return [
            'aula',
            record.turma_id || '',
            record.data_aula || '',
            record.hora_inicio || '',
            record.hora_fim || '',
            record.disciplina || '',
            record.tema_aula || ''
          ].join(':');
        default:
          return null;
      }
    };

    for (const tableName of tables) {
      try {
        const table = db.table<any>(tableName);
        const records = await table.toArray();
        if (!records.length) continue;

        const byFingerprint = new Map<string, any[]>();
        for (const record of records) {
          const fingerprint = buildFingerprint(tableName, record);
          if (!fingerprint) continue;
          if (!byFingerprint.has(fingerprint)) byFingerprint.set(fingerprint, []);
          byFingerprint.get(fingerprint)!.push(record);
        }

        const idsToDelete: string[] = [];

        for (const [, group] of byFingerprint.entries()) {
          if (group.length <= 1) continue;

          group.sort((a, b) => {
            const aLocal = String(a.id || '').startsWith('local_');
            const bLocal = String(b.id || '').startsWith('local_');
            if (aLocal !== bLocal) return aLocal ? 1 : -1; // prioriza remoto

            const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
            const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
            return bTime - aTime; // prioriza mais recente
          });

          const kept = group[0];
          const duplicates = group.slice(1);

          for (const duplicate of duplicates) {
            if (duplicate.id === kept.id) continue;
            if (!String(duplicate.id || '').startsWith('local_')) continue;
            idsToDelete.push(duplicate.id);
          }
        }

        if (idsToDelete.length === 0) continue;

        const uniqueIds = Array.from(new Set(idsToDelete));
        await table.bulkDelete(uniqueIds);

        await db.syncQueue
          .where('table')
          .equals(tableName)
          .filter((item) => uniqueIds.includes(item.record_id) && (!instituicaoId || item.instituicao_id === instituicaoId))
          .delete();

        console.log(`🧹 Removidos ${uniqueIds.length} duplicados locais de ${tableName}`);
      } catch (error) {
        console.error(`❌ Erro ao limpar duplicados legados em ${tableName}:`, error);
      }
    }
  }
};





// Função para configurar sincronização automática
export const setupAutoSync = () => {
  console.log('⚙️ Configurando sincronização automática...');
  
  // Sincronizar quando a conexão voltar
  window.addEventListener('online', async () => {
    console.log('🌐 Conexão restaurada, sincronizando...');
    await syncManager.uploadBatch();
    await syncManager.downloadBatch();
  });
  
  // Sincronizar periodicamente
  const syncInterval = setInterval(async () => {
    if (navigator.onLine) {
      try {
        await syncManager.uploadBatch();
        // Baixar apenas a cada 5 minutos para economizar banda
        if (Date.now() % (5 * 60 * 1000) < 5000) {
          await syncManager.downloadBatch();
        }
      } catch (error) {
        console.error('❌ Erro na sincronização periódica:', error);
      }
    }
  }, 30000); // A cada 30 segundos
  
  // Limpar itens antigos uma vez por dia
  const cleanupInterval = setInterval(async () => {
    await syncManager.cleanupOldItems(24);
    await syncManager.verifyQueueIntegrity();
  }, 24 * 60 * 60 * 1000); // A cada 24 horas
  
  // Verificar integridade a cada hora
  const integrityInterval = setInterval(async () => {
    await syncManager.verifyQueueIntegrity();
  }, 60 * 60 * 1000); // A cada hora
  
  return {
    stop: () => {
      clearInterval(syncInterval);
      clearInterval(cleanupInterval);
      clearInterval(integrityInterval);
      console.log('🛑 Sincronização automática parada');
    }
  };
};


// Adicione também estas funções utilitárias fora do objeto:

// Função para monitorar o progresso da sincronização
export const createSyncMonitor = () => {
  let lastStats: any = null;
  
  return {
    async monitor() {
      const stats = await syncManager.getSyncStats();
      const changed = JSON.stringify(stats) !== JSON.stringify(lastStats);
      
      if (changed) {
        console.log('📈 Stats de sincronização:', stats);
        lastStats = stats;
        
        // Emitir evento customizado para UI
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

// Função de inicialização para usar no Sidebar
export const initializeSyncSystem = async () => {
  try {
    // Inicializar sistema de sincronização
    console.log('🚀 Inicializando sistema de sincronização...');
    
    // Verificar se há conexão com a internet
    if (navigator.onLine) {
      // Tentar sincronizar automaticamente
      await syncManager.downloadBatch();
      
      // Agendar sincronização periódica
      setInterval(async () => {
        if (navigator.onLine) {
          await syncManager.uploadBatch();
          await syncManager.downloadBatch();
        }
      }, 30000); // A cada 30 segundos
    }
    
    console.log('✅ Sistema de sincronização inicializado');
  } catch (error) {
    console.error('❌ Erro ao inicializar sistema de sincronização:', error);
  }
}

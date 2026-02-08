// src/services/database/syncManager.ts
import { alunosService, aulaService, frequenciaService, turmaService } from ".";
import { SyncQueueItem } from "../../types/base";
import { avaliacaoService } from "./avaliacao";
import db, { supabase } from "./db";


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
  debugSyncQueueIssue(tableName:string):any;
  cleanupOldItems(maxAgeHours:number):any;
  checkIfRecordExists(tableName: string, recordId: string): Promise<boolean>;
  forceCleanSyncQueue(tableName?: string):any
  retryFailedItems(maxRetries: number):any
  getSyncStats():Promise<any>
  verifyQueueIntegrity():Promise<any>
}

// Hook personalizado para usar dentro do manager
const useSyncAuthInManager = () => {
  // Esta função simula o hook, mas pode ser chamada em qualquer lugar
  const getAuthData = () => {
    // Tentar obter do localStorage primeiro (para contexto não React)
    console.log(localStorage.getItem('user_role'))
    const token = localStorage.getItem('jwt_token') || 
                  localStorage.getItem('supabase.auth.token');
    const userRole = localStorage.getItem('user_role') || 'user';
    const userId = localStorage.getItem('user_id');
    
    return {
      authToken: token,
      userRole,
      userId,
      isAuthenticated: !!token
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

// Instância do SyncManager
export const syncManager: SyncManager = {
  // ✅ UPLOAD em BATCH (otimizado)
  async uploadBatch() {
    try {
      const { getAuthData } = useSyncAuthInManager();
      
      const authData = getAuthData();
      console.log(authData)
      if (!authData.isAuthenticated) {
        console.warn('⚠️ Usuário não autenticado. Upload adiado.');
        return;
      }
      
      console.log('🔄 Iniciando upload em batch...');
      
      // 1. Agrupar itens por tabela
      const pendingItems = await db.syncQueue
        .where('status')
        .equals('pending')
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
     
    const pendingItems = await db.syncQueue
        .where('status')
        .equals('pending')
        .and(item => item.table === tableName )
        .toArray();
      console.log(`📤 Processando batch de ${pendingItems.length} ${tableName}...`);
      await this.processTableBatch(tableName, pendingItems);
      
  },


  async rentryErrorsTable (tableName: string) {
     
    const pendingItems = await db.syncQueue
        .where('status')
        .equals('failed')
        .and(item => item.table === tableName )
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
      
      // Separar INSERTs e UPDATEs
      const inserts = items.filter(item => item.operation === 'upsert' && item.record_id.startsWith('local_'));
      const updates = items.filter(item => item.operation === 'upsert' && !item.record_id.startsWith('local_'));
      const deletes = items.filter(item => item.operation === 'delete');

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
      console.warn(`⚠️ Usuário não autenticado. Ignorando INSERTs em ${tableName}`);
      return;
    }
    
    try {
      console.log(`🔄 Processando ${items.length} INSERTs em ${tableName}`);
      
      // PASSO 1: Preparar registros válidos
      const { records, itemsToProcess } = await this.prepareInsertRecords(tableName, items);
      
      if (records.length === 0) {
        console.log(`✅ Nada para sincronizar em ${tableName}`);
        return;
      }
      
      // PASSO 2: Executar upsert no Supabase
      const supabaseResult = await this.executeUpsertToSupabase(tableName, records);
      
      if (!supabaseResult.data || supabaseResult.data.length === 0) {
        throw new Error('Nenhum dado retornado do Supabase');
      }
      
      // PASSO 3: Atualizar IDs locais e LIMPAR SYNC QUEUE (CRÍTICO!)
      await this.processSuccessResult(tableName, itemsToProcess, supabaseResult.data);
      
      console.log(`✅ Sincronização concluída: ${records.length} registros em ${tableName}`);
      
    } catch (error) {
      await this.handleInsertError(tableName, items, error);
    }
  }

  // ============ MÉTODOS AUXILIARES ============

  , async prepareInsertRecords(tableName: string, items: SyncQueueItem[]) {
    const records = [];
    const itemsToProcess = [];
    
    for (const item of items) {
      try {
        // 1. Buscar registro do IndexedDB
        const record = await this.getRecordFromTable(tableName, item.record_id);
        
        if (!record) {
          console.warn(`🗑️  Registro não encontrado, removendo: ${item.record_id}`);
          await db.syncQueue.delete(item.id!);
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
    let processedRecords = records;
    
    switch (tableName) {
      case 'system_config':
        onConflict = 'category,name';
        break;
        
      case 'turmas':
        // Remove campos que não existem na tabela
        processedRecords = records.map(record => {
          const { aulas, horarios, ...rest } = record;
          return rest;
        });
        break;
        
      case 'alunos':
        // Remove avaliação (se existir)
        processedRecords = records.map(record => {
          const { avaliacao, ...rest } = record;
          return rest;
        });
        // IMPORTANTE: Se tiver constraint unique no número do estudante
        onConflict = 'numero_estudante';
        break;
        
      default:
        processedRecords = records.map(record => {
          const { id, ...rest } = record;
          return rest;
        });
        // Para outras tabelas, mantém como está
        break;
    }
    
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
      const table = db.table(tableName);
      await table.update(localId, { id: supabaseId });
      console.log(`🔄 ID atualizado: ${localId} → ${supabaseId} (${tableName})`);
    } catch (error) {
      console.error(`❌ Falha ao atualizar ID local ${localId}:`, error);
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
              onConflict: 'category,name'
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
      // Para system_config, verificar pelo par category/name
      if (tableName === 'system_config' && record.category && record.key_name) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('category', record.category)
          .eq('key_name', record.key_name)
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
        updated_by: authData.userId || record.updated_by,
        updated_at: new Date().toISOString(),
        instituicao_id: record.instituicao_id || localStorage.getItem('active_instituicao_id'),

        created_at: createdAt || record.created_at || new Date().toISOString(),
         };
      
      const { error } = await supabase
        .from(tableName)
        .update(recordWithRLS)
        .eq('id', item.record_id);
      
      if (error) throw error;
      
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
    const table = db.table<any>(tableName);
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
    
    if (novasTentativas >= 3) {
      // Marcar como falha permanente
      await db.syncQueue.update(item.id!, {
        status: 'failed',
        error: error.message,
        retryCount: novasTentativas,
        data: new Date().toISOString()
      });
    } else {
      // Tentar novamente mais tarde
      await db.syncQueue.update(item.id!, {
        retryCount: novasTentativas,
        status: 'pending',
        data: new Date().toISOString()
      });
    }
  },
  
  async downloadBatch() {
    try {
      const { getAuthData } = useSyncAuthInManager();
      const authData = getAuthData();
      
      if (!authData.isAuthenticated) {
        console.warn('⚠️ Usuário não autenticado. Download adiado.');
        return;
      }
      
      console.log('📥 Iniciando download em batch...');
      
      // 1. Buscar timestamp da última sincronização
      const lastSync = localStorage.getItem(`last_sync_global`);
      const lastSyncDate = lastSync ? new Date(lastSync) : new Date(0);
      
      // 2. Baixar cada tabela em batch (com base nas permissões)
      const { hasPermission } = useSyncAuthInManager();
      
      const tables = [
        'alunos', 'turmas', 'cursos', 'transacoes', 'aulas', 
        'propina', 'frequencias', 'tarefas', 'metas', 'rotinas',
        'evento', 'profiles', 'instituicao', 'notificacao','avaliacoes','turma_horarios'
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
        await this.downloadTableBatch(tableName, lastSyncDate);
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
      
      // Buscar dados do Supabase (após a última sincronização)
      let query = supabase
        .from(tableName)
        .select('*')
        .order('updated_at', { ascending: true })
        .limit(500);
      
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
      // 1. Contar itens por status
      const allItems = await db.syncQueue.toArray();
      
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
      
      return { total: allItems.length, byStatus, cleaned: syncedItems.length };
      
    } catch (error:any) {
      console.error('❌ Erro ao verificar syncQueue:', error);
      return { error: error.message };
    }
  },

  // Debug para identificar problemas
  async debugSyncQueueIssue(tableName: string) {
    console.log(`🔍 DEBUG: Investigando syncQueue para ${tableName}`);
    
    const items = await db.syncQueue
      .where('table').equals(tableName)
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
      let query = db.syncQueue;
      
      if (tableName) {
        query = query.where('table').equals(tableName);
      }
      
      const items = await query.toArray();
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
      const failedItems = await db.syncQueue
        .where('status').equals('failed')
        .filter(item => (item.retryCount || 0) < maxRetries)
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
    const allItems = await db.syncQueue.toArray();
    
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
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - maxAgeHours);
      
      const oldItems = await db.syncQueue
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
    const allItems = await db.syncQueue.toArray();
    
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
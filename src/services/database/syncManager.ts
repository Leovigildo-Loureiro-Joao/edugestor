// src/services/database/syncManager.ts
import { SyncQueueItem } from "../../types/base";
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
  handleSyncError(item: SyncQueueItem, error: any): Promise<void>;
  downloadTableBatch(tableName: string, since: Date): Promise<void>;
  processDownloadBatch(tableName: string, batch: any[]): Promise<void>;
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
      
      // Processar INSERTs em batch
      if (inserts.length > 0) {
        await this.processInsertBatch(tableName, inserts);
      }
      
      // Processar UPDATEs em batch (um por um por segurança)
      for (const item of updates) {
        await this.processSingleUpdate(tableName, item);
      }
      
      // Processar DELETEs em batch
      if (deletes.length > 0) {
        await this.processDeleteBatch(tableName, deletes);
      }
      
    } catch (error) {
      console.error(`❌ Erro processando batch de ${tableName}:`, error);
      throw error;
    }
  },
  
  // ✅ Processar INSERTs em batch
  async processInsertBatch(tableName: string, items: SyncQueueItem[]) {
    const { getAuthData } = useSyncAuthInManager();
    const authData = getAuthData();
    
    if (!authData.isAuthenticated) {
      console.warn(`⚠️ Usuário não autenticado. Ignorando INSERTs em ${tableName}`);
      return;
    }
    
    // 1. Buscar dados dos itens
    const records = [];
    const itemsToProcess = [];
    
    for (const item of items) {
      const record = await this.getRecordFromTable(tableName, item.record_id);
      if (record) {
        // Verificar se já existe no Supabase (para INSERTs que podem ser UPDATEs)
        // Se o registro já tem um ID não-local, pode já ter sido sincronizado
        if (!record.id || record.id.startsWith('local_')) {
          // Remover campos internos do Dexie e ID local
          const { id, sync_status, deleted, createdAt, updatedAt, ...cleanRecord } = record;
          
          // ✅ ADICIONAR CAMPOS NECESSÁRIOS PARA RLS
          const recordWithRLS = {
            ...cleanRecord,
            // Timestamps no formato do Supabase
            created_at: record.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          // Se tiver campos únicos composto (como system_config), verificar
          if (tableName === 'system_config') {
            // Para system_config, verificar se já existe pelo par category/name
            const existing = await this.checkExistingUniqueConstraint(
              tableName, 
              recordWithRLS
            );
            
            if (existing) {
              console.log(`⚠️ Registro já existe em ${tableName}, convertendo para UPDATE:`, {
                category: recordWithRLS.category,
                name: recordWithRLS.key_name
              });
              
              // Se já existe, mudar para operação de UPDATE
              await this.convertInsertToUpdate(tableName, item, existing.id);
              continue; // Pular este item, será processado como UPDATE
            }
          }
          
          records.push(recordWithRLS);
          itemsToProcess.push(item);
        } else {
          // Registro já tem ID do Supabase, marcar como sincronizado
          console.log(`ℹ️ Registro já sincronizado: ${tableName} - ID: ${record.id}`);
          await db.syncQueue.delete(item.id!);
        }
      }
    }
    
    if (records.length === 0) return;
    
    // Verificar se algum registro ainda tem ID local (deve ser removido)
    records.forEach(record => {
      if (record.id && record.id.startsWith('local_')) {
        console.warn('⚠️ ID local encontrado e removido:', record.id);
        delete record.id;
      }
    });
    
    try {
      // 2. INSERT em batch no Supabase com upsert para evitar duplicidade
      const { data, error } = await supabase
        .from(tableName)
        .upsert(records, {
          onConflict: 'category,name', // Para system_config, ajustar conforme sua tabela
          ignoreDuplicates: false
        })
        .select();
      
      if (error) {
        console.error(`❌ Erro inserindo batch em ${tableName}:`, error);
        
        // Se for erro de duplicidade, tentar UPDATE individual
        if (error.code === '23505') {
          console.log(`🔄 Tratando duplicidade em ${tableName}, tentando UPSERT individual...`);
          await this.handleDuplicateInsert(tableName, records, itemsToProcess, authData);
          return;
        }
        
        // Se for erro de RLS, adicionar mais informações
        if (error.message.includes('row-level security') || error.code === '42501') {
          console.error('🔍 Detalhes do erro RLS:', {
            table: tableName,
            userRole: authData.userRole,
            recordsCount: records.length,
            firstRecord: records[0] ? {
              ...records[0],
              // Ocultar dados sensíveis para log
              nome: records[0].nome_completo?.substring(0, 10) + '...',
              hasInstituicaoId: !!records[0].instituicao_id
            } : null
          });
        }
        
        throw error;
      }
      
      // 3. Atualizar IDs locais com IDs do Supabase
      for (let i = 0; i < itemsToProcess.length; i++) {
        const item = itemsToProcess[i];
        const supabaseRecord = data?.[i];
        
        if (supabaseRecord) {
          // Atualizar ID local
          await this.updateLocalId(tableName, item.record_id, supabaseRecord.id);
          
          // Marcar como sincronizado
          await db.syncQueue.delete(item.id!);
        }
      }
      
      console.log(`✅ ${records.length} registros processados em ${tableName}`);
      
    } catch (error) {
      console.error(`❌ Erro fatal em processInsertBatch para ${tableName}:`, error);
      // Não propagar o erro para não parar a sincronização completa
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
        operation: 'UPDATE',
        record_id: existingId // Usar o ID existente
      });
      
      console.log(`🔄 Convertido INSERT para UPDATE: ${tableName} - ID: ${existingId}`);
    } catch (error) {
      console.error('Erro ao converter INSERT para UPDATE:', error);
    }
  },

  async handleDuplicateInsert(tableName: string, records: any[], items: SyncQueueItem[], authData: any) {
    // Processar registros individualmente para tratar duplicidades
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const item = items[i];
      
      try {
        let result;
        
        // Para system_config, usar UPSERT com onConflict
        if (tableName === 'system_config') {
          const { data, error } = await supabase
            .from(tableName)
            .upsert(record, {
              onConflict: 'category,name',
              ignoreDuplicates: false
            })
            .select()
            .single();
          
          if (error) throw error;
          result = data;
        } else {
          // Para outras tabelas, tentar INSERT primeiro, depois UPDATE se falhar
          const { data, error } = await supabase
            .from(tableName)
            .insert(record)
            .select()
            .single();
          
          if (error && error.code === '23505') {
            // Se for duplicidade, buscar registro existente e atualizar
            console.log(`🔄 Registro duplicado encontrado, convertendo para UPDATE`);
            await this.convertInsertToUpdate(tableName, item, record.id);
            continue;
          } else if (error) {
            throw error;
          }
          
          result = data;
        }
        
        if (result) {
          // Atualizar ID local
          await this.updateLocalId(tableName, item.record_id, result.id);
          
          // Marcar como sincronizado
          await db.syncQueue.delete(item.id!);
        }
        
      } catch (error) {
        console.error(`❌ Erro processando registro individual em ${tableName}:`, error);
        // Continuar com os próximos registros
      }
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
      const { id, sync_status, deleted, createdAt, updatedAt, ...cleanRecord } = record;
      
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
  
  async updateLocalId(tableName: string, oldId: string, newId: string) {
    const table = db.table<any>(tableName);
    const record = await table.get(oldId);
    
    if (record) {
      // Criar novo registro com novo ID
      await table.put({ 
        ...record, 
        id: newId,
        updated_at: new Date().toISOString()
      });
      // Deletar registro antigo
      await table.delete(oldId);
    }
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
        last_attempt: new Date().toISOString()
      });
    } else {
      // Tentar novamente mais tarde
      await db.syncQueue.update(item.id!, {
        retryCount: novasTentativas,
        status: 'pending',
        last_attempt: new Date().toISOString()
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
};
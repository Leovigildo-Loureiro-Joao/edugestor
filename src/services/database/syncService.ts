import { SyncQueueItem } from "../../types/base";
import db, { supabase } from "./db";

export const syncService = {
  // ✅ UPLOAD em BATCH (otimizado)
  async uploadBatch() {
    try {
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
    // 1. Buscar dados dos itens
    const records = [];
    for (const item of items) {
      const record = await this.getRecordFromTable(tableName, item.record_id);
      if (record) {
        // Remover campos internos do Dexie
        const { sync_status, deleted, ...cleanRecord } = record;
        records.push(cleanRecord);
      }
    }
    
    if (records.length === 0) return;
    
    // 2. INSERT em batch no Supabase
    const { data, error } = await supabase
      .from(tableName)
      .insert(records)
      .select();
    
    if (error) {
      console.error(`❌ Erro inserindo batch em ${tableName}:`, error);
      throw error;
    }
    
    // 3. Atualizar IDs locais com IDs do Supabase
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const supabaseRecord = data?.[i];
      
      if (supabaseRecord) {
        // Atualizar ID local
        await this.updateLocalId(tableName, item.record_id, supabaseRecord.id);
        
        // Marcar como sincronizado
        await db.syncQueue.delete(item.id!);
      }
    }
    
    console.log(`✅ ${records.length} registros inseridos em ${tableName}`);
  },
  
  // ✅ Processar UPDATE individual (mais seguro)
   async processSingleUpdate(tableName: string, item: SyncQueueItem) {
    try {
      const record = await this.getRecordFromTable(tableName, item.record_id);
      if (!record) {
        await db.syncQueue.delete(item.id!);
        return;
      }
      
      // Remover campos internos
      const { sync_status, deleted, ...cleanRecord } = record;
      
      const { error } = await supabase
        .from(tableName)
        .update(cleanRecord)
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
      await table.put({ ...record, id: newId });
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
        retryCount: novasTentativas
      });
    } else {
      // Tentar novamente mais tarde
      await db.syncQueue.update(item.id!, {
        retryCount: novasTentativas,
        status: 'pending'
      });
    }
  }
,
  async downloadBatch() {
    try {
      console.log('📥 Iniciando download em batch...');
      
      // 1. Buscar timestamp da última sincronização
      const lastSync = localStorage.getItem(`last_sync_global`);
      const lastSyncDate = lastSync ? new Date(lastSync) : new Date(0);
      
      // 2. Baixar cada tabela em batch
      const tables = ['alunos', 'turmas', 'cursos', 'transacoes', 'aulas', 'propina', 'frequencias','tarefas','metas','rotinas','evento','profiles','system_config','instituicao','notificacao'];
      
      for (const tableName of tables) {
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
      // Buscar dados do Supabase (após a última sincronização)
      const { data: remoteData, error } = await supabase
        .from(tableName)
        .select('*')
        .order('updated_at', { ascending: true })
        .limit(500); // Limite para evitar sobrecarga
      
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
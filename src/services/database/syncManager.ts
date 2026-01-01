import Dexie from "dexie";
import db from "./db";

import { SyncQueueItem } from "../../types/base";

export class SyncManager {
  private isSyncing = false;
  private syncQueue: Array<() => Promise<void>> = [];
  private syncPriorities = {
    alta: ['frequencias', 'aulas'],      // Dados críticos e frequentes
    media: ['transacoes', 'propina'],   // Dados financeiros importantes
    baixa: ['alunos', 'turmas']          // Dados mais estáticos
  };

  // ✅ Inicialização otimizada
  async initialize() {
    if (!navigator.onLine) {
      console.log('📴 Offline - sincronização desabilitada');
      return;
    }

    // Configurar Dexie para melhor performance
    Dexie.debug = false; // Desativa logs no console
    
    // Abrir conexão única
    await db.open();
    
    // Configurar cache
    await this.configureCache();
  }

  // ✅ Configurar cache para performance
  private async configureCache() {
    // Salvar timestamp da última sincronização bem-sucedida
    const lastSync = localStorage.getItem('global_last_sync');
    if (!lastSync) {
      localStorage.setItem('global_last_sync', new Date().toISOString());
    }
  }

  // ✅ Sincronização inteligente por prioridade
  async syncInteligente() {
    if (this.isSyncing) {
      console.log('⏳ Sincronização já em andamento...');
      return;
    }

    if (!navigator.onLine) {
      console.log('🌐 Offline - sincronização adiada');
      return;
    }

    this.isSyncing = true;
    
    try {
      console.log('🚀 Iniciando sincronização inteligente...');
      
      // 1. Primeiro, sincronizar dados de alta prioridade (pequenos)
      console.log('🔄 Fase 1: Dados de alta prioridade');
      await this.syncBatch(this.syncPriorities.alta, 50); // Limite de 50 itens por batch
      
      // 2. Sincronizar dados de média prioridade
      console.log('🔄 Fase 2: Dados de média prioridade');
      await this.syncBatch(this.syncPriorities.media, 30);
      
      // 3. Sincronizar dados de baixa prioridade (maiores, podem esperar)
      console.log('🔄 Fase 3: Dados de baixa prioridade');
      await this.syncBatch(this.syncPriorities.baixa, 10);
      
      // 4. Atualizar timestamp global
      localStorage.setItem('global_last_sync', new Date().toISOString());
      
      console.log('✅ Sincronização inteligente concluída');
      
    } catch (error) {
      console.error('❌ Erro na sincronização inteligente:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // ✅ Sincronização em lotes (batch)
  private async syncBatch(tabelas: string[], batchSize: number) {
    for (const tabela of tabelas) {
      console.log(`📊 Sincronizando ${tabela}...`);
      
      try {
        // Usar serviços específicos
         await this.syncBatchTable(batchSize,tabela);
        await new Promise(resolve => setTimeout(resolve, 500)); // Pausa entre tabelas
      } catch (error) {
        console.error(`❌ Erro sincronizando ${tabela}:`, error);
        // Continuar com outras tabelas mesmo se uma falhar
      }
    }
  }



 private async syncBatchTable(limit: number, name: string) {
    console.log(`🔍 Buscando pendentes para ${name}...`);
    
    const pendentes = await db.syncQueue
      .where('table')
      .equals(name)
      .and(item => item.status === 'pending')
      .limit(limit)
      .toArray();
    
    console.log(`📊 ${pendentes.length} pendentes para ${name}`);
    
    if (pendentes.length === 0) {
      console.log(`📭 Nenhum item pendente para ${name}`);
      return;
    }
    
    for (const item of pendentes) {
      console.log(`🔧 Processando item ${item.id} (${item.operation})...`);
      await this.processItem(item);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // ✅ Processar item CORRETAMENTE
  private async processItem(item: SyncQueueItem) {
    console.log(`🔍 Processando item:`, item);
    
    try {
      // Buscar o registro da tabela correspondente
      const table = db.table<any>(item.table);
      const record = await table.get(item.record_id);
      
      if (!record) {
        console.log(`❌ Registro ${item.record_id} não encontrado em ${item.table}`);
        await db.syncQueue.delete(item.id!);
        return;
      }

      console.log(`📝 Registro encontrado:`, record);

      // Usar supabase do arquivo db.ts
      const { supabase } = await import('./db');
      
      if (item.operation === 'upsert') {
        // Preparar dados para envio
        const { sync_status, deleted, created_at, updated_at, ...dadosParaEnviar } = record;
        
        console.log(`📤 Enviando upsert para ${item.table}:`, dadosParaEnviar);
        
        let resultado;
        
        // Se for um ID local (nunca sincronizado)
        if (item.record_id.startsWith('local_')) {
          // INSERT no Supabase
          resultado = await supabase
            .from(item.table)
            .insert(dadosParaEnviar)
            .select()
            .single();
          
          if (resultado.error) {
            console.error('❌ Erro no INSERT:', resultado.error);
            throw resultado.error;
          }
          
          // Atualizar ID local com ID do Supabase
          if (resultado.data) {
            await table.update(item.record_id, {
              id: resultado.data.id,
              sync_status: 'synced',
              updated_at: new Date().toISOString()
            });
            
            console.log(`🔄 ID atualizado: ${item.record_id} → ${resultado.data.id}`);
          }
        } else {
          // UPDATE no Supabase (já tem ID remoto)
          resultado = await supabase
            .from(item.table)
            .update(dadosParaEnviar)
            .eq('id', item.record_id);
          
          if (resultado.error) {
            console.error('❌ Erro no UPDATE:', resultado.error);
            throw resultado.error;
          }
          
          // Marcar como sincronizado localmente
          await table.update(item.record_id, {
            sync_status: 'synced',
            updated_at: new Date().toISOString()
          });
        }
        
      } else if (item.operation === 'delete') {
        // Só deletar no Supabase se não for um ID local
        if (!item.record_id.startsWith('local_')) {
          console.log(`🗑️ Deletando ${item.record_id} do Supabase...`);
          
          const resultado = await supabase
            .from(item.table)
            .delete()
            .eq('id', item.record_id);
          
          if (resultado.error) {
            console.error('❌ Erro no DELETE:', resultado.error);
            throw resultado.error;
          }
        }
        
        // Deletar localmente
        await table.delete(item.record_id);
      }

      // Remover da fila de sincronização
      await db.syncQueue.delete(item.id!);
      console.log(`✅ Item ${item.id} processado com sucesso`);
      
    } catch (error: any) {
      console.error(`❌ Erro processando item ${item.id}:`, error);
      await this.handleSyncError(item, error);
    }
  }

  private async handleSyncError(item: SyncQueueItem, error: any) {
    console.log(`🔄 Tentativa ${(item.retryCount || 0) + 1} falhou para item ${item.id}`);
    
    const novasTentativas = (item.retryCount || 0) + 1;
    
    if (novasTentativas >= 3) {
      console.log(`❌ Item ${item.id} marcado como falha permanente`);
      await db.syncQueue.update(item.id!, {
        status: 'failed',
        error: error.message,
        retryCount: novasTentativas
      });
    } else {
      console.log(`⏱️ Item ${item.id} será retentado mais tarde`);
      await db.syncQueue.update(item.id!, {
        retryCount: novasTentativas,
        status: 'pending'
      });
    }
  }
  private async processUpsert(item: SyncQueueItem,service:any){

  }

   private async processDelete(item: SyncQueueItem,service:any){
    
  }



  // ✅ Reset otimizado que realmente limpa tudo
  async resetCompleto() {
    console.log('🧹 Iniciando reset otimizado...');
    
    try {
      // 1. Parar todas as sincronizações
      this.isSyncing = false;
      
      // 2. Fechar todas as conexões Dexie
      await this.closeAllConnections();
      
      // 3. Limpar IndexedDB de forma eficaz
      await this.clearIndexedDB();
      
      // 4. Limpar caches específicos
      await this.clearCaches();
      
      // 5. Forçar garbage collection (quando possível)
      await this.forceGarbageCollection();
      
      console.log('✅ Reset completo realizado');
      
    } catch (error) {
      console.error('❌ Erro no reset:', error);
    }
  }

  private async closeAllConnections() {
    try {
      if (db.isOpen()) {
        await db.close();
        console.log('✅ Conexão Dexie fechada');
      }
      
      // Fechar outras possíveis conexões
      const databases = await indexedDB.databases?.();
      if (databases) {
        for (const dbInfo of databases) {
          if (dbInfo.name) {
            const db = await indexedDB.open(dbInfo.name);
            db.onupgradeneeded = null;
            db.onsuccess = (event) => {
              const connection = (event.target as IDBOpenDBRequest).result;
              connection.close();
            };
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Erro ao fechar conexões:', error);
    }
  }

  private async clearIndexedDB() {
    return new Promise<void>((resolve) => {
      console.log('🗑️ Limpando IndexedDB...');
      
      // Lista de bancos para deletar
      const dbNames = [
        'EscolaDB',
        'EduGestorDB',
        'EduGestorOffline',
        'EscolaDB_v1',
        'EscolaDB_v2'
      ];
      
      let completed = 0;
      
      const checkComplete = () => {
        completed++;
        if (completed === dbNames.length) {
          console.log('✅ IndexedDB limpo');
          resolve();
        }
      };
      
      dbNames.forEach(dbName => {
        const req = indexedDB.deleteDatabase(dbName);
        req.onsuccess = () => {
          console.log(`   ✅ ${dbName} deletado`);
          checkComplete();
        };
        req.onerror = () => {
          console.log(`   ⚠️ ${dbName} já deletado ou não existe`);
          checkComplete();
        };
        req.onblocked = () => {
          console.log(`   ⚠️ ${dbName} bloqueado, tentando novamente...`);
          setTimeout(() => indexedDB.deleteDatabase(dbName), 1000);
        };
      });
      
      // Timeout de segurança
      setTimeout(() => {
        console.log('⚠️ Timeout na limpeza do IndexedDB');
        resolve();
      }, 10000);
    });
  }

  private async clearCaches() {
    // Limpar localStorage seletivamente
    const keys = Object.keys(localStorage);
    const syncKeys = keys.filter(key => 
      key.includes('sync') || 
      key.includes('last_') || 
      key.includes('cache_')
    );
    
    syncKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`   🗑️ localStorage: ${key}`);
    });
    
    // Limpar sessionStorage
    sessionStorage.clear();
    
    // Limpar cache de Service Worker se existir
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('✅ Cache de Service Worker limpo');
      } catch (error) {
        console.log('⚠️ Não foi possível limpar cache SW:', error);
      }
    }
  }

  private async forceGarbageCollection() {
    // Técnicas para forçar garbage collection (quando possível)
    if (window.gc) {
      window.gc(); // Chrome flag --js-flags="--expose-gc"
      console.log('✅ Garbage collection forçado');
    }
    
    // Liberar memória manualmente
    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      iframe.contentWindow?.location.reload();
      setTimeout(() => document.body.removeChild(iframe), 100);
    } catch (e) {}
  }

  // ✅ Iniciar sincronização em background
  startBackgroundSync() {
    // Sincronizar a cada 5 minutos quando online
    setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.syncInteligente();
      }
    }, 5 * 60 * 1000); // 5 minutos
    
    // Sincronizar quando voltar online
    window.addEventListener('online', () => {
      console.log('🌐 Voltei online! Sincronizando...');
      setTimeout(() => this.syncInteligente(), 2000);
    });
  }
}

// Exportar instância singleton
export const syncManager = new SyncManager();

// Inicializar na carga da aplicação
export const initializeSyncSystem = async () => {
  await syncManager.initialize();
  syncManager.startBackgroundSync();
  return syncManager;
};
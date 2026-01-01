import { generateUniqueId } from "../../utils/idGenarator";
import db, { supabase } from "./db";
// Você pode criar este utilitário

export const estrategiaService = {
  async getResumoEstrategico() {
    try {
      // Usando Dexie para consultas locais
      const [
        totametasConcluidas,
        tarefasPendentes,
        metasAtrasadas
      ] = await Promise.all([
        // Total de metas concluídas
        db.metas
          .where('status')
          .equals('concluida')
          .count(),
        
        // Tarefas pendentes (assumindo que concluida é booleano)
        db.tarefas
          .where('concluida')
          .equals('true') // Ajuste conforme seu modelo de dados
          .count(),
        
        // Metas atrasadas
        db.metas
          .where('status')
          .equals('pendente')
          .count(),
        
      ]);

      return {
        tarefasPendentes: tarefasPendentes || 0,
        metasConcluidas: totametasConcluidas || 0,
        metasAtrasadas: metasAtrasadas || 0,
        proximasAtividades: [] // Implementar lógica conforme necessário
      };
    } catch (error) {
      console.error('Erro ao buscar resumo estratégico:', error);
      throw error;
    }
  },

  async getTarefas() {
    try {
      const tarefas = await db.tarefas
        .orderBy('created_at')
        .reverse()
        .toArray();
      
      return tarefas || [];
    } catch (error) {
      console.error('Erro ao buscar tarefas:', error);
      throw error;
    }
  },

  async saveTarefa(tarefaData: any) {
    try {
      const id = generateUniqueId();
      const now = new Date().toISOString();
      
      const tarefa = {
        ...tarefaData,
        id,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
        deleted: false,
      };

      console.log('💾 Salvando tarefa:', tarefa.titulo || tarefa.descricao);
      
      await db.tarefas.put(tarefa);
      
      // Adicionar à fila de sincronização
      await db.syncQueue.add({
        table: 'tarefas',
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      console.log('✅ Tarefa salva com ID:', id);
      return id;
      
    } catch (error) {
      console.error('❌ Erro ao salvar tarefa:', error);
      throw error;
    }
  },

 async updateRotinaStatus(rotinaId: string, status: string) {
    return this.updateRotina(rotinaId, { status });
  }, 


  async getMetas() {
    try {
      const metas = await db.metas
        .orderBy('created_at')
        .toArray();
      
      return metas || [];
    } catch (error) {
      console.error('Erro ao buscar metas:', error);
      throw error;
    }
  },

  async saveMeta(metaData: any) {
    try {
      const id = generateUniqueId();
      const now = new Date().toISOString();
      
      const meta = {
        ...metaData,
        id,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
        deleted: false,
      };

      console.log('💾 Salvando meta:', meta.titulo || meta.descricao);
      
      await db.metas.put(meta);
      
      // Adicionar à fila de sincronização
      await db.syncQueue.add({
        table: 'metas',
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      console.log('✅ Meta salva com ID:', id);
      return id;
      
    } catch (error) {
      console.error('❌ Erro ao salvar meta:', error);
      throw error;
    }
  },

  async getRotinasDiarias() {
    try {
      const rotinas = await db.rotinas
        .orderBy('created_at')
        .toArray();
      
      return rotinas || [];
    } catch (error) {
      console.error('Erro ao buscar rotinas:', error);
      throw error;
    }
  },

  async saveRotina(rotinaData: any) {
    try {
      const id = generateUniqueId();
      const now = new Date().toISOString();
      
      const rotina = {
        ...rotinaData,
        id,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
        deleted: false,
      };

      console.log('💾 Salvando rotina:', rotina.titulo || rotina.descricao);
      
      await db.rotinas.put(rotina);
      
      // Adicionar à fila de sincronização
      await db.syncQueue.add({
        table: 'rotinas',
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      console.log('✅ Rotina salva com ID:', id);
      return id;
      
    } catch (error) {
      console.error('❌ Erro ao salvar rotina:', error);
      throw error;
    }
  },



  async updateTarefaStatus(tarefaId: string, concluida: string) {
    return this.updateTarefa(tarefaId, { status: concluida });
  },

  async executarRotina(rotinaId: string) {
    try {
      const updated_at = new Date().toISOString();
      
      await db.rotinas.update(rotinaId, {
        status: 'suspensa',
        updated_at,
        sync_status: 'pending'
      });

      // Adicionar/atualizar na fila de sincronização
      await db.syncQueue.add({
        table: 'rotinas',
        record_id: rotinaId,
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });

      console.log(`✅ Rotina ${rotinaId} executada`);
      
      return { success: true, id: rotinaId };
    } catch (error) {
      console.error('Erro ao executar rotina:', error);
      throw error;
    }
  },

  // Métodos para sincronização
  async syncTarefas() {
    // Implementar conforme necessário usando syncService
    console.log('Sync tarefas...');
  },

  async syncMetas() {
    console.log('Sync metas...');
  },

  async syncRotinas() {
    console.log('Sync rotinas...');
  },

  async syncPlanosAcao() {
    console.log('Sync planos de ação...');
  },

  // Métodos para deletar (soft delete)
  async deleteTarefa(id: string) {
    await this.markForDelete('tarefas', id);
  },

  async deleteMeta(id: string) {
    await this.markForDelete('metas', id);
  },

  async deleteRotina(id: string) {
    await this.markForDelete('rotinas', id);
  },


  async updateTarefa(tarefaId: string, tarefaData: Partial<any>) {
    try {
      const updated_at = new Date().toISOString();
      
      await db.tarefas.update(tarefaId, {
        ...tarefaData,
        updated_at,
        sync_status: 'pending'
      });

      // Adicionar/atualizar na fila de sincronização
      await db.syncQueue.add({
        table: 'tarefas',
        record_id: tarefaId,
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });

      console.log(`✏️ Tarefa ${tarefaId} atualizada`);
      
      return { success: true, id: tarefaId };
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      throw error;
    }
  },

  // ============ UPDATE PARA METAS ============
  async updateMeta(metaId: string, metaData: Partial<any>) {
    try {
      const updated_at = new Date().toISOString();
      
      await db.metas.update(metaId, {
        ...metaData,
        updated_at,
        sync_status: 'pending'
      });

      // Adicionar/atualizar na fila de sincronização
      await db.syncQueue.add({
        table: 'metas',
        record_id: metaId,
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });

      console.log(`✏️ Meta ${metaId} atualizada`);
      
      return { success: true, id: metaId };
    } catch (error) {
      console.error('Erro ao atualizar meta:', error);
      throw error;
    }
  },
  // ============ UPDATE PARA ROTINAS ============
  async updateRotina(rotinaId: string, rotinaData: Partial<any>) {
    try {
      const updated_at = new Date().toISOString();
      
      await db.rotinas.update(rotinaId, {
        ...rotinaData,
        updated_at,
        sync_status: 'pending'
      });

      // Adicionar/atualizar na fila de sincronização
      await db.syncQueue.add({
        table: 'rotinas',
        record_id: rotinaId,
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });

      console.log(`✏️ Rotina ${rotinaId} atualizada`);
      
      return { success: true, id: rotinaId };
    } catch (error) {
      console.error('Erro ao atualizar rotina:', error);
      throw error;
    }
  },


  // Função auxiliar para deletar
  async markForDelete(table: string, id: string) {
    try {
      const record = await db[table].get(id);
      if (!record) return;

      if (record.sync_status === 'synced' && !record.id.startsWith('local_')) {
        // Se já sincronizado, marcar para deleção remota
        await db[table].update(id, { 
          deleted: true, 
          sync_status: 'pending_delete',
          updated_at: new Date().toISOString()
        });
        
        await db.syncQueue.add({
          table,
          record_id: id,
          operation: 'delete',
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        console.log(`🗑️ ${table} ${id} marcado para deleção remota`);
      } else {
        // Se nunca sincronizado, deletar completamente
        await db[table].delete(id);
        
        // Remover da fila se existir
        await db.syncQueue
          .where('record_id')
          .equals(id)
          .delete();
          
        console.log(`🗑️ ${table} ${id} deletado localmente`);
      }
      
    } catch (error) {
      console.error(`Erro ao deletar ${table}:`, error);
      throw error;
    }
  }


};
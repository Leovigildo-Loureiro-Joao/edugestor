import { supabase } from '../database/db';
import db from './db';
import { Avaliacao, AvaliacaoFormData } from '../../types/avaliacao';
import { syncManager } from './syncManager';
import { alunosService } from './alunosService';
import { AlunoDesempenho } from '../../pages/Turmas/TurmasPage';


const generateUniqueId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const avaliacaoService = {
  // ✅ Criar avaliacao localmente
  async criarAvaliacao(avaliacaoData: AvaliacaoFormData): Promise<string> {
    try {
      const id = generateUniqueId();
      const now = new Date().toISOString();
      
      const avaliacao = {
        ...avaliacaoData,
        id,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
        deleted: false,
      } as Avaliacao;

      console.log('💾 Salvando avaliacao:', avaliacao.tipo_avaliacao || `Avaliacao ${avaliacao.data_avaliacao}`);
      
      await db.avaliacao.put(avaliacao);
      
      // Adicionar à fila de sincronização
      await db.syncQueue.add({
        table: 'avaliacao',
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      console.log('✅ Avaliacao salva com ID:', id);
      return id;
      
    } catch (error) {
      console.error('❌ Erro ao salvar avaliacao:', error);
      throw error;
    }
  },

  // ✅ Buscar todas as avaliacao
  async getAllAvaliacaos(): Promise<Avaliacao[]> {
    try {
      console.log('📋 Buscando avaliacao...');
      
      const todasAvaliacaos = await db.avaliacao.toArray();
      const todosAlunos = await db.alunos.toArray();
      
      // Filtrar as não deletadas
      const avaliacaoAtivas = todasAvaliacaos.filter(avaliacao => !avaliacao.deleted);
      const alunosAtivos = todosAlunos.filter(aluno => !aluno.deleted);
        const alunoMap = new Map(alunosAtivos.map(t => [t.id, t]));

      // Ordenar por data (mais recente primeiro)
      avaliacaoAtivas.sort((a, b) => 
        new Date(b.data_avaliacao).getTime() - new Date(a.data_avaliacao).getTime()
      );
      
      console.log(`✅ Encontradas ${avaliacaoAtivas.length} avaliacao ativas`);
      return avaliacaoAtivas.map((avaliacao)=>{
        const aluno=alunoMap.get(avaliacao.aluno_id)
          return {
            ...avaliacao,
            aluno:aluno
          }
        });
    } catch (error) {
      console.error('❌ Erro ao buscar avaliacao:', error);
      return [];
    }
  },

    async syncAvaliacaos() {
      return syncManager.downloadTableBatch('avaliacao', new Date(0));
    },
  
  // ✅ Função auxiliar para marcar como pendente
   async markForSync(recordId: string, operation: 'upsert' | 'delete') {
    await db.syncQueue.add({
      table: 'avaliacao',
      record_id: recordId,
      operation,
      status: 'pending',
      created_at: new Date().toISOString()
    });
  },



  // ✅ Buscar avaliacao recentes (com suporte offline)
  async getAvaliacaosRecentes(limite = 50): Promise<Avaliacao[]> {
    try {
      const todasAvaliacaos = await this.getAllAvaliacaos();
      
      // Ordenar por data (mais recente primeiro) e limitar
      return todasAvaliacaos
        .sort((a, b) => new Date(b.data_avaliacao).getTime() - new Date(a.data_avaliacao).getTime())
        .slice(0, limite);

    } catch (error) {
      console.error('❌ Erro ao buscar avaliacao recentes:', error);
      return [];
    }
  },

  // ✅ Atualizar avaliacao localmente e marcar para sincronização
  async atualizarAvaliacao(id: string, updates: Partial<AvaliacaoFormData>){
    try {
      const updated_at = new Date().toISOString();
     
      await db.avaliacao.update(id, {
        ...updates,
        updated_at,
        sync_status: 'pending',
      });

      // Adicionar/atualizar na fila
      await db.syncQueue.add({
        table: 'avaliacao',
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });
      
      console.log(`✏️ Avaliacao ${id} marcada para atualização`);
      
      // Retornar a avaliacao atualizada
      return await db.avaliacao.get(id);
      
    } catch (error) {
      console.error('Erro ao atualizar avaliacao:', error);
      throw error;
    }
  },

  // ✅ Deletar avaliacao (soft delete)
  async deletarAvaliacao(id: string) {
    try {
      const avaliacao = await db.avaliacao.get(id);
      if (!avaliacao) return;

      if (avaliacao.sync_status === 'synced' && !avaliacao.id.startsWith('local_')) {
        // Se já sincronizado, marcar para deleção remota
        await db.avaliacao.update(id, { 
          deleted: true, 
          sync_status: 'pending_delete' as const,
          updated_at: new Date().toISOString()
        });
        
        await db.syncQueue.add({
          table: 'avaliacao',
          record_id: id,
          operation: 'delete',
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        console.log(`🗑️ Avaliacao ${id} marcada para deleção remota`);
      } else {
        // Se nunca sincronizado, deletar completamente
        await db.avaliacao.delete(id);
        
        // Remover da fila se existir
        await db.syncQueue
          .where('record_id')
          .equals(id)
          .delete();
          
        console.log(`🗑️ Avaliacao ${id} deletada localmente`);
      }
      
    } catch (error) {
      console.error('Erro ao deletar avaliacao:', error);
      throw error;
    }
  },

  // ✅ Buscar avaliacao por turma (com suporte offline)
  async getAvaliacaosPorTurma(turmaId: string): Promise<Avaliacao[]> {
    try {
      const avaliacao = await db.avaliacao
        .where('turma_id')
        .equals(turmaId)
        .and(avaliacao => !avaliacao.deleted)
        .toArray();
      
      // Ordenar por data (mais recente primeiro)
      return avaliacao.sort((a, b) => 
        new Date(b.data_avaliacao).getTime() - new Date(a.data_avaliacao).getTime()
      );

    } catch (error) {
      console.error('❌ Erro ao buscar avaliacao por turma:', error);
      return [];
    }
  },

  // ✅ Buscar avaliacao por ID
  async getAvaliacaoById(id: string): Promise<Avaliacao | undefined> {
    try {
      const avaliacao = await db.avaliacao.get(id);
      return avaliacao && !avaliacao.deleted ? avaliacao : undefined;
    } catch (error) {
      console.error('Erro ao buscar avaliacao por ID:', error);
      return undefined;
    }
  },
    // ✅ Buscar avaliacao por ID
  async getAvaliacaoByIdAluno(id: string): Promise<Avaliacao[] | undefined> {
    try {
      const avaliacao = await db.avaliacao.where('aluno_id').equals(id).and(ava=>!ava.deleted).toArray();
      return avaliacao && !avaliacao ? avaliacao : undefined;
    } catch (error) {
      console.error('Erro ao buscar avaliacao por ID:', error);
      return undefined;
    }
  },


  async getMediaAluno(id: string){
    try {
      const avaliacao = await this.getAvaliacaoByIdAluno(id)
      var medias=[];
      avaliacao?.map((nota)=>{
        nota.nota
      })

      return avaliacao && !avaliacao ? avaliacao : undefined;
    } catch (error) {
      console.error('Erro ao buscar avaliacao por ID:', error);
      return undefined;
    }
  },



  // ✅ Verificar saúde do banco de avaliacao
  async checkDatabaseHealth() {
    try {
      const avaliacaoCount = await db.avaliacao.count();
      const queueCount = await db.syncQueue
        .where('table')
        .equals('avaliacao')
        .and(item => item.status === 'pending')
        .count();
      
      const avaliacaoAtivas = (await this.getAllAvaliacaos()).length;
      
      return {
        avaliacaoTotal: avaliacaoCount,
        avaliacaoAtivas: avaliacaoAtivas,
        pendentes: queueCount,
        online: navigator.onLine,
        bancoAberto: db.isOpen(),
        conflitos: avaliacaoCount - avaliacaoAtivas // Avaliacaos deletadas (soft delete)
      };
    } catch (error: any) {
      return {
        error: error.message,
        bancoAberto: false
      };
    }
  },

  // ✅ Estatísticas de avaliacao
  async getEstatisticas() {
    try {
      const todasAvaliacaos = await this.getAllAvaliacaos();
      
      // Agrupar por turma
      const porTurma: Record<string, number> = {};
      const porMes: Record<string, number> = {};
      
      todasAvaliacaos.forEach(avaliacao => {
        // Por turma
        const turmaKey = avaliacao.turma_id || 'sem_turma';
        porTurma[turmaKey] = (porTurma[turmaKey] || 0) + 1;
        
        // Por mês
        const data = new Date(avaliacao.data_avaliacao);
        const mesKey = `${data.getFullYear()}-${(data.getMonth() + 1).toString().padStart(2, '0')}`;
        porMes[mesKey] = (porMes[mesKey] || 0) + 1;
      });
      
      return {
        total: todasAvaliacaos.length,
        porTurma,
        porMes,
        ultimaAtualizacao: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao gerar estatísticas:', error);
      return {
        total: 0,
        porTurma: {},
        porMes: {},
        ultimaAtualizacao: new Date().toISOString()
      };
    }
  }
};
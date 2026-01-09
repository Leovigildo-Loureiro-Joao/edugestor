// services/database/aulaService.ts
import { supabase } from '../database/db';
import db from './db';
import { Aula, AulaFormData } from '../../types/aula';
import { syncManager } from './syncManager';
import { Turma } from '../../types/turma';
import { turmaService } from '.';

const generateUniqueId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const aulaService = {
  // ✅ Criar aula localmente
  async criarAula(aulaData: AulaFormData): Promise<string> {
    try {
      const id = generateUniqueId();
      const now = new Date().toISOString();
      
      const aula = {
        ...aulaData,
        id,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
        deleted: false,
      } as Aula;

      console.log('💾 Salvando aula:', aula.tema_aula || `Aula ${aula.data_aula}`);
      
      await db.aulas.put(aula);
      
      // Adicionar à fila de sincronização
      await db.syncQueue.add({
        table: 'aulas',
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      console.log('✅ Aula salva com ID:', id);
      return id;
      
    } catch (error) {
      console.error('❌ Erro ao salvar aula:', error);
      throw error;
    }
  },

  // ✅ Buscar todas as aulas
  async getAllAulas(): Promise<Aula[]> {
    try {
      console.log('📋 Buscando aulas...');
      
      const todasAulas = await db.aulas.toArray();
      const todasTurmas = await db.turmas.toArray();
      
      // Filtrar as não deletadas
      const aulasAtivas = todasAulas.filter(aula => !aula.deleted);
      const turmaAtivas = todasTurmas.filter(turma => !turma.deleted);
        const turmaMap = new Map(turmaAtivas.map(t => [t.id, t]));

      // Ordenar por data (mais recente primeiro)
      aulasAtivas.sort((a, b) => 
        new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime()
      );
      
      console.log(`✅ Encontradas ${aulasAtivas.length} aulas ativas`);
      return aulasAtivas.map((aulas)=>{
        const turma=turmaMap.get(aulas.turma_id)
        return {
          ...aulas,
          turmas:turma
        }
      });
    } catch (error) {
      console.error('❌ Erro ao buscar aulas:', error);
      return [];
    }
  },

    async syncAulas() {
      return syncManager.downloadTableBatch('aulas', new Date(0));
    },
  
  // ✅ Função auxiliar para marcar como pendente
   async markForSync(recordId: string, operation: 'upsert' | 'delete') {
    await db.syncQueue.add({
      table: 'aulas',
      record_id: recordId,
      operation,
      status: 'pending',
      created_at: new Date().toISOString()
    });
  },

  // ✅ Buscar aulas recentes (com suporte offline)
  async getAulasRecentes(limite = 50): Promise<Aula[]> {
    try {
      const todasAulas = await this.getAllAulas();
      
      // Ordenar por data (mais recente primeiro) e limitar
      return todasAulas
        .sort((a, b) => new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime())
        .slice(0, limite);

    } catch (error) {
      console.error('❌ Erro ao buscar aulas recentes:', error);
      return [];
    }
  },

  // ✅ Atualizar aula localmente e marcar para sincronização
  async atualizarAula(id: string, updates: Partial<AulaFormData>) {
    try {
      const updated_at = new Date().toISOString();
      
      await db.aulas.update(id, {
        ...updates,
        updated_at,
        sync_status: 'pending' as const
      });

      // Adicionar/atualizar na fila
      await db.syncQueue.add({
        table: 'aulas',
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });
      
      console.log(`✏️ Aula ${id} marcada para atualização`);
      
      // Retornar a aula atualizada
      return await db.aulas.get(id);
      
    } catch (error) {
      console.error('Erro ao atualizar aula:', error);
      throw error;
    }
  },

  // ✅ Deletar aula (soft delete)
  async deletarAula(id: string) {
    try {
      const aula = await db.aulas.get(id);
      if (!aula) return;

      if (aula.sync_status === 'synced' && !aula.id.startsWith('local_')) {
        // Se já sincronizado, marcar para deleção remota
        await db.aulas.update(id, { 
          deleted: true, 
          sync_status: 'pending_delete' as const,
          updated_at: new Date().toISOString()
        });
        
        await db.syncQueue.add({
          table: 'aulas',
          record_id: id,
          operation: 'delete',
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        console.log(`🗑️ Aula ${id} marcada para deleção remota`);
      } else {
        // Se nunca sincronizado, deletar completamente
        await db.aulas.delete(id);
        
        // Remover da fila se existir
        await db.syncQueue
          .where('record_id')
          .equals(id)
          .delete();
          
        console.log(`🗑️ Aula ${id} deletada localmente`);
      }
      
    } catch (error) {
      console.error('Erro ao deletar aula:', error);
      throw error;
    }
  },

  // ✅ Buscar aulas por turma (com suporte offline)
  async getAulasPorTurma(turmaId: string): Promise<Aula[]> {
    try {
      const aulas = await db.aulas
        .where('turma_id')
        .equals(turmaId)
        .and(aula => !aula.deleted)
        .toArray();
      
      // Ordenar por data (mais recente primeiro)
      return aulas.sort((a, b) => 
        new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime()
      );

    } catch (error) {
      console.error('❌ Erro ao buscar aulas por turma:', error);
      return [];
    }
  },

  // ✅ Buscar aula por ID
  async getAulaById(id: string): Promise<Aula | undefined> {
    try {
      const aula = await db.aulas.get(id);
      return aula && !aula.deleted ? aula : undefined;
    } catch (error) {
      console.error('Erro ao buscar aula por ID:', error);
      return undefined;
    }
  },

  // ✅ Buscar aulas por período
  async getAulasPorPeriodo(inicio: Date, fim: Date): Promise<Aula[]> {
    try {
      const todasAulas = await this.getAllAulas();
      
      return todasAulas.filter(aula => {
        const dataAula = new Date(aula.data_aula);
        return dataAula >= inicio && dataAula <= fim;
      }).sort((a, b) => 
        new Date(a.data_aula).getTime() - new Date(b.data_aula).getTime()
      );

    } catch (error) {
      console.error('❌ Erro ao buscar aulas por período:', error);
      return [];
    }
  },

  // ✅ Buscar aulas do dia
  async getAulasDoDia(data: Date = new Date()): Promise<Aula[]> {
    try {
      const inicioDia = new Date(data.setHours(0, 0, 0, 0));
      const fimDia = new Date(data.setHours(23, 59, 59, 999));
      
      return this.getAulasPorPeriodo(inicioDia, fimDia);

    } catch (error) {
      console.error('❌ Erro ao buscar aulas do dia:', error);
      return [];
    }
  },

  // ✅ Buscar aulas da semana
  async getAulasDaSemana(data: Date = new Date()): Promise<Aula[]> {
    try {
      const dia = data.getDay();
      const inicioSemana = new Date(data);
      inicioSemana.setDate(data.getDate() - dia);
      inicioSemana.setHours(0, 0, 0, 0);
      
      const fimSemana = new Date(inicioSemana);
      fimSemana.setDate(inicioSemana.getDate() + 6);
      fimSemana.setHours(23, 59, 59, 999);
      
      return this.getAulasPorPeriodo(inicioSemana, fimSemana);

    } catch (error) {
      console.error('❌ Erro ao buscar aulas da semana:', error);
      return [];
    }
  },

  // ✅ Verificar se já existe aula no mesmo horário
  async verificarConflitoHorario(
    turmaId: string, 
    dataAula: Date, 
    horaInicio: string, 
    horaFim: string, 
    excluirId?: string
  ): Promise<boolean> {
    try {
      const aulasTurma = await this.getAulasPorTurma(turmaId);
      
      return aulasTurma.some(aula => {
        // Pular a própria aula se estiver atualizando
        if (excluirId && aula.id === excluirId) return false;
        
        // Verificar se é no mesmo dia
        const dataAulaExistente = new Date(aula.data_aula);
        const dataNovaAula = new Date(dataAula);
        
        if (dataAulaExistente.toDateString() !== dataNovaAula.toDateString()) {
          return false;
        }
        
        // Verificar conflito de horário
        const inicioExistente = aula.hora_inicio;
        const fimExistente = aula.hora_fim;
        
        // Converte horários para minutos do dia
        const toMinutes = (time: string) => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };
        
        const inicioNovo = toMinutes(horaInicio);
        const fimNovo = toMinutes(horaFim);
        const inicioExistenteMin = toMinutes(inicioExistente);
        const fimExistenteMin = toMinutes(fimExistente);
        
        // Verifica sobreposição
        return (
          (inicioNovo >= inicioExistenteMin && inicioNovo < fimExistenteMin) ||
          (fimNovo > inicioExistenteMin && fimNovo <= fimExistenteMin) ||
          (inicioNovo <= inicioExistenteMin && fimNovo >= fimExistenteMin)
        );
      });

    } catch (error) {
      console.error('❌ Erro ao verificar conflito de horário:', error);
      return false;
    }
  },

  // ✅ Verificar saúde do banco de aulas
  async checkDatabaseHealth() {
    try {
      const aulaCount = await db.aulas.count();
      const queueCount = await db.syncQueue
        .where('table')
        .equals('aulas')
        .and(item => item.status === 'pending')
        .count();
      
      const aulasAtivas = (await this.getAllAulas()).length;
      
      return {
        aulasTotal: aulaCount,
        aulasAtivas: aulasAtivas,
        pendentes: queueCount,
        online: navigator.onLine,
        bancoAberto: db.isOpen(),
        conflitos: aulaCount - aulasAtivas // Aulas deletadas (soft delete)
      };
    } catch (error: any) {
      return {
        error: error.message,
        bancoAberto: false
      };
    }
  },

  // ✅ Estatísticas de aulas
  async getEstatisticas() {
    try {
      const todasAulas = await this.getAllAulas();
      
      // Agrupar por turma
      const porTurma: Record<string, number> = {};
      const porMes: Record<string, number> = {};
      const statusV=['planeada', 'ministrada' , 'cancelada' , 'adiada']
      const porStatus: Record<string, number> = {}
      statusV.forEach(v=> {
        porStatus[v]=0;
      })
      const topTurmas: Record<string, Turma> = {};
      const turmas= await turmaService.getTurmas()
      todasAulas.forEach(aula => {
        // Por turma
        const turmaKey = aula.turma_id || 'sem_turma';
        porTurma[turmaKey] = (porTurma[turmaKey] || 0) + 1;

        const statusKey = aula.status || 'sem_status'
        porStatus[statusKey] = (porStatus[statusKey] || 0) + 1;
        
        // Por mês
        const data = new Date(aula.data_aula);
        const mesKey = `${data.getFullYear()}-${(data.getMonth() + 1).toString().padStart(2, '0')}`;
        porMes[mesKey] = (porMes[mesKey] || 0) + 1;
      });
      
      return {
        total: todasAulas.length,
        porTurma,
        porMes,
        porStatus,
        topTurmas,
        ultimaAtualizacao: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao gerar estatísticas:', error);
      return {
        total: 0,
        porTurma: {},
        porMes: {},
        porStatus:{},
        topTurmas:[],
        ultimaAtualizacao: new Date().toISOString()
      };
    }
  }
};
// services/database/turmaService.ts
import { Student } from '../../types';
import { HorarioAula, HorarioAulaForm, Turma, TurmaFormData } from '../../types/turma';
import { instituicaoIdValue } from '../../utils/getInsitituicaoID';
import { supabase } from '../database/db';
import { alunosService } from './alunosService';
import { cacheManager } from './cacheManager';
import db from './db';
import { notificacaoService, PrioridadeNotificacao, TipoNotificacao } from './notificacaoService';
import { syncManager } from './syncManager';

const generateUniqueId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const turmaService = {
  // ✅ Criar turma localmente
  async createTurma(turmaData: TurmaFormData): Promise<string> {
    try {
      const id = generateUniqueId();
      const now = new Date().toISOString();
      
      const turma = {
        ...turmaData,
        id,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
        deleted: false,
      } as Turma;

      console.log('💾 Salvando turma:', turma.nome_turma);
      
      await db.turmas.put(turma);
      
      // Adicionar à fila de sincronização
      await db.syncQueue.add({
        table: 'turmas',
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      console.log('✅ Turma salva com ID:', id);
    
      return id;
      
    } catch (error) {
      console.error('❌ Erro ao salvar turma:', error);
      throw error;
    }
  },

  // ✅ Buscar todas as turmas
  async getTurmas(): Promise<Turma[]> {
    try {
      console.log('📋 Buscando turmas...');
      const CACHE_KEY = 'turmas_all';
      const qtd= await db.turmas.count()
      const cached = cacheManager.get(CACHE_KEY,qtd);
      if (cached) {
        return cached;
      }

      const [todosCursos,aulasDb,alunos]= await Promise.all([
            db.cursos
            .where("instituicao_id")
            .equals(instituicaoIdValue()||"")
            .and(curso=>!curso.deleted)
            .toArray(),
            db.aulas.filter(aula=>!aula.deleted ).toArray(),
            db.alunos.filter(aluno=>!aluno.deleted).toArray(),
      ])
      
          
      const todasTurmas:Turma[] = []
      const horarios:HorarioAula[]=[]

      for (const curso of todosCursos) {
          const value =await this.getTurmasPorCurso(curso.id)
          todasTurmas.push(...value)
      }
      for (const turma of todasTurmas) {
        const value =await this.getHorarios(turma.id)
        horarios.push(...value)
      }
      
      // Filtrar as não deletadas
      const turmasAtivas = todasTurmas.filter(turma =>  !turma.deleted);
      const cursosMap = new Map(todosCursos.map(c => [c.id, c]));
                        // Ordenar por nome
      turmasAtivas.sort((a, b) => 
        (a.nome_turma || '').localeCompare(b.nome_turma || '')
      );

     const turmas= (turmasAtivas.map( turma=>{
         const curso = turma.curso_id ? cursosMap.get(turma.curso_id) : null;
         const aluno= alunos.filter((aluno:Student)=> aluno.turma_id==turma.id).length
         const aulas=aulasDb.filter(aula=> aula.turma_id==turma.id)
         const horario=horarios.filter(h=>h.turma_id==turma.id)
         return {
          ...turma,
          curso_nome:curso?.nome,
          qtd:aluno,
          aulas,
          horarios:horario
         }
      }))
      
      cacheManager.set(CACHE_KEY, turmas);

      console.log(`✅ Encontradas ${turmasAtivas.length} turmas ativas`);
      return turmas
    } catch (error) {
      console.error('❌ Erro ao buscar turmas:', error);
      return [];
    }
  },

  async getTurmaById(id: string): Promise<Turma | undefined> {
    try {
      const turma = await db.turmas.get(id);
      const curso=await db.cursos.where('id')
                  .equals(turma?.curso_id||'')
                  .and(curso=> !curso.deleted)
                  .first()

      return turma&&!turma.deleted ? {
        ...turma,
        curso_nome:curso?.nome
      } : undefined;
    } catch (error) {
      console.error('Erro ao buscar turma por ID:', error);
      return undefined;
    }
  },

  async getTurmaByNome(nome: string): Promise<Turma | undefined> {
    try {
      const turmas = await db.turmas
        .where('nome_turma')
        .equals(nome)
        .and(turma => !turma.deleted)
        .toArray();
      
      return turmas[0];
    } catch (error) {
      console.error('Erro ao buscar turma por nome:', error);
      return undefined;
    }
  },

  async getId(nome: string): Promise<string | null> {
    try {
      const turmaLocal = await this.getTurmaByNome(nome);
      if (turmaLocal) {
        return turmaLocal.id;
      }
      
      if (navigator.onLine) {
        const { data } = await supabase
          .from("turmas")
          .select("id")
          .eq("nome_turma", nome)
          .limit(1);
          
        if (data && data.length > 0) {
          return data[0].id;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar ID da turma:', error);
      return null;
    }
  },

  async findById(id: string): Promise<Turma | null> {
    try {
      const turma = await this.getTurmaById(id);
      if (turma) {
        return turma;
      }
      
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from("turmas")
          .select("*")
          .eq("id", id)
          .single();
          
        if (!error && data) {
          // Salvar localmente para cache
          await db.turmas.put({
            ...data,
            sync_status: 'synced' as const,
            deleted: false
          });
          return data;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar turma:', error);
      return null;
    }
  },

  // ✅ Deletar turma (soft delete)
  async deleteTurma(id: string) {
    try {
      const turma = await db.turmas.get(id);
      if (!turma) return;

      if (turma.sync_status === 'synced' && !turma.id.startsWith('local_')) {
        // Se já sincronizado, marcar para deleção remota
        await db.turmas.update(id, { 
          deleted: true, 
          sync_status: 'pending_delete',
          updated_at: new Date().toISOString(),
          
        });
        
        await db.syncQueue.add({
          table: 'turmas',
          record_id: id,
          operation: 'delete',
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        console.log(`🗑️ Turma ${id} marcada para deleção remota`);
      } else {
        // Se nunca sincronizado, deletar completamente
        await db.turmas.delete(id);
        
        // Remover da fila se existir
        await db.syncQueue
          .where('record_id')
          .equals(id)
          .delete();
          
        console.log(`🗑️ Turma ${id} deletada localmente`);
      }
      
    } catch (error) {
      console.error('Erro ao deletar turma:', error);
      throw error;
    }
  },

  // ✅ Editar turma
  async editTurma(id: string, turmaData: Partial<TurmaFormData>) {
    try {
      const updated_at = new Date().toISOString();
      
      await db.turmas.update(id, {
        ...turmaData,
        updated_at,
        sync_status: 'pending'
      });

      // Adicionar/atualizar na fila
      await db.syncQueue.add({
        table: 'turmas',
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });
      
      console.log(`✏️ Turma ${id} marcada para atualização`);
      
    } catch (error) {
      console.error('Erro ao editar turma:', error);
      throw error;
    }
  },

  // ✅ Obter horários da turma
  async getHorarios(turmaId: string): Promise<HorarioAula[]> {
    try {
      const horarios=await db.turma_horarios.filter(f=>!f.deleted&&f.turma_id==turmaId)
                    .toArray()

      
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('turma_horarios')
          .select("*")
          .eq('turma_id', turmaId);
          
        if (!error && data) {
          return data as HorarioAula[];
        }
      }
      
      return horarios;
      
    } catch (error) {
      console.error('Erro ao buscar horários:', error);
      return [];
    }
  },

  // ✅ Criar horário
  async createHorario(horario: HorarioAulaForm, turmaId: string) {
    try {
      const id = generateUniqueId();
      const now = new Date().toISOString();
      
      const horarios = {
        ...horario,
        id,
        turma_id:turmaId,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
        deleted: false,
      } as HorarioAula;

      console.log('💾 Salvando horario:', horarios.dia_semana);
      
      await db.turma_horarios.put(horarios);
      
      // Adicionar à fila de sincronização
      await db.syncQueue.add({
        table: 'turma_horarios',
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      console.log('✅ Turma salva com ID:', id);
    
      return id;
    } catch (error) {
      console.error('Erro ao criar horário:', error);
      throw error;
    }
  },

  // ✅ Atualizar horário
  async updateHorario(id: string, horario: Partial<HorarioAulaForm>) {
    try {
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('turma_horarios')
          .update(horario)
          .eq('id', id)
          .select();
        
        if (error) throw new Error(`Erro ao atualizar horário: ${error.message}`);
        return data;
      } else {
        throw new Error('Offline - não é possível atualizar horário sem conexão');
      }
    } catch (error) {
      console.error('Erro ao atualizar horário:', error);
      throw error;
    }
  },

  // ✅ Excluir horário
  async excluirHorario(id: string) {
    try {
      if (navigator.onLine) {
        const { error } = await supabase
          .from('turma_horarios')
          .delete()
          .eq('id', id);
        
        if (error) throw new Error(`Erro ao excluir horário: ${error.message}`);
      } else {
        throw new Error('Offline - não é possível excluir horário sem conexão');
      }
    } catch (error) {
      console.error('Erro ao excluir horário:', error);
      throw error;
    }
  },

 async syncTurmas() {
      return syncManager.downloadTableBatch('turmas', new Date(0));
    },
  
  // ✅ Função auxiliar para marcar como pendente
   async markForSync(recordId: string, operation: 'upsert' | 'delete') {
    await db.syncQueue.add({
      table: 'turmas',
      record_id: recordId,
      operation,
      status: 'pending',
      created_at: new Date().toISOString()
    });
  },

  // ✅ Verificar saúde do banco de turmas
  async checkDatabaseHealth(instituicao_id:string) {
    try {
      const turmaCount = await db.turmas.count();
      const queueCount = await db.syncQueue
        .where('table')
        .equals('turmas')
        .and(item => item.status === 'pending')
        .count();
      
      const turmasAtivas = (await this.getTurmas()).length;
      
      return {
        turmasTotal: turmaCount,
        turmasAtivas: turmasAtivas,
        pendentes: queueCount,
        online: navigator.onLine,
        bancoAberto: db.isOpen()
      };
    } catch (error: any) {
      return {
        error: error.message,
        bancoAberto: false
      };
    }
  },

  // ✅ Buscar turmas por curso
  async getTurmasPorCurso(cursoId: string): Promise<Turma[]> {
    try {
      const turmas = await db.turmas
        .where('curso_id')
        .equals(cursoId)
        .and(turma => !turma.deleted)
        .toArray();
      
      return turmas.sort((a, b) => 
        (a.nome_turma || '').localeCompare(b.nome_turma || '')
      );
    } catch (error) {
      console.error('Erro ao buscar turmas por curso:', error);
      return [];
    }
  },

  // ✅ Obter estatísticas
  async getEstatisticas(instituicao_id:string) {
    try {
      const turmas = await this.getTurmas();
      
      // Agrupar por curso
      const porCurso: Record<string, number> = {};
      const porAno: Record<string, number> = {};
      
      turmas.forEach(turma => {
        // Por curso
        const cursoKey = turma.curso_id || 'sem_curso';
        porCurso[cursoKey] = (porCurso[cursoKey] || 0) + 1;
        
        // Por ano letivo
        const anoKey = turma.ano_lectivo || 'sem_ano';
        porAno[anoKey] = (porAno[anoKey] || 0) + 1;
      });
      
      return {
        total: turmas.length,
        porCurso,
        porAno,
        ultimaAtualizacao: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao gerar estatísticas:', error);
      return {
        total: 0,
        porCurso: {},
        porAno: {},
        ultimaAtualizacao: new Date().toISOString()
      };
    }
  }
};
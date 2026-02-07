// services/database/turmaService.ts
import { Student } from '../../types';
import { Aula } from '../../types/aula';
import { SyncStatus } from '../../types/base';
import { HorarioAula, HorarioAulaForm, Turma, TurmaFormData } from '../../types/turma';
import { emitPendingSync } from '../../utils/emitPendingSync';
import { instituicaoIdValue } from '../../utils/getInsitituicaoID';
import { getLastModifiedTimestamp } from '../../utils/getLastModifiedTimestamp';
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
    const CACHE_KEY = 'turmas_all';
    try {
      console.log('📋 Buscando turmas...');
      
      // 1. Obter versão/checksum dos dados para cache mais inteligente
      const [turmaCount, cursoCount, aulaCount, alunoCount,lastModified] = await Promise.all([
        db.turmas.count(),
        db.cursos.count(),
        db.aulas.count(),
        db.alunos.count(),
        getLastModifiedTimestamp()
      ]);
      
      // Criar uma chave de versão baseada em contagens e timestamps
      const cacheVersion = `${turmaCount}_${cursoCount}_${aulaCount}_${alunoCount}_${lastModified}`;
      const cacheKeyWithVersion = `${CACHE_KEY}_${cacheVersion}`;
      
      // 2. Tentar obter do cache com a nova chave
      const cached = cacheManager.get(cacheKeyWithVersion);
      if (cached) {
        console.log('✅ Cache HIT para turmas');
        return cached;
      }
      
      console.log('🔄 Cache MISS, buscando do banco...');
      
      // 3. Buscar dados em paralelo de forma mais eficiente
      const [todosCursos, aulasDb, alunos, todasTurmasDb] = await Promise.all([
        db.cursos
          .where("instituicao_id")
          .equals(instituicaoIdValue() || "")
          .filter(curso => !curso.deleted)
          .toArray(),
        db.aulas.filter(aula => !aula.deleted).toArray(),
        db.alunos.filter(aluno => !aluno.deleted).toArray(),
        db.turmas.filter(turma => !turma.deleted).toArray() ,
      ]);
      
      // 4. Otimizar: buscar horários em batch em vez de um por um
      const todasTurmasIds = todasTurmasDb.map(t => t.id);
      const horarios = await this.getHorariosBatch(todasTurmasIds);
      
      // 5. Criar maps para lookup O(1)
      const cursosMap = new Map(todosCursos.map(c => [c.id, c]));
      const horariosMap = new Map();
      horarios.forEach(h => {
        if (!horariosMap.has(h.turma_id)) horariosMap.set(h.turma_id, []);
        horariosMap.get(h.turma_id).push(h);
      });
      
      const alunosPorTurma = alunos.reduce((acc, aluno) => {
        if (aluno.turma_id) {
          acc[aluno.turma_id] = (acc[aluno.turma_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      
      const aulasPorTurma = aulasDb.reduce((acc, aula) => {
        if (aula.turma_id) {
          if (!acc[aula.turma_id]) acc[aula.turma_id] = [];
          acc[aula.turma_id].push(aula);
        }
        return acc;
      }, {} as Record<string, Aula[]>);
      
      // 6. Processar turmas
      const turmasAtivas = todasTurmasDb
        .filter(turma => !turma.deleted)
        .sort((a, b) => (a.nome_turma || '').localeCompare(b.nome_turma || ''));
      
      const turmas = turmasAtivas.map(turma => {
        const curso = turma.curso_id ? cursosMap.get(turma.curso_id) : null;
        
        return {
          ...turma,
          curso_nome: curso?.nome,
          qtd: alunosPorTurma[turma.id] || 0,
          aulas: aulasPorTurma[turma.id] || [],
          horarios: horariosMap.get(turma.id) || []
        };
      });
      
      // 7. Salvar no cache com expiration time
      cacheManager.set(cacheKeyWithVersion, turmas, {
        ttl: 5 * 60 * 1000, // 5 minutos
        version: cacheVersion
      });
      const pendentesCount = turmas.filter(turma => 
        turma.sync_status === 'pending' || turma.sync_status === 'pending_delete'
      ).length;

      if (pendentesCount > 0) {
        emitPendingSync('turmas', pendentesCount);
      }

      // 8. Limpar versões antigas do cache
      this.cleanOldCacheVersions(CACHE_KEY, cacheVersion);
      
      console.log(`✅ Encontradas ${turmas.length} turmas ativas`);


      return turmas;
      
    } catch (error) {
      console.error('❌ Erro ao buscar turmas:', error);
      // Fallback para cache mais antigo se disponível
      const fallback = cacheManager.getLatest(CACHE_KEY);
      if (fallback) {
        console.warn('⚠️  Usando cache fallback devido a erro');
        return fallback;
      }
      return [];
    }
  }

  // Métodos auxiliares recomendados:
  , async getHorariosBatch(turmaIds: string[]): Promise<HorarioAula[]> {
    if (turmaIds.length === 0) return [];
    
    return db.turma_horarios
      .where('turma_id')
      .anyOf(turmaIds)
      .filter(horario => !horario.deleted)
      .toArray();
  }

  , cleanOldCacheVersions(baseKey: string, currentVersion: string) {
    const keys = Object.keys(localStorage)
      .filter(key => key.startsWith(`${baseKey}_`))
      .filter(key => !key.endsWith(`_${currentVersion}`));
    
    keys.forEach(key => {
      cacheManager.delete(key);
    });
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
          sync_status: 'pending_delete' as SyncStatus,
          updated_at: new Date().toISOString(),
        });

        await alunosService.getAlunosPorTurma(id).then(alunos => {
          alunos.forEach(async aluno => {
            await alunosService.deleteStudent(aluno.id);
          });
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
    
      this.markForSync(id,'upsert')
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
      await db.turma_horarios.update(id,{
        ...horario,
        sync_status:"pending",
        updated_at:new Date().toISOString()        
      })

      await db.syncQueue.add({
        table: 'turma_horarios',
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: new Date().toISOString()        
      });
      console.timeLog('Horario editado com sucesso');
    }catch(error){
      console.error('Erro ao editar horário:', error);
      throw error;
    }
  },

  // ✅ Excluir horário
  async excluirHorario(id: string) {
    try{
    await db.turma_horarios.delete(id)

      await db.syncQueue.add({
        table: 'turma_horarios',
        record_id: id,
        operation: 'delete',
        status: 'pending_delete',
        created_at: new Date().toISOString()        
      });
      console.log('Horario excluido com sucesso');
    }catch(error){
      console.error('Erro ao excluir horário:', error);
      throw error;
    }
  },

    async syncTurmas() {
      if(navigator.onLine)
        return await Promise.all([syncManager.uploadTableBatch('turmas'),
          syncManager.downloadTableBatch('turmas', new Date(0))
        ])
      throw new Error("sem net")
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
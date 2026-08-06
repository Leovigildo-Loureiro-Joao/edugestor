import { Student } from '../../types';
import { Aula } from '../../types/aula';
import { SyncStatus } from '../../types/base';
import { HorarioAula, HorarioAulaForm, Turma, TurmaFormData } from '../../types/turma';
import { emitPendingSync } from '../../utils/emitPendingSync';
import { instituicaoIdValue } from '../../utils/getInstituicaoID';
import { getLastModifiedTimestamp } from '../../utils/getLastModifiedTimestamp';
import { generateUniqueId } from '../../utils/idGenerator';
import { supabase } from '../database/db';
import { alunosService } from './alunosService';
import { aulaService } from './aulaService';
import { cacheManager } from './cacheManager';
import db from './db';
import { frequenciaService } from './frequenciaService';
import { notificacaoService, PrioridadeNotificacao, TipoNotificacao } from './notificacaoService';
import { syncManager } from './syncManager';


const normalizeHorarioText = (value?: string) => (value || '').trim().toLowerCase();
const normalizeHorarioTime = (value?: string) => (value || '').trim().slice(0, 5);
const normalizeDisciplinaIdentity = (value?: string) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
const getHorarioIdentityKey = (
  horario: Pick<HorarioAula, 'turma_id' | 'dia_semana' | 'hora_inicio' | 'hora_fim' | 'disciplina'>
) => {
  return [
    horario.turma_id,
    horario.dia_semana,
    normalizeHorarioTime(horario.hora_inicio),
    normalizeHorarioTime(horario.hora_fim),
    normalizeHorarioText(horario.disciplina)
  ].join('|');
};

const deduplicateHorariosByIdentity = (horarios: HorarioAula[]) => {
  const uniqueMap = new Map<string, HorarioAula>();

  for (const horario of horarios) {
    const key = getHorarioIdentityKey(horario);
    const existente = uniqueMap.get(key);

    if (!existente) {
      uniqueMap.set(key, horario);
      continue;
    }

    const existenteTime = new Date(existente.updated_at || existente.created_at || 0).getTime();
    const atualTime = new Date(horario.updated_at || horario.created_at || 0).getTime();
    if (atualTime > existenteTime) {
      uniqueMap.set(key, horario);
    }
  }

  return Array.from(uniqueMap.values());
};

const ensureDisciplinaInCursoDaTurma = async (turmaId: string, disciplina?: string): Promise<boolean> => {
  const disciplinaLimpa = (disciplina || '').trim();
  if (!disciplinaLimpa) return false;

  const turma = await db.turmas.get(turmaId);
  if (!turma || turma.deleted || !turma.curso_id) return false;

  const curso = await db.cursos.get(turma.curso_id);
  if (!curso || curso.deleted) return false;

  const disciplinasAtuais = Array.isArray(curso.disciplinas) ? curso.disciplinas : [];
  const disciplinaJaExiste = disciplinasAtuais.some(
    (item) => normalizeDisciplinaIdentity(item) === normalizeDisciplinaIdentity(disciplinaLimpa)
  );

  if (disciplinaJaExiste) return false;

  const updated_at = new Date().toISOString();
  await db.cursos.put({
    ...curso,
    disciplinas: [...disciplinasAtuais, disciplinaLimpa],
    sync_status: 'pending',
    updated_at,
    instituicao_id: instituicaoIdValue()
  });

  await db.syncQueue.add({
    table: 'cursos',
    instituicao_id: curso.instituicao_id || instituicaoIdValue(),
    record_id: curso.id,
    operation: 'upsert',
    status: 'pending',
    created_at: updated_at
  });

  const cacheScope = curso.instituicao_id || instituicaoIdValue() || 'global';
  cacheManager.delete(`curso_${cacheScope}_${curso.id}`);
  cacheManager.invalidate(`^cursos_all_${cacheScope}_`);
  cacheManager.emitCacheInvalidated('courses');

  return true;
};

export const turmaService = {
  
  async createTurma(turmaData: TurmaFormData): Promise<string> {
    try {
      const id = generateUniqueId();
      const now = new Date().toISOString();
      const instituicao_id = instituicaoIdValue() || '';
      
      const turma = {
        ...turmaData,
        id,
        instituicao_id,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
        deleted: false,
      } as Turma;

      await db.turmas.put(turma);
      
      
      await db.syncQueue.add({
        table: 'turmas',
        instituicao_id:instituicaoIdValue(),
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      return id;
      
    } catch (error) {
      console.error('❌ Erro ao salvar turma:', error);
      throw error;
    }
  },

  
  async getTurmas(): Promise<Turma[]> {
    const activeInstituicaoId = instituicaoIdValue() || '';
    const cacheScope = activeInstituicaoId || 'global';
    const CACHE_KEY = `turmas_all_${cacheScope}`;
    try {
      
      const [turmaCount, cursoCount, aulaCount, alunoCount,lastModified] = await Promise.all([
        db.turmas.count(),
        db.cursos.count(),
        db.aulas.count(),
        db.alunos.count(),
        getLastModifiedTimestamp()
      ]);
      
      
      const cacheVersion = `${turmaCount}_${cursoCount}_${aulaCount}_${alunoCount}_${activeInstituicaoId}_${lastModified}`;
      const cacheKeyWithVersion = `${CACHE_KEY}_${cacheVersion}`;
      
      
      const cached = cacheManager.get(cacheKeyWithVersion);
      if (cached) {
        return cached;
      }
      
      
      const [todosCursos, aulasDb, alunos, todasTurmasDb] = await Promise.all([
        db.cursos
          .where("instituicao_id")
          .equals(instituicaoIdValue() || "")
          .filter(curso => !curso.deleted)
          .toArray(),
        db.aulas.filter(aula => !aula.deleted && (!activeInstituicaoId || aula.instituicao_id === activeInstituicaoId)).toArray(),
        db.alunos.filter(aluno => !aluno.deleted && (!activeInstituicaoId || aluno.instituicao_id === activeInstituicaoId)).toArray(),
        db.turmas.filter(turma => !turma.deleted && (!activeInstituicaoId || turma.instituicao_id === activeInstituicaoId)).toArray() ,
      ]);
      
      
      const todasTurmasIds = todasTurmasDb.map(t => t.id);
      const horarios = await this.getHorariosBatch(todasTurmasIds);
      
      
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
      
      
      cacheManager.set(cacheKeyWithVersion, turmas, {
        ttl: 5 * 60 * 1000, 
        version: cacheVersion
      });
      const pendentesCount = turmas.filter(turma => 
        turma.sync_status === 'pending' || turma.sync_status === 'pending_delete'
      ).length;

      if (pendentesCount > 0) {
        emitPendingSync('turmas', pendentesCount);
      }

      
      this.cleanOldCacheVersions(CACHE_KEY, cacheVersion);
      
      return turmas;
      
    } catch (error) {
      console.error('❌ Erro ao buscar turmas:', error);
      
      const fallback = cacheManager.getLatest(CACHE_KEY);
      if (fallback) {
        console.warn('⚠️  Usando cache fallback devido a erro');
        return fallback;
      }
      return [];
    }
  }

  
  , async getHorariosBatch(turmaIds: string[]): Promise<HorarioAula[]> {
    if (turmaIds.length === 0) return [];

    const horarios = await db.turma_horarios
      .where('turma_id')
      .anyOf(turmaIds)
      .filter(horario => !horario.deleted)
      .toArray();

    return deduplicateHorariosByIdentity(horarios);
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

  
  async deleteTurma(id: string) {
    try {
      const turma = await db.turmas.get(id);
      if (!turma) return;

      
      const aulasDaTurma = await db.aulas
        .where('turma_id')
        .equals(id)
        .and((aula) => !aula.deleted)
        .toArray();

      for (const aula of aulasDaTurma) {
        await frequenciaService.deleteFrequenciasPorAula(aula.id);
        await aulaService.deletarAula(aula.id);
      }

      const horariosDaTurma = await db.turma_horarios
        .where('turma_id')
        .equals(id)
        .and((horario) => !horario.deleted)
        .toArray();

      for (const horario of horariosDaTurma) {
        if (horario.sync_status === 'synced' && !horario.id.startsWith('local_')) {
          await db.turma_horarios.update(horario.id, {
            deleted: true,
            sync_status: 'pending_delete',
            updated_at: new Date().toISOString()
          });

          await db.syncQueue.add({
            table: 'turma_horarios',
            record_id: horario.id,
            instituicao_id: instituicaoIdValue(),
            operation: 'delete',
            status: 'pending',
            created_at: new Date().toISOString()
          });
        } else {
          await db.turma_horarios.delete(horario.id);
          await db.syncQueue
            .where('record_id')
            .equals(horario.id)
            .delete();
        }
      }

      const alunosDaTurma = await alunosService.getAlunosPorTurma(id);
      for (const aluno of alunosDaTurma) {
        await alunosService.deleteStudent(aluno.id);
      }

      if (turma.sync_status === 'synced' && !turma.id.startsWith('local_')) {
        
        await (db.turmas as any).update(
          id,
          {
            deleted: true,
            sync_status: 'pending_delete' as SyncStatus,
            updated_at: new Date().toISOString()
          }
        );
        
        await db.syncQueue.add({
          table: 'turmas',
          instituicao_id:instituicaoIdValue(),
          record_id: id,
          operation: 'delete',
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        } else {
        
        await db.turmas.delete(id);
        
        
        await db.syncQueue
          .where('record_id')
          .equals(id)
          .delete();
          
        }
      
    } catch (error) {
      console.error('Erro ao deletar turma:', error);
      throw error;
    }
  },

  
  async editTurma(id: string, turmaData: Partial<TurmaFormData>) {
    try {
      const updated_at = new Date().toISOString();
      
      await (db.turmas as any).update(id, {
        ...turmaData,
        updated_at,
        sync_status: 'pending'
      });

      
      await db.syncQueue.add({
        table: 'turmas',
        instituicao_id:instituicaoIdValue(),
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });
      
      } catch (error) {
      console.error('Erro ao editar turma:', error);
      throw error;
    }
  },

  
  async getHorarios(turmaId: string): Promise<HorarioAula[]> {
    try {
      const horarios = await db.turma_horarios
        .filter(f => !f.deleted && f.turma_id == turmaId)
        .toArray();

      return deduplicateHorariosByIdentity(horarios);
      
    } catch (error) {
      console.error('Erro ao buscar horários:', error);
      return [];
    }
  },

  async findDuplicateHorario(
    turmaId: string,
    horario: Pick<HorarioAulaForm, 'dia_semana' | 'hora_inicio' | 'hora_fim' | 'disciplina'>,
    ignoreId?: string
  ): Promise<HorarioAula | undefined> {
    const horariosDaTurma = await db.turma_horarios
      .where('turma_id')
      .equals(turmaId)
      .and(item => !item.deleted && item.id !== ignoreId)
      .toArray();

    const newKey = getHorarioIdentityKey({
      turma_id: turmaId,
      dia_semana: horario.dia_semana,
      hora_inicio: horario.hora_inicio,
      hora_fim: horario.hora_fim,
      disciplina: horario.disciplina
    } as Pick<HorarioAula, 'turma_id' | 'dia_semana' | 'hora_inicio' | 'hora_fim' | 'disciplina'>);

    return horariosDaTurma.find((item) => getHorarioIdentityKey(item) === newKey);
  },

  
  async createHorario(horario: HorarioAulaForm, turmaId: string) {
    try {
      const duplicado = await this.findDuplicateHorario(turmaId, horario);
      if (duplicado) {
        throw new Error('Já existe um horário com a mesma turma, dia, hora e disciplina.');
      }

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

      await db.turma_horarios.put(horarios);
      const disciplinaAdicionadaAoCurso = await ensureDisciplinaInCursoDaTurma(turmaId, horario.disciplina);

      
      await db.syncQueue.add({
        table: 'turma_horarios',
        record_id: id,
        instituicao_id:instituicaoIdValue(),
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      return { id, disciplinaAdicionadaAoCurso };
    } catch (error) {
      console.error('Erro ao criar horário:', error);
      throw error;
    }
  },

  
  async updateHorario(id: string, horario: Partial<HorarioAulaForm>) {
    try {
      const horarioAtual = await db.turma_horarios.get(id);
      if (!horarioAtual || horarioAtual.deleted) {
        throw new Error('Horário não encontrado para atualização.');
      }

      const turmaId = horario.turma_id || horarioAtual.turma_id;
      const candidato = {
        dia_semana: horario.dia_semana || horarioAtual.dia_semana,
        hora_inicio: horario.hora_inicio || horarioAtual.hora_inicio,
        hora_fim: horario.hora_fim || horarioAtual.hora_fim,
        disciplina: horario.disciplina || horarioAtual.disciplina
      };

      const duplicado = await this.findDuplicateHorario(turmaId, candidato, id);
      if (duplicado) {
        throw new Error('Já existe um horário com a mesma turma, dia, hora e disciplina.');
      }

      await db.turma_horarios.update(id,{
        ...horario,
        sync_status:"pending",
        updated_at:new Date().toISOString()        
      })
      const disciplinaAdicionadaAoCurso = await ensureDisciplinaInCursoDaTurma(turmaId, candidato.disciplina);

      await db.syncQueue.add({
        table: 'turma_horarios',
        record_id: id,
        instituicao_id:instituicaoIdValue(),
        operation: 'upsert',
        status: 'pending',
        created_at: new Date().toISOString()        
      });
      console.timeLog('Horario editado com sucesso');
      return { disciplinaAdicionadaAoCurso };
    }catch(error){
      console.error('Erro ao editar horário:', error);
      throw error;
    }
  },

  
  async excluirHorario(id: string) {
    try{
    await db.turma_horarios.delete(id)

      await db.syncQueue.add({
        table: 'turma_horarios',
        record_id: id,
        instituicao_id:instituicaoIdValue(),
        operation: 'delete',
        status: 'pending_delete',
        created_at: new Date().toISOString()        
      });
      }catch(error){
      console.error('Erro ao excluir horário:', error);
      throw error;
    }
  },

    async syncTurmas() {
      if(navigator.onLine)
        return await Promise.all([syncManager.uploadBatch(),
          syncManager.downloadTableBatch('turmas', new Date(0))
        ])
      throw new Error("sem net")
    },

  
   async markForSync(recordId: string, operation: 'upsert' | 'delete') {
    await db.syncQueue.add({
      table: 'turmas',
      instituicao_id:instituicaoIdValue(),
      record_id: recordId,
      operation,
      status: 'pending',
      created_at: new Date().toISOString()
    });
  },

  
  async checkDatabaseHealth(instituicao_id:string) {
    try {
      const turmaCount = await db.turmas.count();
      const queueCount = await db.syncQueue
        .where('instituicao_id')
        .equals(instituicaoIdValue())
        .and(item => item.table === 'turmas' && item.status === 'pending')
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

  
  async getEstatisticas(instituicao_id:string) {
    try {
      const turmas = await this.getTurmas();
      
      
      const porCurso: Record<string, number> = {};
      const porAno: Record<string, number> = {};
      
      turmas.forEach(turma => {
        
        const cursoKey = turma.curso_id || 'sem_curso';
        porCurso[cursoKey] = (porCurso[cursoKey] || 0) + 1;
        
        
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

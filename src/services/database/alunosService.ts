import { Student, StudentFormData } from "../../types";
import db from "./db";
import { supabase } from "./db";
import { Turma } from '../../types/turma';
import { syncManager } from "./syncManager";
import { SyncQueueItem } from "../../types/base";
import { avaliacaoService } from "./avaliacao";
import { profileService } from "./profileService";
import { turmaService } from "./turmas";
import { frequenciaService } from "./frequenciaService";
import { cacheManager } from "./cacheManager";
import { emitPendingSync } from "../../utils/emitPendingSync";
import { getLastModifiedTimestamp } from "../../utils/getLastModifiedTimestamp";
import { instituicaoIdValue } from "../../utils/getInsitituicaoID";
import { generateUniqueId } from "../../utils/idGenarator";
import { paymentChecker } from "./paymentcheker";
import { AlunoDesempenho } from "../../types/aluno";
import { propinaCascadeService } from "./propinaCascade";
import { resolveStudentAcademicStatus } from "../../utils/studentAcademicStatus";

const LOCAL_ID_MAP_KEY = 'sync_local_id_map';

const resolveMappedId = (id: string): string => {
  if (!id || !id.startsWith('local_')) return id;

  try {
    const instituicaoId = instituicaoIdValue();
    const scopedKey = instituicaoId ? `${LOCAL_ID_MAP_KEY}_${instituicaoId}` : LOCAL_ID_MAP_KEY;
    const scopedMapRaw = localStorage.getItem(scopedKey);
    const scopedMap = scopedMapRaw ? JSON.parse(scopedMapRaw) : {};
    if (scopedMap?.[id]) return scopedMap[id];
  } catch {
    
  }

  try {
    const globalMapRaw = localStorage.getItem(LOCAL_ID_MAP_KEY);
    const globalMap = globalMapRaw ? JSON.parse(globalMapRaw) : {};
    if (globalMap?.[id]) return globalMap[id];
  } catch {
    
  }

  return id;
};

const resolveStudentIdForUpdate = async (
  id: string,
  studentData: Partial<StudentFormData>
): Promise<string | null> => {
  const direct = await db.alunos.get(id);
  if (direct) return id;

  const mappedId = resolveMappedId(id);
  if (mappedId !== id) {
    const mapped = await db.alunos.get(mappedId);
    if (mapped) return mappedId;
  }

  
  if (typeof (studentData as any).numero_estudante === 'number') {
    const instituicaoId = instituicaoIdValue();
    const byNumber = await db.alunos
      .where('numero_estudante')
      .equals((studentData as any).numero_estudante)
      .toArray();
    const match = byNumber.find(
      (aluno) => !aluno.deleted && (!instituicaoId || aluno.instituicao_id === instituicaoId)
    );
    if (match?.id) return match.id;
  }

  return null;
};



export const alunosService = {

  async runEnrollmentStatusBackfill(options?: { force?: boolean }) {
    try {
      const instituicaoId = instituicaoIdValue() || '';
      if (!instituicaoId) return { updated: 0, queued: 0, skipped: true };

      const todayKey = new Date().toISOString().split('T')[0];
      const runKey = `alunos_backfill_enrollment_status_${instituicaoId}`;
      const lastRun = localStorage.getItem(runKey);

      if (!options?.force && lastRun === todayKey) {
        return { updated: 0, queued: 0, skipped: true };
      }

      const now = new Date().toISOString();
      const alunos = await db.alunos
        .where('instituicao_id')
        .equals(instituicaoId)
        .and((aluno) => !aluno.deleted)
        .toArray();

      let updated = 0;
      let queued = 0;

      for (const aluno of alunos) {
        const nextEstado = resolveStudentAcademicStatus(aluno as Student);
        if (nextEstado === aluno.estado) continue;

        await db.alunos.update(aluno.id, {
          estado: nextEstado,
          updated_at: now,
          sync_status: 'pending'
        });
        updated += 1;

        const hasPending = await db.syncQueue
          .where('table')
          .equals('alunos')
          .and(
            (item) =>
              item.record_id === aluno.id &&
              item.operation === 'upsert' &&
              item.status === 'pending' &&
              item.instituicao_id === instituicaoId
          )
          .first();

        if (!hasPending) {
          await db.syncQueue.add({
            table: 'alunos',
            record_id: aluno.id,
            instituicao_id: instituicaoId,
            operation: 'upsert',
            status: 'pending',
            created_at: now
          });
          queued += 1;
        }
      }

      this.invalidateStudentCache();
      localStorage.setItem(runKey, todayKey);

      return { updated, queued, skipped: false };
    } catch (error) {
      console.error('❌ Erro no backfill de matrícula:', error);
      return { updated: 0, queued: 0, skipped: false, error: true };
    }
  },


  
async saveStudent(studentData: StudentFormData): Promise<string> {
  try {
    const id = generateUniqueId();
    const now = new Date().toISOString();
    const instituicao_id = instituicaoIdValue() || "";
    const n = await this.gerarProximoNumeroEstudante();
    const estado = resolveStudentAcademicStatus({
      ...studentData,
      numero_estudante: n,
      instituicao_id,
      estado: studentData.estado || 'ativo'
    } as Student);

    
    const aluno = {
      ...studentData,
      id,
      instituicao_id,
      numero_estudante: n,
      estado,
      turma_id: studentData.turma_id && studentData.turma_id.trim() !== ''
        ? studentData.turma_id
        : null, 
      created_at: now,
      updated_at: now,
      sync_status: 'pending',
      deleted: false,
    };

    await db.alunos.put(aluno as Student);

    
    const syncRecord = await db.syncQueue.add({
      table: 'alunos',
      record_id: id,
      instituicao_id: instituicaoIdValue(),
      operation: 'upsert',
      status: 'pending',
      created_at: now
    });

    const alunosFromQueue = await db.syncQueue.get(syncRecord);
    const insertBatch = [alunosFromQueue] as SyncQueueItem[];
    await syncManager.processInsertBatch('alunos', insertBatch);

    return id;

  } catch (error) {
    console.error('❌ Erro ao salvar aluno:', error);
    throw error;
  }
},

async getAlunosPorTurma(turma_id: string | null) {
  const alunos = await db.alunos.toArray();

  
  if (turma_id === null) {
    return alunos.filter(aluno =>
      !aluno.deleted &&
      (!aluno.turma_id || aluno.turma_id.trim() === '')
    );
  }

  
  return alunos.filter(aluno =>
    !aluno.deleted &&
    aluno.turma_id === turma_id
  );
} ,

    
async getAllStudents(): Promise<Student[]> {
  const activeInstituicaoId = instituicaoIdValue() || '';
  const profile=await profileService.getLocalProfile()
  const cacheScope = activeInstituicaoId || 'global';
  const CACHE_KEY = `alunos_all_${cacheScope}`;
  try {
    await this.runEnrollmentStatusBackfill();
    
    const [alunoCount, turmaCount, lastModified] = await Promise.all([
      db.alunos.count(),
      db.turmas.count(),
      getLastModifiedTimestamp() 
    ]);

    
    const cacheVersion = `v${alunoCount}_${turmaCount}_${activeInstituicaoId}_${lastModified}`;
    const cacheKeyWithVersion = `${CACHE_KEY}_${cacheVersion}`;

    
    const cached = cacheManager.get(cacheKeyWithVersion);
    if (cached) {
      return cached;
    }

    
    const [alunosAll, todasTurmas] = await Promise.all([
      db.alunos.toArray(),
      turmaService.getTurmas()
    ]);

    
    
    const turmasAtivas = todasTurmas.filter(t => !t.deleted);
    const turmaMap = new Map(
      turmasAtivas.map(t => [t.id, {
        id: t.id,
        nome_turma: t.nome_turma || '',
        professor: t.professor || '',
        curso_nome: t.curso_nome || ''
      }])
    );

    
    
    const alunos = alunosAll
      .filter(aluno => {
        const turma = turmaMap.get(aluno.turma_id);
        if (activeInstituicaoId && aluno.instituicao_id !== activeInstituicaoId) {
          return false;
        }
        if(profile&&profile.role=="teacher")
          return turma?.professor===profile.full_name
        
        if (aluno.deleted) return false;
        
        return true;
      })
      .sort((a, b) => {
        
        const nomeA = a.nome_completo || '';
        const nomeB = b.nome_completo || '';
        return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
      })
      .map(aluno => {
        let turmaInfo = {
          turma_nome: 'Sem turma',
          professor: 'Sem professor',
          curso_nome: ''
        };

        if (aluno.turma_id) {
          const turma = turmaMap.get(aluno.turma_id);
          if (turma) {
            turmaInfo = {
              turma_nome: turma.nome_turma,
              professor: turma.professor,
              curso_nome: turma.curso_nome
            };
          }
        }


        return {
          ...aluno,
          ...turmaInfo,
          
          idade: aluno.data_nascimento ? this.calcularIdade(aluno.data_nascimento) : null
        };
      });

      const pendentesCount = alunosAll.filter(aluno =>
        aluno.sync_status === 'pending' || aluno.sync_status === 'pending_delete'
      ).length;

      if (pendentesCount > 0) {
        emitPendingSync('alunos', pendentesCount);
      }

    
    cacheManager.set(cacheKeyWithVersion, alunos, {
      ttl: 10 * 60 * 1000, 
      version: cacheVersion
    });

    
    this.cleanOldStudentCache(CACHE_KEY, cacheVersion);

    return alunos;

  } catch (error) {
    console.error('❌ Erro ao carregar alunos:', error);

    
    const fallback = cacheManager.getLatest(CACHE_KEY);
    if (fallback) {
      console.warn('⚠️ Usando cache fallback devido a erro');
      return fallback;
    }

    return [];
  }
}


, calcularIdade(dataNascimento: Date | string): number {
  const nascimento = new Date(dataNascimento);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();

  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }

  return idade;
}

, cleanOldStudentCache(baseKey: string, currentVersion: string): void {
  
  const cacheKeys = Object.keys(localStorage)
    .filter(key => key.startsWith(`${baseKey}_v`))
    .filter(key => !key.endsWith(`_${currentVersion}`));

  
  if (cacheKeys.length > 3) {
    const keysToRemove = cacheKeys.slice(3);
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
  }
}


, invalidateStudentCache(): void {
  
  const keys = Object.keys(localStorage).filter(key => key.startsWith('alunos_all_'));
  keys.forEach(key => localStorage.removeItem(key));
  }


, invalidateCacheOnStudentChange(studentId?: string): void {
  if (studentId) {
    
    cacheManager.delete(`aluno_${studentId}`);
  }
  
  this.invalidateStudentCache();
},

  async syncAlunos() {
    if (!navigator.onLine) throw new Error("sem net");

    await syncManager.uploadBatch();
    return Promise.all([
      syncManager.downloadTableBatch('alunos', new Date(0)),
      syncManager.downloadTableBatch('propina', new Date(0))
    ]);
  },

  
   async markForSync(recordId: string, operation: 'upsert' | 'delete') {
    await db.syncQueue.add({
      table: 'alunos',
      record_id: recordId,
      instituicao_id:instituicaoIdValue(),
      operation,
      status: 'pending',
      created_at: new Date().toISOString()
    });
  },

  
  async getStudentById(id: string): Promise<Student | undefined> {
    try {
      await this.runEnrollmentStatusBackfill();
      const aluno = await db.alunos.get(id);

      if (!aluno || aluno.deleted) {
        return undefined;
      }

      const instituicaoId = instituicaoIdValue();
      if (instituicaoId && aluno.instituicao_id && aluno.instituicao_id !== instituicaoId) {
        return undefined;
      }

      return {
        ...aluno,
        turma_nome: aluno.turma_id ? (await db.turmas.get(aluno.turma_id))?.nome_turma : 'Sem turma',
        professor: aluno.turma_id ? (await db.turmas.get(aluno.turma_id))?.professor : 'Sem professor',
        avaliacao:(await avaliacaoService.getAvaliacoesByAluno(aluno.id)).avaliacoes
      } as Student;
    } catch (error) {
      console.error('Erro ao buscar aluno:', error);
      return undefined;
    }
  },
  async refreshAllStudents() {
    const activeInstituicaoId = instituicaoIdValue() || '';
    const cacheScope = activeInstituicaoId || 'global';
    
    cacheManager.delete(`alunos_all_${cacheScope}`);
    cacheManager.invalidate(`alunos_all_${cacheScope}_.*`);
    cacheManager.invalidate(`alunos_chart_data_${cacheScope}`);

    
    return await this.getAllStudents();
  },
   async getAlunosForChart() {
    const activeInstituicaoId = instituicaoIdValue() || '';
    const cacheScope = activeInstituicaoId || 'global';
    const CACHE_KEY = `alunos_chart_data_${cacheScope}`;
    const cached = cacheManager.get(CACHE_KEY);

    if (cached) {
      return cached;
    }

    const alunos = await this.getAllStudents();

    cacheManager.set(CACHE_KEY, alunos,  {
      ttl: 10 * 60 * 1000, 
      version: CACHE_KEY
    }); 

    return alunos;
  }
  ,

  
  async getStudentByNumeroEstudante(numero: number): Promise<Student | undefined> {
    try {
      const alunos = await db.alunos
        .where('numero_estudante')
        .equals(numero)
        .toArray();

      return alunos.find(aluno => !aluno.deleted);
    } catch (error) {
      console.error('Erro ao buscar por número:', error);
      return undefined;
    }
  },

  
 async updateStudent(id: string, studentData: Partial<StudentFormData>) {
  try {
    const updated_at = new Date().toISOString();
    const targetId = await resolveStudentIdForUpdate(id, studentData);

    if (!targetId) {
      throw new Error(`Aluno não encontrado para atualização: ${id}`);
    }

    const currentStudent = await db.alunos.get(targetId);
    if (!currentStudent) {
      throw new Error(`Aluno não encontrado para atualização: ${targetId}`);
    }

    
    const dataToUpdate = { ...studentData };

    
    if (dataToUpdate.turma_id !== undefined) {
      dataToUpdate.turma_id = dataToUpdate.turma_id && dataToUpdate.turma_id.trim() !== ''
        ? dataToUpdate.turma_id
        : undefined;
    }

    const mergedStudent = {
      ...currentStudent,
      ...dataToUpdate,
      turma_id:
        dataToUpdate.turma_id !== undefined
          ? dataToUpdate.turma_id
          : currentStudent.turma_id
    } as Student;

    dataToUpdate.estado = resolveStudentAcademicStatus(mergedStudent);

    const updatedRows = await db.alunos.update(targetId, {
      ...dataToUpdate,
      updated_at,
      sync_status: 'pending'
    });

    if (!updatedRows) {
      throw new Error(`Falha ao atualizar aluno: ${targetId}`);
    }

    
    await db.syncQueue.add({
      table: 'alunos',
      record_id: targetId,
      instituicao_id: instituicaoIdValue(),
      operation: 'upsert',
      status: 'pending',
      created_at: updated_at
    });

  } catch (error) {
    console.error('Erro ao atualizar aluno:', error);
    throw error;
  }
},

  
  async deleteStudent(id: string) {
    try {
      const aluno = await db.alunos.get(id);
      if (!aluno) return;
      const instituicaoId = aluno.instituicao_id || instituicaoIdValue() || '';

      await propinaCascadeService.deleteByAluno(id, instituicaoId);

      if (aluno.sync_status === 'synced' && !aluno.id.startsWith('local_')) {
        
        await db.alunos.update(id, {
          deleted: true,
          sync_status: 'pending_delete',
          updated_at: new Date().toISOString()
        });

        await avaliacaoService.deleteAvaliacoesByAluno(id);
        await frequenciaService.deleteFrequenciaByAluno(id);

        await db.syncQueue.add({
          table: 'alunos',
          record_id: id,
          instituicao_id: instituicaoId,
          operation: 'delete',
          status: 'pending',
          created_at: new Date().toISOString()
        });

        } else {
        
        await db.alunos.delete(id);

        
        await db.syncQueue
          .where('record_id')
          .equals(id)
          .and((item) => item.instituicao_id === instituicaoId)
          .delete();

        }

    } catch (error) {
      console.error('Erro ao deletar aluno:', error);
      throw error;
    }
  },

    async getDesempemhoTurma(turma_id:string) :Promise<any>{
      const alunos=await this.getAlunosPorTurma(turma_id)
      try {
        const dese=alunos.map(async (aluno)=> ( await this.getDesempemhoAluno(aluno?.id)))
         return dese? dese:[]
      } catch (error) {

      }
     return[]

    },
   async getDesempemhoAluno(id:string):Promise<AlunoDesempenho|null>{
      const alunos=await this.getStudentById(id)
      if (!alunos?.id) {
         throw new Error("Erro aluno inexistente");
      }
      const avaliacao=await avaliacaoService.getAvaliacoesByAluno(alunos.id)
      const frenquencia=await frequenciaService.getFrequenciaAluno(alunos.id)
      return {
        ...alunos,
        avaliacao:avaliacao?.avaliacoes || [],
        media:avaliacao?.estatisticas?.mediaGeral || 0,
        presenca:frenquencia?.total>0?((frenquencia?.presentes||0)*100)/frenquencia.total:0,
        ultimaAvaliacao:avaliacao?.avaliacoes?.[avaliacao.avaliacoes.length-1]?.nota || 0,
      }
    },
  
  async gerarProximoNumeroEstudante(): Promise<number> {

    try {
      const alunos = await db.alunos.toArray();
      const numeros = alunos
        .filter(a => !a.deleted)
        .map(a => a.numero_estudante);
      const maior = numeros.length > 0 ? Math.max(...numeros) : 0;
      return maior + 1;
    } catch (error) {
      console.error('Erro ao gerar número:', error);
      return 1; 
    }
  },

  
  async checkDatabaseHealth() {
    try {
      const alunoCount = await db.alunos.count();
      const queueCount = await db.syncQueue
        .where('instituicao_id')
        .equals(instituicaoIdValue())
        .and((item) => item.status === 'pending')
        .count();

      return {
        alunosTotal: alunoCount,
        alunosAtivos: (await this.getAllStudents()).length,
        pendentes: queueCount,
        online: navigator.onLine,
        bancoAberto: db.isOpen()
      };
    } catch (error:any) {
      return {
        error: error.message,
        bancoAberto: false
      };
    }
  },

  
  async clearDatabase() {
    if (confirm('TEM CERTEZA? Isso apaga TODOS os dados locais!')) {
      await db.alunos.clear();
      await db.syncQueue.clear();
      return true;
    }
    return false;
  },

  async verificarAlunos(){
    try {
      await paymentChecker.verificarPagamentosAtrasados();
    } catch (error) {
      console.error('Erro ao verificar status financeiro dos alunos:', error);
    }
  }
};
function resolveEnrollmentStatus(data_matricula: string, estado: string): string {
  if (!data_matricula) return estado;

  const matriculaDate = new Date(data_matricula);
  const today = new Date();

  
  matriculaDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  
  if (matriculaDate > today) {
    return 'pendente';
  }

  
  if (matriculaDate <= today) {
    return 'ativo';
  }

  return estado;
}


function normalizeTurmaId(turma_id: string | null | undefined): string | null {
  if (!turma_id) return null;
  if (typeof turma_id === 'string' && turma_id.trim() === '') return null;
  return turma_id;
}

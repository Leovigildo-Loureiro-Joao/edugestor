
import { alunosService } from ".";
import { Student } from "../../types";
import { Course, CourseFormData } from "../../types/curso";
import { UserProfile } from "../../types/profile";
import { Turma } from "../../types/turma";
import { emitPendingSync } from "../../utils/emitPendingSync";
import { instituicaoIdValue } from "../../utils/getInstituicaoID";
import { getLastModifiedTimestamp } from "../../utils/getLastModifiedTimestamp";
import { generateUniqueId } from "../../utils/idGenerator";
import { supabase } from "../database/db";
import { cacheManager } from "./cacheManager";
import db from "./db";
import { profileService } from "./profileService";
import { syncManager } from "./syncManager";
import { turmaService } from "./turmas";

export const cursosService = {
  
  async create(course: CourseFormData): Promise<string> {
    try {
      const id = generateUniqueId();
      const now = new Date().toISOString();
      const instituicao_id = instituicaoIdValue() || course.instituicao_id || "";

      if (!instituicao_id) {
        throw new Error("instituicao_id ausente. Defina a instituição ativa antes de criar cursos.");
      }
      
      const curso = {
        ...course,
        id,
        instituicao_id,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
        deleted: false,
      } as Course;

      await db.cursos.put(curso);
      
      
      await db.syncQueue.add({
        table: 'cursos',
        instituicao_id,
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      return id;
      
    } catch (error) {
      console.error('❌ Erro ao salvar curso:', error);
      throw error;
    }
  },

    
  async getCourses(): Promise<Course[]> {
    const activeInstituicaoId = instituicaoIdValue() || "";
    const cacheScope = activeInstituicaoId || 'global';
    const CACHE_KEY = `cursos_all_${cacheScope}`;
    try {
      
      const [cursoCount, turmaCount, alunoCount, lastModified] = await Promise.all([
        db.cursos.count(),
        db.turmas.count(),
        db.alunos.count(),
        getLastModifiedTimestamp()
      ]);
      
      
      const cacheVersion = `v${cursoCount}_${turmaCount}_${alunoCount}_${activeInstituicaoId}_${lastModified}`;
      const cacheKeyWithVersion = `${CACHE_KEY}_${cacheVersion}`;
      
      
      const cached = cacheManager.get(cacheKeyWithVersion);
      if (cached) {
        return cached;
      }
      
      
      const instituicaoId = activeInstituicaoId;
      
      const [todosCursos, todasTurmas, todosAlunos] = await Promise.all([
        
        db.cursos
          .where("instituicao_id")
          .equals(instituicaoId)
          .filter(curso => !curso.deleted)
          .sortBy('nome')
          .catch(() => []), 
        
        
        turmaService.getTurmas(),
        
        
        alunosService.getAllStudents()
      ]);
      
      
      
      const turmasPorCurso = new Map<string, Turma[]>();
      const turmasAtivas = todasTurmas.filter(turma => !turma.deleted);
      
      turmasAtivas.forEach(turma => {
        if (turma.curso_id) {
          if (!turmasPorCurso.has(turma.curso_id)) {
            turmasPorCurso.set(turma.curso_id, []);
          }
          turmasPorCurso.get(turma.curso_id)!.push(turma);
        }
      });
      
      
      const alunosAtivos = todosAlunos.filter(aluno => !aluno.deleted);
      const alunosPorTurma = alunosAtivos.reduce((map, aluno) => {
        if (aluno.turma_id) {
          map.set(aluno.turma_id, (map.get(aluno.turma_id) || 0) + 1);
        }
        return map;
      }, new Map<string, number>());
      
      
      const cursos = todosCursos
        .filter(curso => !curso.deleted && curso.instituicao_id === instituicaoId)
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }))
        .map(curso => {
          const turmasDoCurso = turmasPorCurso.get(curso.id) || [];
          
          
          let alunosCount = 0;
          if (turmasDoCurso.length > 0) {
            alunosCount = turmasDoCurso.reduce((total, turma) => {
              return total + (alunosPorTurma.get(turma.id) || 0);
            }, 0);
          }
          
          
          const turmasCount = turmasDoCurso.length;
          const hasActiveTurmas = turmasDoCurso.some(turma => turma.estado === 'ativa');
          
          return {
            ...curso,
            
            alunos: alunosCount,
            turmas: turmasDoCurso,
            turmas_count: turmasCount,
            
            
            has_active_turmas: hasActiveTurmas,
            alunos_por_turma: turmasCount > 0 ? (alunosCount / turmasCount).toFixed(1) : '0',
            
            
            _cached_at: Date.now(),
            _cache_version: cacheVersion
          };
        });
      
      
      if (cursos.length > 0 || cacheManager.getStrictMode() === false) {
        
        cacheManager.set(cacheKeyWithVersion, cursos, {
          ttl: 15 * 60 * 1000, 
          version: cacheVersion,
          
        });

         const pendentesCount = cursos.filter(curso => 
            curso.sync_status === 'pending' || curso.sync_status === 'pending_delete'
          ).length;
  
        if (pendentesCount > 0) {
          emitPendingSync('cursos', pendentesCount);
        }
        
        
        this.cleanOldCourseCache(CACHE_KEY, cacheVersion);
      }
      
      return cursos;
      
    } catch (error) {
      console.error('❌ Erro ao buscar cursos:', error);
      
      
      const fallbackStrategies = [
        
        () => cacheManager.getLatest(CACHE_KEY),
        
        async () => {
          const cursosBasicos = await db.cursos
            .where("instituicao_id")
            .equals(instituicaoIdValue() || "")
            .filter(curso => !curso.deleted)
            .sortBy('nome')
            .catch(() => []);
          
          return cursosBasicos.map(curso => ({
            ...curso,
            alunos: 0,
            turmas: [],
            turmas_count: 0,
            has_active_turmas: false,
            alunos_por_turma: '0'
          }));
        }
      ];
      
      
      for (const strategy of fallbackStrategies) {
        try {
          const result = await strategy();
          if (result && Array.isArray(result)) {
            console.warn(`⚠️  Usando fallback (${strategy.name}) para cursos`);
            return result;
          }
        } catch (e) {
          
        }
      }
      
      return [];
    }
  }

  

  , cleanOldCourseCache(baseKey: string, currentVersion: string): void {
    
    const cacheKeys = Object.keys(localStorage)
      .filter(key => key.startsWith(`${baseKey}_v`))
      .filter(key => !key.endsWith(`_${currentVersion}`));
    
    
    if (cacheKeys.length > 2) {
      const keysToRemove = cacheKeys.slice(2);
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      }
  }

  
  , invalidateCourseCache(): void {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('cursos_all_'));
    const count = keys.length;
    
    keys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    
    
    
    cacheManager.emitCacheInvalidated('courses');
  },

  
  async getCoursesById(id: string): Promise<Course | null> {
    const activeInstituicaoId = instituicaoIdValue() || "global";
    const CACHE_KEY = `curso_${activeInstituicaoId}_${id}`;
    const cached = cacheManager.get(CACHE_KEY);
    
    try {
      
      const curso = await db.cursos.get(id);
      if (!curso || curso.deleted || curso.instituicao_id !== instituicaoIdValue()) {
        return cached || null;
      }
      
      
      const [turmas, alunos] = await Promise.all([
        turmaService.getTurmasPorCurso(id),
        alunosService.getAllStudents()
      ]);
      
      const turmasAtivas = turmas.filter(t => !t.deleted);
      const alunosAtivos = alunos.filter(a => !a.deleted);
      
      const alunosCount = alunosAtivos.filter(aluno => 
        aluno.turma_id && turmasAtivas.some(t => t.id === aluno.turma_id)
      ).length;
      
      const cursoCompleto = {
        ...curso,
        alunos: alunosCount,
        turmas: turmasAtivas,
        turmas_count: turmasAtivas.length,
        has_active_turmas: turmasAtivas.some(t => t.estado === 'ativa')
      };
      
      
      cacheManager.set(CACHE_KEY, cursoCompleto, {
        ttl: 5 * 60 * 1000 
      });
      
      return cursoCompleto;
    } catch (error) {
      console.error(`❌ Erro ao buscar curso ${id}:`, error);
      return cached || null;
    }
  }

  
  , async refreshCoursesCache(): Promise<Course[]> {
    
    this.invalidateCourseCache();
    
    
    const cursos = await this.getCourses();
    
    return cursos;
  },

  
  async getCoursesId(id: string): Promise<Course | null> {
    try {
      
      const cursoLocal = await this.getCoursesById(id);
      if (cursoLocal) {
        return cursoLocal;
      }
      
      
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from("cursos")
          .select("*, turmas(nome_turma)")
          .eq("id", id)
          .single();
          
        if (!error && data) {
          
          await db.cursos.put({
            ...data,
            sync_status: 'synced' as const,
            deleted: false
          });
          return data;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar curso:', error);
      return null;
    }
  },

  
  async updateCourse(id: string, courseData: Partial<CourseFormData>) {
    try {
      const updated_at = new Date().toISOString();
      
      await (db.cursos as any).update(id, {
        ...courseData,
        updated_at,
        sync_status: 'pending'
      });

      
      await db.syncQueue.add({
        table: 'cursos',
        record_id: id,
        instituicao_id:instituicaoIdValue(),
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });
      
      } catch (error) {
      console.error('Erro ao atualizar curso:', error);
      throw error;
    }
  },

  
  async deleteCourse(id: string) {
    try {
      const curso = await db.cursos.get(id);
      if (!curso) return;

      const turmasDoCurso = await turmaService.getTurmasPorCurso(id);
      for (const turma of turmasDoCurso) {
        await turmaService.deleteTurma(turma.id);
      }

      if (curso.sync_status === 'synced' && !curso.id.startsWith('local_')) {
        
        await (db.cursos as any).update(
          id,
          ({
            deleted: true,
            sync_status: 'pending_delete',
            updated_at: new Date().toISOString()
          } as any)
        );
        
        await db.syncQueue.add({
          table: 'cursos',
          record_id: id,
          instituicao_id:instituicaoIdValue(),
          operation: 'delete',
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        } else {
        
        await db.cursos.delete(id);
        
        
        await db.syncQueue
          .where('record_id')
          .equals(id)
          .delete();
          
        }
      
    } catch (error) {
      console.error('Erro ao deletar curso:', error);
      throw error;
    }
  },

 async syncCursos() {
  
   if(navigator.onLine)
      return Promise.all([syncManager.uploadBatch(),
        syncManager.downloadTableBatch('cursos', new Date(0))
      ])
    throw new Error("sem net")
      
  },
  
  
   async markForSync(recordId: string, operation: 'upsert' | 'delete') {
    await db.syncQueue.add({
      table: 'cursos',
      instituicao_id:instituicaoIdValue(),
      record_id: recordId,
      operation,
      status: 'pending',
      created_at: new Date().toISOString()
    });
  },


  
  async checkDatabaseHealth() {
    try {
      const cursoCount = await db.cursos.count();
      const queueCount = await db.syncQueue
        .where('instituicao_id')
        .equals(instituicaoIdValue())
        .and(item => item.table === 'cursos' && item.status === 'pending')
        .count();
      
      const cursosAtivos = (await this.getCourses()).length;
      
      return {
        cursosTotal: cursoCount,
        cursosAtivos: cursosAtivos,
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

  
  async getEstatisticas() {
    try {
      const cursos = await this.getCourses();
      
      
      const porArea: Record<string, number> = {};
      const porNivel: Record<string, number> = {};
      
      cursos.forEach(curso => {
        
        const areaKey = (curso as any).area || 'sem_area';
        porArea[areaKey] = (porArea[areaKey] || 0) + 1;
        
        
        const nivelKey = (curso as any).nivel || 'sem_nivel';
        porNivel[nivelKey] = (porNivel[nivelKey] || 0) + 1;
      });
      
      return {
        total: cursos.length,
        porArea,
        porNivel,
        ultimaAtualizacao: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao gerar estatísticas:', error);
      return {
        total: 0,
        porArea: {},
        porNivel: {},
        ultimaAtualizacao: new Date().toISOString()
      };
    }
  },

  
  async searchCursos(filtro: string): Promise<Course[]> {
    try {
      const cursos = await this.getCourses();
      
      return cursos.filter(curso => 
        curso.nome.toLowerCase().includes(filtro.toLowerCase()) ||
        (curso.descricao && curso.descricao.toLowerCase().includes(filtro.toLowerCase()))
      );
    } catch (error) {
      console.error('Erro ao buscar cursos:', error);
      return [];
    }
  }
};

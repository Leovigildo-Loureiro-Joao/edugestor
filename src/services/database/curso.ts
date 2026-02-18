// services/database/cursoService.ts
import { alunosService } from ".";
import { Student } from "../../types";
import { Course, CourseFormData } from "../../types/curso";
import { UserProfile } from "../../types/profile";
import { emitPendingSync } from "../../utils/emitPendingSync";
import { instituicaoIdValue } from "../../utils/getInsitituicaoID";
import { getLastModifiedTimestamp } from "../../utils/getLastModifiedTimestamp";
import { generateUniqueId } from "../../utils/idGenarator";
import { supabase } from "../database/db";
import { cacheManager } from "./cacheManager";
import db from "./db";
import { profileService } from "./profileService";
import { syncManager } from "./syncManager";
import { turmaService } from "./turmas";

export const cursosService = {
  // ✅ Criar curso localmente
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

      console.log('💾 Salvando curso:', curso.nome);
      
      await db.cursos.put(curso);
      
      // Adicionar à fila de sincronização
      await db.syncQueue.add({
        table: 'cursos',
        instituicao_id,
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      console.log('✅ Curso salvo com ID:', id);
      return id;
      
    } catch (error) {
      console.error('❌ Erro ao salvar curso:', error);
      throw error;
    }
  },

    // ✅ Buscar todos os cursos
  async getCourses(): Promise<Course[]> {
    const activeInstituicaoId = instituicaoIdValue() || "";
    const cacheScope = activeInstituicaoId || 'global';
    const CACHE_KEY = `cursos_all_${cacheScope}`;
    try {
      console.log('📋 Buscando cursos...');
      
      // 1. Criar versão de cache baseada em múltiplos fatores
      const [cursoCount, turmaCount, alunoCount, lastModified] = await Promise.all([
        db.cursos.count(),
        db.turmas.count(),
        db.alunos.count(),
        getLastModifiedTimestamp()
      ]);
      
      // 2. Criar chave de cache com versão
      const cacheVersion = `v${cursoCount}_${turmaCount}_${alunoCount}_${activeInstituicaoId}_${lastModified}`;
      const cacheKeyWithVersion = `${CACHE_KEY}_${cacheVersion}`;
      
      // 3. Tentar cache primeiro
      const cached = cacheManager.get(cacheKeyWithVersion);
      if (cached) {
        console.log('✅ Cache HIT para cursos');
        return cached;
      }
      
      console.log('🔄 Cache MISS para cursos, buscando do banco...');
      
      // 4. Buscar dados em paralelo com otimizações
      const instituicaoId = activeInstituicaoId;
      
      const [todosCursos, todasTurmas, todosAlunos] = await Promise.all([
        // Buscar cursos filtrados diretamente do banco
        db.cursos
          .where("instituicao_id")
          .equals(instituicaoId)
          .filter(curso => !curso.deleted)
          .sortBy('nome')
          .catch(() => []), // Fallback seguro
        
        // Usar cache do serviço de turmas se disponível
        turmaService.getTurmas(),
        
        // Usar cache do serviço de alunos se disponível
        alunosService.getAllStudents()
      ]);
      
      // 5. Otimizar: Criar estruturas de lookup eficientes
      // Mapa de turmas por curso_id
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
      
      // Mapa de alunos por turma_id para contagem rápida
      const alunosAtivos = todosAlunos.filter(aluno => !aluno.deleted);
      const alunosPorTurma = alunosAtivos.reduce((map, aluno) => {
        if (aluno.turma_id) {
          map.set(aluno.turma_id, (map.get(aluno.turma_id) || 0) + 1);
        }
        return map;
      }, new Map<string, number>());
      
      // 6. Processar cursos de forma eficiente
      const cursos = todosCursos
        .filter(curso => !curso.deleted && curso.instituicao_id === instituicaoId)
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }))
        .map(curso => {
          const turmasDoCurso = turmasPorCurso.get(curso.id) || [];
          
          // Calcular total de alunos no curso
          let alunosCount = 0;
          if (turmasDoCurso.length > 0) {
            alunosCount = turmasDoCurso.reduce((total, turma) => {
              return total + (alunosPorTurma.get(turma.id) || 0);
            }, 0);
          }
          
          // Calcular estatísticas adicionais
          const turmasCount = turmasDoCurso.length;
          const hasActiveTurmas = turmasDoCurso.some(turma => turma.status === 'ativa');
          
          return {
            ...curso,
            // Informações básicas
            alunos: alunosCount,
            turmas: turmasDoCurso,
            turmas_count: turmasCount,
            
            // Estatísticas adicionais (úteis para UI)
            has_active_turmas: hasActiveTurmas,
            alunos_por_turma: turmasCount > 0 ? (alunosCount / turmasCount).toFixed(1) : '0',
            
            // Metadados para cache
            _cached_at: Date.now(),
            _cache_version: cacheVersion
          };
        });
      
      // 7. Validar se há dados antes de salvar no cache
      if (cursos.length > 0 || cacheManager.getStrictMode() === false) {
        // Guardar no cache com TTL e metadados
        cacheManager.set(cacheKeyWithVersion, cursos, {
          ttl: 15 * 60 * 1000, // 15 minutos (cursos mudam menos frequentemente)
          version: cacheVersion,
          
        });

         const pendentesCount = cursos.filter(curso => 
            curso.sync_status === 'pending' || curso.sync_status === 'pending_delete'
          ).length;
  
        if (pendentesCount > 0) {
          emitPendingSync('cursos', pendentesCount);
        }
        
        // 8. Limpar versões antigas do cache
        this.cleanOldCourseCache(CACHE_KEY, cacheVersion);
      }
      
      console.log(`✅ Encontrados ${cursos.length} cursos ativos`);
      return cursos;
      
    } catch (error) {
      console.error('❌ Erro ao buscar cursos:', error);
      
      // 9. Fallback robusto
      const fallbackStrategies = [
        // Primeiro: última versão em cache
        () => cacheManager.getLatest(CACHE_KEY),
        // Segundo: buscar apenas cursos básicos (fallback mínimo)
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
      
      // Tentar cada estratégia até encontrar uma que funcione
      for (const strategy of fallbackStrategies) {
        try {
          const result = await strategy();
          if (result && Array.isArray(result)) {
            console.warn(`⚠️  Usando fallback (${strategy.name}) para cursos`);
            return result;
          }
        } catch (e) {
          // Continuar para próxima estratégia
        }
      }
      
      return [];
    }
  }

  // Métodos auxiliares recomendados:

  , cleanOldCourseCache(baseKey: string, currentVersion: string): void {
    // Limpar versões antigas do cache de cursos
    const cacheKeys = Object.keys(localStorage)
      .filter(key => key.startsWith(`${baseKey}_v`))
      .filter(key => !key.endsWith(`_${currentVersion}`));
    
    // Manter apenas as últimas 2 versões (cursos mudam menos)
    if (cacheKeys.length > 2) {
      const keysToRemove = cacheKeys.slice(2);
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      console.log(`🧹 Removidas ${keysToRemove.length} versões antigas do cache de cursos`);
    }
  }

  // Método para invalidar cache quando necessário
  , invalidateCourseCache(): void {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('cursos_all_'));
    const count = keys.length;
    
    keys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log(`🧹 Cache de cursos invalidado (${count} itens removidos)`);
    
    // Emitir evento se estiver usando algum sistema de eventos
    cacheManager.emitCacheInvalidated('courses');
  },

  // Método para buscar um curso específico com cache individual
  async getCoursesById(id: string): Promise<Course | null> {
    const activeInstituicaoId = instituicaoIdValue() || "global";
    const CACHE_KEY = `curso_${activeInstituicaoId}_${id}`;
    const cached = cacheManager.get(CACHE_KEY);
    
    try {
      // Buscar sempre do Dexie primeiro para evitar stale cache na UI
      const curso = await db.cursos.get(id);
      if (!curso || curso.deleted || curso.instituicao_id !== instituicaoIdValue()) {
        return cached || null;
      }
      
      // Buscar informações relacionadas
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
      
      // Cache individual com TTL menor
      cacheManager.set(CACHE_KEY, cursoCompleto, {
        ttl: 5 * 60 * 1000 // 5 minutos
      });
      
      return cursoCompleto;
    } catch (error) {
      console.error(`❌ Erro ao buscar curso ${id}:`, error);
      return cached || null;
    }
  }

  // Método para forçar refresh do cache
  , async refreshCoursesCache(): Promise<Course[]> {
    console.log('🔄 Forçando refresh do cache de cursos...');
    
    // Invalidar cache existente
    this.invalidateCourseCache();
    
    // Buscar dados frescos
    const cursos = await this.getCoursess();
    
    return cursos;
  },

  // ✅ Buscar curso por ID (com cache remoto)
  async getCoursesId(id: string): Promise<Course | null> {
    try {
      // Primeiro busca localmente
      const cursoLocal = await this.getCoursesById(id);
      if (cursoLocal) {
        return cursoLocal;
      }
      
      // Se não encontrou localmente e está online, busca no Supabase
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from("cursos")
          .select("*, turmas(nome_turma)")
          .eq("id", id)
          .single();
          
        if (!error && data) {
          // Salvar localmente para cache
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

  // ✅ Atualizar curso
  async updateCourse(id: string, courseData: Partial<CourseFormData>) {
    try {
      const updated_at = new Date().toISOString();
      
      await db.cursos.update(id, {
        ...courseData,
        updated_at,
        sync_status: 'pending'
      });

      // Adicionar/atualizar na fila
      await db.syncQueue.add({
        table: 'cursos',
        record_id: id,
        instituicao_id:instituicaoIdValue(),
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });
      
      console.log(`✏️ Curso ${id} marcado para atualização`);
      
    } catch (error) {
      console.error('Erro ao atualizar curso:', error);
      throw error;
    }
  },

  // ✅ Deletar curso (soft delete)
  async deleteCourse(id: string) {
    try {
      const curso = await db.cursos.get(id);
      if (!curso) return;

      if (curso.sync_status === 'synced' && !curso.id.startsWith('local_')) {
        // Se já sincronizado, marcar para deleção remota
        await db.cursos.update(id, { 
          deleted: true, 
          sync_status: 'pending_delete',
          updated_at: new Date().toISOString()
        });

        await turmaService.getTurmasPorCurso(id).then(turmas => {
          turmas.forEach(async turma => {
            await turmaService.deleteTurma(turma.id);
          });
        });
        
        await db.syncQueue.add({
          table: 'cursos',
          record_id: id,
          instituicao_id:instituicaoIdValue(),
          operation: 'delete',
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        console.log(`🗑️ Curso ${id} marcado para deleção remota`);
      } else {
        // Se nunca sincronizado, deletar completamente
        await db.cursos.delete(id);
        
        // Remover da fila se existir
        await db.syncQueue
          .where('record_id')
          .equals(id)
          .delete();
          
        console.log(`🗑️ Curso ${id} deletado localmente`);
      }
      
    } catch (error) {
      console.error('Erro ao deletar curso:', error);
      throw error;
    }
  },

 async syncCursos() {
  
   if(navigator.onLine)
      return Promise.all([syncManager.uploadTableBatch('cursos'),
        syncManager.downloadTableBatch('cursos', new Date(0))
      ])
    throw new Error("sem net")
      
  },
  
  // ✅ Função auxiliar para marcar como pendente
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


  // ✅ Verificar saúde do banco de cursos
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

  // ✅ Obter estatísticas
  async getEstatisticas() {
    try {
      const cursos = await this.getCourses();
      
      // Agrupar por área ou tipo
      const porArea: Record<string, number> = {};
      const porNivel: Record<string, number> = {};
      
      cursos.forEach(curso => {
        // Por área (se existir o campo)
        const areaKey = (curso as any).area || 'sem_area';
        porArea[areaKey] = (porArea[areaKey] || 0) + 1;
        
        // Por nível (se existir o campo)
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

  // ✅ Buscar cursos com filtros
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

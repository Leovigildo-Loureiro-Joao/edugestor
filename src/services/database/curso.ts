// services/database/cursoService.ts
import { Course, CourseFormData } from "../../types/curso";
import { supabase } from "../database/db";
import db from "./db";
import { syncService } from "./syncService";

const generateUniqueId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const cursosService = {
  // ✅ Criar curso localmente
  async create(course: CourseFormData): Promise<string> {
    try {
      const id = generateUniqueId();
      const now = new Date().toISOString();
      
      const curso = {
        ...course,
        id,
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
  async getCourse(): Promise<Course[]> {
    try {
      console.log('📋 Buscando cursos...');
      
      const todosCursos = await db.cursos.toArray();
      
      // Filtrar os não deletados
      const cursosAtivos = todosCursos.filter(curso => !curso.deleted);
      
      // Ordenar por nome
      cursosAtivos.sort((a, b) => 
        (a.nome || '').localeCompare(b.nome || '')
      );
      
      console.log(`✅ Encontrados ${cursosAtivos.length} cursos ativos`);
      return cursosAtivos;
    } catch (error) {
      console.error('❌ Erro ao buscar cursos:', error);
      return [];
    }
  },

  // ✅ Buscar curso por ID
  async getCourseById(id: string): Promise<Course | null> {
    try {
      const curso = await db.cursos.get(id);
      return curso && !curso.deleted ? curso : null;
    } catch (error) {
      console.error('Erro ao buscar curso por ID:', error);
      return null;
    }
  },

  // ✅ Buscar curso por ID (com cache remoto)
  async getCourseId(id: string): Promise<Course | null> {
    try {
      // Primeiro busca localmente
      const cursoLocal = await this.getCourseById(id);
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
        
        await db.syncQueue.add({
          table: 'cursos',
          record_id: id,
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
      return syncService.downloadTableBatch('cursos', new Date(0));
    },
  
  // ✅ Função auxiliar para marcar como pendente
   async markForSync(recordId: string, operation: 'upsert' | 'delete') {
    await db.syncQueue.add({
      table: 'cursos',
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
        .where('table')
        .equals('cursos')
        .and(item => item.status === 'pending')
        .count();
      
      const cursosAtivos = (await this.getCourse()).length;
      
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
      const cursos = await this.getCourse();
      
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
      const cursos = await this.getCourse();
      
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
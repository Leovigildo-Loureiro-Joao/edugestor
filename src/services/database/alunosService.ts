import { Student, StudentFormData } from "../../types";
import db from "./db";
import { supabase } from "./db";
import { Turma } from '../../types/turma';
import { syncManager } from "./syncManager";
import { SyncQueueItem } from "../../types/base";
import { avaliacaoService } from "./avaliacao";
import { AlunoDesempenho } from "../../pages/Turmas/TurmasPage";
import { profileService } from "./profileService";
import { turmaService } from "./turmas";
import { frequenciaService } from "./frequenciaService";

const generateUniqueId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const alunosService = {
  // ✅ Criar aluno
  async saveStudent(studentData: StudentFormData): Promise<string> {
    try {
      const id = generateUniqueId();
      const now = new Date().toISOString();
      
      const aluno = {
        ...studentData,
        id,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
        deleted: false,
      };

      console.log('💾 Salvando aluno:', aluno.nome_completo);
      
      await db.alunos.put(aluno as Student);
      
      // Adicionar à fila de sincronização
     const syncRecord = await db.syncQueue.add({
        table: 'alunos',
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });
      const alunosFromQueue = await db.syncQueue.get(syncRecord);
      const insertBatch = [alunosFromQueue] as SyncQueueItem[];
      syncManager.processInsertBatch('alunos', insertBatch);

      console.log('✅ Aluno salvo com ID:', id);
      return id;
      
    } catch (error) {
      console.error('❌ Erro ao salvar aluno:', error);
      throw error;
    }
  },

  async  getAlunosPorTurma(turma_id:string) {
     const alunos = await db.alunos.toArray()
    console.log(alunos)
    return alunos.filter(alunos=> !alunos.deleted&&alunos.turma_id.includes(turma_id))
  },

    // ✅ Buscar todos os alunos - CORRIGIDO
  async getAllStudents() {
    const alunosAll = await db.alunos.toArray()
    const todasTurmas = await turmaService.getTurmas();
    const turmaMap = new Map(todasTurmas.map(t => [t.id, t]));
    const alunos = alunosAll.filter(aluno => !aluno.deleted&&turmaMap.get(aluno.turma_id));
    alunos.sort((a,b)=>(a.nome_completo.localeCompare(b.nome_completo)))
    console.log(alunos)
  
  return  alunos.map( aluno => {
    const turma = aluno.turma_id ? turmaMap.get(aluno.turma_id) : null;
    
    return  {
      ...aluno,  // ✅ Mantém todas as propriedades originais do aluno
      turma_nome: turma ? turma.nome_turma : 'Sem turma',
      professor: turma ? turma.professor : 'Sem professor',
    };
  });
},

  async syncAlunos() {
      return syncManager.downloadTableBatch('alunos', new Date(0));
    },
  
  // ✅ Função auxiliar para marcar como pendente
   async markForSync(recordId: string, operation: 'upsert' | 'delete') {
    await db.syncQueue.add({
      table: 'alunos',
      record_id: recordId,
      operation,
      status: 'pending',
      created_at: new Date().toISOString()
    });
  },

  // ✅ Buscar aluno por ID
  async getStudentById(id: string): Promise<Student | undefined> {
    try {
      const aluno = await db.alunos.get(id);
      
      if (!aluno) {
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

  // ✅ Buscar aluno por número de estudante
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

  // ✅ Atualizar aluno
  async updateStudent(id: string, studentData: Partial<StudentFormData>) {
    try {
      const updated_at = new Date().toISOString();
      
      await db.alunos.update(id, {
        ...studentData,
        updated_at,
        sync_status: 'pending',
        avaliacao:[]
      });

      // Adicionar/atualizar na fila
      await db.syncQueue.add({
        table: 'alunos',
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });
      
      console.log(`✏️ Aluno ${id} marcado para atualização`);
      
    } catch (error) {
      console.error('Erro ao atualizar aluno:', error);
      throw error;
    }
  },

  // ✅ Deletar aluno (soft delete)
  async deleteStudent(id: string) {
    try {
      const aluno = await db.alunos.get(id);
      if (!aluno) return;

      if (aluno.sync_status === 'synced' && !aluno.id.startsWith('local_')) {
        // Se já sincronizado, marcar para deleção remota
        await db.alunos.update(id, { 
          deleted: true, 
          sync_status: 'pending_delete',
          updated_at: new Date().toISOString()
        });
        
        await db.syncQueue.add({
          table: 'alunos',
          record_id: id,
          operation: 'delete',
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        console.log(`🗑️ Aluno ${id} marcado para deleção remota`);
      } else {
        // Se nunca sincronizado, deletar completamente
        await db.alunos.delete(id);
        
        // Remover da fila se existir
        await db.syncQueue
          .where('record_id')
          .equals(id)
          .delete();
          
        console.log(`🗑️ Aluno ${id} deletado localmente`);
      }
      
    } catch (error) {
      console.error('Erro ao deletar aluno:', error);
      throw error;
    }
  },

    async getDesempemhoTurma(turma_id:string) :Promise<any>{
      const alunos=await this.getAlunosPorTurma(turma_id)
      try {
        const dese=alunos.map(async (aluno)=> ( await this.getDesempemhoAluno(aluno.id)))
         return dese? dese:[]
      } catch (error) {
        
      }
     return[]

    },
   async getDesempemhoAluno(id:string):Promise<AlunoDesempenho|null>{
      const alunos=await this.getStudentById(id)
      const avaliacao=await avaliacaoService.getAvaliacoesByAluno(alunos!.id||'')
      const frenquencia=await frequenciaService.getFrequenciaAluno(alunos!.id||'')
      return alunos?{
        ...alunos,
        media:avaliacao.estatisticas.mediaGeral,
        presenca:frenquencia.total>0?(frenquencia.presentes*100)/frenquencia.total:0,
        ultimaAvaliacao:avaliacao.avaliacoes[avaliacao.avaliacoes.length-1]?.nota,
      }:null
    },
  // ✅ Gerar próximo número de estudante
  async gerarProximoNumeroEstudante(): Promise<number> {
    try {
      const alunos = await db.alunos.toArray();
      const numeros = alunos
        .filter(a => !a.deleted && a.numero_estudante)
        .map(a => a.numero_estudante);
      
      const maior = numeros.length > 0 ? Math.max(...numeros) : 0;
      return maior + 1;
    } catch (error) {
      console.error('Erro ao gerar número:', error);
      return 1; // Fallback
    }
  },

  // ✅ Verificar saúde do banco
  async checkDatabaseHealth() {
    try {
      const alunoCount = await db.alunos.count();
      const queueCount = await db.syncQueue
        .where('status')
        .equals('pending')
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

  // ✅ Limpar banco (apenas para testes)
  async clearDatabase() {
    if (confirm('TEM CERTEZA? Isso apaga TODOS os dados locais!')) {
      await db.alunos.clear();
      await db.syncQueue.clear();
      console.log('🗑️ Banco limpo com sucesso');
      return true;
    }
    return false;
  }
};
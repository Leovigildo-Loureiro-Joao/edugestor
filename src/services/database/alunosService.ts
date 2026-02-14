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
import { cacheManager } from "./cacheManager";
import { emitPendingSync } from "../../utils/emitPendingSync";
import { getLastModifiedTimestamp } from "../../utils/getLastModifiedTimestamp";

const generateUniqueId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const alunosService = {
  // ✅ Criar aluno
  async saveStudent(studentData: StudentFormData): Promise<string> {
    try {
      const id = generateUniqueId();
      const now = new Date().toISOString();
      const n=await this.gerarProximoNumeroEstudante();
      const aluno = {
        ...studentData,
        id,
        numero_estudante:n,
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
async getAllStudents(): Promise<Student[]> {
  const CACHE_KEY = 'alunos_all';
  
  try {
    // 1. Criar versão baseada em múltiplos contadores para detectar mudanças reais
    const [alunoCount, turmaCount, lastModified] = await Promise.all([
      db.alunos.count(),
      db.turmas.count(),
      getLastModifiedTimestamp() // Método para obter timestamp da última modificação
    ]);
    
    // 2. Criar chave de cache composta por versões
    const cacheVersion = `v${alunoCount}_${turmaCount}_${lastModified}`;
    const cacheKeyWithVersion = `${CACHE_KEY}_${cacheVersion}`;
    
    // 3. Tentar cache primeiro
    const cached = cacheManager.get(cacheKeyWithVersion);
    if (cached) {
      console.log('✅ Cache HIT para alunos');
      return cached;
    }
    
    console.log('🔄 Cache MISS para alunos, buscando do banco...');
    
    // 4. Buscar dados em paralelo
    const [alunosAll, todasTurmas] = await Promise.all([
      db.alunos.toArray(),
      turmaService.getTurmas()
    ]);
    
    // 5. Otimizar: Criar mapa de turmas mais eficiente
    // Filtrar apenas turmas ativas e válidas
    const turmasAtivas = todasTurmas.filter(t => !t.deleted);
    const turmaMap = new Map(
      turmasAtivas.map(t => [t.id, {
        id: t.id,
        nome_turma: t.nome_turma || '',
        professor: t.professor || '',
        curso_nome: t.curso_nome || ''
      }])
    );
    
    // 6. Processar alunos
    // Primeiro filtrar, depois ordenar, depois mapear
    const alunos = alunosAll
      .filter(aluno => {
        // Aluno não deletado
        if (aluno.deleted) return false;
        
        // Aluno com turma válida (se tiver turma_id)
        if (aluno.turma_id) {
          const turma = turmaMap.get(aluno.turma_id);
          return turma !== undefined;
        }
        
        // Aceitar alunos sem turma também
        return true;
      })
      .sort((a, b) => {
        // Ordenação otimizada
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
          // Adicionar informações calculadas se necessário
          idade: aluno.data_nascimento ? this.calcularIdade(aluno.data_nascimento) : null
        };
      });
    
      const pendentesCount = alunosAll.filter(aluno => 
        aluno.sync_status === 'pending' || aluno.sync_status === 'pending_delete'
      ).length;
      
      if (pendentesCount > 0) {
        emitPendingSync('alunos', pendentesCount);
      }
    
    // 7. Guardar no cache com TTL
    cacheManager.set(cacheKeyWithVersion, alunos, {
      ttl: 10 * 60 * 1000, // 10 minutos
      version: cacheVersion
    });
    
    // 8. Limpar versões antigas do cache (opcional, mas recomendado)
    this.cleanOldStudentCache(CACHE_KEY, cacheVersion);
    
    console.log(`✅ Carregados ${alunos.length} alunos`);
    return alunos;
    
  } catch (error) {
    console.error('❌ Erro ao carregar alunos:', error);
    
    // 9. Fallback para última versão em cache disponível
    const fallback = cacheManager.getLatest(CACHE_KEY);
    if (fallback) {
      console.warn('⚠️ Usando cache fallback devido a erro');
      return fallback;
    }
    
    return [];
  }
}

// Métodos auxiliares recomendados:
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
  // Limpar versões antigas do cache de alunos
  const cacheKeys = Object.keys(localStorage)
    .filter(key => key.startsWith(`${baseKey}_v`))
    .filter(key => !key.endsWith(`_${currentVersion}`));
  
  // Manter apenas as últimas 3 versões
  if (cacheKeys.length > 3) {
    const keysToRemove = cacheKeys.slice(3);
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

// Adicione também métodos para invalidar cache quando necessário:
, invalidateStudentCache(): void {
  // Invalidar todas as versões do cache de alunos
  const keys = Object.keys(localStorage).filter(key => key.startsWith('alunos_all_'));
  keys.forEach(key => localStorage.removeItem(key));
  console.log('🧹 Cache de alunos invalidado');
}

// Ou invalidar seletivamente:
, invalidateCacheOnStudentChange(studentId?: string): void {
  if (studentId) {
    // Cache específico por aluno se necessário
    cacheManager.delete(`aluno_${studentId}`);
  }
  // Invalidar cache geral
  this.invalidateStudentCache();
},

  async syncAlunos() {
    if(navigator.onLine)
     return Promise.all([syncManager.uploadTableBatch('alunos'),
      syncManager.downloadTableBatch('alunos', new Date(0))
    ])
    throw new Error("sem net")
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
  async refreshAllStudents() {
    // Invalidar cache
    cacheManager.delete('alunos_all');
    cacheManager.invalidate('alunos_.*');
    cacheManager.invalidate('chart_.*');
    
    // Buscar dados frescos
    return await this.getAllStudents();
  },
   async getAlunosForChart() {
    const CACHE_KEY = 'alunos_chart_data';
    const cached = cacheManager.get(CACHE_KEY);
    
    if (cached) {
      return cached;
    }
    
    const alunos = await this.getAllStudents();
    
    cacheManager.set(CACHE_KEY, alunos,  {
      ttl: 10 * 60 * 1000, // 10 minutos
      version: CACHE_KEY
    }); // 2 minutos para dados de gráfico
    
    return alunos;
  }
  ,

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

        await avaliacaoService.deleteAvaliacoesByAluno(id);
        await frequenciaService.deleteFrequenciaByAluno(id);

        
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
        .filter(a => !a.deleted)
        .map(a => a.numero_estudante);
      alert(numeros.length)
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
  },

  async verificarAlunos(){
    
  }
};

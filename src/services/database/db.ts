// src/services/database/db.ts
import Dexie, { Table } from 'dexie';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  DatabaseInstance,
  SyncQueueItem
} from '../../types/base';
import {  Frequencia, Instituicao, Student } from '../../types';
import { HorarioAula, Turma } from '../../types/turma';
import { Course } from '../../types/curso';
import { AlocacaoRecurso, Transacao } from '../../types/transacao';
import { Aula } from '../../types/aula';
import { Propina } from '../../types/propina';
import { syncManager } from './syncManager';
import { EventFormData, Meta, PlanoAcao, Rotina, Tarefa } from '../../types/eventos';
import { SystemConfig } from '../../types/config';
import { UserProfile } from '../../types/profile';
import { Notificacao } from './notificacaoService';
import { Avaliacao } from '../../types/avaliacao';
import { PlaneamentoBase } from '../../types/planeamento';
import type { PlanoAula } from './planoAulasService';

// Configurar Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Tipar o Supabase
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey,
  {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Para sincronização offline, configure persistência
if (typeof window !== 'undefined') {
  // Persistir sessão no localStorage
  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      localStorage.setItem('supabase.auth.token', session.access_token);
    } else {
      localStorage.removeItem('supabase.auth.token');
    }
  });
}

// ============ CLASSE TIPADA DO DEXIE ============
class EduGestorDatabase extends Dexie {
  // Declaração EXPLÍCITA das tabelas com tipos
  alunos!: Table<Student, string>;
  turmas!: Table<Turma, string>;
  cursos!: Table<Course, string>;
  transacoes!: Table<Transacao, string>;
  aulas!: Table<Aula, string>;
  propina!: Table<Propina, string>;
  frequencias!: Table<Frequencia, string>;
  tarefas!: Table<Tarefa, string>;
  metas!: Table<Meta, string>;
  evento!: Table<EventFormData, string>;
  rotinas!: Table<Rotina, string>;
  system_config!: Table<SystemConfig, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  instituicao!: Table<Instituicao, string>;
  notificacao!: Table<Notificacao, string>;
  avaliacoes!: Table<Avaliacao,string>
  alocacao!:Table<AlocacaoRecurso,string>
  profiles!: Table<UserProfile, string>;
  turma_horarios!:Table<HorarioAula,string>
  planeamentos!:Table<PlaneamentoBase,string>
  plano_aulas!:Table<PlanoAula,string> // PlanoAula, mas tem campos dinâmicos, então deixamos como any por enquanto

  constructor() {
    super('EduGestorDB_Final');
    
    this.version(4).stores({
      // 🔥 Agora sua IDE vai entender ESTA estrutura
      alunos: 'id, nome_completo, numero_estudante,turma_id,curso, sync_status, deleted,updated_at',
      avaliacoes:'id,aluno_id,turma_id,disciplina, tipo_avaliacao,data_avaliacao, periodo, deleted, sync_status',
      turmas: 'id, nome_turma, curso_id, ano_letivo, sync_status, deleted, [curso_id+ano_letivo], [sync_status+deleted]',
      cursos: 'id, nome,instituicao_id,[nome+instituicao_id],ativo,vagas, sync_status, deleted,updated_at, [sync_status+deleted]',
      turma_horarios: 'id, turma_id, dia_semana, hora_inicio, [turma_id+dia_semana]',
      transacoes: 'id, tipo, categoria, data, valor, descricao, sync_status, deleted, created_at, updated_at',
      propina: 'id, aluno_id, mes_referencia, estado, data_vencimento, sync_status, deleted, updated_at'   ,   // db.ts - Adicione esta linha na definição das tabelas,
      frequencias: 'id, aluno_id, aula_id, data_aula, presente, sync_status, deleted, updated_at',
      aulas: 'id, turma_id, data_aula, sync_status, deleted, updated_at',
      tarefas: 'id, concluida, status, sync_status, deleted, created_at',
      metas: 'id, data_limite_real,tipo,status, sync_status, deleted, created_at',
      planeamentos:"id,tipo,data_inicio,sync_status, deleted, created_at, updated_at",
      plano_aulas:"id,tipo,sync_status, deleted, created_at, updated_at",
      alocacao:"id,meta_id, sync_status, deleted, created_at",
      rotinas: 'id, status, sync_status, deleted, created_at',
      syncQueue: '++id, table, record_id, operation, status, created_at',
      profiles: 'id, role, sync_status, deleted',
      notificacao: `id,lida,corpo,tipo,instituicao_id,aluno_id,user_id,data_envio,[lida+deleted],[tipo+deleted],[instituicao_id+deleted],[aluno_id+deleted],sync_status,deleted`,
      instituicao:'id, nome_escola, endereco, email, numero_telefone, whatsapp, ano_lectivo, valor_cartao, valor_confirmacao, valor_matricula, created_at, updated_at,sync_status,deleted',
      evento: 'id, data_evento, tipo, sync_status, deleted, created_at',
      system_config:'id, key_name, category,[category+deleted], [category+key_name],[category+key_name+deleted],sync_status, deleted'
    });

      // ✅ ADICIONE ESTES LISTENERS PARA DEBUG
    this.on('populate', () => {
      console.log('🎯 Dexie: Banco populado pela primeira vez');
    });
    
    this.on('ready', () => {
      console.log('🎯 Dexie: Banco pronto para uso');
      console.log('🎯 Dexie: Tabelas disponíveis:', this.tables.map(t => t.name));
    });
    
    this.on('blocked', (error) => {
      console.error('🎯 Dexie ERRO:', error);
    });

    
  }
}

// ============ INSTÂNCIA ÚNICA TIPADA ============
let dbInstance: DatabaseInstance | null = null;

export function getDatabase(): DatabaseInstance {
  if (!dbInstance) {
    dbInstance = new EduGestorDatabase() as DatabaseInstance;
    
    // Abrir conexão
    dbInstance.open().catch(async err => {
      console.error('Erro ao abrir banco Dexie:', err);

      if (err?.name === 'UpgradeError' || err?.name === 'VersionError') {
        console.warn('Falha de upgrade. Recriando o banco local...');
        await Dexie.delete('EduGestorDB_Final');
        await dbInstance.open();
      }
    });
  }
  
  return dbInstance;
}

// Exportar a instância tipada
const db: DatabaseInstance = getDatabase();
export default db;


export const syncDatabase = {
  async syncAll() {
    if (!navigator.onLine) {
      console.log('🌐 Offline - sincronização adiada');
      return { success: false, message: 'Offline' };
    }
    
    try {
      console.log('🔄 Iniciando sincronização completa...');
      
      // 1. Primeiro upload (enviar alterações locais)
      await syncManager.uploadBatch();
      
      // 2. Depois download (buscar atualizações remotas)
      await syncManager.downloadBatch();
      
      console.log('✅ Sincronização completa concluída');
      return { success: true, message: 'Sincronizado com sucesso' };
      
    } catch (error: any) {
      console.error('❌ Erro na sincronização:', error);
      return { success: false, message: error.message };
    }
  },
  
  // Sincronização apenas upload
  async syncUpload() {
    return syncManager.uploadBatch();
  },
  
  // Sincronização apenas download
  async syncDownload() {
    return syncManager.downloadBatch();
  },
  
  // Verificar status
  async getSyncStatus() {
    const pendingCount = await db.syncQueue
      .where('status')
      .equals('pending')
      .count();
    
    const lastSync = localStorage.getItem('last_sync_global');
    
    return {
      online: navigator.onLine,
      pendingItems: pendingCount,
      lastSync: lastSync ? new Date(lastSync).toLocaleString() : 'Nunca',
      databaseSize: await this.getDatabaseSize()
    };
  },
  
  // Estimar tamanho do banco
  async getDatabaseSize() {
    try {
      const tables = ['alunos', 'turmas','alocacao', 'cursos', 'transacoes', 'aulas', 'propina', 'frequencias','tarefas','metas','rotinas','evento','profiles','system_config','instituicao','notificacao','avaliacoes','turma_horarios','planeamentos','plano_aulas'];
      let total = 0;
      
      for (const tableName of tables) {
        const count = await db.table(tableName).count();
        total += count;
      }
      
      return total;
    } catch {
      return 0;
    }
  }
};

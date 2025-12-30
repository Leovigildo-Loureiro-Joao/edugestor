// src/services/database/db.ts
import Dexie, { Table } from 'dexie';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  DatabaseInstance,
  SyncQueueItem
} from '../../types/base';
import {  Frequencia, Student } from '../../types';
import { Turma } from '../../types/turma';
import { Course } from '../../types/curso';
import { Transacao } from '../../types/transacao';
import { Aula } from '../../types/aula';
import { Propina } from '../../types/propina';
import { syncService } from './syncService';

// Configurar Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Tipar o Supabase
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// ============ CLASSE TIPADA DO DEXIE ============
class EduGestorDatabase extends Dexie {
  // Declaração EXPLÍCITA das tabelas com tipos
  alunos!: Table<Student, string>;
  turmas!: Table<Turma, string>;
  cursos!: Table<Course, string>;
  transacoes!: Table<Transacao, string>;
  aulas!: Table<Aula, string>;
  propinas!: Table<Propina, string>;
  frequencias!: Table<Frequencia, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('EduGestorDB_Final');
    
    this.version(3).stores({
      // 🔥 Agora sua IDE vai entender ESTA estrutura
      alunos: '++id, nome_completo, numero_estudante, sync_status, deleted',
      turmas: '++id, nome_turma, curso_id, ano_letivo, sync_status, deleted, [curso_id+ano_letivo], [sync_status+deleted]',
      cursos: '++id, nome, area, nivel, sync_status, deleted, [sync_status+deleted]',
      turma_horarios: '++id, turma_id, dia_semana, hora_inicio, [turma_id+dia_semana]',
      transacoes: '++id, tipo, categoria, data, valor, descricao, sync_status, deleted, created_at, updated_at',
      propinas: '++id, aluno_id, mes_referencia, estado, data_vencimento, sync_status, deleted, updated_at'   ,   // db.ts - Adicione esta linha na definição das tabelas,
      frequencias: '++id, aluno_id, aula_id, data_aula, presente, sync_status, deleted, updated_at',
      aulas: '++id, turma_id, data_aula, sync_status, deleted, updated_at',
      syncQueue: '++id, table, record_id, operation, status'
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
    dbInstance.open().catch(err => {
      console.error('Erro ao abrir banco Dexie:', err);
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
      await syncService.uploadBatch();
      
      // 2. Depois download (buscar atualizações remotas)
      await syncService.downloadBatch();
      
      console.log('✅ Sincronização completa concluída');
      return { success: true, message: 'Sincronizado com sucesso' };
      
    } catch (error: any) {
      console.error('❌ Erro na sincronização:', error);
      return { success: false, message: error.message };
    }
  },
  
  // Sincronização apenas upload
  async syncUpload() {
    return syncService.uploadBatch();
  },
  
  // Sincronização apenas download
  async syncDownload() {
    return syncService.downloadBatch();
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
      const tables = ['alunos', 'turmas', 'cursos', 'transacoes', 'aulas', 'propina', 'frequencias'];
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
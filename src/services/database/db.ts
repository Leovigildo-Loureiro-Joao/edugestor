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
    
    this.version(1).stores({
      // 🔥 Agora sua IDE vai entender ESTA estrutura
      alunos: 'id, nome_completo, numero_estudante, sync_status, deleted',
      turmas: 'id, nome_turma, professor, sync_status',
      cursos: '++id, nome, sync_status',
      transacoes:'id, sync_status',
      propinas: '++id, aluno_id, mes_referencia, estado, data_vencimento, sync_status, deleted, updated_at'   ,   // db.ts - Adicione esta linha na definição das tabelas,
      frequencias: '++id, aluno_id, aula_id, data_aula, presente, sync_status, deleted, updated_at',
      aulas: '++id, turma_id, data_aula, sync_status, deleted, updated_at',
      syncQueue: '++id, table, record_id, operation, status'
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
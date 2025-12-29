import Dexie from "dexie";
import { Student } from "./aluno";
import { Turma } from "./turma";
import { Course } from "./curso";
import { Transacao } from "./transacao";
import { Aula } from "./aula";
import { Propina } from "./propina";
import { Frequencia } from "./frequencia";

export type SyncStatus = 'pending' | 'synced' | 'pending_delete' | 'failed' | 'conflict';

export interface BaseEntity {
  id: string;
  sync_status: SyncStatus;
  deleted?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SyncQueueItem {
  id?: number;
  table: 'alunos' | 'turmas' | 'cursos' | 'transacoes'|'aulas'|'propinas'|'frequencias';
  record_id: string;
  operation: 'upsert' | 'delete';
  status: SyncStatus;
  retryCount?: number;
  created_at?: string;
  data?: string; // JSON string dos dados
}

// ============ TIPOS PARA O DEXIE ============
export interface EduGestorDatabase {
  alunos: Dexie.Table<Student, string>;
  turmas: Dexie.Table<Turma, string>;
  cursos: Dexie.Table<Course, string>;
  transacoes: Dexie.Table<Transacao, string>;
  aulas: Dexie.Table<Aula, string>;
  propinas:Dexie.Table<Propina,string>;
  frequencias:Dexie.Table<Frequencia,string>;
  syncQueue: Dexie.Table<SyncQueueItem, number>;
}

// Helper para tipar o banco
export type DatabaseInstance = Dexie & EduGestorDatabase;
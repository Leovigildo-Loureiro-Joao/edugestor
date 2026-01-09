import Dexie from "dexie";
import { Student } from "./aluno";
import { Turma } from "./turma";
import { Course } from "./curso";
import { Transacao } from "./transacao";
import { Aula } from "./aula";
import { Propina } from "./propina";
import { Frequencia } from "./frequencia";
import { EventFormData, Meta, PlanoAcao, Rotina, Tarefa } from "./eventos";
import { SystemConfig } from "./config";
import { UserProfile } from "./profile";
import { Instituicao } from ".";
import { Notificacao } from "../services/database/notificacaoService";
import { Avaliacao } from "./avaliacao";

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
  table: 'alunos' | 'turmas' | 'cursos' | 'transacoes'|'aulas'|'propina'|'frequencias'|'tarefas'|'metas'|'rotinas'|'evento'|'profiles'|'system_config'|'instituicao'|'notificacao'|'avaliacao';
  record_id: string;
  operation: 'upsert' | 'delete';
  status: SyncStatus;
  retryCount?: number;
  created_at?: string;
  error?:string;
  data?: string; // JSON string dos dados
}

// ============ TIPOS PARA O DEXIE ============
export interface EduGestorDatabase {
  alunos: Dexie.Table<Student, string>;
  turmas: Dexie.Table<Turma, string>;
  cursos: Dexie.Table<Course, string>;
  transacoes: Dexie.Table<Transacao, string>;
  aulas: Dexie.Table<Aula, string>;
  propina:Dexie.Table<Propina,string>;
  frequencias:Dexie.Table<Frequencia,string>;
  syncQueue: Dexie.Table<SyncQueueItem, number>;
  tarefas: Dexie.Table<Tarefa, string>;
  metas: Dexie.Table<Meta, string>;
  rotinas: Dexie.Table<Rotina, string>;
  evento: Dexie.Table<EventFormData, string>;
  profiles: Dexie.Table<UserProfile, string>;
  system_config: Dexie.Table<SystemConfig, string>;
  instituicao: Dexie.Table<Instituicao, string>;
  notificacao: Dexie.Table<Notificacao, string>;
  avaliacoes: Dexie.Table<Avaliacao, string>;
}

// Helper para tipar o banco
export type DatabaseInstance = Dexie & EduGestorDatabase;
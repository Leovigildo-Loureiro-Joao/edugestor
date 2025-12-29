import { BaseEntity } from "./base";

export interface Aula extends BaseEntity{
  turma_id: string; // "10A", "11B", etc.
  disciplina: string; // "Matemática", "Português", etc.
  data_aula: string;
  hora_inicio: string;
  hora_fim: string;
  conteudo_ministrado?: string;
  tema_aula: string;
}

export type AulaFormData = Omit<Aula, 
  'id' | 'created_at' | 'updated_at' | 'sync_status'
>;


export interface AulaComFrequencia extends Aula {
  total_alunos?: number;
  presentes?: number;
  ausentes?: number;
}
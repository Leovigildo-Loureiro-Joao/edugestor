import { BaseEntity } from "./base";
import { Turma } from "./turma";

export interface Aula extends BaseEntity{
  turma_id: string; // "10A", "11B", etc.
  disciplina: string; // "Matemática", "Português", etc.
  status: 'planeada' | 'ministrada' | 'cancelada' | 'adiada';
  data_aula: string;
  hora_inicio: string;
  hora_fim: string;
  conteudo_ministrado?: string;
  objetivos_aprendizagem?: string[];
  recursos_utilizados?: string;
  observacoes?: string;
  taxa_participacao?: number;
  tema_aula: string;
  turmas?: Turma
}

export type AulaFormData = Omit<Aula, 
  'id' | 'created_at' | 'updated_at' | 'sync_status'|'turma'
>;


export interface AulaComFrequencia extends Aula {
  total_alunos?: number;
  presentes?: number;
  ausentes?: number;
}
export interface Aula {
  id: string;
  turma_id: string; // "10A", "11B", etc.
  disciplina: string; // "Matemática", "Português", etc.
  data_aula: string;
  hora_inicio: string;
  hora_fim: string;
  conteudo_ministrado?: string;
  created_at: string;
  tema_aula: string;
}

export interface AulaFormData {
  turma_id: string;
  disciplina: string;
  data_aula: string;
  hora_inicio: string;
  hora_fim: string;
  conteudo_ministrado?: string;
  tema_aula: string;
}

export interface AulaComFrequencia extends Aula {
  total_alunos?: number;
  presentes?: number;
  ausentes?: number;
}
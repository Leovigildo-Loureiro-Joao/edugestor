// Tipos principais do sistema
import { Frequencia } from "./frequencia";
import { Student,StudentFormData,StudentFormProps } from "./aluno";

export { Frequencia, Student,StudentFormData,StudentFormProps };
export interface Turma {
  id: string;
  nome_turma: string;
  ano_lectivo: string;
  curso_id: string;
  professor_director: string;
  capacidade_maxima: number;
  turno: 'manhã' | 'tarde' | 'noite';
  created_at: string;
}

export interface Propina {
  id: string;
  aluno_id: string;
  mes_referencia: string;
  valor_previsto: number;
  valor_pago: number;
  data_vencimento: string;
  data_pagamento?: string;
  estado: 'pendente' | 'pago' | 'atrasado';
  multa: number;
  recibo_numero?: string;
  created_at: string;
  updated_at: string;
}

export interface Avaliacao {
  id: string;
  aluno_id: string;
  disciplina_id: string;
  tipo_avaliacao: 'teste' | 'exame' | 'trabalho';
  nota: number;
  peso_avaliacao: number;
  data_avaliacao: string;
  observacoes?: string;
  periodo: '1º trimestre' | '2º trimestre' | '3º trimestre';
  created_at: string;
}

export interface Disciplina {
  id: string;
  nome_disciplina: string;
  codigo: string;
  carga_horaria_semanal: number;
  professor_responsavel: string;
  curso_id: string;
}

export interface Curso {
  id: string;
  nome_curso: string;
  duracao_anos: number;
  regime: 'diurno' | 'nocturno';
}

export interface DashboardStats {
  totalAlunos: number;
  alunosAtivos: number;
  propinasPagas: number;
  propinasPendentes: number;
  frequenciaMedia: number;
}


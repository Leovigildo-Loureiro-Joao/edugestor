// Tipos principais do sistema
import { Frequencia } from "./frequencia";
import { Student,StudentFormData,StudentFormProps } from "./aluno";

export { Frequencia, Student,StudentFormData,StudentFormProps };

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

export interface Transacao {
  id: string;
  data: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  descricao: string;
  categoria: 'mensalidade' | 'matricula' | 'salario' | 'material' | 'alimentacao' | 'transporte' | 'utilidades' | 'investimento';
  aluno_id?: string; // Opcional - para vincular a aluno específico
  created_at: string;
}

export interface DashboardStats {
  totalAlunos: number;
  alunosAtivos: number;
  propinasPagas: number;
  propinasPendentes: number;
  frequenciaMedia: number;
  totalMensal: number; // ← ADICIONAR
  saldoAtual: number; // ← ADICIONAR
}

export interface ResumoMensal {
  mes: string;
  total_entradas: number;
  total_saidas: number;
  saldo: number;
  alunos_pagantes: number;
  alunos_pendentes: number;
}

// NOVA INTERFACE (baseada na planilha Finanças)


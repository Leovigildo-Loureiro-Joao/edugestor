// Tipos principais do sistema
import { Frequencia } from "./frequencia";
import { Student,StudentFormData,StudentFormProps } from "./aluno";
export { Frequencia, Student,StudentFormData,StudentFormProps };



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

export interface PieChartData {
  name: string;
  value: number;
  porcentagem: number;
}

export interface CustomPieChartProps {
  dados: PieChartData[];
  tipo?: 'pagamentos' | 'despesas';
  title?: string;
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

export interface Instituicao {
  nome_escola?:string,
  endereco?:string,
  email?:string,
  numero_telefone?:string,
  whatsapp?:string,
  ano_lectivo?:string,
  valor_cartao?:number,
  valor_confirmacao?:number
  valor_matricula?:number
  created_at: string;
  updated_at: string;
}




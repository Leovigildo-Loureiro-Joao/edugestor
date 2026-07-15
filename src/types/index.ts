// Tipos principais do sistema
import { Frequencia } from "./frequencia";
import { Student,StudentFormData,StudentFormProps } from "./aluno";
import { IconType } from "react-icons";
import { BaseEntity } from "./base";
export type { Frequencia, Student, StudentFormData, StudentFormProps };



export interface Disciplina {
  id: string;
  nome_disciplina: string;
  codigo: string;
  carga_horaria_semanal: number;
  professor_responsavel: string;
  curso_id: string;
}

export interface Curso extends BaseEntity{
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



export interface ResumoMensal {
  mes: string;
  total_entradas: number;
  total_saidas: number;
  saldo: number;
  alunos_pagantes: number;
  alunos_pendentes: number;
}

export interface Instituicao extends BaseEntity{
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

export interface Instituicao extends BaseEntity{
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


export interface FluxoCaixa {
  mes: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

export interface NotaDisciplina {
  disciplina: string;
  media: number;
  totalAvaliacoes: number;
}

export interface TopAluno {
  id: string;
  nome: string;
  media: number;
  turma: string;
  presenca: number;
}

export interface InadimplenciaTurma {
  turma: string;
  totalAlunos: number;
  inadimplentes: number;
  percentual: number;
}

export interface MetaKPI {
  nome: string;
  valor: number;
  meta: number;
  unidade: string;
  cor: 'green' | 'yellow' | 'red' | 'blue';
}

export interface ProximoEvento {
  id: string;
  titulo: string;
  data: string;
  tipo: 'evento' | 'tarefa' | 'meta' | 'aula';
  descricao?: string;
}

export interface DashboardStats {
  // Existente
  anoLectivoAtual: string;
  anoLectivoAnterior: string;
  alunosAnoAtual: number;
  alunosAguardandoAtivacao: number;
  turmasAnoAtual: number;
  cursosAtivos: number;
  totalAlunos: number;
  totalAlunosAnterior: number;
  alunosAtivos: number;
  propinaPagas: number;
  propinaPagasAnterior: number;
  propinaPendentes: number;
  propinaPendentesAnterior: number;
  propinaPagasCount: number;
  propinaPagasCountAnterior: number;
  propinaPendentesCount: number;
  propinaPendentesCountAnterior: number;
  frequencias: number;
  frequenciasP: number;
  aulasMinistradas: number;
  aulasMinistradasP: number;

  // NOVOS - Financeiro
  saldoAtual: number;
  saldoAnterior: number;
  totalDespesas: number;
  despesasAnterior: number;
  despesasPendentes: number;
  receitaPrevista: number;
  inadimplencia: number;
  inadimplenciaAnterior: number;
  ticketMedio: number;
  ticketMedioAnterior: number;
  fluxoCaixa: FluxoCaixa[];
  inadimplenciaPorTurma: InadimplenciaTurma[];

  // NOVOS - Acadêmico
  aprovacaoGeral: number;
  aprovacaoAnterior: number;
  reprovacaoGeral: number;
  recuperacaoGeral: number;
  notasMedias: NotaDisciplina[];
  topAlunos: TopAluno[];
  alunosRisco: number;
  alunosRiscoAnterior: number;

  // NOVOS - Operacional
  turmasAtivas: number;
  turmasLotadas: number;
  professoresAtivos: number;
  cargaHorariaTotal: number;
  aulasCanceladas: number;
  aulasCanceladasAnterior: number;
  ocupacaoMedia: number;
  ocupacaoAnterior: number;

  // NOVOS - Estratégico
  metasAlcancadas: number;
  metasTotal: number;
  tarefasAtrasadas: number;
  proximosEventos: ProximoEvento[];
  indicadoresChave: MetaKPI[];
}

export interface StatCard {
  title: string;
  value: number | string;
  change: string;
  color: 'blue' | 'green' | 'emerald' | 'orange' | 'purple' | 'indigo' | 'red' | 'yellow' | 'pink';
  icon: IconType;
  aux?: string;
  fix?: boolean;
  linkTo?: string;
  progress?: number;
  progressColor?: string;
  target?: number;
  description?: string;
  alert?: boolean;
}



export interface AtividadeEstrategica {
  titulo: string;
  prioridade: 'alta' | 'media' | 'baixa';
  data_limite?: string;
}

export interface EstrategiaStats {
  tarefasPendentes: number;
  metasConcluidas: number;
  metasAtrasadas: number;
  proximasAtividades: AtividadeEstrategica[];
}

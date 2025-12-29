import { Student } from "./aluno";
import { BaseEntity } from "./base";

export interface Turma extends BaseEntity{
  id: string;
  nome_turma: string;
  ano_lectivo: string;
  curso_id: string;
  professor: string;
  capacidade_maxima: number;
  turno: 'manhã' | 'tarde' | 'noite';
  estado: 'ativa' | 'inativa' | 'concluida';
  descricao?: string;
  vagas_disponiveis?: number;
  curso_nome:string;
}

export interface TurmaCompleta extends Turma {
  horarios?: HorarioAula[];
  alunos?: (Student & {
    media?: number;
    presenca?: number;
    ultimaAvaliacao?: number;
  })[];
}

export interface HorarioAula {
  id: string;
  dia_semana: 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado';
  hora_inicio: string;
  hora_fim: string;
  disciplina: string;
  sala: string;
  professor_responsavel: string;
}

export type TurmaFormData = Omit<Turma, 
  'id' | 'created_at'|'cursos'
>;

export interface AlunoDesempenho {
  id: number;
  nome: string;
  numero_estudante: string;
  media: number;
  presenca: number;
  ultimaAvaliacao: number;
  foto?: string;
}


export type HorarioAulaForm = Omit<HorarioAula, 'id'>;
 
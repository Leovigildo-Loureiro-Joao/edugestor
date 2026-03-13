import { BaseEntity } from "./base";
import { Frequencia } from "./frequencia";

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
  observacoes_professor?: string;
  taxa_participacao?: number;
  tema_aula: string;
  turmas?: AulaTurmaRef,
  registro?:Frequencia[]
  dia_semana: 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo';
}

export interface AulaTurmaRef {
  id: string;
  nome_turma?: string;
  professor?: string;
  curso_id?: string;
  ano_lectivo?: string;
}

export type AulaFormData = Omit<Aula, 
  'id' | 'created_at' | 'updated_at' | 'sync_status'|'turma'
>;


export interface AulaComFrequencia extends Aula {
  total_alunos?: number;
  presentes?: number;
  ausentes?: number;
}

export interface PlanoAula extends BaseEntity {
  id: string;
  titulo: string;
  descricao?: string;
  disciplina: string;
  tipo: 'unica' | 'serie' | 'modulo';
  objetivos_aprendizagem: string[];
  competencias_desenvolvidas: string[];
  recursos_necessarios: string[];
  metodologia_principal: string;
  avaliacao: string;
  duracao_total: number;
  aulas_planeadas: number;
  data_inicio?: string;
  data_fim?: string;
  frequencia?: 'diaria' | 'semanal' | 'quinzenal' | 'mensal';
  conteudos: Array<{
    ordem: number;
    titulo: string;
    descricao: string;
    duracao: number;
    metodologia: string;
    atividades: string[];
  }>;
  turma_ids: string[];
  status: 'rascunho' | 'ativo' | 'arquivado' | 'concluido';
  aulas_geradas: string[];
  instituicao_id: string;
  profile_id: string;
  created_at: string;
  updated_at: string;
}

import { Student } from "./aluno";
import { BaseEntity } from "./base";

export interface Avaliacao extends BaseEntity{
  id: string;
  aluno_id: string;
  turma_id?: string;
  disciplina: string;
  tipo_avaliacao: string;
  instituicao_id: string;
  nota: number;
  data_avaliacao: string;
  observacoes?: string;
  // Trimestre usado para análise de evolução (sem pauta formal).
  periodo: '1º trimestre' | '2º trimestre' | '3º trimestre';
  created_at: string;
  updated_at: string;
}


export type AvaliacaoFormData=Omit<Avaliacao,
'id'|'deleted'|'sync_status'|'updated_at'|'created_at'
>


export interface NotaData {
  id: string;
  disciplina: string;
  nota: number;
  tipo_avaliacao: string;
  data_avaliacao: string;
}


export interface AvaliacaoWithAluno extends Avaliacao {
  aluno?: {
    nome_completo: string;
    numero_estudante: string;
    turma_nome?: string;
  };
}

export interface AvaliacaoStats {
  totalAvaliacoes: number;
  mediaGeral: number;
  aprovados: number;
  reprovados: number;
  distribuicaoNotas: Record<number, number>;
  melhorMedia: number;
  piorMedia: number;
}

export interface DisciplinaStats {
  nome: string;
  media: number;
  totalAvaliacoes: number;
  aprovados: number;
  reprovados: number;
  melhorNota: number;
  piorNota: number;
  historico: Array<{ data: string; nota: number }>;
}


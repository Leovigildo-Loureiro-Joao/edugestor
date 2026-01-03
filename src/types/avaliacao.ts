import { Student } from "./aluno";
import { BaseEntity } from "./base";

export interface Avaliacao extends BaseEntity{
  id: string;
  aluno_id: string;
  turma_id: string;
  disciplina: string;
  tipo_avaliacao: string;
  nota: number;
  data_avaliacao: string;
  observacoes?: string;
  periodo: '1º trimestre' | '2º trimestre' | '3º trimestre';
  created_at: string;
}


export type AvaliacaoFormData=Omit<Avaliacao,
'id'|'deleted'|'sync_status'|'updated_at'
>


export interface NotaData {
  id: string;
  disciplina: string;
  nota: number;
  tipo_avaliacao: string;
  data_avaliacao: string;
}
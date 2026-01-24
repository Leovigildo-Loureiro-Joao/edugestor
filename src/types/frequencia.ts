import { BaseEntity } from "./base";

export interface Frequencia extends BaseEntity{
  id: string;
  aluno_id: string;
  aula_id: string;
  data_aula: string;
  presente: boolean;
  participacao?:boolean;
  justificativa?: string;
  created_at: string;
  aluno_nome?: string;
}
export interface FrequenciaData {
  id: string;
  data_aula: string;
  presente: boolean;
  justificativa?: string;
  participacao?:boolean;
  disciplina?:string;
  professor?:string
}
export interface RegistroFrequenciaLote {
  aula_id: string;
  data_aula: string;
  registros: {
    aluno_id: string;
    presente: boolean;
    justificativa?: string;
    participacao?:boolean;
  }[];
}
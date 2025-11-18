export interface Frequencia {
  id: string;
  aluno_id: string;
  aula_id: string;
  data_aula: string;
  presente: boolean;
  justificativa?: string;
  created_at: string;
  aluno_nome?: string;
}

export interface RegistroFrequenciaLote {
  aula_id: string;
  registros: {
    aluno_id: string;
    presente: boolean;
    justificativa?: string;
  }[];
}
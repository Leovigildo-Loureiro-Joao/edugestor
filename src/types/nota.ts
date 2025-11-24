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

export interface NotaData {
  id: string;
  disciplina: string;
  nota: number;
  tipo_avaliacao: string;
  data_avaliacao: string;
}
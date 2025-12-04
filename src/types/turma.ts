export interface Turma {
  id: string;
  nome_turma: string;
  ano_lectivo: string;
  curso_id: string;
  professor: string;
  capacidade_maxima: number;
  turno: 'manhã' | 'tarde' | 'noite';
  cursos:{
    nome:string
  }
  created_at: string;
}


 export interface TurmaFormData{
    nome_turma: string,
    ano_lectivo: Date,
    curso: string,
    professor: string,
    capacidade_maxima: number,
    turno: string
  };

export interface AlunoDesempenho {
  id: number;
  nome: string;
  numero_estudante: string;
  media: number;
  presenca: number;
  ultimaAvaliacao: number;
  foto?: string;
}

export interface HorarioAula {
  id: number;
  dia: string;
  horaInicio: string;
  horaFim: string;
  disciplina: string;
  sala: string;
  professor: string;
}
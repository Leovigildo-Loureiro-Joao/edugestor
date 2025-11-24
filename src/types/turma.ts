export interface Turma {
  id: string;
  nome_turma: string;
  ano_lectivo: string;
  curso_id: string;
  professor: string;
  capacidade_maxima: number;
  turno: 'manhã' | 'tarde' | 'noite';
  curso: 'Alfabetização' | 'Reforço' | 'Iniciação'; // ← ADICIONAR
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


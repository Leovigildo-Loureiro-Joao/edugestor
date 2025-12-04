export interface CourseFormData {
  nome: string;
  preco: number;
  duracao: string;
  disciplinas: string[];
  vagas: number;
  descricao: string;
  ativo: boolean;
}

export interface Course {
  id:number  
  nome: string;
  preco: number;
  duracao: string;
  disciplinas: string[];
  vagas: number;
  descricao: string;
  ativo: boolean;
    created_at: string;
  alunos:{
    curso:string
  }[];
  turmas:{
    nome_turma:string
  }[];
  updated_at: string;
}
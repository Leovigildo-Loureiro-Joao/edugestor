import { BaseEntity } from "./base";

export interface CourseFormData {
  nome: string;
  preco: number;
  duracao: string;
  disciplinas: string[];
  vagas: number;
  descricao: string;
  ativo: boolean;
}

export interface Course extends BaseEntity{
  id:string  
  nome: string;
  preco: number;
  duracao: string;
  disciplinas: string[];
  vagas: number;
  descricao: string;
  ativo: boolean;
    created_at: string;
  alunos:number;
  turmas:string[];
  updated_at: string;
}
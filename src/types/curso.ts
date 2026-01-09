
import { BaseEntity } from "./base";
import { Turma } from "./turma";


export interface Course extends BaseEntity{
  id:string  
  nome: string;
  preco: number;
  duracao: string;
  disciplinas: string[];
  vagas: number;
  descricao?: string;
  ativo: boolean;
  created_at: string;
  instituicao_id:string;
  alunos?:number;
  turmas?:Turma[];
  updated_at: string;
}

export type CourseFormData = Omit <Course,
   'id' | 'created_at' | 'updated_at' |'turmas' |'alunos'|'sync_status'
>;

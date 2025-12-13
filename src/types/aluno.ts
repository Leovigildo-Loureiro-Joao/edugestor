import strict from "assert/strict";
import { Propina } from "./propina";

// types/student.ts
export interface Student {
  id: string;
  nome_completo: string;
  data_nascimento: string;
  nome_pai: string;
  nome_mae: string;
  contacto_principal: string;
  email?: string;
  endereco: string;
  pagamento_em_dia:boolean,
  turma_id: string;
  turmas?: {
    nome_turma: string;
    professor: string;
  }[];
  data_matricula: string;
  estado: 'ativo' | 'transferido' | 'desistente';
  created_at: string;
  ano_lectivo: string;
  updated_at: string;
  numero_estudante: number;
  meses_em_aberto: string[];
  propina: Propina[];
  sexo: 'M' | 'F';
  curso: string;
  classe_escolar: string;
  contacto_secundario?: string;
  ultima_verificacao_pagamento: string;
  cartao_pago: boolean;
}



export type StudentFormData = Omit<Student, 
  'id' | 'created_at' | 'updated_at' | 'turmas'
>;

export interface StudentFormProps {
  student?: Student;
  onSubmit: (data: StudentFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}



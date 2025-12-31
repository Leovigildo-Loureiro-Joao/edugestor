import strict from "assert/strict";
import { Propina } from "./propina";
import { BaseEntity } from "./base";


export interface Student extends BaseEntity {
  nome_completo: string;
  data_nascimento: string;
  nome_pai: string;
  nome_mae: string;
  contacto_principal: string;
  contacto_secundario?: string;
  email?: string;
  endereco: string;

  sexo: 'M' | 'F';
  numero_estudante: number;
  ano_lectivo: string;
  curso: string;
  classe_escolar: string;

  turma_id: string;
  estado: 'ativo' | 'transferido' | 'desistente';

  tipo_matricula: 'regular' | 'reforco_personalizado';
  modalidade_atendimento: 'individual' | 'grupo' | 'ambos';
  frequencia_semanal: number;
  disciplinas_reforco: string[];

  nivel_conhecimento: 'A' | 'B' | 'C';
  grupo_aprendizado: 'gama' | 'beta' | 'alfa';
  objetivos_academicos: string;

  pagamento_em_dia: boolean;
  cartao_pago: boolean;
  meses_em_aberto?: string[];
  ultima_verificacao_pagamento?: string;

  propina: number;

  data_matricula: string;
  turma_nome?:string;
  professor?:string;
}



export type StudentFormData = Omit<Student, 
  'id' | 'created_at' | 'updated_at' 
>;

export interface StudentFormProps {
  student?: Student;
  onSubmit: (data: StudentFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}



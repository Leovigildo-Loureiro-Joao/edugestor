export interface Student {
  id: string;
  nome_completo: string;
  data_nascimento: string;
  numero_bi: string;
  nome_pai: string;
  nome_mae: string;
  contacto_telefone: string;
  email?: string;
  endereco: string;
  turma_id: string;
  data_matricula: string;
  estado: 'ativo' | 'transferido' | 'desistente';
  created_at: string;
  updated_at: string;
}

export interface StudentFormProps {
  student?: Student; // Opcional para novo aluno
  onSubmit: (data: StudentFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

export type StudentFormData = {
  nome_completo: string;
  data_nascimento: string;
  numero_bi: string;
  nome_pai: string;
  nome_mae: string;
  contacto_telefone: string;
  email?: string;
  endereco: string;
  turma_id: string;
  data_matricula: string;
  estado: 'ativo' | 'transferido' | 'desistente';
}
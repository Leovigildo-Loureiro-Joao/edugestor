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
  turma_id: string;
  turmas?: {
    nome_turma: string;
  };
  numero_bi: string;
  data_matricula: string;
  estado: 'ativo' | 'transferido' | 'desistente';
  created_at: string;
  updated_at: string;
  numero_estudante: string;
  sexo: 'M' | 'F';
  curso: 'Alfabetização' | 'Reforço' | 'REGULAR';
  classe_escolar: string;
  periodo: 'Manhã' | 'Tarde' | 'Noite';
  horario: string;
  contacto_secundario?: string;
  professor: string;
  cartao_pago: boolean;
}



export type StudentFormData = Omit<Student, 
  'id' | 'created_at' | 'updated_at' | 'idade'
>;

export interface StudentFormProps {
  student?: Student;
  onSubmit: (data: StudentFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}
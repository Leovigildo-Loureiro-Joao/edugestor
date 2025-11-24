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
  };
  data_matricula: string;
  estado: 'ativo' | 'transferido' | 'desistente';
  created_at: string;
  updated_at: string;
  numero_estudante: string;
  
  propina: number;
  sexo: 'M' | 'F';
  curso: 'Alfabetização' | 'Reforço' | 'REGULAR';
  classe_escolar: string;
  periodo: 'Manhã' | 'Tarde' | 'Noite';
  horario: string;
  contacto_secundario?: string;
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

export interface AlunoData {
  id: string;
  nome_completo: string;
  data_nascimento: string;
  contacto_principal: string;
  email?: string;
  endereco: string;
  pagamento_em_dia:boolean,
  propina:number,
  turma_id: string;
  estado: 'ativo' | 'transferido' | 'desistente';
  numero_estudante: string;
  sexo: 'M' | 'F';
  curso: string;
  periodo: string;
  turmas?: {
    nome_turma: string;
    professor: string;
  };
}


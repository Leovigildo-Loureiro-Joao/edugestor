// src/services/database/students-supabase.js
import { Student, StudentFormData } from '../../types'
import { supabase } from '../supabase/config'

export const studentsService = {
  // Criar aluno
  async createStudent(studentData:StudentFormData) {
    const { data, error } = await supabase
      .from('alunos')
      .insert([{
        ...studentData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
    
    if (error) throw new Error(`Erro ao criar aluno: ${error.message}`)
    return data[0].id
  },

  async getAlunosPorTurma(turmaId:string) {
    const { data, error } = await supabase
      .from('alunos')
      .select('id, nome_completo, turma_id, estado')
      .eq('turma_id', turmaId)
      .order('nome_completo');

    if (error) throw error;
    return data;
  },

  // Buscar todos os alunos
  async getStudents() {
    const { data, error } = await supabase
      .from('alunos')
      .select(`
  id, 
  nome_completo, 
  data_nascimento, 
  nome_pai, 
  nome_mae, 
  contacto_principal, 
  email, 
  endereco, 
  data_matricula, 
  pagamento_em_dia,
  estado, 
  created_at, 
  updated_at, 
  numero_estudante, 
  sexo, 
  curso, 
  classe_escolar, 
  turma_id,
  periodo, 
  propina,
  horario, 
  contacto_secundario, 
  cartao_pago,
  turmas (
    nome_turma,
    professor
  )
`)
      .order('nome_completo', { ascending: true })
    
    if (error) throw new Error(`Erro ao buscar alunos: ${error.message}`)
    return data
  },

  // Buscar aluno por ID
  async getStudentById(id:string) {
    const { data, error } = await supabase
      .from('alunos')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw new Error(`Erro ao buscar aluno: ${error.message}`)
    return data
  },

  // Atualizar aluno
  async updateStudent(id:string, studentData:StudentFormData) {
    const { error } = await supabase
      .from('alunos')
      .update({
        ...studentData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
    
    if (error) throw new Error(`Erro ao atualizar aluno: ${error.message}`)
  },

  // Deletar aluno
  async deleteStudent(id:string) {
    const { error } = await supabase
      .from('alunos')
      .delete()
      .eq('id', id)
    
    if (error) throw new Error(`Erro ao deletar aluno: ${error.message}`)
  }
}

// src/services/database/students-supabase.js
import { supabase } from '../supabase/config'

export const studentsService = {
  // Criar aluno
  async createStudent(studentData) {
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

  async getAlunosPorTurma(turmaId) {
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
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw new Error(`Erro ao buscar alunos: ${error.message}`)
    return data
  },

  // Buscar aluno por ID
  async getStudentById(id) {
    const { data, error } = await supabase
      .from('alunos')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw new Error(`Erro ao buscar aluno: ${error.message}`)
    return data
  },

  // Atualizar aluno
  async updateStudent(id, studentData) {
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
  async deleteStudent(id) {
    const { error } = await supabase
      .from('alunos')
      .delete()
      .eq('id', id)
    
    if (error) throw new Error(`Erro ao deletar aluno: ${error.message}`)
  }
}
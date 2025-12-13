// src/services/database/students-supabase.js
import { Student, StudentFormData } from '../../types'
import { supabase } from '../supabase/config'

export const studentsService = {
  // ✅ Buscar o maior número de estudante
  async getMaiorNumeroEstudante() {
    const { data, error } = await supabase
      .from('alunos')
      .select('numero_estudante')
      .order('numero_estudante', { ascending: false })
      .limit(1)
    
    if (error) {
      console.error('Erro ao buscar maior número de estudante:', error)
      return 0
    }
    
    if (data && data.length > 0 && data[0].numero_estudante) {
      // Converte para número e retorna o maior
      return parseInt(data[0].numero_estudante) || 0
    }
    
    return 0
  },

  // ✅ Gerar próximo número de estudante
  async gerarProximoNumeroEstudante() {
    try {
      const maiorNumero = await this.getMaiorNumeroEstudante()
      const proximoNumero = maiorNumero + 1
      console.log(`🎯 Gerando número de estudante: ${maiorNumero} + 1 = ${proximoNumero}`)
      return proximoNumero
    } catch (error) {
      console.error('Erro ao gerar próximo número de estudante:', error)
      // Fallback: retorna timestamp como número
      return Math.floor(Date.now() / 1000)
    }
  },

  // ✅ Criar aluno com número automático
  async createStudent(studentData: StudentFormData) {
    try {
      // Se não foi fornecido um número de estudante, gera automaticamente
      let numeroEstudante = studentData.numero_estudante
      
      if (!numeroEstudante || numeroEstudante === 0) {
        numeroEstudante = await this.gerarProximoNumeroEstudante()
        studentData.numero_estudante=numeroEstudante;
        console.log(`🔢 Número de estudante gerado automaticamente: ${numeroEstudante}`)
      }

      const alunoComNumero = {
        ...studentData,
        numero_estudante: numeroEstudante,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('📤 Criando aluno:', alunoComNumero)
      
      const { data, error } = await supabase
        .from('alunos')
        .insert([alunoComNumero])
        .select()
      
      if (error) throw new Error(`Erro ao criar aluno: ${error.message}`)
      
      console.log('✅ Aluno criado com sucesso, ID:', data[0].id)
      return data[0].id
    } catch (error) {
      console.error('❌ Erro ao criar aluno:', error)
      throw error
    }
  },

  async getAlunosPorTurma(turmaId: string) {
    const { data, error } = await supabase
      .from('alunos')
      .select('id, nome_completo, turma_id, estado, numero_estudante')
      .eq('turma_id', turmaId)
      .order('nome_completo')

    if (error) throw error
    return data
  },

  async atualizarStatusMatricula(id: string,status:boolean) {
    const { data, error } = await supabase
      .from('alunos')
      .update({matricula_status:status})
      .eq('id', id)

    if (error) throw error
    return data
  },


  // ✅ Buscar todos os alunos
  async getStudents() :Promise<Student[]> {
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
        ano_lectivo,
        created_at, 
        updated_at, 
        numero_estudante, 
        sexo, 
        curso, 
        classe_escolar, 
        turma_id,
        meses_em_aberto,
        propina,
        contacto_secundario, 
        cartao_pago,
        ultima_verificacao_pagamento,
        propina(mes_referencia,data_pagamento),
        turmas (
          nome_turma,
          professor
        )
      `)
      .order('numero_estudante', { ascending: false })
    
    if (error) throw new Error(`Erro ao buscar alunos: ${error.message}`)
    return data
  },

    async getStudentByIdOnly(id: string) {
    const { data, error } = await supabase
      .from('alunos')
      .select(`*`)
      .eq('id', id)
      .single()
    
    if (error) throw new Error(`Erro ao buscar aluno: ${error.message}`)
    return data
  },

  // ✅ Buscar aluno por ID
  async getStudentById(id: string) {
    const { data, error } = await supabase
      .from('alunos')
      .select(`*, turmas (
          nome_turma,
          professor
        )`)
      .eq('id', id)
      .single()
    
    if (error) throw new Error(`Erro ao buscar aluno: ${error.message}`)
    return data
  },
  async atualizarCartaoPago(id: string, cartaoPago: boolean) {
      const { error } = await supabase
          .from('alunos')
          .update({ 
              cartao_pago: cartaoPago,
              updated_at: new Date().toISOString()
          })
          .eq('id', id)
      
      if (error) throw new Error(`Erro ao atualizar cartão: ${error.message}`)
  },
  async updateStudent(id: string, studentData: StudentFormData) {
    const { error } = await supabase
      .from('alunos')
      .update({
        ...studentData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
    
    if (error) throw new Error(`Erro ao atualizar aluno: ${error.message}`)
  },

  // ✅ Deletar aluno
  async deleteStudent(id: string) {
    const { error } = await supabase
      .from('alunos')
      .delete()
      .eq('id', id)
    
    if (error) throw new Error(`Erro ao deletar aluno: ${error.message}`)
  },

  // ✅ Buscar aluno por número de estudante (opcional - para validação)
  async getStudentByNumeroEstudante(numeroEstudante: string) {
    const { data, error } = await supabase
      .from('alunos')
      .select('id, nome_completo')
      .eq('numero_estudante', numeroEstudante)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = não encontrado
      throw new Error(`Erro ao buscar aluno por número: ${error.message}`)
    }
    
    return data
  }
}
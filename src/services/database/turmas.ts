import { Turma, TurmaFormData } from '../../types/turma';
import { supabase } from '../supabase/config'

export const turmaService = { 
    // Criar turma
  async createTurma(turmaData:TurmaFormData) {
    const {data,error}= await supabase.from("turmas")
    .insert([{...turmaData}]);
    if (error) throw new Error(`Erro ao criar turma: ${error.message}`)
    return data
  },
  async getTurmas() {
    const {data}= await supabase.from("turmas")
    .select("*,cursos(nome)");
    return data
  },
  async getTurma() {
    const nomeTurmas= await supabase.from("turmas")
    .select("nome_turma");
    return nomeTurmas
  },
  async getId(nome:string) {
    const {data}= await supabase.from("turmas")
    .select("id")
    .eq("nome_turma",nome);
    return data
  },
  async findBy(id:string) {
    const {data,error}= await supabase.from("turmas")
    .select("*")
    .eq("id",id);
    if (error) throw new Error(`Erro ao buscar turma: ${error.message}`)
    return data
  },
  async deleteTurma(id:string) {
     const {error}= await supabase.from("turmas")
    .delete()
    .eq("id",id);
    if (error) throw new Error(`Erro ao deletar turma: ${error.message}`)
  },
  async editTurma(id:string,turmaData:TurmaFormData) {
    const {error}= await supabase.from("turmas")
    .update({...turmaData})
    .eq("id",id);
    if (error) throw new Error(`Erro ao editar turma: ${error.message}`)
  }


}
  
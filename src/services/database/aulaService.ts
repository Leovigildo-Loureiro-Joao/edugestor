// services/database/aulaService.js
import { AulaFormData } from '../../types/aula';
import { supabase } from '../supabase/config';

export const aulaService = {
  async criarAula(aulaData:AulaFormData) {
    const { data, error } = await supabase
      .from('aulas')
      .insert([{
        ...aulaData,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAulasRecentes(limite = 50) {
    const { data, error } = await supabase
      .from('aulas')
      .select("*, turmas(nome_turma)")
      .order('data_aula', { ascending: false })
      .limit(limite);

    if (error) throw error;
    return data;
  },

  async atualizarAula(id:string, updates:AulaFormData) {
    const { data, error } = await supabase
      .from('aulas')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deletarAula(id:string) {
    const { error } = await supabase
      .from('aulas')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getAulasPorTurma(turmaId:string) {
    const { data, error } = await supabase
      .from('aulas')
      .select('*')
      .eq('turma_id', turmaId)
      .order('data_aula', { ascending: false });

    if (error) throw error;
    return data;
  },
};
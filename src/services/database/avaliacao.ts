import { supabase } from "../supabase/config";

export const notasService = {
  async getByAluno(alunoId: string) {
    const { data, error } = await supabase 
      .from('avaliacoes')
      .select('*')
      .eq('aluno_id', alunoId)
      .order('data_avaliacao', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },
  
};
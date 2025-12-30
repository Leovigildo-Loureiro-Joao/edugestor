import { supabase } from "../database/db";

export const estrategiaService = {
  // ... existing methods

  async getResumoEstrategico() {
   const [
          { count: totametasConcluidas, error: metasError },
          { count: tarefasPendentes, error: tarefasPendentesError },
          { count: metasAtrasadas, error: metasAtrasadasError },
          { count: proximasAtividades, error: proximasAtividadesError }
        ] = await Promise.all([
          // Total de alunos - ✅ COUNT, não DATA
          supabase
            .from('metas')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'concluida'),
          
          // Alunos ativos - ✅ COUNT, não DATA
          supabase
            .from('tarefas')
            .select('id', { count: 'exact', head: true })
            .eq('concluida', 'true'),
          
          // propina pagas - ✅ COUNT, não DATA
          supabase
            .from('metas')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pendente'),
          
          // propina pendentes - ✅ COUNT, não DATA
          supabase
            .from('plano_atividades')
            .select('id', { count: 'exact', head: true })
            .eq('horario', 'proxima')
        ]);



    
        if (metasError || tarefasPendentesError || metasAtrasadasError || proximasAtividadesError) {
          throw metasError || tarefasPendentesError || metasAtrasadasError || proximasAtividadesError;
        }
    
        return {
          tarefasPendentes: tarefasPendentes || 0,
          metasConcluidas: totametasConcluidas || 0,
          metasAtrasadas: metasAtrasadas || 0,
          proximasAtividades: proximasAtividades || []
        };
  },
  async getTarefas(){
    const { data, error } = await supabase
      .from('tarefas')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },
  async updateTarefaStatus(tarefaId: string, concluida: string) {
    const { data, error } = await supabase
      .from('tarefas')
      .update({"status":concluida})
      .eq('id', tarefaId);
    
    if (error) throw error;
    return data;
  },
   async updateRotinaStatus(rotinaId: string, concluida: string) {
    const { data, error } = await supabase
      .from('rotinas')
      .update({"status":concluida})
      .eq('id', rotinaId);
    
    if (error) throw error;
    return data;
  },
  async getMetas(){
    const { data, error } = await supabase
      .from('metas')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },
  async getRotinasDiarias(){
    const { data, error } = await supabase
      .from('rotinas')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },
  async getPlanoAtividades(){
    const { data, error } = await supabase
      .from('planos_acao')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },
  async executarRotina(rotinaId: string) {
    const { data, error } = await supabase
      .from('rotinas')
      .update({ status: 'executada' })
      .eq('id', rotinaId);
    
    if (error) throw error;
    return data;
  }
};

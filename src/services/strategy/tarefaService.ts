import { Tarefa } from "../../types/eventos";
import { supabase } from "../supabase/config";

const tarefaService = { 
    async createTarefa(tarefa: Partial<Tarefa>): Promise<void> {
        const { data, error } = await supabase
          .from('tarefas')
          .insert(tarefa)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },
    async updateTarefa(tarefaId: string, tarefa: Partial<Tarefa>): Promise<void> {
        const { data, error } = await supabase
          .from('tarefas')
          .update(tarefa)
          .eq('id', tarefaId)
          .select()
          .single();
        
        if (error) throw error;
        return data[0];
    },

    async deleteTarefa(tarefaId: string): Promise<void> {
        const { error } = await supabase
          .from('tarefas')
          .delete()
          .eq('id', tarefaId);
        
        if (error) throw error;
    },
    async getTarefaPorId(tarefaId: string): Promise<Tarefa | null> {  
        const { data, error } = await supabase
          .from('tarefas')
          .select('*')
          .eq('id', tarefaId)
          .single();
        
        if (error) throw error;
        return data;
    }
};

export { tarefaService };
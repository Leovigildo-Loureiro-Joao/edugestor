import { supabase } from "../database/db";
import { Meta } from "../../types/eventos";

export const metasService= { 
    async getMetas(): Promise<Meta[]> {
        const { data, error } = await supabase
          .from('metas')
          .select('*');
        
        if (error) throw error;
        return data;
    },
    async getMetaPorId(metaId: string): Promise<Meta | null> {  
        const { data, error } = await supabase
          .from('metas')
          .select('*')
          .eq('id', metaId)
          .single();
        
        if (error) throw error;
        return data;
    },async createMeta(meta: Partial<Meta>): Promise<void> {
        const { data, error } = await supabase
          .from('metas')
          .insert(meta)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },
    async updateMeta(metaId: string, meta: Partial<Meta>): Promise<void> {
        const { data, error } = await supabase
          .from('metas')
          .update(meta)
          .eq('id', metaId)
          .select()
          .single();
        
        if (error) throw error;
        return data[0];
    },async deleteMeta(metaId: string): Promise<void> {
        const { error } = await supabase
          .from('metas')
          .delete()
          .eq('id', metaId);
        
        if (error) throw error;
    }
};
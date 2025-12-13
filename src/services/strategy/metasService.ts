import { supabase } from "../supabase/config";
import { Meta } from "../../types/eventos";

export const metasService= { 
    async getMetas(): Promise<Meta[]> {
        const { data, error } = await supabase
          .from('metas')
          .select('*');
        
        if (error) throw error;
        return data;
    }
};
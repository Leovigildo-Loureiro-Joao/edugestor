import { Instituicao } from "../../types";
import { supabase } from "../supabase/config";

// Serviço
export const instituicaoService = {
  async getConfig() {
    const { data } = await supabase
      .from('instituicao')
      .select('*')
      .eq('id', 1)
      .single();
    
    return data;
  },

  async updateConfig(config: Partial<Instituicao>) {
    const { data } = await supabase
      .from('instituicao')
      .update(config)
      .eq('id', 1)
      .select()
      .single();
    
    return data;
  }
};


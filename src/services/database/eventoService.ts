import { EventFormData } from "../../types/eventos";
import { supabase } from "../database/db";

export const eventoService = {
  async listarEventos() {
    const { data, error} = await supabase.from('evento').select('*');
    if (error) {
      throw new Error(error.message);
    }
    return data;
  },

  async listarEventoPorId(eventoId:string): Promise<EventFormData> {
    const { data, error} = await supabase.from('evento').select('*').eq('id', eventoId).single();
    if (error) {
      throw new Error(error.message);
    }
    return data;
  },

  async criarEvento(eventoData:EventFormData): Promise<EventFormData> {
    const { data, error } = await supabase.from('evento').insert(eventoData).select();
    if (error) {
      throw new Error(error.message);
    }
    return data[0];

  },

  async atualizarEvento(eventoId:string, eventoData:EventFormData) : Promise<EventFormData>{
    const { data, error } = await supabase.from('evento').update(eventoData).eq('id', eventoId).select();
    if (error) {
      throw new Error(error.message);
    }
    return data[0];
  },

  async deletarEvento(eventoId:string) {
    const { data, error } = await supabase.from('evento').delete().eq('id', eventoId).select();
    if (error) {
      throw new Error(error.message);
    }
    return data;
  },
};


import { data } from "react-router-dom";
import { Propina, PropinaFormData } from "../../types/propina";
import { supabase } from "../supabase/config";
import { studentsService } from "./students";
import { StudentFormData } from "../../types";

export const propinaService = {
    async registerPropina(data: PropinaFormData) {
        let aluno:StudentFormData = await studentsService.getStudentById(data.aluno_id);
        data.valor_falta = aluno!.propina - data.valor_pago;
        data.estado = data.valor_falta > 0 ? 'pendente' : 'pago';
        const { data: propina, error } = await supabase
            .from('propina')
            .insert([{
                ...data,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])
            .select();

        if (error) throw error;
        return propina[0];
    },

    async SearchMesesPagos(alunoId: string) {
        const { data, error } = await supabase
        .from('propina')
        .select('mes_referencia')
        .eq('aluno_id', alunoId)
        .eq('estado', 'pago');

        if (error) throw error;
        return data?.map(item => item.mes_referencia) || [];
    },

    async getByAluno(alunoId: string) {
    const { data, error } = await supabase
      .from('propina')
      .select('*')
      .eq('aluno_id', alunoId)
      .order('data_vencimento', { ascending: false });

    if (error) throw error;
    return data as Propina[];
    },

  async grafico(ano?: number) {
    let query = supabase
        .from('propina')
        .select('data_pagamento, data_vencimento, estado, valor_pago, valor_falta')
        .order('data_vencimento');

    // Filtrar pelos últimos 6 meses por padrão
    if (!ano) {
        const seisMesesAtras = new Date();
        seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
        query = query.gte('data_vencimento', seisMesesAtras.toISOString().slice(0, 10));
    } else {
        // Ano específico
        const inicioAno = `${ano}-01-01`;
        const fimAno = `${ano}-12-31`;
        query = query.gte('data_vencimento', inicioAno).lte('data_vencimento', fimAno);
    }
    
    const { data: propina, error } = await query;
    
    if (error) throw error;
    return propina || [];
},
  // Buscar histórico de pagamentos
  async getHistoricoPagamentos() {
    try {
      const { data, error } = await supabase
        .from('propina')
        .select(`
          *,
          alunos(nome_completo)
        `)
        .order('data_pagamento', { ascending: false })
        .limit(10);

      if (error) throw error;

      return data.map(pagamento => ({
        ...pagamento,
        aluno_nome: pagamento.alunos?.nome_completo
      }));

    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      return [];
    }
  },

}

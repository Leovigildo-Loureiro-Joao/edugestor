// services/database/transacaoService.ts
import { supabase } from '../supabase/config';
import { DadosPagamentoCash } from '../../types/transacao';
import { propinaService } from './propinas';



export const transacaoService = {
   async processarPagamentoCash(alunoId: string, dados: DadosPagamentoCash): Promise<{sucesso: boolean; mensagem: string; dados?: any}> {
    try {
      const valorTotal = parseFloat(dados.valor) * dados.meses;
      
      // Registrar transação
      const { data: transacao, error } = await supabase
        .from('transacoes')
        .insert({
          aluno_id: alunoId,
          valor: valorTotal,
          tipo: 'entrada',
          categoria: 'mensalidade',
          metodo: 'cash',
          data: new Date().toISOString(),
          descricao: `Pagamento de ${dados.meses} mes(es) de propina - ${dados.mesReferencia.join(', ')}`
        })
        .select();

      if (error) throw error;

      // Registrar propinas para cada mês
      for (let i = 0; i < dados.meses; i++) {
        // normalizar a abreviação do mês para o tipo esperado ('Jan' | 'Fev' | ... | 'Dez')
        const mesRef = (dados.mesReferencia[i].substring(0, 3) as 'Jan' | 'Fev' | 'Mar' | 'Abr' | 'Mai' | 'Jun' | 'Jul' | 'Ago' | 'Set' | 'Out' | 'Nov' | 'Dez');

        await propinaService.registerPropina({
          aluno_id: alunoId,
          data_vencimento: new Date(new Date().getFullYear(), new Date().getMonth() + i + 1, 0).toISOString(), // Último dia do mês
          data_pagamento: new Date().toISOString(),
          valor_pago: parseFloat(dados.valor),
          valor_falta: 0,
          mes_referencia: mesRef, // 'Jan', 'Fev', etc
          transacao_id: transacao[0].id,
          estado: 'pago',
        });
      }

      return {
        sucesso: true,
        mensagem: `Pagamento de ${dados.meses} mes(es) registrado com sucesso!`,
        dados: transacao[0]
      };

    } catch (error: any) {
      console.error('❌ Erro ao processar pagamento cash:', error);
      return {
        sucesso: false,
        mensagem: error.message
      };
    }
  },

  async getPagamentosPorAno(ano: number): Promise<any[]> {
    try {
      const inicioAno = `${ano}-01-01`;
      const fimAno = `${ano}-12-31`;

      const { data, error } = await supabase
        .from('transacoes') // Corrigido: era 'transacaoes'
        .select('*')
        .eq('tipo', 'entrada')
        .gte('data', inicioAno)
        .lte('data', fimAno)
        .order('data', { ascending: true });

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('Erro ao buscar pagamentos por ano:', error);
      return [];
    }
  },

  async getDespesasPorAno(ano: number): Promise<any[]> {
    try {
      const inicioAno = `${ano}-01-01`;
      const fimAno = `${ano}-12-31`;

      const { data, error } = await supabase
        .from('transacoes') // Corrigido: era 'transacaoes'
        .select('*')
        .eq('tipo', 'saida')
        .gte('data', inicioAno)
        .lte('data', fimAno)
        .order('data', { ascending: true });

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('Erro ao buscar despesas:', error);
      return [];
    }
  },

  async getHistoricoPagamentos(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('transacoes')
        .select('*')
        .eq('tipo', 'entrada')
        .order('data', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      return [];
    }
  },
};
// services/dashboard/dashboardService.ts
import { supabase } from '../database/db';

// Tipos
import { DashboardStats } from '../../types';
import { ComparativoPropinasMensal, ParamsResumoPropinas, ResumoPropinasDetalhado } from '../../types/propina';

// Constantes
const mes_actual: number = new Date().getMonth();

const mapaMeses: { [key: string]: string } = {
  'Janeiro': 'Jan', 'Fevereiro': 'Fev', 'Março': 'Mar', 'Abril': 'Abr',
  'Maio': 'Mai', 'Junho': 'Jun', 'Julho': 'Jul', 'Agosto': 'Ago',
  'Setembro': 'Set', 'Outubro': 'Out', 'Novembro': 'Nov', 'Dezembro': 'Dez',
};

export const dashboardService = {
  
 async getDashboardStats(): Promise<DashboardStats> {
  try {
    console.log('🟡 Iniciando busca de estatísticas...');

    // Calcular mês atual e anterior
    const mesAtualIndex = mes_actual; // 0-11
    const mesAnteriorIndex = mes_actual - 1 < 0 ? 11 : mes_actual - 1;
    
    const mesAtual = mapaMeses[Object.keys(mapaMeses)[mesAtualIndex]];
    const mesAnterior = mapaMeses[Object.keys(mapaMeses)[mesAnteriorIndex]];

    // Execute todas as queries em paralelo
    const [
      totalAlunosPromise,
      alunosAnteriorPromise,
      alunosAtivosPromise,
      propinaPromiseComparativo,
      frequenciasPromise
    ] = await Promise.all([
      // Total de alunos do ano atual
      supabase
        .rpc('get_alunos_ano_lectivo_actual'),
      
      // Alunos do ano anterior
      supabase
        .rpc('alunos_ano_lectivo_anterior'),
      
      // Alunos ativos
      supabase
        .from('alunos')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'ativo'),

      // ✅ Comparativo de propinas (mês atual vs anterior)
      supabase
        .rpc<string, ParamsResumoPropinas>('get_resumo_propinas_meses_comparativo', {
          p_mes_atual: mesAtual,
          p_mes_anterior: mesAnterior,
          p_ano_lectivo: '2025-2026'
        }),
      
      // Frequências
      supabase
        .from('frequencias')
        .select('presente')
    ]);

    // Desestruturação com tipos
    const { data: totalAlunosData, error: alunosError } = totalAlunosPromise;
    const { data: alunosAnteriorData, error: anteriorError } = alunosAnteriorPromise;
    const { count: alunosAtivos, error: ativosError } = alunosAtivosPromise;
    const { data: resultComparativo, error: comparativoError } = propinaPromiseComparativo;
    const { data: frequencias, error: frequenciasError } = frequenciasPromise;

    // ✅ Tratamento de erros
    if (alunosError) {
      console.error('❌ Erro alunos:', alunosError);
      throw alunosError;
    }
    if (anteriorError) {
      console.error('❌ Erro alunos anterior:', anteriorError);
      throw anteriorError;
    }
    if (ativosError) {
      console.error('❌ Erro alunos ativos:', ativosError);
      throw ativosError;
    }
    if (comparativoError) {
      console.error('❌ Erro comparativo propinas:', comparativoError);
      throw comparativoError;
    }
    if (frequenciasError) {
      console.error('❌ Erro frequências:', frequenciasError);
      throw frequenciasError;
    }

    // ✅ Calcular totais
    const totalAlunos: number = totalAlunosData?.length || 0;
    const totalAlunosAnterior: number = alunosAnteriorData?.length || 0;

    // ✅ Extrair dados do comparativo de propinas
    const comparativo = resultComparativo || {
      mes_atual: {
        pagas: { count: 0, valor: 0 },
        pendentes: { count: 0, valor: 0 }
      },
      mes_anterior: {
        pagas: { count: 0, valor: 0 },
        pendentes: { count: 0, valor: 0 }
      }
    };

    // ✅ Calcular frequência média
    let frequenciaMedia: number = 0;
    if (frequencias && frequencias.length > 0) {
      const totalPresentes: number = frequencias.filter(f => f.presente).length;
      frequenciaMedia = (totalPresentes / frequencias.length) * 100;
    }

    // ✅ DEBUG: Ver o que está retornando
    console.log('🔍 Debug dos counts:', {
      totalAlunos,
      totalAlunosAnterior,
      alunosAtivos: alunosAtivos || 0,
      propinas: {
        // Mês atual
        pagas_atual: comparativo.mes_atual.pagas.valor,
        pagas_count_atual: comparativo.mes_atual.pagas.count,
        pendentes_atual: comparativo.mes_atual.pendentes.valor,
        pendentes_count_atual: comparativo.mes_atual.pendentes.count,
        // Mês anterior
        pagas_anterior: comparativo.mes_anterior.pagas.valor,
        pagas_count_anterior: comparativo.mes_anterior.pagas.count,
        pendentes_anterior: comparativo.mes_anterior.pendentes.valor,
        pendentes_count_anterior: comparativo.mes_anterior.pendentes.count
      },
      frequencias: frequencias?.length || 0
    });

    // ✅ Criar objeto de estatísticas com tipos
    const stats: DashboardStats = {
      totalAlunos,
      totalAlunosAnterior,
      alunosAtivos: alunosAtivos || 0,
      
      // Propinas pagas (VALOR em dinheiro)
      propinaPagas: comparativo.mes_atual.pagas.valor,
      propinaPagasAnterior: comparativo.mes_anterior.pagas.valor,
      
      // Propinas pendentes (VALOR em dinheiro)
      propinaPendentes: comparativo.mes_atual.pendentes.valor,
      propinaPendentesAnterior: comparativo.mes_anterior.pendentes.valor,
      
      // Opcional: Contagens (se quiser usar nos cards)
      propinaPagasCount: comparativo.mes_atual.pagas.count,
      propinaPagasCountAnterior: comparativo.mes_anterior.pagas.count,
      propinaPendentesCount: comparativo.mes_atual.pendentes.count,
      propinaPendentesCountAnterior: comparativo.mes_anterior.pendentes.count,
      
      // Frequência
      frequencias: parseFloat(frequenciaMedia.toFixed(1))
    };

    console.log('📊 Estatísticas finais:', stats);
    return stats;

  } catch (error: unknown) {
    console.error('❌ Erro ao buscar estatísticas do dashboard:', error);
    
    // Retornar objeto vazio ou lançar exceção
    throw error;
  }
},

  // Métodos adicionais com tipagem
  async getAlunosPorMes(): Promise<{ mes: string; total: number }[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_alunos_por_mes');
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('❌ Erro ao buscar alunos por mês:', error);
      return [];
    }
  },

  // Exemplo de método com parâmetros tipados
  async getPropinasPorEstado(estado: 'pago' | 'pendente' | 'atrasado'): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('propina')
        .select('id', { count: 'exact', head: true })
        .eq('estado', estado);
      
      if (error) throw error;
      
      return count || 0;
    } catch (error) {
      console.error(`❌ Erro ao buscar propinas ${estado}:`, error);
      return 0;
    }
  }
};
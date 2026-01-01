// services/dashboard/dashboardService.ts
import db, { supabase } from '../database/db';

// Tipos
import { DashboardStats } from '../../types';
import { ComparativoPropinasMensal, ParamsResumoPropinas, Propina, ResumoPropinasDetalhado } from '../../types/propina';
import { m } from 'framer-motion';

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
      this.get_alunos_ano_lectivo_actual(),
      
      // Alunos do ano anterior
     this.alunos_ano_lectivo_anterior(),
      
      // Alunos ativos
      async function alunos_activo() {
        return (await db.alunos
        .toArray())
        .filter(
          (aluno)=> aluno.deleted!=false&&aluno.estado=='ativo'
        )
      }(),

      // ✅ Comparativo de propinas (mês atual vs anterior)
      this.get_resumo_propinas_meses_comparativo(),
      async function frequencias() {
        return (await db.frequencias
        .toArray())
        .filter(
          (frequencia)=> frequencia.deleted!=false&&frequencia.presente==true
        )
      }()
      
    ]);

    // Desestruturação com tipos
   const totalAlunos: number = totalAlunosPromise?.length || 0;
    const totalAlunosAnterior: number = alunosAnteriorPromise?.length || 0;
  

    // ✅ Extrair dados do comparativo de propinas
    const comparativo = propinaPromiseComparativo || {
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
    if (frequenciasPromise && frequenciasPromise.length > 0) {
      const totalPresentes: number = frequenciasPromise.filter(f => f.presente).length;
      frequenciaMedia = (totalPresentes / frequenciasPromise.length) * 100;
    }

  

    // ✅ Criar objeto de estatísticas com tipos
    const stats: DashboardStats = {
      totalAlunos,
      totalAlunosAnterior,
      alunosAtivos: alunosAtivosPromise.length || 0,
      
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

  ,async get_alunos_ano_lectivo_actual(){
     const alunos= await db.alunos.toArray() 
     const instituicao=(await db.instituicao.toArray())[0] 
     const totalAlunos=alunos.filter((aluno)=> aluno.deleted!=false&&aluno.ano_lectivo==instituicao.ano_lectivo)
     return totalAlunos
  },

  async alunos_ano_lectivo_anterior(){
    const alunos= await db.alunos.toArray() 
     const instituicao=(await db.instituicao.toArray())[0] 
     const totalAlunos=alunos.filter((aluno)=> aluno.deleted!=false&&aluno.ano_lectivo==instituicao.ano_lectivo)
      return totalAlunos
  },

  async get_resumo_propinas_meses_comparativo(){
    return null;
  }
};
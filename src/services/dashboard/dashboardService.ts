// services/dashboard/dashboardService.ts
import db, { supabase } from '../database/db';
import { instituicaoIdValue } from '../../utils/getInsitituicaoID';

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
    const activeInstituicaoId = instituicaoIdValue() || '';
    if (!activeInstituicaoId) {
      return {
        totalAlunos: 0,
        totalAlunosAnterior: 0,
        alunosAtivos: 0,
        propinaPagas: 0,
        propinaPagasAnterior: 0,
        propinaPendentes: 0,
        propinaPendentesAnterior: 0,
        propinaPagasCount: 0,
        propinaPagasCountAnterior: 0,
        propinaPendentesCount: 0,
        propinaPendentesCountAnterior: 0,
        frequencias: 0,
        frequenciasP: 0,
        aulasMinistradas: 0,
        aulasMinistradasP: 0
      };
    }

    // Calcular mês atual e anterior
    const mesAtualIndex = mes_actual; // 0-11
    const mesAnteriorIndex = mes_actual - 1 < 0 ? 11 : mes_actual - 1;
    
    const mesAtual = mapaMeses[Object.keys(mapaMeses)[mesAtualIndex]];
    const mesAnterior = mapaMeses[Object.keys(mapaMeses)[mesAnteriorIndex]];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const previousMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const previousMonth = previousMonthDate.getMonth();
    const previousMonthYear = previousMonthDate.getFullYear();

    const [aulasAll, alunosAll, frequenciasAll, instituicaoAtual] = await Promise.all([
      db.aulas.toArray(),
      db.alunos.toArray(),
      db.frequencias.toArray(),
      activeInstituicaoId ? db.instituicao.get(activeInstituicaoId) : Promise.resolve(undefined)
    ]);

    const aulasInstituicao = aulasAll.filter(
      (aula) => !aula.deleted && aula.instituicao_id === activeInstituicaoId
    );

    const aulasMesAtual = aulasInstituicao.filter((aula) => {
      const dataAula = new Date(aula.data_aula);
      return dataAula.getMonth() === currentMonth && dataAula.getFullYear() === currentYear;
    }).length;

    const aulasMesAnterior = aulasInstituicao.filter((aula) => {
      const dataAula = new Date(aula.data_aula);
      return dataAula.getMonth() === previousMonth && dataAula.getFullYear() === previousMonthYear;
    }).length;

    const alunosInstituicao = alunosAll.filter(
      (aluno) => !aluno.deleted && aluno.instituicao_id === activeInstituicaoId
    );

    const alunosAtivosCount = alunosInstituicao.filter((aluno) => aluno.estado === 'ativo').length;

    const aulaIdsInstituicao = new Set(aulasInstituicao.map((aula) => aula.id));
    const frequenciasInstituicao = frequenciasAll.filter(
      (frequencia) => !frequencia.deleted && aulaIdsInstituicao.has(frequencia.aula_id)
    );

    const frequenciasMesAtual = frequenciasInstituicao.filter((frequencia) => {
      const data = new Date(frequencia.data_aula);
      return data.getMonth() === currentMonth && data.getFullYear() === currentYear;
    });

    const frequenciasMesAnterior = frequenciasInstituicao.filter((frequencia) => {
      const data = new Date(frequencia.data_aula);
      return data.getMonth() === previousMonth && data.getFullYear() === previousMonthYear;
    });

    const [totalAlunosPromise, alunosAnteriorPromise, propinaPromiseComparativo] = await Promise.all([
      this.get_alunos_ano_lectivo_actual(),
      this.alunos_ano_lectivo_anterior(),
      this.obterComparativoPropinas(
        mesAtual,
        mesAnterior,
        instituicaoAtual?.ano_lectivo || '2025-2026'
      )
    ]);

    // Desestruturação com tipos
   const totalAlunos: number = totalAlunosPromise || 0;
    const totalAlunosAnterior: number = alunosAnteriorPromise || 0;
  

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
    let frequenciaMediaP: number = 0;
    if (frequenciasMesAtual.length > 0) {
      const totalPresentes: number = frequenciasMesAtual.filter(f => f.presente).length;
      frequenciaMedia = (totalPresentes / frequenciasMesAtual.length) * 100;
    }
    if (frequenciasMesAnterior.length > 0) {
      const totalPresentesP: number = frequenciasMesAnterior.filter(f => f.presente).length;
      frequenciaMediaP = (totalPresentesP / frequenciasMesAnterior.length) * 100;
    }

  

    // ✅ Criar objeto de estatísticas com tipos
    const stats: DashboardStats = {
      totalAlunos,
      totalAlunosAnterior,
      alunosAtivos: alunosAtivosCount || 0,
      
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
      frequencias: parseFloat(frequenciaMedia.toFixed(1)),
      frequenciasP: parseFloat(frequenciaMediaP.toFixed(1)),

      aulasMinistradas:aulasMesAtual,
      aulasMinistradasP:aulasMesAnterior
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
      const activeInstituicaoId = instituicaoIdValue() || '';
      if (!activeInstituicaoId) return [];
      const { data, error } = await supabase
        .rpc('get_alunos_por_mes', { p_instituicao_id: activeInstituicaoId });
      
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
      const activeInstituicaoId = instituicaoIdValue() || '';
      if (!activeInstituicaoId) return 0;
      const { count, error } = await supabase
        .from('propina')
        .select('id', { count: 'exact', head: true })
        .eq('instituicao_id', activeInstituicaoId)
        .eq('estado', estado);
      
      if (error) throw error;
      
      return count || 0;
    } catch (error) {
      console.error(`❌ Erro ao buscar propinas ${estado}:`, error);
      return 0;
    }
  }

  ,async get_alunos_ano_lectivo_actual(){
     const activeInstituicaoId = instituicaoIdValue() || '';
     if (!activeInstituicaoId) return 0;
     const alunos= await db.alunos.toArray() 
     const instituicao = activeInstituicaoId ? await db.instituicao.get(activeInstituicaoId) : undefined;
     const totalAlunos=alunos.filter((aluno)=>
      !aluno.deleted &&
      aluno.ano_lectivo==instituicao?.ano_lectivo &&
      aluno.instituicao_id === activeInstituicaoId
     )
     return totalAlunos.length
  },


async alunos_ano_lectivo_anterior(){
    const activeInstituicaoId = instituicaoIdValue() || '';
    if (!activeInstituicaoId) return 0;
    const alunos = await db.alunos.toArray();
    const instituicao = activeInstituicaoId ? await db.instituicao.get(activeInstituicaoId) : undefined;
    
    const anoAnterior = obterAnoLetivoAnterior(instituicao?.ano_lectivo || '');
    
    const totalAlunos = alunos.filter((aluno) => 
        !aluno.deleted && 
        aluno.ano_lectivo == anoAnterior &&
        aluno.instituicao_id === activeInstituicaoId
    );
    
    return totalAlunos.length;
},

async  obterComparativoPropinas(
  p_mes_atual: string,
  p_mes_anterior: string,
  p_ano_lectivo: string
): Promise<ComparativoPropinasMensal> {
  const activeInstituicaoId = instituicaoIdValue() || '';
  if (!activeInstituicaoId) {
    return {
      mes_atual: { pagas: { count: 0, valor: 0 }, pendentes: { count: 0, valor: 0 } },
      mes_anterior: { pagas: { count: 0, valor: 0 }, pendentes: { count: 0, valor: 0 } }
    };
  }
  const alunosPermitidos = await db.alunos
    .toArray()
    .then((alunos) =>
      alunos
        .filter((aluno) => !aluno.deleted && aluno.instituicao_id === activeInstituicaoId)
        .map((aluno) => aluno.id)
    );
  const alunosPermitidosSet = new Set(alunosPermitidos);

  // Resumo do MÊS ATUAL
  const propinasAtual = await db.propina
    .where('mes_referencia')
    .equals(p_mes_atual)
    .and(
      (propina) =>
        propina.instituicao_id === activeInstituicaoId &&
        propina.ano_lectivo === p_ano_lectivo &&
        alunosPermitidosSet.has(propina.aluno_id)
    )
    .toArray();

  // Resumo do MÊS ANTERIOR
  const propinasAnterior = await db.propina
    .where('mes_referencia')
    .equals(p_mes_anterior)
    .and(
      (propina) =>
        propina.instituicao_id === activeInstituicaoId &&
        propina.ano_lectivo === p_ano_lectivo &&
        alunosPermitidosSet.has(propina.aluno_id)
    )
    .toArray();

  // Função auxiliar para calcular estatísticas
  const calcularEstatisticas = (propinas: any[]) => {
    if (!propinas || propinas.length === 0) {
      return {
        pagas: { count: 0, valor: 0 },
        pendentes: { count: 0, valor: 0 }
      };
    }

    const estatisticas = propinas.reduce((acc, propina) => {
      if (propina.estado === 'pago') {
        acc.pagas.count += 1;
        acc.pagas.valor += propina.valor_pago || 0;
      } else if (propina.estado === 'pendente') {
        acc.pendentes.count += 1;
        acc.pendentes.valor += propina.valor_falta || 0;
      }
      return acc;
    }, {
      pagas: { count: 0, valor: 0 },
      pendentes: { count: 0, valor: 0 }
    });

    return estatisticas;
  };

  // Retornar comparativo
  return {
    mes_atual: calcularEstatisticas(propinasAtual),
    mes_anterior: calcularEstatisticas(propinasAnterior)
  };
}
};

function obterAnoLetivoAnterior(anoAtual:string) {
    const [inicio, fim] = anoAtual.split('-').map(Number);
    return `${inicio - 1}-${fim - 1}`;
}

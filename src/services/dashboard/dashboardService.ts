// services/dashboard/dashboardService
import db, { supabase } from '../database/db';
import { instituicaoIdValue } from '../../utils/getInsitituicaoID';
import { configService } from '../database/config';
import { financeRulesService } from '../finance/financeRulesService';
import {
  DashboardStats,
  FluxoCaixa,
  InadimplenciaTurma,
  MetaKPI,
  NotaDisciplina,
  ProximoEvento,
  TopAluno
} from '../../types';
import { ComparativoPropinasMensal } from '../../types/propina';

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DASHBOARD_CACHE_TTL_MS = 60_000;

let dashboardStatsCache: {
  instituicaoId: string;
  createdAt: number;
  data: DashboardStats;
} | null = null;

function toPercent(valor: number, total: number): number {
  if (!total) return 0;
  return Number(((valor / total) * 100).toFixed(1));
}

function isDateInMonthYear(data: string | undefined, month: number, year: number): boolean {
  if (!data) return false;
  const date = new Date(data);
  if (Number.isNaN(date.getTime())) return false;
  return date.getMonth() === month && date.getFullYear() === year;
}

function soma<T>(itens: T[], fn: (item: T) => number): number {
  return itens.reduce((acc, item) => acc + fn(item), 0);
}

function obterAnoLetivoAnterior(anoAtual: string): string {
  const [inicio, fim] = anoAtual.split('-').map(Number);
  if (Number.isNaN(inicio) || Number.isNaN(fim)) return '';
  return `${inicio - 1}-${fim - 1}`;
}

function paraTipoEventoDashboard(tipo?: string): ProximoEvento['tipo'] {
  if (tipo === 'academic' || tipo === 'event') return 'evento';
  if (tipo === 'meeting') return 'meta';
  return 'tarefa';
}

function parseHoraParaMinutos(hora?: string): number {
  if (!hora || !hora.includes(':')) return 0;
  const [h, m] = hora.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

function criarStatsVazio(): DashboardStats {
  return {
    anoLectivoAtual: '',
    anoLectivoAnterior: '',
    alunosAnoAtual: 0,
    alunosAguardandoAtivacao: 0,
    turmasAnoAtual: 0,
    cursosAtivos: 0,
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
    aulasMinistradasP: 0,
    saldoAtual: 0,
    saldoAnterior: 0,
    totalDespesas: 0,
    despesasAnterior: 0,
    despesasPendentes: 0,
    receitaPrevista: 0,
    inadimplencia: 0,
    inadimplenciaAnterior: 0,
    ticketMedio: 0,
    ticketMedioAnterior: 0,
    fluxoCaixa: [],
    inadimplenciaPorTurma: [],
    aprovacaoGeral: 0,
    aprovacaoAnterior: 0,
    reprovacaoGeral: 0,
    recuperacaoGeral: 0,
    notasMedias: [],
    topAlunos: [],
    alunosRisco: 0,
    alunosRiscoAnterior: 0,
    turmasAtivas: 0,
    turmasLotadas: 0,
    professoresAtivos: 0,
    cargaHorariaTotal: 0,
    aulasCanceladas: 0,
    aulasCanceladasAnterior: 0,
    ocupacaoMedia: 0,
    ocupacaoAnterior: 0,
    metasAlcancadas: 0,
    metasTotal: 0,
    tarefasAtrasadas: 0,
    proximosEventos: [],
    indicadoresChave: []
  };
}

export const dashboardService = {
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const activeInstituicaoId = instituicaoIdValue() || '';
      if (!activeInstituicaoId) return criarStatsVazio();

      const nowMs = Date.now();
      if (
        dashboardStatsCache &&
        dashboardStatsCache.instituicaoId === activeInstituicaoId &&
        nowMs - dashboardStatsCache.createdAt < DASHBOARD_CACHE_TTL_MS
      ) {
        return dashboardStatsCache.data;
      }

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const previousMonthDate = new Date(currentYear, currentMonth - 1, 1);
      const previousMonth = previousMonthDate.getMonth();
      const previousMonthYear = previousMonthDate.getFullYear();

      const [
        aulasAll,
        alunosAll,
        cursosAll,
        frequenciasAll,
        instituicaoAtual,
        transacoesAll,
        turmasAll,
        avaliacoesAll,
        metasAll,
        tarefasAll,
        eventosAll,
        propinasAll
      ] = await Promise.all([
        db.aulas.toArray(),
        db.alunos.toArray(),
        db.cursos.toArray(),
        db.frequencias.toArray(),
        db.instituicao.get(activeInstituicaoId),
        db.transacoes.toArray(),
        db.turmas.toArray(),
        db.avaliacoes.toArray(),
        db.metas.toArray(),
        db.tarefas.toArray(),
        db.evento.toArray(),
        db.propina.toArray()
      ]);

      const anoLectivoAtual = instituicaoAtual?.ano_lectivo || '';
      const anoLectivoAnterior = obterAnoLetivoAnterior(anoLectivoAtual);

      const aulasInstituicao = aulasAll.filter(
        (aula) => !aula.deleted && aula.instituicao_id === activeInstituicaoId
      );
      const alunosInstituicao = alunosAll.filter(
        (aluno) => !aluno.deleted && aluno.instituicao_id === activeInstituicaoId
      );
      const alunosAtivosInstituicao = alunosInstituicao.filter((aluno) => aluno.estado === 'ativo');
      const alunosAtivosIdsSet = new Set(alunosAtivosInstituicao.map((aluno) => aluno.id));
      const turmasInstituicao = turmasAll.filter(
        (turma) => !turma.deleted && turma.instituicao_id === activeInstituicaoId
      );
      const cursosInstituicao = cursosAll.filter(
        (curso) => !curso.deleted && curso.instituicao_id === activeInstituicaoId
      );
      const transacoesInstituicao = transacoesAll.filter(
        (transacao) => !transacao.deleted && transacao.instituicao_id === activeInstituicaoId
      );
      const avaliacoesInstituicao = avaliacoesAll.filter(
        (avaliacao) => !avaliacao.deleted && avaliacao.instituicao_id === activeInstituicaoId
      );
      const avaliacoesAtivosInstituicao = avaliacoesInstituicao.filter((avaliacao) =>
        alunosAtivosIdsSet.has(avaliacao.aluno_id)
      );
      const metasInstituicao = metasAll.filter(
        (meta) => !meta.deleted && meta.instituicao_id === activeInstituicaoId
      );
      const tarefasInstituicao = tarefasAll.filter(
        (tarefa) => !tarefa.deleted && tarefa.instituicao_id === activeInstituicaoId
      );
      const propinasInstituicao = propinasAll.filter(
        (propina) =>
          !propina.deleted &&
          propina.instituicao_id === activeInstituicaoId &&
          alunosAtivosIdsSet.has(propina.aluno_id)
      );
      const eventosInstituicao = eventosAll.filter((evento) => {
        const instituicaoEvento = (evento as { instituicao_id?: string }).instituicao_id;
        return !evento.deleted && (!instituicaoEvento || instituicaoEvento === activeInstituicaoId);
      });

      const aulasMesAtual = aulasInstituicao.filter((aula) => isDateInMonthYear(aula.data_aula, currentMonth, currentYear));
      const aulasMesAnterior = aulasInstituicao.filter((aula) => isDateInMonthYear(aula.data_aula, previousMonth, previousMonthYear));
      const aulasMinistradas = aulasMesAtual.filter((aula) => aula.status === 'ministrada').length;
      const aulasMinistradasP = aulasMesAnterior.filter((aula) => aula.status === 'ministrada').length;

      const percentualCanceladasAtual = toPercent(
        aulasMesAtual.filter((aula) => aula.status === 'cancelada').length,
        aulasMesAtual.length
      );
      const percentualCanceladasAnterior = toPercent(
        aulasMesAnterior.filter((aula) => aula.status === 'cancelada').length,
        aulasMesAnterior.length
      );

      const aulaIdsInstituicao = new Set(aulasInstituicao.map((aula) => aula.id));
      const frequenciasInstituicao = frequenciasAll.filter(
        (frequencia) => !frequencia.deleted && aulaIdsInstituicao.has(frequencia.aula_id)
      );
      const frequenciasAtivosInstituicao = frequenciasInstituicao.filter((frequencia) =>
        alunosAtivosIdsSet.has(frequencia.aluno_id)
      );
      const frequenciasMesAtual = frequenciasInstituicao.filter((frequencia) =>
        isDateInMonthYear(frequencia.data_aula, currentMonth, currentYear)
      );
      const frequenciasMesAnterior = frequenciasInstituicao.filter((frequencia) =>
        isDateInMonthYear(frequencia.data_aula, previousMonth, previousMonthYear)
      );

      const frequencias = toPercent(
        frequenciasMesAtual.filter((f) => f.presente).length,
        frequenciasMesAtual.length
      );
      const frequenciasP = toPercent(
        frequenciasMesAnterior.filter((f) => f.presente).length,
        frequenciasMesAnterior.length
      );

      const [paymentConfig] = await Promise.all([configService.getPaymentConfig()]);

      const totalAlunos = alunosInstituicao.filter(
        (aluno) => aluno.ano_lectivo === anoLectivoAtual
      ).length;
      const totalAlunosAnterior = alunosInstituicao.filter(
        (aluno) => aluno.ano_lectivo === anoLectivoAnterior
      ).length;
      const alunosAguardandoAtivacao = alunosInstituicao.filter(
        (aluno) =>
          aluno.tipo_matricula === 'regular' &&
          aluno.estado === 'inativo' &&
          aluno.ano_lectivo !== anoLectivoAtual
      ).length;
      const turmasAnoAtual = turmasInstituicao.filter(
        (turma) => turma.estado === 'ativa' && turma.ano_lectivo === anoLectivoAtual
      ).length;
      const cursosAtivos = cursosInstituicao.filter((curso) => curso.ativo).length;

      const mesesBase = (paymentConfig.mesesPagamento || []).map((mes: string) =>
        financeRulesService.toMonthAbbr(mes)
      );
      const dueDay = Number(paymentConfig.diaVencimento || 0);
      const paidMonthsMap = financeRulesService.buildPaidMonthsMap(propinasInstituicao);

      const calcularResumoMensal = (targetMonth: string, referenceDate: Date) => {
        const estudantesElegiveis = alunosAtivosInstituicao.filter((aluno) =>
          financeRulesService
            .getBillingMonthsForStudent(aluno as any, mesesBase, turmasInstituicao as any, cursosInstituicao as any, {
              paidMonths: paidMonthsMap[aluno.id] || []
            })
            .includes(targetMonth)
        );
        const elegiveisIds = new Set(estudantesElegiveis.map((aluno) => aluno.id));

        const propinasMes = propinasInstituicao.filter(
          (propina) => propina.mes_referencia === targetMonth && elegiveisIds.has(propina.aluno_id)
        );
        const propinaPorAluno = new Map<string, (typeof propinasMes)[number]>();
        propinasMes.forEach((propina) => {
          const atual = propinaPorAluno.get(propina.aluno_id);
          const atualTs = new Date(atual?.updated_at || atual?.created_at || 0).getTime();
          const propTs = new Date(propina.updated_at || propina.created_at || 0).getTime();
          if (!atual || propTs >= atualTs) {
            propinaPorAluno.set(propina.aluno_id, propina);
          }
        });

        let pagasCount = 0;
        let pagasValor = 0;
        let pendentesCount = 0;
        let pendentesValor = 0;
        const inadimplentesIds = new Set<string>();

        const diaAtual = referenceDate.getDate();
        const cobrarMes = dueDay <= 0 || diaAtual >= dueDay;

        estudantesElegiveis.forEach((aluno) => {
          const propina = propinaPorAluno.get(aluno.id);
          const paidSet = new Set((paidMonthsMap[aluno.id] || []).map((mes) => financeRulesService.toMonthAbbr(mes)));
          const pagoNoMes = paidSet.has(targetMonth) || Boolean(
            propina && (propina.estado === 'pago' || (Number(propina.valor_falta || 0) <= 0 && Number(propina.valor_pago || 0) > 0))
          );

          if (pagoNoMes) {
            pagasCount += 1;
            pagasValor += Number(propina?.valor_pago || aluno.propina || 0);
            return;
          }

          if (!cobrarMes) return;

          inadimplentesIds.add(aluno.id);

          // Dívida financeira considera apenas saldo em aberto já registrado em propina.
          if (!propina) return;

          const falta = Number(propina.valor_falta || 0);
          if (falta > 0) {
            pendentesCount += 1;
            pendentesValor += falta;
          }
        });

        return {
          pagas: { count: pagasCount, valor: pagasValor },
          pendentes: { count: pendentesCount, valor: pendentesValor },
          inadimplentesIds
        };
      };

      const resumoAtual = calcularResumoMensal(
        MESES_CURTOS[currentMonth],
        now
      );
      const resumoAnterior = calcularResumoMensal(
        MESES_CURTOS[previousMonth],
        new Date(previousMonthYear, previousMonth + 1, 0)
      );

      const propinaPagas = resumoAtual.pagas.valor;
      const propinaPagasAnterior = resumoAnterior.pagas.valor;
      const propinaPendentes = resumoAtual.pendentes.valor;
      const propinaPendentesAnterior = resumoAnterior.pendentes.valor;

      const alunosAtivos = alunosAtivosInstituicao.length;
      const totalAlunosAtivosAnterior = alunosAll.filter(
        (aluno) =>
          !aluno.deleted &&
          aluno.instituicao_id === activeInstituicaoId &&
          aluno.ano_lectivo === anoLectivoAnterior &&
          aluno.estado === 'ativo'
      ).length;

      const transacoesMesAtual = transacoesInstituicao.filter((t) =>
        isDateInMonthYear(t.data, currentMonth, currentYear)
      );
      const transacoesMesAnterior = transacoesInstituicao.filter((t) =>
        isDateInMonthYear(t.data, previousMonth, previousMonthYear)
      );

      const entradasMesAtual = soma(transacoesMesAtual.filter((t) => t.tipo === 'entrada'), (t) => t.valor || 0);
      const saidasMesAtual = soma(transacoesMesAtual.filter((t) => t.tipo === 'saida'), (t) => t.valor || 0);
      const entradasMesAnterior = soma(transacoesMesAnterior.filter((t) => t.tipo === 'entrada'), (t) => t.valor || 0);
      const saidasMesAnterior = soma(transacoesMesAnterior.filter((t) => t.tipo === 'saida'), (t) => t.valor || 0);

      const saldoAtual = entradasMesAtual - saidasMesAtual;
      const saldoAnterior = entradasMesAnterior - saidasMesAnterior;

      const fluxoCaixa: FluxoCaixa[] = Array.from({ length: 6 }, (_, index) => {
        const monthDate = new Date(currentYear, currentMonth - (5 - index), 1);
        const mes = monthDate.getMonth();
        const ano = monthDate.getFullYear();
        const transacoesMes = transacoesInstituicao.filter((t) => isDateInMonthYear(t.data, mes, ano));
        const entradas = soma(transacoesMes.filter((t) => t.tipo === 'entrada'), (t) => t.valor || 0);
        const saidas = soma(transacoesMes.filter((t) => t.tipo === 'saida'), (t) => t.valor || 0);

        return {
          mes: MESES_CURTOS[mes],
          entradas,
          saidas,
          saldo: entradas - saidas
        };
      });

      const inadimplentesAtuaisSet = resumoAtual.inadimplentesIds;
      const inadimplentesAnteriorSet = resumoAnterior.inadimplentesIds;

      const inadimplencia = toPercent(inadimplentesAtuaisSet.size, alunosAtivos || 1);
      const inadimplenciaAnterior = toPercent(inadimplentesAnteriorSet.size, totalAlunosAtivosAnterior || 1);

      const ticketMedio = resumoAtual.pagas.count
        ? Number((propinaPagas / resumoAtual.pagas.count).toFixed(2))
        : 0;
      const ticketMedioAnterior = resumoAnterior.pagas.count
        ? Number((propinaPagasAnterior / resumoAnterior.pagas.count).toFixed(2))
        : 0;

      const alunosPorTurma = alunosAtivosInstituicao.reduce<Record<string, number>>((acc, aluno) => {
        acc[aluno.turma_id] = (acc[aluno.turma_id] || 0) + 1;
        return acc;
      }, {});

      const alunosPorTurmaAnterior = alunosAtivosInstituicao
        .filter((aluno) => aluno.ano_lectivo === anoLectivoAnterior)
        .reduce<Record<string, number>>((acc, aluno) => {
          acc[aluno.turma_id] = (acc[aluno.turma_id] || 0) + 1;
          return acc;
        }, {});

      const alunosPorId = new Map(alunosAtivosInstituicao.map((aluno) => [aluno.id, aluno]));

      const inadimplenciaPorTurma: InadimplenciaTurma[] = turmasInstituicao.map((turma) => {
        const totalAlunosTurma = alunosPorTurma[turma.id] || 0;
        const inadimplentes = alunosAtivosInstituicao.filter(
          (aluno) => aluno.turma_id === turma.id && inadimplentesAtuaisSet.has(aluno.id)
        ).length;

        return {
          turma: turma.nome_turma,
          abreviacao:turma.nome_turma.split(" ").map(s=> s.charAt(0).toLocaleUpperCase()).toString().replace(",",""),
          totalAlunos: totalAlunosTurma,
          inadimplentes,
          percentual: toPercent(inadimplentes, totalAlunosTurma)
        };
      });

      const avaliacoesAtual = avaliacoesAtivosInstituicao.filter((a) =>
        isDateInMonthYear(a.data_avaliacao, currentMonth, currentYear)
      );
      const avaliacoesAnterior = avaliacoesAtivosInstituicao.filter((a) =>
        isDateInMonthYear(a.data_avaliacao, previousMonth, previousMonthYear)
      );
      const avaliacoesBase = avaliacoesAtual.length > 0 ? avaliacoesAtual : avaliacoesAtivosInstituicao;

      const aprovacaoGeral = toPercent(avaliacoesBase.filter((a) => a.nota >= 10).length, avaliacoesBase.length);
      const aprovacaoAnterior = toPercent(avaliacoesAnterior.filter((a) => a.nota >= 10).length, avaliacoesAnterior.length);
      const reprovacaoGeral = toPercent(avaliacoesBase.filter((a) => a.nota < 10).length, avaliacoesBase.length);
      const recuperacaoGeral = toPercent(
        avaliacoesBase.filter((a) => a.nota >= 10 && a.nota < 14).length,
        avaliacoesBase.length
      );

      const disciplinaStats = avaliacoesBase.reduce<Record<string, { total: number; soma: number }>>((acc, avaliacao) => {
        if (!acc[avaliacao.disciplina]) acc[avaliacao.disciplina] = { total: 0, soma: 0 };
        acc[avaliacao.disciplina].total += 1;
        acc[avaliacao.disciplina].soma += avaliacao.nota || 0;
        return acc;
      }, {});

      const notasMedias: NotaDisciplina[] = Object.entries(disciplinaStats).map(([disciplina, valor]) => ({
        disciplina,
        media: Number((valor.soma / valor.total).toFixed(1)),
        totalAvaliacoes: valor.total
      }));

      const presencaPorAluno = frequenciasAtivosInstituicao.reduce<Record<string, { total: number; presentes: number }>>((acc, reg) => {
        if (!acc[reg.aluno_id]) acc[reg.aluno_id] = { total: 0, presentes: 0 };
        acc[reg.aluno_id].total += 1;
        if (reg.presente) acc[reg.aluno_id].presentes += 1;
        return acc;
      }, {});

      const avaliacaoMediaPorAluno = avaliacoesBase.reduce<Record<string, { total: number; soma: number }>>((acc, avaliacao) => {
        if (!acc[avaliacao.aluno_id]) acc[avaliacao.aluno_id] = { total: 0, soma: 0 };
        acc[avaliacao.aluno_id].total += 1;
        acc[avaliacao.aluno_id].soma += avaliacao.nota || 0;
        return acc;
      }, {});

      const mediasAlunos = Object.entries(avaliacaoMediaPorAluno).map(([alunoId, dados]) => {
        const media = dados.total ? dados.soma / dados.total : 0;
        const presencaData = presencaPorAluno[alunoId];
        const presenca = presencaData ? toPercent(presencaData.presentes, presencaData.total) : 0;
        const aluno = alunosPorId.get(alunoId);
        const turma = turmasInstituicao.find((t) => t.id === aluno?.turma_id);

        return {
          id: alunoId,
          nome: aluno?.nome_completo || 'Aluno',
          media,
          turma: turma?.nome_turma || 'Sem turma',
          presenca
        };
      });

      const topAlunos: TopAluno[] = mediasAlunos
        .sort((a, b) => b.media - a.media)
        .slice(0, 8)
        .map((aluno) => ({
          ...aluno,
          media: Number(aluno.media.toFixed(1))
        }));

      const alunosRisco = mediasAlunos.filter((a) => a.media < 10 || a.presenca < 70).length;

      const mediasAlunosAnterior = avaliacoesAnterior.reduce<Record<string, { total: number; soma: number }>>((acc, avaliacao) => {
        if (!acc[avaliacao.aluno_id]) acc[avaliacao.aluno_id] = { total: 0, soma: 0 };
        acc[avaliacao.aluno_id].total += 1;
        acc[avaliacao.aluno_id].soma += avaliacao.nota || 0;
        return acc;
      }, {});

      const frequenciaPorAlunoAnterior = frequenciasMesAnterior
        .filter((reg) => alunosAtivosIdsSet.has(reg.aluno_id))
        .reduce<Record<string, { total: number; presentes: number }>>((acc, reg) => {
        if (!acc[reg.aluno_id]) acc[reg.aluno_id] = { total: 0, presentes: 0 };
        acc[reg.aluno_id].total += 1;
        if (reg.presente) acc[reg.aluno_id].presentes += 1;
        return acc;
      }, {});

      const alunosRiscoAnterior = Object.entries(mediasAlunosAnterior).filter(([alunoId, dados]) => {
        const media = dados.total ? dados.soma / dados.total : 0;
        const freq = frequenciaPorAlunoAnterior[alunoId];
        const presenca = freq ? toPercent(freq.presentes, freq.total) : 0;
        return media < 10 || presenca < 70;
      }).length;

      const turmasAtivas = turmasInstituicao.filter((turma) => turma.estado === 'ativa').length;
      const turmasLotadas = turmasInstituicao.filter((turma) => {
        const capacidade = turma.capacidade_maxima || 0;
        if (!capacidade) return false;
        return (alunosPorTurma[turma.id] || 0) / capacidade >= 0.9;
      }).length;

      const professoresAtivos = new Set(
        turmasInstituicao.filter((turma) => turma.estado === 'ativa' && turma.professor).map((turma) => turma.professor)
      ).size;

      const cargaHorariaTotal = Number(
        (
          aulasMesAtual.reduce((acc, aula) => {
            const inicio = parseHoraParaMinutos(aula.hora_inicio);
            const fim = parseHoraParaMinutos(aula.hora_fim);
            const duracao = fim > inicio ? (fim - inicio) / 60 : 0;
            return acc + duracao;
          }, 0)
        ).toFixed(1)
      );

      const ocupacaoMedia = Number(
        (
          turmasInstituicao.reduce((acc, turma) => {
            const capacidade = turma.capacidade_maxima || 0;
            if (!capacidade) return acc;
            return acc + ((alunosPorTurma[turma.id] || 0) / capacidade) * 100;
          }, 0) / (turmasInstituicao.length || 1)
        ).toFixed(1)
      );

      const ocupacaoAnterior = Number(
        (
          turmasInstituicao.reduce((acc, turma) => {
            const capacidade = turma.capacidade_maxima || 0;
            if (!capacidade) return acc;
            return acc + ((alunosPorTurmaAnterior[turma.id] || 0) / capacidade) * 100;
          }, 0) / (turmasInstituicao.length || 1)
        ).toFixed(1)
      );

      const metasTotal = metasInstituicao.length;
      const metasAlcancadas = metasInstituicao.filter((meta) => meta.status === 'concluida').length;

      const tarefasAtrasadas = tarefasInstituicao.filter((tarefa) => {
        if (tarefa.status === 'atrasada') return true;
        if (tarefa.concluida) return false;
        if (!tarefa.data_limite) return false;
        return new Date(tarefa.data_limite) < now;
      }).length;

      const proximosEventos: ProximoEvento[] = eventosInstituicao
        .map((evento) => ({
          id: evento.id,
          titulo: evento.title,
          data: evento.date,
          tipo: paraTipoEventoDashboard(evento.type),
          descricao: evento.description
        }))
        .filter((evento) => new Date(evento.data) >= now)
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
        .slice(0, 6);

      const indicadoresChave: MetaKPI[] = [
        {
          nome: 'Aprovação',
          valor: aprovacaoGeral,
          meta: 75,
          unidade: '%',
          cor: aprovacaoGeral >= 75 ? 'green' : aprovacaoGeral >= 60 ? 'yellow' : 'red'
        },
        {
          nome: 'Frequência',
          valor: frequencias,
          meta: 85,
          unidade: '%',
          cor: frequencias >= 85 ? 'green' : frequencias >= 75 ? 'yellow' : 'red'
        },
        {
          nome: 'Inadimplência',
          valor: inadimplencia,
          meta: 10,
          unidade: '%',
          cor: inadimplencia <= 10 ? 'green' : inadimplencia <= 20 ? 'yellow' : 'red'
        },
        {
          nome: 'Execução Metas',
          valor: metasTotal ? Number(((metasAlcancadas / metasTotal) * 100).toFixed(1)) : 0,
          meta: 100,
          unidade: '%',
          cor: metasTotal > 0 && metasAlcancadas === metasTotal ? 'green' : 'blue'
        }
      ];

      const result: DashboardStats = {
        anoLectivoAtual,
        anoLectivoAnterior,
        alunosAnoAtual: totalAlunos,
        alunosAguardandoAtivacao,
        turmasAnoAtual,
        cursosAtivos,
        totalAlunos,
        totalAlunosAnterior,
        alunosAtivos,
        propinaPagas,
        propinaPagasAnterior,
        propinaPendentes,
        propinaPendentesAnterior,
        propinaPagasCount: resumoAtual.pagas.count,
        propinaPagasCountAnterior: resumoAnterior.pagas.count,
        propinaPendentesCount: resumoAtual.pendentes.count,
        propinaPendentesCountAnterior: resumoAnterior.pendentes.count,
        frequencias,
        frequenciasP,
        aulasMinistradas,
        aulasMinistradasP,
        saldoAtual,
        saldoAnterior,
        totalDespesas: saidasMesAtual,
        despesasAnterior: saidasMesAnterior,
        despesasPendentes: 0,
        receitaPrevista: propinaPagas + propinaPendentes,
        inadimplencia,
        inadimplenciaAnterior,
        ticketMedio,
        ticketMedioAnterior,
        fluxoCaixa,
        inadimplenciaPorTurma,
        aprovacaoGeral,
        aprovacaoAnterior,
        reprovacaoGeral,
        recuperacaoGeral,
        notasMedias,
        topAlunos,
        alunosRisco,
        alunosRiscoAnterior,
        turmasAtivas,
        turmasLotadas,
        professoresAtivos,
        cargaHorariaTotal,
        aulasCanceladas: percentualCanceladasAtual,
        aulasCanceladasAnterior: percentualCanceladasAnterior,
        ocupacaoMedia,
        ocupacaoAnterior,
        metasAlcancadas,
        metasTotal,
        tarefasAtrasadas,
        proximosEventos,
        indicadoresChave
      };

      dashboardStatsCache = {
        instituicaoId: activeInstituicaoId,
        createdAt: nowMs,
        data: result
      };

      return result;
    } catch (error: unknown) {
      console.error('❌ Erro ao buscar estatísticas do dashboard:', error);
      throw error;
    }
  },

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
  },

  async get_alunos_ano_lectivo_actual() {
    const activeInstituicaoId = instituicaoIdValue() || '';
    if (!activeInstituicaoId) return 0;

    const [alunos, instituicao] = await Promise.all([
      db.alunos.toArray(),
      db.instituicao.get(activeInstituicaoId)
    ]);

    return alunos.filter(
      (aluno) =>
        !aluno.deleted &&
        aluno.ano_lectivo === instituicao?.ano_lectivo &&
        aluno.instituicao_id === activeInstituicaoId
    ).length;
  },

  async alunos_ano_lectivo_anterior() {
    const activeInstituicaoId = instituicaoIdValue() || '';
    if (!activeInstituicaoId) return 0;

    const [alunos, instituicao] = await Promise.all([
      db.alunos.toArray(),
      db.instituicao.get(activeInstituicaoId)
    ]);

    const anoAnterior = obterAnoLetivoAnterior(instituicao?.ano_lectivo || '');

    return alunos.filter(
      (aluno) =>
        !aluno.deleted &&
        aluno.ano_lectivo === anoAnterior &&
        aluno.instituicao_id === activeInstituicaoId
    ).length;
  },

  async obterComparativoPropinas(
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
          .filter(
            (aluno) =>
              !aluno.deleted &&
              aluno.instituicao_id === activeInstituicaoId &&
              aluno.estado === 'ativo'
          )
          .map((aluno) => aluno.id)
      );
    const alunosPermitidosSet = new Set(alunosPermitidos);

    const propinasAtual = await db.propina
      .where('mes_referencia')
      .equals(p_mes_atual as any)
      .and(
        (propina) =>
          !propina.deleted &&
          propina.instituicao_id === activeInstituicaoId &&
          propina.ano_lectivo === p_ano_lectivo &&
          alunosPermitidosSet.has(propina.aluno_id)
      )
      .toArray();

    const propinasAnterior = await db.propina
      .where('mes_referencia')
      .equals(p_mes_anterior as any)
      .and(
        (propina) =>
          !propina.deleted &&
          propina.instituicao_id === activeInstituicaoId &&
          propina.ano_lectivo === p_ano_lectivo &&
          alunosPermitidosSet.has(propina.aluno_id)
      )
      .toArray();

    const calcularEstatisticas = (propinas: typeof propinasAtual) => {
      return propinas.reduce(
        (acc, propina) => {
          if (propina.estado === 'pago') {
            acc.pagas.count += 1;
            acc.pagas.valor += propina.valor_pago || 0;
          } else if (propina.estado === 'pendente' || propina.estado === 'atrasado') {
            acc.pendentes.count += 1;
            acc.pendentes.valor += propina.valor_falta || 0;
          }
          return acc;
        },
        {
          pagas: { count: 0, valor: 0 },
          pendentes: { count: 0, valor: 0 }
        }
      );
    };

    return {
      mes_atual: calcularEstatisticas(propinasAtual),
      mes_anterior: calcularEstatisticas(propinasAnterior)
    };
  }
};

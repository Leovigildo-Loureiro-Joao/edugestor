import db from '../database/db';
import { configService } from '../database/config';
import { instituicaoIdValue } from '../../utils/getInstituicaoID';
import { getStudentBillingStartMonth } from '../../utils/studentBillingStartMonth';
import type { Student } from '../../types/aluno';
import type { Turma } from '../../types/turma';
import type { Course } from '../../types/curso';
import type { Propina } from '../../types/propina';

const MONTH_MAP: Record<string, string> = {
  janeiro: 'Jan',
  fevereiro: 'Fev',
  marco: 'Mar',
  março: 'Mar',
  abril: 'Abr',
  maio: 'Mai',
  junho: 'Jun',
  julho: 'Jul',
  agosto: 'Ago',
  setembro: 'Set',
  outubro: 'Out',
  novembro: 'Nov',
  dezembro: 'Dez',
  jan: 'Jan',
  fev: 'Fev',
  mar: 'Mar',
  abr: 'Abr',
  mai: 'Mai',
  jun: 'Jun',
  jul: 'Jul',
  ago: 'Ago',
  set: 'Set',
  out: 'Out',
  nov: 'Nov',
  dez: 'Dez'
};

const MONTH_INDEX_BY_ABBR: Record<string, number> = {
  Jan: 0,
  Fev: 1,
  Mar: 2,
  Abr: 3,
  Mai: 4,
  Jun: 5,
  Jul: 6,
  Ago: 7,
  Set: 8,
  Out: 9,
  Nov: 10,
  Dez: 11
};

type BillingMonthOptions = {
  includeFutureMonths?: boolean;
  paidMonths?: string[];
};

const normalizeMonthToken = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const parseDuracaoEmMeses = (duracao?: string): number => {
  if (!duracao) return 0;
  const raw = duracao.toLowerCase();
  const numeros = raw.match(/\d+/g)?.map((n) => Number(n)).filter((n) => Number.isFinite(n)) || [];
  if (!numeros.length) return 0;
  if (raw.includes('ano')) {
    if (raw.includes('mes')) {
      return Math.max(...numeros);
    }
    return Math.max(...numeros) * 12;
  }
  return Math.max(...numeros);
};

const parseAcademicYear = (anoLectivo?: string): { startYear: number; endYear: number } | null => {
  const match = String(anoLectivo || '').match(/(\d{4})\D+(\d{4})/);
  if (!match) return null;

  const startYear = Number(match[1]);
  const endYear = Number(match[2]);

  if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) {
    return null;
  }

  return { startYear, endYear };
};

const parseValidDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const getBillingStartDate = (aluno: Student): Date | null => {
  // Prioriza data_inicio_estudos; fallback para data_matricula para compatibilidade
  return parseValidDate((aluno as any).data_inicio_estudos) || parseValidDate(aluno.data_matricula) || null;
};

export const financeRulesService = {
  toMonthAbbr(input: string): string {
    if (!input) return '';
    const token = normalizeMonthToken(input.split(' ')[0]);
    return MONTH_MAP[token] || input.substring(0, 3);
  },

  getCurrentMonthAbbr(refDate = new Date()): string {
    const monthName = refDate.toLocaleDateString('pt-BR', { month: 'long' });
    return this.toMonthAbbr(monthName);
  },

  normalizeMonthList(months: string[]): string[] {
    return Array.from(
      new Set(
        (months || [])
          .map((month) => this.toMonthAbbr(month))
          .filter(Boolean)
      )
    );
  },

  sortMonthsByAcademicYear(months: string[], anoLectivo?: string): string[] {
    const parsedYear = parseAcademicYear(anoLectivo);

    return [...this.normalizeMonthList(months)].sort((a, b) => {
      const monthA = MONTH_INDEX_BY_ABBR[a] ?? -1;
      const monthB = MONTH_INDEX_BY_ABBR[b] ?? -1;

      if (!parsedYear) return monthA - monthB;

      const yearA = monthA >= 8 ? parsedYear.startYear : parsedYear.endYear;
      const yearB = monthB >= 8 ? parsedYear.startYear : parsedYear.endYear;

      if (yearA !== yearB) return yearA - yearB;
      return monthA - monthB;
    });
  },

  isBillingNotStarted(aluno: Student, refDate = new Date()): boolean {
    const startDate = parseValidDate((aluno as any).data_inicio_estudos);
    if (!startDate) return false;
    const startBoundary = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const refBoundary = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
    return startBoundary.getTime() > refBoundary.getTime();
  },

  resolveBillingStartMonth(
    aluno: Student,
    mesesBase: string[],
    paidMonths: string[] = []
  ): string {
    const explicitMonth = this.toMonthAbbr(getStudentBillingStartMonth(aluno));
    if (explicitMonth && mesesBase.includes(explicitMonth)) {
      return explicitMonth;
    }

    const paidStartMonth = this.sortMonthsByAcademicYear(paidMonths, aluno.ano_lectivo).find((month) =>
      mesesBase.includes(month)
    );
    if (paidStartMonth) {
      return paidStartMonth;
    }

    // Prioriza data_inicio_estudos (nova lógica): se definida, usa o mês dessa data
    const inicioEstudosDate = parseValidDate((aluno as any).data_inicio_estudos);
    if (inicioEstudosDate) {
      const inicioEstudosMonth = this.toMonthAbbr(
        inicioEstudosDate.toLocaleDateString('pt-BR', { month: 'long' })
      );
      if (inicioEstudosMonth && mesesBase.includes(inicioEstudosMonth)) {
        return inicioEstudosMonth;
      }
      // Se mês não está nos meses base (config custom), fallback para primeiro que seja >=
      if (inicioEstudosMonth) {
        // procura próximo mês base cronologicamente
        return mesesBase[0];
      }
    }

    const matriculaMonth = this.toMonthAbbr(
      new Date(aluno.data_matricula || new Date()).toLocaleDateString('pt-BR', { month: 'long' })
    );
    if (matriculaMonth && mesesBase.includes(matriculaMonth)) {
      return matriculaMonth;
    }

    return mesesBase[0];
  },

  buildBillingSequence(
    mesesBase: string[],
    startMonth: string,
    totalMonths: number
  ): string[] {
    const startIndex = Math.max(0, mesesBase.indexOf(startMonth));
    const sequence: string[] = [];

    for (let i = 0; i < totalMonths; i += 1) {
      sequence.push(mesesBase[(startIndex + i) % mesesBase.length]);
    }

    return sequence;
  },

  buildBillingTimeline(
    months: string[],
    anoLectivo?: string,
    dataMatricula?: string
  ): Array<{ month: string; date: Date }> {
    if (!months.length) return [];

    const parsedYear = parseAcademicYear(anoLectivo);
    const startMonthIndex = MONTH_INDEX_BY_ABBR[this.toMonthAbbr(months[0])] ?? 0;
    const matriculaYear = Number.isFinite(new Date(dataMatricula || '').getFullYear())
      ? new Date(dataMatricula || '').getFullYear()
      : new Date().getFullYear();

    let yearCursor = parsedYear
      ? startMonthIndex >= 8
        ? parsedYear.startYear
        : parsedYear.endYear
      : matriculaYear;

    let previousMonthIndex: number | null = null;

    return months.map((month, index) => {
      const normalizedMonth = this.toMonthAbbr(month);
      const currentMonthIndex = MONTH_INDEX_BY_ABBR[normalizedMonth] ?? 0;

      if (index > 0 && previousMonthIndex !== null && currentMonthIndex <= previousMonthIndex) {
        yearCursor += 1;
      }

      previousMonthIndex = currentMonthIndex;

      return {
        month: normalizedMonth,
        date: new Date(yearCursor, currentMonthIndex, 1)
      };
    });
  },

  limitBillingSequenceToCurrentMonth(
    timeline: Array<{ month: string; date: Date }>,
    refDate = new Date()
  ): string[] {
    const monthBoundary = new Date(refDate.getFullYear(), refDate.getMonth(), 1);

    return timeline
      .filter((item) => item.date.getTime() <= monthBoundary.getTime())
      .map((item) => item.month);
  },

  getBillingMonthsForStudent(
    aluno: Student,
    mesesBase: string[],
    turmasSource: Turma[],
    cursosSource: Course[],
    options: BillingMonthOptions = {}
  ): string[] {
    const mesesNormalizados = this.normalizeMonthList(mesesBase);
    if (!mesesNormalizados.length) return [];

    // Se aluno ainda não iniciou os estudos, não cobra nada (a não ser no modo pagamento antecipado)
    const billingStartDate = getBillingStartDate(aluno);
    const inicioEstudosDate = parseValidDate((aluno as any).data_inicio_estudos);
    if (inicioEstudosDate && this.isBillingNotStarted(aluno) && !options.includeFutureMonths) {
      return [];
    }

    const startMonth = this.resolveBillingStartMonth(aluno, mesesNormalizados, options.paidMonths || []);
    const turma = turmasSource.find((t) => t.id === aluno.turma_id);
    const curso = cursosSource.find((c) => c.id === turma?.curso_id);
    const duracaoMeses = parseDuracaoEmMeses(curso?.duracao);
    const totalMonths =
      aluno.tipo_matricula === 'regular'
        ? mesesNormalizados.length
        : duracaoMeses > 0
        ? duracaoMeses
        : mesesNormalizados.length;

    const sequence = this.buildBillingSequence(mesesNormalizados, startMonth, totalMonths);

    if (options.includeFutureMonths) {
      // No modo antecipado, ainda filtra meses anteriores ao início dos estudos
      if (billingStartDate) {
        const startBoundary = new Date(billingStartDate.getFullYear(), billingStartDate.getMonth(), 1);
        const timelineFull = this.buildBillingTimeline(
          sequence,
          aluno.ano_lectivo,
          (aluno as any).data_inicio_estudos || aluno.data_matricula
        );
        return timelineFull.filter((item) => item.date.getTime() >= startBoundary.getTime()).map((item) => item.month);
      }
      return sequence;
    }

    const timeline = this.buildBillingTimeline(
      sequence,
      aluno.ano_lectivo,
      (aluno as any).data_inicio_estudos || aluno.data_matricula
    );

    // Filtra meses anteriores ao início efetivo dos estudos
    let filteredTimeline = timeline;
    if (billingStartDate) {
      const startBoundary = new Date(billingStartDate.getFullYear(), billingStartDate.getMonth(), 1);
      filteredTimeline = timeline.filter((item) => item.date.getTime() >= startBoundary.getTime());
    }

    return this.limitBillingSequenceToCurrentMonth(filteredTimeline);
  },

  buildPaidMonthsMap(propinas: Propina[]): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    propinas
      .filter((p) => p.estado === 'pago' && !p.deleted)
      .forEach((p) => {
        const abbr = this.toMonthAbbr(p.mes_referencia);
        const list = result[p.aluno_id] || [];
        if (!list.includes(abbr)) list.push(abbr);
        result[p.aluno_id] = this.sortMonthsByAcademicYear(list, p.ano_lectivo);
      });
    return result;
  },

  buildPendingMonthsMap(
    alunos: Student[],
    mesesBase: string[],
    turmasSource: Turma[],
    cursosSource: Course[],
    paidMonthsMap: Record<string, string[]>
  ): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    alunos.forEach((aluno) => {
      const paidMonths = paidMonthsMap[aluno.id] || [];
      const plano = this.getBillingMonthsForStudent(
        aluno,
        mesesBase,
        turmasSource,
        cursosSource,
        { paidMonths }
      );
      const paidSet = new Set(paidMonths.map((m) => this.toMonthAbbr(m)));
      result[aluno.id] = plano.filter((mes) => !paidSet.has(mes));
    });
    return result;
  },

  async markStudentPaidIfCurrentMonthPaid(
    alunoId: string,
    paidMonths: string[]
  ): Promise<boolean> {
    const config = await configService.getPaymentConfig();
    if (!config.pagamentoPrepago) return false;

    const currentMonth = this.getCurrentMonthAbbr();
    const paidSet = new Set((paidMonths || []).map((m) => this.toMonthAbbr(m)));
    if (!paidSet.has(currentMonth)) return false;

    const aluno = await db.alunos.get(alunoId);
    if (!aluno) return false;

    const now = new Date().toISOString();
    await db.alunos.update(alunoId, {
      pagamento_em_dia: true,
      ultima_verificacao_pagamento: now,
      updated_at: now,
      sync_status: 'pending'
    });

    await db.syncQueue.add({
      table: 'alunos',
      instituicao_id: aluno.instituicao_id || instituicaoIdValue(),
      record_id: alunoId,
      operation: 'upsert',
      status: 'pending',
      created_at: now
    });

    return true;
  }
};

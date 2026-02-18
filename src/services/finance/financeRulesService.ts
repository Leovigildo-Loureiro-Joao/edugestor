import db from '../database/db';
import { configService } from '../database/config';
import { instituicaoIdValue } from '../../utils/getInsitituicaoID';
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

const normalizeMonthToken = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

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

  getBillingMonthsForStudent(
    aluno: Student,
    mesesBase: string[],
    turmasSource: Turma[],
    cursosSource: Course[]
  ): string[] {
    if (!mesesBase.length) return [];

    const mesMatriculaAbrev = this.toMonthAbbr(
      new Date(aluno.data_matricula).toLocaleDateString('pt-BR', { month: 'long' })
    );
    const startIndex = Math.max(0, mesesBase.indexOf(mesMatriculaAbrev));

    if (aluno.tipo_matricula === 'regular') {
      return mesesBase.slice(startIndex);
    }

    const turma = turmasSource.find((t) => t.id === aluno.turma_id);
    const curso = cursosSource.find((c) => c.id === turma?.curso_id);
    const duracaoMeses = Number((curso?.duracao || '').match(/\d+/)?.[0] || 0);
    const totalMeses = duracaoMeses > 0 ? duracaoMeses : mesesBase.length;

    const meses: string[] = [];
    for (let i = 0; i < totalMeses; i += 1) {
      meses.push(mesesBase[(startIndex + i) % mesesBase.length]);
    }
    return meses;
  },

  buildPaidMonthsMap(propinas: Propina[]): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    propinas
      .filter((p) => p.estado === 'pago' && !p.deleted)
      .forEach((p) => {
        const abbr = this.toMonthAbbr(p.mes_referencia);
        const list = result[p.aluno_id] || [];
        if (!list.includes(abbr)) list.push(abbr);
        result[p.aluno_id] = list;
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
      const plano = this.getBillingMonthsForStudent(aluno, mesesBase, turmasSource, cursosSource);
      const paidSet = new Set((paidMonthsMap[aluno.id] || []).map((m) => this.toMonthAbbr(m)));
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

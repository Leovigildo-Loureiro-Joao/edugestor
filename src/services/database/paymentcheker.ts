import db from './db';
import { configService } from './config';
import { financeRulesService } from '../finance/financeRulesService';
import { instituicaoIdValue } from '../../utils/getInsitituicaoID';
import type { Student } from '../../types/aluno';

const sameMonthList = (a: string[] = [], b: string[] = []) => {
  if (a.length !== b.length) return false;
  return a.every((m, i) => m === b[i]);
};

export const paymentChecker = {
  // Usa o MESMO fio lógico da página Pagamento:
  // meses pagos -> mapa pago -> meses de cobrança por aluno -> meses pendentes.
  async verificarPagamentosAtrasados(): Promise<{
    processados: number;
    atualizados: number;
    emDia: number;
    pendentes: number;
  }> {
    try {
      const instituicaoId = instituicaoIdValue() || '';
      const config = await configService.getPaymentConfig();
      const mesesBase = (config.mesesPagamento || []).map(financeRulesService.toMonthAbbr.bind(financeRulesService));
      const now = new Date().toISOString();

      const [alunos, turmas, cursos, propinas] = await Promise.all([
        db.alunos
          .filter((a) => !a.deleted && (!instituicaoId || a.instituicao_id === instituicaoId))
          .toArray(),
        db.turmas
          .filter((t) => !t.deleted && (!instituicaoId || t.instituicao_id === instituicaoId))
          .toArray(),
        db.cursos
          .filter((c) => !c.deleted && (!instituicaoId || c.instituicao_id === instituicaoId))
          .toArray(),
        db.propina
          .filter((p) => !p.deleted && (!instituicaoId || p.instituicao_id === instituicaoId))
          .toArray()
      ]);

      const paidMap = financeRulesService.buildPaidMonthsMap(propinas);
      const pendingMap = financeRulesService.buildPendingMonthsMap(alunos as Student[], mesesBase, turmas, cursos, paidMap);

      let atualizados = 0;
      let emDia = 0;
      let pendentes = 0;

      await db.transaction('rw', db.alunos, db.syncQueue, async () => {
        for (const aluno of alunos) {
          const mesesEmAberto = pendingMap[aluno.id] || [];
          const pagamentoEmDia = mesesEmAberto.length === 0;

          if (pagamentoEmDia) emDia += 1;
          else pendentes += 1;

          const atualMeses = aluno.meses_em_aberto || [];
          const precisaAtualizar =
            aluno.pagamento_em_dia !== pagamentoEmDia || !sameMonthList(atualMeses, mesesEmAberto);

          if (!precisaAtualizar) continue;

          await db.alunos.update(aluno.id, {
            pagamento_em_dia: pagamentoEmDia,
            meses_em_aberto: mesesEmAberto,
            ultima_verificacao_pagamento: now,
            updated_at: now,
            sync_status: 'pending'
          });

          await db.syncQueue.add({
            table: 'alunos',
            record_id: aluno.id,
            instituicao_id: aluno.instituicao_id || instituicaoId,
            operation: 'upsert',
            status: 'pending',
            created_at: now
          });

          atualizados += 1;
        }
      });

      return { processados: alunos.length, atualizados, emDia, pendentes };
    } catch (error) {
      console.error('❌ Erro ao verificar pagamentos:', error);
      return { processados: 0, atualizados: 0, emDia: 0, pendentes: 0 };
    }
  }
};

import db from './db';
import { instituicaoIdValue } from '../../utils/getInsitituicaoID';
import { clearStudentBillingStartMonth } from '../../utils/studentBillingStartMonth';
import type { Propina } from '../../types/propina';

const enqueueDeleteIfAbsent = async (propinaId: string, instituicaoId: string, now: string) => {
  const existing = await db.syncQueue
    .where('table')
    .equals('propina')
    .and(
      (item) =>
        item.record_id === propinaId &&
        item.operation === 'delete' &&
        item.status === 'pending' &&
        item.instituicao_id === instituicaoId
    )
    .first();

  if (existing) return;

  await db.syncQueue.add({
    table: 'propina',
    record_id: propinaId,
    instituicao_id: instituicaoId,
    operation: 'delete',
    status: 'pending',
    created_at: now
  });
};

const deleteSinglePropina = async (propina: Propina, instituicaoId: string) => {
  const now = new Date().toISOString();

  if (propina.sync_status === 'synced' && !propina.id.startsWith('local_')) {
    await db.propina.update(propina.id, {
      deleted: true,
      sync_status: 'pending_delete',
      updated_at: now
    });

    await enqueueDeleteIfAbsent(propina.id, instituicaoId, now);
    return;
  }

  await db.propina.delete(propina.id);
  await db.syncQueue
    .where('record_id')
    .equals(propina.id)
    .and((item) => item.instituicao_id === instituicaoId)
    .delete();
};

const cleanupBillingStartIfNeeded = async (propinas: Propina[], instituicaoId: string) => {
  const affectedKeys = Array.from(
    new Set(
      propinas
        .filter((propina) => propina.aluno_id && propina.ano_lectivo)
        .map((propina) => `${propina.aluno_id}::${propina.ano_lectivo}`)
    )
  );

  for (const key of affectedKeys) {
    const [alunoId, anoLectivo] = key.split('::');
    if (!alunoId || !anoLectivo) continue;

    const remaining = await db.propina
      .where('aluno_id')
      .equals(alunoId)
      .and(
        (propina) =>
          !propina.deleted &&
          propina.ano_lectivo === anoLectivo &&
          (!instituicaoId || propina.instituicao_id === instituicaoId)
      )
      .count();

    if (remaining > 0) continue;

    const aluno = await db.alunos.get(alunoId);
    clearStudentBillingStartMonth({
      numero_estudante: aluno?.numero_estudante,
      ano_lectivo: anoLectivo,
      instituicao_id: aluno?.instituicao_id || instituicaoId
    });
  }
};

export const propinaCascadeService = {
  async deleteByAluno(alunoId: string, instituicaoId = instituicaoIdValue() || ''): Promise<number> {
    const propinas = await db.propina
      .where('aluno_id')
      .equals(alunoId)
      .and((propina) => !propina.deleted && (!instituicaoId || propina.instituicao_id === instituicaoId))
      .toArray();

    for (const propina of propinas) {
      await deleteSinglePropina(propina, instituicaoId || propina.instituicao_id || '');
    }

    await cleanupBillingStartIfNeeded(propinas, instituicaoId);
    return propinas.length;
  },

  async deleteByTransacao(transacaoId: string, instituicaoId = instituicaoIdValue() || ''): Promise<number> {
    const propinas = await db.propina
      .filter(
        (propina) =>
          !propina.deleted &&
          propina.transacao_id === transacaoId &&
          (!instituicaoId || propina.instituicao_id === instituicaoId)
      )
      .toArray();

    for (const propina of propinas) {
      await deleteSinglePropina(propina, instituicaoId || propina.instituicao_id || '');
    }

    await cleanupBillingStartIfNeeded(propinas, instituicaoId);
    return propinas.length;
  }
};

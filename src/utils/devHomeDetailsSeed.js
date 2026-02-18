import db from '../services/database/db';
import { instituicaoIdValue } from './getInsitituicaoID';

const ensureInstituicaoId = () => {
  const instituicaoId = instituicaoIdValue();
  if (!instituicaoId) {
    throw new Error('Nenhuma instituicao ativa encontrada (active_instituicao_id).');
  }
  return instituicaoId;
};

const uid = (prefix) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const pick = (items) => items[Math.floor(Math.random() * items.length)];

const getPeriodo = (month) => {
  if (month <= 3) return '1º trimestre';
  if (month <= 7) return '2º trimestre';
  return '3º trimestre';
};

const randomDateInYear = (year) => {
  const month = Math.floor(Math.random() * 12);
  const day = Math.floor(Math.random() * 28) + 1;
  const date = new Date(year, month, day);
  return date.toISOString();
};

export async function seedHomeDetailsData(options = {}) {
  const instituicaoId = ensureInstituicaoId();
  const {
    alunos = 120,
    avaliacoesPorAluno = 6,
    frequenciasPorAluno = 28,
    ano = new Date().getFullYear(),
    enqueueSync = true,
  } = options;

  const now = new Date().toISOString();
  const firstNames = ['Ana', 'Paulo', 'Marta', 'Joao', 'Carlos', 'Helena', 'Mateus', 'Sara', 'Pedro', 'Bia'];
  const lastNames = ['Silva', 'Santos', 'Fernandes', 'Pereira', 'Costa', 'Almeida', 'Fonseca', 'Mendes'];
  const disciplinas = ['Matematica', 'Portugues', 'Historia', 'Geografia', 'Fisica', 'Quimica', 'Biologia'];
  const tiposAvaliacao = ['Teste', 'Prova', 'Trabalho', 'Exame'];

  const turmasAtivas = await db.turmas
    .filter((t) => !t.deleted && t.instituicao_id === instituicaoId)
    .toArray();
  const aulasAtivas = await db.aulas
    .filter((a) => !a.deleted && a.instituicao_id === instituicaoId)
    .toArray();

  const turmaIds = turmasAtivas.map((t) => t.id).filter(Boolean);
  const aulaIds = aulasAtivas.map((a) => a.id).filter(Boolean);

  const students = [];
  const avaliacoes = [];
  const frequencias = [];
  const syncQueueItems = [];

  for (let i = 0; i < alunos; i += 1) {
    const alunoId = uid('local_hd_aluno');
    const nome = `${pick(firstNames)} ${pick(lastNames)}`;
    const dataMatricula = randomDateInYear(ano);
    const turmaId = turmaIds.length > 0 ? turmaIds[i % turmaIds.length] : '';

    students.push({
      id: alunoId,
      instituicao_id: instituicaoId,
      nome_completo: nome,
      data_nascimento: `200${i % 8}-0${(i % 9) + 1}-15`,
      nome_pai: 'Encarregado 1',
      nome_mae: 'Encarregada 2',
      contacto_principal: `9${String(10000000 + i).slice(0, 8)}`,
      endereco: 'Endereco teste',
      sexo: i % 2 === 0 ? 'M' : 'F',
      numero_estudante: 10000 + i,
      ano_lectivo: `${ano}/${ano + 1}`,
      curso: 'Curso Teste',
      classe_escolar: `${(i % 3) + 10}a`,
      turma_id: turmaId,
      estado: 'ativo',
      tipo_matricula: 'reforco_personalizado',
      modalidade_atendimento: 'grupo',
      frequencia_semanal: 3,
      disciplinas_reforco: ['Matematica'],
      nivel_conhecimento: 'B',
      grupo_aprendizado: 'beta',
      objetivos_academicos: 'Melhorar desempenho',
      pagamento_em_dia: true,
      cartao_pago: true,
      propina: 25000,
      data_matricula: dataMatricula,
      sync_status: 'pending',
      deleted: false,
      created_at: now,
      updated_at: now,
    });

    if (enqueueSync) {
      syncQueueItems.push({
        table: 'alunos',
        instituicao_id: instituicaoId,
        record_id: alunoId,
        operation: 'upsert',
        status: 'pending',
        created_at: now,
      });
    }

    for (let a = 0; a < avaliacoesPorAluno; a += 1) {
      const data = randomDateInYear(ano);
      const month = new Date(data).getMonth();
      const avaliacaoId = uid('local_hd_av');
      avaliacoes.push({
        id: avaliacaoId,
        instituicao_id: instituicaoId,
        aluno_id: alunoId,
        turma_id: turmaId,
        disciplina: pick(disciplinas),
        tipo_avaliacao: pick(tiposAvaliacao),
        nota: Number((8 + Math.random() * 12).toFixed(1)),
        data_avaliacao: data,
        periodo: getPeriodo(month),
        sync_status: 'pending',
        deleted: false,
        created_at: now,
        updated_at: now,
      });

      if (enqueueSync) {
        syncQueueItems.push({
          table: 'avaliacoes',
          instituicao_id: instituicaoId,
          record_id: avaliacaoId,
          operation: 'upsert',
          status: 'pending',
          created_at: now,
        });
      }
    }

    for (let f = 0; f < frequenciasPorAluno; f += 1) {
      const data = randomDateInYear(ano);
      const frequenciaId = uid('local_hd_freq');
      frequencias.push({
        id: frequenciaId,
        instituicao_id: instituicaoId,
        aluno_id: alunoId,
        aula_id: aulaIds.length > 0 ? aulaIds[f % aulaIds.length] : '',
        data_aula: data,
        presente: Math.random() > 0.18,
        justificativa: '',
        sync_status: 'pending',
        deleted: false,
        created_at: now,
        updated_at: now,
      });

      if (enqueueSync) {
        syncQueueItems.push({
          table: 'frequencias',
          instituicao_id: instituicaoId,
          record_id: frequenciaId,
          operation: 'upsert',
          status: 'pending',
          created_at: now,
        });
      }
    }
  }

  await db.transaction('rw', db.alunos, db.avaliacoes, db.frequencias, db.syncQueue, async () => {
    await db.alunos.bulkPut(students);
    await db.avaliacoes.bulkPut(avaliacoes);
    await db.frequencias.bulkPut(frequencias);
    if (enqueueSync && syncQueueItems.length > 0) {
      await db.syncQueue.bulkAdd(syncQueueItems);
    }
  });

  window.dispatchEvent(
    new CustomEvent('db-changed', {
      detail: { table: 'alunos', operation: 'seed' },
    }),
  );

  const summary = {
    instituicaoId,
    alunos: students.length,
    avaliacoes: avaliacoes.length,
    frequencias: frequencias.length,
  };
  console.table(summary);
  return summary;
}

export async function clearHomeDetailsData() {
  const instituicaoId = ensureInstituicaoId();

  await db.transaction('rw', db.alunos, db.avaliacoes, db.frequencias, db.syncQueue, async () => {
    const alunosIds = (await db.alunos
      .filter((a) => !a.deleted && a.instituicao_id === instituicaoId && String(a.id).startsWith('local_hd_aluno'))
      .toArray()).map((a) => a.id);

    const avaliacaoIds = (await db.avaliacoes
      .filter((a) => !a.deleted && a.instituicao_id === instituicaoId && String(a.id).startsWith('local_hd_av'))
      .toArray()).map((a) => a.id);

    const frequenciaIds = (await db.frequencias
      .filter((f) => !f.deleted && f.instituicao_id === instituicaoId && String(f.id).startsWith('local_hd_freq'))
      .toArray()).map((f) => f.id);

    if (alunosIds.length) await db.alunos.bulkDelete(alunosIds);
    if (avaliacaoIds.length) await db.avaliacoes.bulkDelete(avaliacaoIds);
    if (frequenciaIds.length) await db.frequencias.bulkDelete(frequenciaIds);

    const queueIds = (await db.syncQueue
      .filter((item) => {
        const recordId = String(item.record_id || '');
        if (item.instituicao_id !== instituicaoId) return false;
        return recordId.startsWith('local_hd_') || recordId.startsWith('seed_');
      })
      .toArray())
      .map((item) => item.id)
      .filter((id) => typeof id === 'number');

    if (queueIds.length > 0) {
      await db.syncQueue.bulkDelete(queueIds);
    }
  });

  window.dispatchEvent(
    new CustomEvent('db-changed', {
      detail: { table: 'alunos', operation: 'cleanup' },
    }),
  );

  const summary = { instituicaoId, cleaned: true };
  console.table(summary);
  return summary;
}

export async function clearSeedSyncQueue(options = {}) {
  const { allInstituicoes = false } = options;
  const instituicaoId = ensureInstituicaoId();

  const seedQueueItems = await db.syncQueue
    .filter((item) => {
      const recordId = String(item.record_id || '');
      if (!recordId.startsWith('seed_') && !recordId.startsWith('local_hd_')) return false;
      if (allInstituicoes) return true;
      return item.instituicao_id === instituicaoId;
    })
    .toArray();

  const ids = seedQueueItems
    .map((item) => item.id)
    .filter((id) => typeof id === 'number');

  if (ids.length > 0) {
    await db.syncQueue.bulkDelete(ids);
  }

  const summary = {
    instituicaoId,
    allInstituicoes,
    deletedQueueItems: ids.length,
  };
  console.table(summary);
  return summary;
}

export function registerHomeDetailsSeedHelpers() {
  window.seedHomeDetailsData = seedHomeDetailsData;
  window.clearHomeDetailsData = clearHomeDetailsData;
  window.clearSeedSyncQueue = clearSeedSyncQueue;
  console.log(
    '[DEV] Helpers: seedHomeDetailsData({...}) [usa local_hd_* e pending], clearHomeDetailsData(), clearSeedSyncQueue({ allInstituicoes })',
  );
}

import { alunosService } from '../services/database/alunosService';
import { avaliacaoService } from '../services/database/avaliacao';
import { propinaService } from '../services/database/propinas';
import { transacaoService } from '../services/database/transacaoService';
import { planoAulaService } from '../services/database/planoAulasService';
import { turmaService } from '../services/database/turmas';
import { instituicaoIdValue } from './getInstituicaoID';

const MESES = ['Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'];
const TIPOS_AVALIACAO = ['Teste', 'Prova', 'Trabalho', 'Exame'];
const METODOLOGIAS = ['expositiva', 'dialogada', 'pratica', 'ativa', 'hibrida'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const toISODate = (date) => new Date(date).toISOString().split('T')[0];

const getPeriodoByDate = (dateIso) => {
  const month = new Date(dateIso).getMonth() + 1;
  if (month <= 3) return '1º trimestre';
  if (month <= 7) return '2º trimestre';
  return '3º trimestre';
};

async function runWithConcurrency(items, concurrency, worker) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length || 1) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      await worker(items[index], index);
    }
  });
  await Promise.all(workers);
}

export async function addAvaliacoesForAllStudents(options = {}) {
  const {
    porAluno = 2,
    notaMin = 10,
    notaMax = 18,
    disciplinaFallback = 'Matematica',
    concurrency = 6
  } = options;

  const instituicaoId = instituicaoIdValue();
  const alunos = await alunosService.getAllStudents();
  const ativos = alunos.filter((a) => !a.deleted && a.estado !== 'desistente');

  const criacoes = [];
  ativos.forEach((aluno) => {
    for (let i = 0; i < porAluno; i += 1) {
      criacoes.push({ aluno, index: i });
    }
  });

  let ok = 0;
  let fail = 0;
  const errors = [];

  await runWithConcurrency(criacoes, concurrency, async ({ aluno }) => {
    try {
      const disciplina = (aluno.disciplinas_reforco && aluno.disciplinas_reforco[0]) || disciplinaFallback;
      const dataISO = toISODate(new Date());
      const nota = Number((notaMin + Math.random() * (notaMax - notaMin)).toFixed(1));

      await avaliacaoService.criarAvaliacao({
        instituicao_id: instituicaoId || aluno.instituicao_id,
        aluno_id: aluno.id,
        turma_id: aluno.turma_id || undefined,
        disciplina,
        tipo_avaliacao: pick(TIPOS_AVALIACAO),
        nota,
        data_avaliacao: dataISO,
        periodo: getPeriodoByDate(dataISO),
        observacoes: 'Lançamento em massa DEV',
        peso: 1
      });
      ok += 1;
    } catch (error) {
      fail += 1;
      errors.push({ aluno_id: aluno.id, error: String(error?.message || error) });
    }
  });

  const summary = {
    targetStudents: ativos.length,
    requested: criacoes.length,
    created: ok,
    failed: fail,
    sampleErrors: errors.slice(0, 10)
  };
  console.table(summary);
  return summary;
}

export async function addPropinasForAllStudents(options = {}) {
  const {
    meses = [MESES[new Date().getMonth()]],
    vencimentoDia = 10,
    payMode = 'mixed', // 'paid' | 'pending' | 'mixed'
    singleTransactionForMonths = true,
    concurrency = 6
  } = options;

  const alunos = await alunosService.getAllStudents();
  const ativos = alunos.filter((a) => !a.deleted && a.estado !== 'desistente');

  const criacoes = ativos.map((aluno) => ({ aluno }));

  let ok = 0;
  let fail = 0;
  const errors = [];

  await runWithConcurrency(criacoes, concurrency, async ({ aluno }) => {
    try {
      const ano = new Date().getFullYear();
      const valorBase = Number(aluno.propina || 0);

      const mesesPayload = meses.map((mes) => {
        const pago =
          payMode === 'paid'
            ? valorBase
            : payMode === 'pending'
            ? 0
            : Math.random() > 0.5
            ? valorBase
            : Number((valorBase * (0.3 + Math.random() * 0.5)).toFixed(2));

        return { mes, pago };
      });

      const totalTransacao = Number(
        mesesPayload.reduce((acc, item) => acc + item.pago, 0).toFixed(2)
      );

      let transacaoId = '';
      if (singleTransactionForMonths) {
        transacaoId = await transacaoService.createTransacao({
          valor: totalTransacao,
          tipo: 'entrada',
          categoria: 'mensalidade',
          data: new Date().toISOString(),
          descricao: `Pagamento DEV em massa - ${aluno.nome_completo} - ${meses.join(', ')}`
        });
      }

      for (const item of mesesPayload) {
        const monthIndex = Math.max(0, MESES.indexOf(item.mes));
        const vencimento = new Date(ano, monthIndex, vencimentoDia);

        const transacaoIdMes = singleTransactionForMonths
          ? transacaoId
          : await transacaoService.createTransacao({
              valor: item.pago,
              tipo: 'entrada',
              categoria: 'mensalidade',
              data: new Date().toISOString(),
              descricao: `Pagamento DEV em massa - ${aluno.nome_completo} - ${item.mes}`
            });

        await propinaService.registerPropina({
          instituicao_id: aluno.instituicao_id,
          aluno_id: aluno.id,
          mes_referencia: item.mes,
          valor_pago: item.pago,
          data_vencimento: vencimento.toISOString(),
          data_pagamento: item.pago > 0 ? new Date().toISOString() : undefined,
          estado: item.pago >= valorBase ? 'pago' : 'pendente',
          multa: 0,
          recibo_numero: '',
          ano_lectivo: aluno.ano_lectivo || `${ano}-${ano + 1}`,
          transacao_id: transacaoIdMes
        });
        ok += 1;
      }
    } catch (error) {
      fail += 1;
      errors.push({ aluno_id: aluno.id, error: String(error?.message || error) });
    }
  });

  const summary = {
    targetStudents: ativos.length,
    requested: criacoes.length,
    created: ok,
    failed: fail,
    sampleErrors: errors.slice(0, 10)
  };
  console.table(summary);
  return summary;
}

export async function addPlanosAulaForAllTurmas(options = {}) {
  const {
    porTurma = 1,
    aulasPlaneadas = 4,
    duracaoTotal = 90,
    status = 'ativo',
    gerarAulas = false,
    concurrency = 3
  } = options;

  const turmas = await turmaService.getTurmas();
  const validTurmas = turmas.filter((t) => !t.deleted && t.estado === 'ativa');

  const criacoes = [];
  validTurmas.forEach((turma) => {
    for (let i = 0; i < porTurma; i += 1) {
      criacoes.push({ turma, index: i + 1 });
    }
  });

  let ok = 0;
  let fail = 0;
  const errors = [];

  await runWithConcurrency(criacoes, concurrency, async ({ turma, index }) => {
    try {
      const now = new Date();
      const inicio = toISODate(now);
      const fim = toISODate(new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30));
      const disciplina = turma.curso_nome || `Disciplina ${index}`;

      const plano = await planoAulaService.criarPlano({
        titulo: `Plano ${turma.nome_turma} #${index}`,
        descricao: 'Criado em massa via helper DEV',
        disciplina,
        tipo: 'serie',
        objetivos_aprendizagem: ['Consolidar conteúdos', 'Preparar avaliação'],
        competencias_desenvolvidas: ['Raciocínio crítico', 'Resolução de problemas'],
        recursos_necessarios: ['Quadro', 'Marcadores'],
        metodologia_principal: pick(METODOLOGIAS),
        avaliacao: 'Avaliação contínua',
        duracao_total: duracaoTotal,
        aulas_planeadas: aulasPlaneadas,
        data_inicio: inicio,
        data_fim: fim,
        frequencia: 'semanal',
        conteudos: [
          {
            ordem: 1,
            titulo: 'Introdução',
            descricao: 'Abertura do tema',
            duracao: Math.max(15, Math.floor(duracaoTotal / 3)),
            metodologia: 'expositiva',
            atividades: ['Apresentação']
          },
          {
            ordem: 2,
            titulo: 'Prática guiada',
            descricao: 'Exercícios aplicados',
            duracao: Math.max(20, Math.floor(duracaoTotal / 3)),
            metodologia: 'pratica',
            atividades: ['Resolução de exercícios']
          }
        ],
        turma_ids: [turma.id],
        status
      });

      if (gerarAulas) {
        await planoAulaService.gerarAulasDoPlano(plano.id);
      }

      ok += 1;
    } catch (error) {
      fail += 1;
      errors.push({ turma_id: turma.id, error: String(error?.message || error) });
    }
  });

  const summary = {
    targetTurmas: validTurmas.length,
    requested: criacoes.length,
    created: ok,
    failed: fail,
    sampleErrors: errors.slice(0, 10)
  };
  console.table(summary);
  return summary;
}

export async function bulkAcademicFill(options = {}) {
  const {
    avaliacoes = true,
    propinas = true,
    planos = true
  } = options;

  const summary = {};
  if (avaliacoes) summary.avaliacoes = await addAvaliacoesForAllStudents(options.avaliacoesOptions || {});
  if (propinas) summary.propinas = await addPropinasForAllStudents(options.propinasOptions || {});
  if (planos) summary.planos = await addPlanosAulaForAllTurmas(options.planosOptions || {});

  return summary;
}

export function registerBulkAcademicHelpers() {
  window.addAvaliacoesForAllStudents = addAvaliacoesForAllStudents;
  window.addPropinasForAllStudents = addPropinasForAllStudents;
  window.addPlanosAulaForAllTurmas = addPlanosAulaForAllTurmas;
  window.bulkAcademicFill = bulkAcademicFill;
  }

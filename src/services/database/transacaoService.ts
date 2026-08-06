
import { supabase } from '../database/db';
import { propinaService } from './propinas';
import db from './db';
import { AlocacaoRecurso, AlocacaoRecursoFormData, DadosPagamentoCash, Transacao, TransacaoFormData } from '../../types/transacao';
import { syncManager } from './syncManager';
import { configService } from './config';
import { estrategiaService } from './estrategiaService';
import { progress } from 'framer-motion';
import { instituicaoIdValue } from '../../utils/getInstituicaoID';
import { generateUniqueId } from '../../utils/idGenerator';
import { financeRulesService } from '../finance/financeRulesService';
import { propinaCascadeService } from './propinaCascade';
import { setStudentBillingStartMonth } from '../../utils/studentBillingStartMonth';
import { resolveStudentAcademicStatus } from '../../utils/studentAcademicStatus';

const getActiveInstituicaoId = () => instituicaoIdValue();

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

const parseAcademicYear = (value?: string) => {
  const match = String(value || '').match(/(\d{4})\D+(\d{4})/);
  if (!match) return null;

  const startYear = Number(match[1]);
  const endYear = Number(match[2]);

  if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) {
    return null;
  }

  return { startYear, endYear };
};

const resolveDueDateForReferenceMonth = (
  monthLabel: string,
  anoLectivo: string,
  dueDay: number
) => {
  const monthAbbr = financeRulesService.toMonthAbbr(monthLabel);
  const monthIndex = MONTH_INDEX_BY_ABBR[monthAbbr];

  if (monthIndex == null) {
    return new Date().toISOString();
  }

  const parsedAcademicYear = parseAcademicYear(anoLectivo);
  const currentYear = new Date().getFullYear();
  const targetYear = parsedAcademicYear
    ? monthIndex >= 8
      ? parsedAcademicYear.startYear
      : parsedAcademicYear.endYear
    : currentYear;

  const safeDueDay = Math.max(1, Number(dueDay || 10));
  const lastDayOfMonth = new Date(targetYear, monthIndex + 1, 0).getDate();

  return new Date(targetYear, monthIndex, Math.min(safeDueDay, lastDayOfMonth)).toISOString();
};

export const transacaoService = {
  async enqueuePendingIfAbsent(
    table: string,
    recordId: string,
    instituicaoId: string,
    operation: 'upsert' | 'delete',
    now: string
  ) {
    const hasPending = await db.syncQueue
      .where('table')
      .equals(table)
      .and(
        (item) =>
          item.record_id === recordId &&
          item.operation === operation &&
          item.status === 'pending' &&
          item.instituicao_id === instituicaoId
      )
      .first();

    if (!hasPending) {
      
      await db.syncQueue.add({
        table: table as "alunos" | "turmas" | "cursos" | "alocacao" | "transacoes" | "aulas" | "propina" | "frequencias" | "tarefas" | "metas" | "rotinas" | "evento" | "profiles" | "system_config" | "instituicao" | "notificacao" | "avaliacoes" | "turma_horarios" | "planeamentos" | "plano_aulas",
        instituicao_id: instituicaoId,
        record_id: recordId,
        operation,
        status: 'pending',
        created_at: now
      });
    }
  },

  async recalculateMetaFromAlocacoes(metaId: string, instituicaoId: string) {
    const meta = await db.metas.get(metaId);
    if (!meta || meta.deleted || meta.instituicao_id !== instituicaoId) return false;

    const alocacoesMeta = await db.alocacao
      .filter((a) => !a.deleted && a.instituicao_id === instituicaoId && a.meta_id === metaId)
      .toArray();

    const orcamento_alocado = alocacoesMeta.reduce((sum, a) => sum + Number(a.valor || 0), 0);
    const progresso = meta.orcamento_previsto
      ? Number(Math.min((orcamento_alocado / meta.orcamento_previsto) * 100, 100).toFixed(1))
      : Number(meta.progresso || 0);

    const statusAtual = meta.status;
    const status =
      statusAtual === 'suspensa' || statusAtual === 'atrasada'
        ? statusAtual
        : progresso >= 100
        ? 'concluida'
        : progresso > 0
        ? 'em_andamento'
        : 'nao_iniciada';

    const mudouMeta =
      Number(meta.orcamento_alocado || 0) !== orcamento_alocado ||
      Number(meta.progresso || 0) !== progresso ||
      meta.status !== status;

    if (!mudouMeta) return false;

    const now = new Date().toISOString();
    await db.metas.update(metaId, {
      orcamento_alocado,
      progresso,
      status,
      updated_at: now,
      sync_status: 'pending',
    });

    await this.enqueuePendingIfAbsent('metas', metaId, instituicaoId, 'upsert', now);
    return true;
  },

  async runAlocacoesBackfill(options?: { force?: boolean }) {
    try {
      const instituicaoId = getActiveInstituicaoId();
      if (!instituicaoId) {
        return { skipped: true, alocacoesAtualizadas: 0, metasAtualizadas: 0, transacoesAtualizadas: 0 };
      }

      const todayKey = new Date().toISOString().split('T')[0];
      const runKey = `alocacoes_backfill_integrity_v3_${instituicaoId}`;
      const lastRun = localStorage.getItem(runKey);
      if (!options?.force && lastRun === todayKey) {
        return { skipped: true, alocacoesAtualizadas: 0, metasAtualizadas: 0, transacoesAtualizadas: 0 };
      }

      const now = new Date().toISOString();
      const todasAlocacoes = await db.alocacao
        .filter((a) => a.instituicao_id === instituicaoId)
        .toArray();
      const alocacoes = todasAlocacoes
        .filter((a) => !a.deleted && a.instituicao_id === instituicaoId)
        ;

      let alocacoesAtualizadas = 0;
      let transacoesAtualizadas = 0;
      const metasImpactadas = new Set<string>();
      todasAlocacoes.forEach((a) => {
        if (a.meta_id) metasImpactadas.add(a.meta_id);
      });

      for (const alocacao of alocacoes) {
        if (!alocacao.meta_id) continue;
        const meta = await db.metas.get(alocacao.meta_id);
        if (!meta || meta.deleted || meta.instituicao_id !== instituicaoId) continue;

        const valor = Number(alocacao.valor || 0);
        const orcamentoTotal = Number(meta.orcamento_previsto || alocacao.orcamento_total || 0);
        const percentual = orcamentoTotal > 0 ? Number(((valor / orcamentoTotal) * 100).toFixed(2)) : 0;
        const orcamentoActual = Number(meta.orcamento_alocado || 0);
        const data_alocacao = alocacao.data_alocacao || alocacao.created_at || now;
        const tipo_alocacao = alocacao.tipo_alocacao || 'parcial';

        const precisaAtualizar =
          Number(alocacao.percentual || 0) !== percentual ||
          Number(alocacao.orcamento_total || 0) !== orcamentoTotal ||
          Number(alocacao.orcamento_actual || 0) !== orcamentoActual ||
          (alocacao.data_alocacao || '') !== data_alocacao ||
          (alocacao.tipo_alocacao || '') !== tipo_alocacao;

        if (!precisaAtualizar) {
          metasImpactadas.add(alocacao.meta_id);
          continue;
        }

        await db.alocacao.update(alocacao.id, {
          percentual,
          orcamento_total: orcamentoTotal,
          orcamento_actual: orcamentoActual,
          data_alocacao,
          tipo_alocacao,
          updated_at: now,
          sync_status: 'pending',
        });

        await this.enqueuePendingIfAbsent('alocacao', alocacao.id, instituicaoId, 'upsert', now);

        alocacoesAtualizadas += 1;
        metasImpactadas.add(alocacao.meta_id);
      }

      const transacoesInvestimento = await db.transacoes
        .filter((t) =>
          !t.deleted &&
          t.instituicao_id === instituicaoId &&
          t.tipo === 'saida' &&
          t.categoria === 'investimento'
        )
        .toArray();

      for (const transacao of transacoesInvestimento) {
        const valorAtual = Number((transacao as any).valor);
        const valorInvalido = !Number.isFinite(valorAtual) || (transacao as any).valor == null;
        if (!valorInvalido) continue;

        const descricao = String(transacao.descricao || '').trim();
        if (!descricao) continue;

        const alocacoesCandidatas = alocacoes.filter((a) => {
          const descPadrao = `Alocação para meta ${a.meta_id}`;
          return (
            String(a.motivo || '').trim() === descricao ||
            descPadrao === descricao
          );
        });

        if (alocacoesCandidatas.length === 0) continue;

        const alocacaoRef = alocacoesCandidatas.sort((a, b) => {
          const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
          const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
          return bTime - aTime;
        })[0];

        const valorCorrigido = Number(alocacaoRef.valor || 0);
        if (!Number.isFinite(valorCorrigido)) continue;

        await db.transacoes.update(transacao.id, {
          valor: valorCorrigido,
          updated_at: now,
          sync_status: 'pending'
        });

        await this.enqueuePendingIfAbsent('transacoes', transacao.id, instituicaoId, 'upsert', now);

        transacoesAtualizadas += 1;
      }

      let metasAtualizadas = 0;
      for (const metaId of metasImpactadas) {
        const mudou = await this.recalculateMetaFromAlocacoes(metaId, instituicaoId);
        if (mudou) metasAtualizadas += 1;
      }

      localStorage.setItem(runKey, todayKey);
      
      return { skipped: false, alocacoesAtualizadas, metasAtualizadas, transacoesAtualizadas };
    } catch (error) {
      console.error('❌ Erro no backfill de alocações:', error);
      return { skipped: false, alocacoesAtualizadas: 0, metasAtualizadas: 0, transacoesAtualizadas: 0, error: true };
    }
  },

  
  async createTransacao(transacaoData: TransacaoFormData): Promise<string> {
    try {
      const id = generateUniqueId();
      const now = new Date().toISOString();
      const instituicaoId = instituicaoIdValue();

      if (!instituicaoId) {
        throw new Error('Instituição ativa não encontrada para registrar transação.');
      }
      
      const transacao = {
        ...transacaoData,
        instituicao_id: instituicaoId,
        id,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
        deleted: false,
      } as Transacao;

      await db.transacoes.put(transacao);
      
      
      await db.syncQueue.add({
        table: 'transacoes',
        instituicao_id: instituicaoId,
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      return id;
      
    } catch (error) {
      console.error('❌ Erro ao salvar transação:', error);
      throw error;
    }
  },



  async createAlocacao(alocacaoData: AlocacaoRecursoFormData): Promise<string> {
    try {
      const id = generateUniqueId();
      const now = new Date().toISOString();
      const instituicaoId = getActiveInstituicaoId();
      
      const alocacao = {
        ...alocacaoData,
        instituicao_id: instituicaoId,
        id,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
        deleted: false,
      } as AlocacaoRecurso;

      await db.alocacao.put(alocacao);
      
      
      await db.syncQueue.add({
        table: 'alocacao',
        instituicao_id: instituicaoId,
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

       transacaoService.createTransacao({
        categoria:"investimento",
        data: new Date().toISOString(),
        descricao:alocacao.motivo,
        tipo:'saida',
        valor:alocacao.valor
      })
      const meta = await estrategiaService.getMetasID(alocacao.meta_id);
      const progresso:number = meta && meta.orcamento_previsto ? ((100 * alocacao.valor) / meta.orcamento_previsto) : 0;
      estrategiaService.updateMeta(alocacao.meta_id,{
        progresso: Math.round(progresso) + (meta?.progresso || 0)

      })

      return id;
      
    } catch (error) {
      console.error('❌ Erro ao salvar transação:', error);
      throw error;
    }
  },

  getTransacoesPeriodo: async (inicio: string, fim: string): Promise<Transacao[]> => {
    try {
      const instituicaoId = getActiveInstituicaoId();
      if (!instituicaoId) return [];
      const transacoes = await db.transacoes
        .where('data')
        .between(inicio, fim, true, true)
        .and(t => !t.deleted && t.instituicao_id === instituicaoId)
        .toArray();
      
      return transacoes.sort((a, b) => 
        new Date(a.data).getTime() - new Date(b.data).getTime()
      );
    } catch (error) {
      console.error('Erro ao buscar transações por período:', error);
      return [];
    }
  },
  

  
  async processarPagamento(dados: TransacaoFormData): Promise<{sucesso: boolean; mensagem: string; dados?: any}> {
    try {
      
      const transacaoId = await this.createTransacao(dados);
      
      
      if (navigator.onLine) {
        await this.syncTransacoes();
        
        
        const transacaoSincronizada = await db.transacoes.get(transacaoId);
        
        return {
          sucesso: true,
          mensagem: `Pagamento do cartão registrado com sucesso!`,
          dados: transacaoSincronizada
        };
      }
      
      
      const transacaoLocal = await db.transacoes.get(transacaoId);
      
      return {
        sucesso: true,
        mensagem: `Pagamento registrado localmente. Será sincronizado quando online.`,
        dados: transacaoLocal
      };

    } catch (error: any) {
      console.error('❌ Erro ao processar pagamento:', error);
      return {
        sucesso: false,
        mensagem: error.message
      };
    }
  },



  
  async processarMensalidade(alunoId: string, dados: DadosPagamentoCash): Promise<{sucesso: boolean; mensagem: string; dados?: any}> {
    try {
      const mesesReferencia = Array.from(
        new Set((dados.mesReferencia || []).map((mes) => String(mes || '').trim()).filter(Boolean))
      );
      
      if (!mesesReferencia.length) {
        return {
          sucesso: false,
          mensagem: `Mês de referência não informado`,
        };
      }

      
      const valorMensal = parseFloat(dados.valor);
      const valorTotal = valorMensal * mesesReferencia.length;
      const [paymentConfig, anoLectivo, aluno] = await Promise.all([
        configService.getPaymentConfig(),
        configService.getConfigValue("academic", "academic_year"),
        db.alunos.get(alunoId)
      ]);

      const propinasDoAno = await db.propina
        .where('aluno_id')
        .equals(alunoId)
        .and((propina) => !propina.deleted && propina.ano_lectivo === anoLectivo)
        .count();

      if (aluno && propinasDoAno === 0) {
        setStudentBillingStartMonth(
          {
            numero_estudante: aluno.numero_estudante,
            ano_lectivo: String(anoLectivo || aluno.ano_lectivo || '').trim(),
            instituicao_id: aluno.instituicao_id
          },
          mesesReferencia[0]
        );
      }

      const transacaoData: TransacaoFormData = {
        valor: valorTotal,
        tipo: 'entrada',
        categoria: 'mensalidade',
        data: new Date().toISOString(),
        descricao: `Pagamento de ${mesesReferencia.length} mes(es) de propina - ${mesesReferencia.join(', ')}`
      };

      const transacaoId = await this.createTransacao(transacaoData);
      const transacaoLocal = await db.transacoes.get(transacaoId);

      
      for (const mes of mesesReferencia) {
        const mesRef = financeRulesService.toMonthAbbr(mes) as 'Jan' | 'Fev' | 'Mar' | 'Abr' | 'Mai' | 'Jun' | 'Jul' | 'Ago' | 'Set' | 'Out' | 'Nov' | 'Dez';
        
        await propinaService.registerPropina({
          aluno_id: alunoId,
          data_vencimento: resolveDueDateForReferenceMonth(
            mes,
            String(anoLectivo || aluno?.ano_lectivo || ''),
            Number(paymentConfig.diaVencimento || 10)
          ),
          data_pagamento: new Date().toISOString(),
          valor_pago: valorMensal,
          valor_falta: 0,
          mes_referencia: mesRef,
          transacao_id: transacaoId,
          estado: 'pago',
          ano_lectivo: String(anoLectivo || aluno?.ano_lectivo || '')

        });
      }

      
      await financeRulesService.markStudentPaidIfCurrentMonthPaid(
        alunoId,
        mesesReferencia
      );

      if (aluno) {
        const proximoEstado = resolveStudentAcademicStatus(aluno);
        if (proximoEstado !== aluno.estado) {
          const now = new Date().toISOString();
          await db.alunos.update(alunoId, {
            estado: proximoEstado,
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
        }
      }

      
      if (navigator.onLine) {
        await this.syncTransacoes();
      }

      return {
        sucesso: true,
        mensagem: `Pagamento de ${mesesReferencia.length} mes(es) registrado com sucesso!`,
        dados: transacaoLocal
      };

    } catch (error: any) {
      console.error('❌ Erro ao processar pagamento cash:', error);
      return {
        sucesso: false,
        mensagem: error.message
      };
    }
  },

  
  async getAllTransactions(): Promise<Transacao[]> {
    try {
      const instituicaoId = getActiveInstituicaoId();
      if (!instituicaoId) return [];
      
      const todasTransacoes = await db.transacoes.toArray();
      
      
      const transacoesAtivas = todasTransacoes.filter(t => !t.deleted && t.instituicao_id === instituicaoId);
      
      
      transacoesAtivas.sort((a, b) => 
        new Date(b.data).getTime() - new Date(a.data).getTime()
      );
      
      return transacoesAtivas;
    } catch (error) {
      console.error('❌ Erro ao buscar transações:', error);
      return [];
    }
  },

    async syncTransacoes() {
      if (!navigator.onLine) {
        throw new Error('sem net');
      }

      await syncManager.uploadBatch();
      return Promise.all([
        syncManager.downloadTableBatch('transacoes', new Date(0)),
        syncManager.downloadTableBatch('propina', new Date(0))
      ]);
    },
  
  
   async markForSync(recordId: string, operation: 'upsert' | 'delete') {
    await db.syncQueue.add({
      table: 'transacoes',
      record_id: recordId,
      instituicao_id:instituicaoIdValue(),
      operation,
      status: 'pending',
      created_at: new Date().toISOString()
    });
  },

  
  async getTransacoesPorTipo(tipo: 'entrada' | 'saida'): Promise<Transacao[]> {
    try {
      const instituicaoId = getActiveInstituicaoId();
      if (!instituicaoId) return [];
      const transacoes = await db.transacoes
        .where('tipo')
        .equals(tipo)
        .and(t => !t.deleted && t.instituicao_id === instituicaoId)
        .toArray();
      
      return transacoes.sort((a, b) => 
        new Date(b.data).getTime() - new Date(a.data).getTime()
      );
    } catch (error) {
      console.error('Erro ao buscar transações por tipo:', error);
      return [];
    }
  },

  
  async getTransacoesPorCategoria(categoria: Transacao['categoria']): Promise<Transacao[]> {
    try {
      const instituicaoId = getActiveInstituicaoId();
      if (!instituicaoId) return [];
      const transacoes = await db.transacoes
        .where('categoria')
        .equals(categoria)
        .and(t => !t.deleted && t.instituicao_id === instituicaoId)
        .toArray();
      
      return transacoes.sort((a, b) => 
        new Date(b.data).getTime() - new Date(a.data).getTime()
      );
    } catch (error) {
      console.error('Erro ao buscar transações por categoria:', error);
      return [];
    }
  },

  
  async getPagamentosPorAno(ano: number): Promise<Transacao[]> {
    try {
      const instituicaoId = getActiveInstituicaoId();
      if (!instituicaoId) return [];
      const inicioAno = `${ano}-01-01`;
      const fimAno = `${ano}-12-31`;
      
      
      const transacoesLocais = await db.transacoes
        .where('tipo')
        .equals('entrada')
        .and(t => !t.deleted && t.instituicao_id === instituicaoId)
        .toArray();
      
      
      const filtradas = transacoesLocais.filter(t => {
        const data = new Date(t.data);
        return data.getFullYear() === ano;
      });
      
      
      if (navigator.onLine) {
        const { data: transacoesRemotas, error } = await supabase
          .from('transacoes')
          .select('*')
          .eq('instituicao_id', instituicaoId)
          .eq('tipo', 'entrada')
          .gte('data', inicioAno)
          .lte('data', fimAno)
          .order('data', { ascending: true });

        if (!error && transacoesRemotas) {
          
          const todasTransacoes = [...filtradas];
          for (const remota of transacoesRemotas) {
            if (!todasTransacoes.find(t => t.id === remota.id)) {
              todasTransacoes.push({
                ...remota,
                sync_status: 'synced' as const,
                deleted: false
              });
            }
          }
          
          return todasTransacoes.sort((a, b) => 
            new Date(a.data).getTime() - new Date(b.data).getTime()
          );
        }
      }
      
      
      return filtradas.sort((a, b) => 
        new Date(a.data).getTime() - new Date(b.data).getTime()
      );

    } catch (error) {
      console.error('Erro ao buscar pagamentos por ano:', error);
      return [];
    }
  },

  
  async getDespesasPorAno(ano: number): Promise<Transacao[]> {
    try {
      const instituicaoId = getActiveInstituicaoId();
      if (!instituicaoId) return [];
      const inicioAno = `${ano}-01-01`;
      const fimAno = `${ano}-12-31`;
      
      
      const transacoesLocais = await db.transacoes
        .where('tipo')
        .equals('saida')
        .and(t => !t.deleted && t.instituicao_id === instituicaoId)
        .toArray();
      
      
      const filtradas = transacoesLocais.filter(t => {
        const data = new Date(t.data);
        return data.getFullYear() === ano;
      });
      
      
      if (navigator.onLine) {
        const { data: transacoesRemotas, error } = await supabase
          .from('transacoes')
          .select('*')
          .eq('instituicao_id', instituicaoId)
          .eq('tipo', 'saida')
          .gte('data', inicioAno)
          .lte('data', fimAno)
          .order('data', { ascending: true });

        if (!error && transacoesRemotas) {
          const todasTransacoes = [...filtradas];
          for (const remota of transacoesRemotas) {
            if (!todasTransacoes.find(t => t.id === remota.id)) {
              todasTransacoes.push({
                ...remota,
                sync_status: 'synced' as const,
                deleted: false
              });
            }
          }
          
          return todasTransacoes.sort((a, b) => 
            new Date(a.data).getTime() - new Date(b.data).getTime()
          );
        }
      }
      
      return filtradas.sort((a, b) => 
        new Date(a.data).getTime() - new Date(b.data).getTime()
      );

    } catch (error) {
      console.error('Erro ao buscar despesas:', error);
      return [];
    }
  },

  
  async getHistoricoPagamentos(): Promise<Transacao[]> {
    try {
      const instituicaoId = getActiveInstituicaoId();
      if (!instituicaoId) return [];
      const transacoes = await db.transacoes
        .where('tipo')
        .equals('entrada')
        .and(t => !t.deleted && t.instituicao_id === instituicaoId)
        .toArray();
      
      
      return transacoes
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
        .slice(0, 10);

    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      return [];
    }
  },

  
  async updateTransacao(id: string, transacaoData: Partial<TransacaoFormData>) {
    try {
      const updated_at = new Date().toISOString();
      const instituicaoId = getActiveInstituicaoId();
      const existente = await db.transacoes.get(id);
      if (!existente || !instituicaoId || existente.instituicao_id !== instituicaoId) {
        throw new Error('Transação não encontrada para a instituição ativa.');
      }
      
      await db.transacoes.update(id, {
        ...transacaoData,
        updated_at,
        sync_status: 'pending' as const
      });

      
      await db.syncQueue.add({
        table: 'transacoes',
        record_id: id,
        instituicao_id: instituicaoId,
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });
      
      } catch (error) {
      console.error('Erro ao atualizar transação:', error);
      throw error;
    }
  },

  
  async deleteTransacao(id: string) {
    try {
      const transacao = await db.transacoes.get(id);
      const instituicaoId = getActiveInstituicaoId();
      if (!transacao || !instituicaoId || transacao.instituicao_id !== instituicaoId) return;

      await propinaCascadeService.deleteByTransacao(id, instituicaoId);

      if (transacao.sync_status === 'synced' && !transacao.id.startsWith('local_')) {
        
        await db.transacoes.update(id, { 
          deleted: true, 
          sync_status: 'pending_delete' as const,
          updated_at: new Date().toISOString()
        });
        
        await db.syncQueue.add({
          table: 'transacoes',
          record_id: id,
          instituicao_id: instituicaoId,
          operation: 'delete',
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        } else {
        
        await db.transacoes.delete(id);
        
        
        await db.syncQueue
          .where('record_id')
          .equals(id)
          .and((item) => item.instituicao_id === instituicaoId)
          .delete();
          
        }
      
    } catch (error) {
      console.error('Erro ao deletar transação:', error);
      throw error;
    }
  },

  
  async checkDatabaseHealth() {
    try {
      const instituicaoId = getActiveInstituicaoId();
      if (!instituicaoId) {
        return {
          transacoesTotal: 0,
          transacoesAtivas: 0,
          pendentes: 0,
          online: navigator.onLine,
          bancoAberto: db.isOpen()
        };
      }

      const transacaoCount = await db.transacoes
        .filter((t) => t.instituicao_id === instituicaoId)
        .count();
      const queueCount = await db.syncQueue
        .where('instituicao_id')
        .equals(instituicaoId)
        .and(item => item.table === 'transacoes' && item.status === 'pending')
        .count();
      
      return {
        transacoesTotal: transacaoCount,
        transacoesAtivas: (await this.getAllTransactions()).length,
        pendentes: queueCount,
        online: navigator.onLine,
        bancoAberto: db.isOpen()
      };
    } catch (error: any) {
      return {
        error: error.message,
        bancoAberto: false
      };
    }
  },

  
  async calcularTotalPorPeriodo(tipo: 'entrada' | 'saida', inicio: Date, fim: Date): Promise<number> {
    try {
      const instituicaoId = getActiveInstituicaoId();
      if (!instituicaoId) return 0;
      const transacoes = await db.transacoes
        .where('tipo')
        .equals(tipo)
        .and(t => !t.deleted && t.instituicao_id === instituicaoId)
        .toArray();
      
      return transacoes
        .filter(t => {
          const data = new Date(t.data);
          return data >= inicio && data <= fim;
        })
        .reduce((total, t) => total + t.valor, 0);
    } catch (error) {
      console.error('Erro ao calcular total:', error);
      return 0;
    }
  }
};

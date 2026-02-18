// services/database/transacaoService.ts
import { supabase } from '../database/db';
import { propinaService } from './propinas';
import db from './db';
import { AlocacaoRecurso, AlocacaoRecursoFormData, DadosPagamentoCash, Transacao, TransacaoFormData } from '../../types/transacao';
import { syncManager } from './syncManager';
import { configService } from './config';
import { estrategiaService } from './estrategiaService';
import { progress } from 'framer-motion';
import { instituicaoIdValue } from '../../utils/getInsitituicaoID';
import { generateUniqueId } from '../../utils/idGenarator';
import { financeRulesService } from '../finance/financeRulesService';

const getActiveInstituicaoId = () => instituicaoIdValue();

export const transacaoService = {
  // ✅ Criar transação localmente
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

      console.log('💾 Salvando transação:', transacao.descricao);
      
      await db.transacoes.put(transacao);
      
      // Adicionar à fila de sincronização
      await db.syncQueue.add({
        table: 'transacoes',
        instituicao_id: instituicaoId,
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      console.log('✅ Transação salva com ID:', id);
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

      console.log('💾 Salvando alocacao:', alocacao.motivo);
      
      await db.alocacao.put(alocacao);
      
      // Adicionar à fila de sincronização
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
      const meta= await estrategiaService.getMetasID(alocacao.meta_id)
      const progresso:number=meta&&meta.orcamento_previsto?((100*alocacao.valor)/meta.orcamento_previsto):0
      estrategiaService.updateMeta(alocacao.meta_id,{
        progresso: Math.round(progresso)+meta.progresso

      })


      console.log('✅ Transação salva com ID:', id);
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
  

  // ✅ Processar pagamento com cartão (inclui sincronização)
  async processarPagamento(dados: TransacaoFormData): Promise<{sucesso: boolean; mensagem: string; dados?: any}> {
    try {
      // Primeiro, salvar localmente
      const transacaoId = await this.createTransacao(dados);
      
      // Se online, tentar sincronizar imediatamente
      if (navigator.onLine) {
        await this.syncTransacoes();
        
        // Buscar transação sincronizada
        const transacaoSincronizada = await db.transacoes.get(transacaoId);
        
        return {
          sucesso: true,
          mensagem: `Pagamento do cartão registrado com sucesso!`,
          dados: transacaoSincronizada
        };
      }
      
      // Se offline, retornar dados locais
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



  // ✅ Processar mensalidade com sincronização
  async processarMensalidade(alunoId: string, dados: DadosPagamentoCash): Promise<{sucesso: boolean; mensagem: string; dados?: any}> {
    try {
      const valorTotal = parseFloat(dados.valor) * dados.meses;
      
      if (!dados.mesReferencia) {
        return {
          sucesso: false,
          mensagem: `Mês de referência não informado`,
        };
      }

      // Criar transação localmente
      const transacaoData: TransacaoFormData = {
        valor: valorTotal,
        tipo: 'entrada',
        categoria: 'mensalidade',
        data: new Date().toISOString(),
        descricao: `Pagamento de ${dados.meses} mes(es) de propina - ${dados.mesReferencia.join(', ')}`
      };

      const transacaoId = await this.createTransacao(transacaoData);
      const transacaoLocal = await db.transacoes.get(transacaoId);

      // Registrar propinas para cada mês (também deve ter sincronização)
      for (let i = 0; i < dados.meses; i++) {
        const mesRef = (dados.mesReferencia[i].substring(0, 3) as 'Jan' | 'Fev' | 'Mar' | 'Abr' | 'Mai' | 'Jun' | 'Jul' | 'Ago' | 'Set' | 'Out' | 'Nov' | 'Dez');

        await propinaService.registerPropina({
          aluno_id: alunoId,
          data_vencimento: new Date(new Date().getFullYear(), new Date().getMonth() + i + 1, 0).toISOString(),
          data_pagamento: new Date().toISOString(),
          valor_pago: parseFloat(dados.valor),
          valor_falta: 0,
          mes_referencia: mesRef,
          transacao_id: transacaoId,
          estado: 'pago',
          ano_lectivo:await configService.getConfigValue("academic", "academic_year")

        });
      }

      // Pré-pago: se mês atual foi pago, marca aluno em dia localmente.
      await financeRulesService.markStudentPaidIfCurrentMonthPaid(
        alunoId,
        dados.mesReferencia
      );

      // Sincronizar se online
      if (navigator.onLine) {
        await this.syncTransacoes();
      }

      return {
        sucesso: true,
        mensagem: `Pagamento de ${dados.meses} mes(es) registrado com sucesso!`,
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

  // ✅ Buscar todas as transações
  async getAllTransactions(): Promise<Transacao[]> {
    try {
      console.log('📋 Buscando transações...');
      const instituicaoId = getActiveInstituicaoId();
      if (!instituicaoId) return [];
      
      const todasTransacoes = await db.transacoes.toArray();
      
      // Filtrar as não deletadas
      const transacoesAtivas = todasTransacoes.filter(t => !t.deleted && t.instituicao_id === instituicaoId);
      
      // Ordenar por data (mais recente primeiro)
      transacoesAtivas.sort((a, b) => 
        new Date(b.data).getTime() - new Date(a.data).getTime()
      );
      
      console.log(`✅ Encontradas ${transacoesAtivas.length} transações ativas`);
      return transacoesAtivas;
    } catch (error) {
      console.error('❌ Erro ao buscar transações:', error);
      return [];
    }
  },

    async syncTransacoes() {
      return syncManager.downloadTableBatch('transacoes', new Date(0));
    },
  
  // ✅ Função auxiliar para marcar como pendente
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

  // ✅ Buscar transações por tipo
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

  // ✅ Buscar transações por categoria
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

  // ✅ Buscar pagamentos por ano (agora busca local + remoto)
  async getPagamentosPorAno(ano: number): Promise<Transacao[]> {
    try {
      const instituicaoId = getActiveInstituicaoId();
      if (!instituicaoId) return [];
      const inicioAno = `${ano}-01-01`;
      const fimAno = `${ano}-12-31`;
      
      // Primeiro buscar localmente
      const transacoesLocais = await db.transacoes
        .where('tipo')
        .equals('entrada')
        .and(t => !t.deleted && t.instituicao_id === instituicaoId)
        .toArray();
      
      // Filtrar por ano localmente
      const filtradas = transacoesLocais.filter(t => {
        const data = new Date(t.data);
        return data.getFullYear() === ano;
      });
      
      // Se online, também buscar do Supabase para garantir dados completos
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
          // Combinar resultados (remover duplicatas baseadas no ID)
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
      
      // Retornar apenas locais se offline ou erro
      return filtradas.sort((a, b) => 
        new Date(a.data).getTime() - new Date(b.data).getTime()
      );

    } catch (error) {
      console.error('Erro ao buscar pagamentos por ano:', error);
      return [];
    }
  },

  // ✅ Buscar despesas por ano
  async getDespesasPorAno(ano: number): Promise<Transacao[]> {
    try {
      const instituicaoId = getActiveInstituicaoId();
      if (!instituicaoId) return [];
      const inicioAno = `${ano}-01-01`;
      const fimAno = `${ano}-12-31`;
      
      // Primeiro buscar localmente
      const transacoesLocais = await db.transacoes
        .where('tipo')
        .equals('saida')
        .and(t => !t.deleted && t.instituicao_id === instituicaoId)
        .toArray();
      
      // Filtrar por ano localmente
      const filtradas = transacoesLocais.filter(t => {
        const data = new Date(t.data);
        return data.getFullYear() === ano;
      });
      
      // Se online, também buscar do Supabase
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

  // ✅ Buscar histórico de pagamentos (últimas 10 entradas)
  async getHistoricoPagamentos(): Promise<Transacao[]> {
    try {
      const instituicaoId = getActiveInstituicaoId();
      if (!instituicaoId) return [];
      const transacoes = await db.transacoes
        .where('tipo')
        .equals('entrada')
        .and(t => !t.deleted && t.instituicao_id === instituicaoId)
        .toArray();
      
      // Ordenar por data (mais recente primeiro) e pegar primeiras 10
      return transacoes
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
        .slice(0, 10);

    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      return [];
    }
  },

  // ✅ Atualizar transação
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

      // Adicionar/atualizar na fila
      await db.syncQueue.add({
        table: 'transacoes',
        record_id: id,
        instituicao_id: instituicaoId,
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });
      
      console.log(`✏️ Transação ${id} marcada para atualização`);
      
    } catch (error) {
      console.error('Erro ao atualizar transação:', error);
      throw error;
    }
  },

  // ✅ Deletar transação (soft delete)
  async deleteTransacao(id: string) {
    try {
      const transacao = await db.transacoes.get(id);
      const instituicaoId = getActiveInstituicaoId();
      if (!transacao || !instituicaoId || transacao.instituicao_id !== instituicaoId) return;

      if (transacao.sync_status === 'synced' && !transacao.id.startsWith('local_')) {
        // Se já sincronizado, marcar para deleção remota
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
        
        console.log(`🗑️ Transação ${id} marcada para deleção remota`);
      } else {
        // Se nunca sincronizado, deletar completamente
        await db.transacoes.delete(id);
        
        // Remover da fila se existir
        await db.syncQueue
          .where('record_id')
          .equals(id)
          .and((item) => item.instituicao_id === instituicaoId)
          .delete();
          
        console.log(`🗑️ Transação ${id} deletada localmente`);
      }
      
    } catch (error) {
      console.error('Erro ao deletar transação:', error);
      throw error;
    }
  },

  // ✅ Verificar saúde do banco de transações
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

  // ✅ Calcular total por período
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

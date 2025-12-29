// services/database/transacaoService.ts
import { supabase } from '../supabase/config';
import { propinaService } from './propinas';
import db from './db';
import { DadosPagamentoCash, Transacao, TransacaoFormData } from '../../types/transacao';

const generateUniqueId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const transacaoService = {
  // ✅ Criar transação localmente
  async createTransacao(transacaoData: TransacaoFormData): Promise<string> {
    try {
      const id = generateUniqueId();
      const now = new Date().toISOString();
      
      const transacao = {
        ...transacaoData,
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

  // ✅ Processar pagamento com cartão (inclui sincronização)
  async processarPagamento(dados: TransacaoFormData): Promise<{sucesso: boolean; mensagem: string; dados?: any}> {
    try {
      // Primeiro, salvar localmente
      const transacaoId = await this.createTransacao(dados);
      
      // Se online, tentar sincronizar imediatamente
      if (navigator.onLine) {
        await this.syncPendingTransactions();
        
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
        });
      }

      // Sincronizar se online
      if (navigator.onLine) {
        await this.syncPendingTransactions();
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
      
      const todasTransacoes = await db.transacoes.toArray();
      
      // Filtrar as não deletadas
      const transacoesAtivas = todasTransacoes.filter(t => !t.deleted);
      
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

  // ✅ Sincronização bidirecional de transações
  async syncAllPending() {
    if (!navigator.onLine) {
      console.log('🌐 Offline - sincronização de transações adiada');
      return;
    }

    try {
      console.log('🔄 Iniciando sincronização bidirecional de transações...');
      
      // FASE 1: DOWNLOAD - Buscar transações do Supabase
      console.log('📥 FASE 1: Baixando transações do Supabase...');
      await this.downloadFromSupabase();
      
      // FASE 2: UPLOAD - Enviar alterações locais para Supabase
      console.log('📤 FASE 2: Enviando alterações locais...');
      await this.uploadToSupabase();
      
      console.log('✅ Sincronização de transações concluída');
      
    } catch (error) {
      console.error('❌ Erro geral na sincronização de transações:', error);
    }
  },

  // ✅ DOWNLOAD: Baixar transações do Supabase
  async downloadFromSupabase() {
    try {
      console.log('📥 Buscando últimas transações do Supabase...');
      
      const lastSync = localStorage.getItem('last_sync_transacoes');
      console.log('Última sincronização de transações:', lastSync || 'Primeira vez');
      
      let query = supabase
        .from('transacoes')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (lastSync) {
        query = query.gt('updated_at', lastSync);
      }
      
      const { data: transacoesSupabase, error } = await query;
      
      if (error) {
        console.error('❌ Erro ao buscar transações do Supabase:', error);
        return;
      }
      
      console.log(`📥 ${transacoesSupabase?.length || 0} transações encontradas no Supabase`);
      
      if (!transacoesSupabase || transacoesSupabase.length === 0) {
        console.log('📭 Nenhuma transação nova/atualizada no Supabase');
        return;
      }
      
      // Processar cada transação do Supabase
      for (const transacaoSupabase of transacoesSupabase) {
        try {
          const transacaoLocal = await db.transacoes.get(transacaoSupabase.id);
          
          if (!transacaoLocal) {
            // NOVA TRANSAÇÃO DO SUPABASE
            const transacaoParaSalvar = {
              ...transacaoSupabase,
              sync_status: 'synced' as const,
              deleted: false
            };
            
            await db.transacoes.put(transacaoParaSalvar);
            console.log(`✅ Nova transação baixada: ${transacaoSupabase.descricao}`);
            
          } else if (transacaoLocal.sync_status === 'synced') {
            // ATUALIZAÇÃO DO SUPABASE - Só atualizar se não tivermos alterações pendentes
            const localUpdated = new Date(transacaoLocal.updated_at || 0);
            const remoteUpdated = new Date(transacaoSupabase.updated_at || 0);
            
            if (remoteUpdated > localUpdated) {
              // Supabase tem versão mais recente
              const transacaoAtualizada = {
                ...transacaoLocal,
                ...transacaoSupabase,
                sync_status: 'synced' as const,
              };
              
              await db.transacoes.put(transacaoAtualizada);
              console.log(`✏️ Transação atualizada do Supabase: ${transacaoSupabase.descricao}`);
            }
          }
          // Se sync_status = 'pending', não sobrescrever (temos alterações locais não enviadas)
          
        } catch (transacaoError) {
          console.error(`❌ Erro processando transação ${transacaoSupabase.id}:`, transacaoError);
        }
      }
      
      // Atualizar timestamp da última sincronização
      localStorage.setItem('last_sync_transacoes', new Date().toISOString());
      console.log('✅ Download do Supabase concluído');
      
    } catch (error) {
      console.error('❌ Erro no download do Supabase:', error);
    }
  },

  // ✅ UPLOAD: Enviar alterações locais para Supabase
  async uploadToSupabase() {
    try {
      // Buscar itens da fila específicos para transações
      const pendingItems = await db.syncQueue
        .where('table')
        .equals('transacoes')
        .and(item => item.status === 'pending')
        .toArray();

      console.log(`📤 ${pendingItems.length} transações pendentes para envio`);

      for (const item of pendingItems) {
        try {
          const transacao = await db.transacoes.get(item.record_id);
          if (!transacao) {
            await db.syncQueue.delete(item.id || -1);
            continue;
          }

          if (item.operation === 'upsert') {
            // Preparar dados para envio
            const { sync_status, deleted, created_at, updated_at, ...dadosParaEnviar } = transacao;
            
            // Verificar se já existe no Supabase
            let transacaoExistente = null;
            if (!transacao.id.startsWith('local_')) {
              const { data } = await supabase
                .from('transacoes')
                .select('id')
                .eq('id', transacao.id)
                .maybeSingle();
              transacaoExistente = data;
            }

            let resultado;
            if (transacaoExistente) {
              // UPDATE no Supabase
              resultado = await supabase
                .from('transacoes')
                .update(dadosParaEnviar)
                .eq('id', transacao.id);
            } else {
              // INSERT no Supabase
              resultado = await supabase
                .from('transacoes')
                .insert(dadosParaEnviar)
                .select()
                .single();
              
              // Se criou no Supabase, atualizar ID local
              if (resultado.data && transacao.id.startsWith('local_')) {
                await db.transacoes.update(transacao.id, {
                  id: resultado.data.id,
                  sync_status: 'synced' as const
                });
                
                // Atualizar referência na fila
                await db.syncQueue.update(item.id || -1, {
                  record_id: resultado.data.id
                });
              }
            }

            if (resultado.error) {
              console.error('Erro Supabase:', resultado.error);
              throw resultado.error;
            }
            
            // Marcar como sincronizado
            await db.transacoes.update(item.record_id, { 
              sync_status: 'synced' as const,
              updated_at: new Date().toISOString()
            });
            await db.syncQueue.delete(item.id || -1);
            
          } else if (item.operation === 'delete') {
            // Só deletar no Supabase se não for um ID local
            if (!transacao.id.startsWith('local_')) {
              await supabase.from('transacoes').delete().eq('id', transacao.id);
            }
            
            // Deletar localmente
            await db.transacoes.delete(item.record_id);
            await db.syncQueue.delete(item.id || -1);
          }

          console.log(`[Sync] Transação ${item.record_id} sincronizada`);
          
        } catch (itemError) {
          console.error(`[Sync] Erro na transação ${item.record_id}:`, itemError);
          
          // Incrementar tentativas
          const novasTentativas = (item.retryCount || 0) + 1;
          await db.syncQueue.update(item.id || -1, {
            retryCount: novasTentativas,
            status: novasTentativas >= 3 ? 'failed' : 'pending'
          });
        }
        
        // Pausa entre operações
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      console.log('✅ Upload para Supabase concluído');
    } catch (error) {
      console.error('❌ Erro no upload para Supabase:', error);
    }
  },

  // ✅ Função auxiliar para sincronizar transações pendentes
  async syncPendingTransactions() {
    return this.syncAllPending();
  },

  // ✅ Buscar transações por tipo
  async getTransacoesPorTipo(tipo: 'entrada' | 'saida'): Promise<Transacao[]> {
    try {
      const transacoes = await db.transacoes
        .where('tipo')
        .equals(tipo)
        .and(t => !t.deleted)
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
      const transacoes = await db.transacoes
        .where('categoria')
        .equals(categoria)
        .and(t => !t.deleted)
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
      const inicioAno = `${ano}-01-01`;
      const fimAno = `${ano}-12-31`;
      
      // Primeiro buscar localmente
      const transacoesLocais = await db.transacoes
        .where('tipo')
        .equals('entrada')
        .and(t => !t.deleted)
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
      const inicioAno = `${ano}-01-01`;
      const fimAno = `${ano}-12-31`;
      
      // Primeiro buscar localmente
      const transacoesLocais = await db.transacoes
        .where('tipo')
        .equals('saida')
        .and(t => !t.deleted)
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
      const transacoes = await db.transacoes
        .where('tipo')
        .equals('entrada')
        .and(t => !t.deleted)
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
      
      await db.transacoes.update(id, {
        ...transacaoData,
        updated_at,
        sync_status: 'pending' as const
      });

      // Adicionar/atualizar na fila
      await db.syncQueue.add({
        table: 'transacoes',
        record_id: id,
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
      if (!transacao) return;

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
      const transacaoCount = await db.transacoes.count();
      const queueCount = await db.syncQueue
        .where('table')
        .equals('transacoes')
        .and(item => item.status === 'pending')
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
      const transacoes = await db.transacoes
        .where('tipo')
        .equals(tipo)
        .and(t => !t.deleted)
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
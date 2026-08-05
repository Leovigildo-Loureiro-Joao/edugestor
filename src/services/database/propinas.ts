
import { supabase } from '../database/db';
import db from './db';
import { Propina, PropinaFormData } from '../../types/propina';
import { alunosService } from './alunosService';
import { Student } from '../../types';
import { instituicaoIdValue } from '../../utils/getInsitituicaoID';

const generateUniqueId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const getActiveInstituicaoId = () => instituicaoIdValue();

export const propinaService = {
  
  async registerPropina(data: PropinaFormData): Promise<string> {
    try {
      const id = generateUniqueId();
      const now = new Date().toISOString();
      
      
      const aluno = await alunosService.getStudentById(data.aluno_id);
      const instituicaoId = aluno?.instituicao_id || instituicaoIdValue();

      if (!instituicaoId) {
        throw new Error('Instituição ativa não encontrada para registrar propina.');
      }
      
      
      const valorPropina = aluno?.propina || 0;
      const valorFalta = valorPropina - data.valor_pago;
      const estado = valorFalta > 0 ? 'pendente' : 'pago';
      
      const propina = {
        ...data,
        instituicao_id: instituicaoId,
        id,
        valor_falta: valorFalta> 0?valorFalta:0,
        estado,
        created_at: now,
        updated_at: now,
        sync_status: 'pending' as const,
        deleted: false,
      } as Propina;

      await db.propina.put(propina);
      
      
      await db.syncQueue.add({
        instituicao_id: instituicaoId,
        table: 'propina',
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      return id;
      
    } catch (error) {
      console.error('❌ Erro ao salvar propina:', error);
      throw error;
    }
  },

  
  async getAllPropinas(): Promise<Propina[]> {
    try {
      const instituicaoId = getActiveInstituicaoId();
      if (!instituicaoId) return [];
      
      const todasPropinas = await db.propina.toArray();
      
      
      const propinasAtivas = todasPropinas.filter(
        (propina) => !propina.deleted && propina.instituicao_id === instituicaoId
      );
      
      
      propinasAtivas.sort((a, b) => 
        new Date(b.data_vencimento).getTime() - new Date(a.data_vencimento).getTime()
      );
      
      return propinasAtivas;
    } catch (error) {
      console.error('❌ Erro ao buscar propinas:', error);
      return [];
    }
  },

  
  async syncAllPending() {
    if (!navigator.onLine) {
      return;
    }

    try {
      
      await this.downloadFromSupabase();
      
      
      await this.uploadToSupabase();
      
      } catch (error) {
      console.error('❌ Erro geral na sincronização de propinas:', error);
    }
  },

  
  async downloadFromSupabase() {
    try {
      const instituicaoId = getActiveInstituicaoId();
      if (!instituicaoId) return;
      
      const lastSync = localStorage.getItem('last_sync_propinas');
      let query = supabase
        .from('propina')
        .select('*, alunos(nome_completo)')
        .eq('instituicao_id', instituicaoId)
        .order('updated_at', { ascending: false });
      
      if (lastSync) {
        query = query.gt('updated_at', lastSync);
      }
      
      const { data: propinasSupabase, error } = await query;
      
      if (error) {
        console.error('❌ Erro ao buscar propinas do Supabase:', error);
        return;
      }
      
      if (!propinasSupabase || propinasSupabase.length === 0) {
        return;
      }
      
      
      for (const propinaSupabase of propinasSupabase) {
        try {
          const propinaLocal = await db.propina.get(propinaSupabase.id);
          
          if (!propinaLocal) {
            
            const propinaParaSalvar = {
              ...propinaSupabase,
              sync_status: 'synced' as const,
              deleted: false
            };
            
            await db.propina.put(propinaParaSalvar);
            } else if (propinaLocal.sync_status === 'synced') {
            
            const localUpdated = new Date(propinaLocal.updated_at || 0);
            const remoteUpdated = new Date(propinaSupabase.updated_at || 0);
            
            if (remoteUpdated > localUpdated) {
              
              const propinaAtualizada = {
                ...propinaLocal,
                ...propinaSupabase,
                sync_status: 'synced' as const,
              };
              
              await db.propina.put(propinaAtualizada);
              }
          }
          
          
        } catch (propinaError) {
          console.error(`❌ Erro processando propina ${propinaSupabase.id}:`, propinaError);
        }
      }
      
      
      localStorage.setItem('last_sync_propinas', new Date().toISOString());
      } catch (error) {
      console.error('❌ Erro no download do Supabase:', error);
    }
  },

  
  async uploadToSupabase() {
    try {
      const instituicaoId = instituicaoIdValue();
      if (!instituicaoId) return;
      
      const pendingItems = await db.syncQueue
        .where('instituicao_id')
        .equals(instituicaoId)
        .and(item => item.table === 'propina' && item.status === 'pending')
        .toArray();

      for (const item of pendingItems) {
        try {
          const propina = await db.propina.get(item.record_id);
          if (!propina) {
            await db.syncQueue.delete(item.id || -1);
            continue;
          }

          if (item.operation === 'upsert') {
            
            const { sync_status, deleted, created_at, updated_at, ...dadosParaEnviar } = propina;
            
            
            let propinaExistente = null;
            if (!propina.id.startsWith('local_')) {
              const { data } = await supabase
                .from('propina')
                .select('id')
                .eq('id', propina.id)
                .maybeSingle();
              propinaExistente = data;
            }

            let resultado;
            if (propinaExistente) {
              
              resultado = await supabase
                .from('propina')
                .update(dadosParaEnviar)
                .eq('id', propina.id)
                .select('*, alunos(nome_completo)')
                .single();
            } else {
              
              resultado = await supabase
                .from('propina')
                .insert(dadosParaEnviar)
                .select('*, alunos(nome_completo)')
                .single();
              
              
              if (resultado.data && propina.id.startsWith('local_')) {
                await db.propina.update(propina.id, {
                  id: resultado.data.id,
                  sync_status: 'synced' as const
                });
                
                
                await db.syncQueue.update(item.id || -1, {
                  record_id: resultado.data.id
                });
              }
            }

            if (resultado.error) {
              console.error('Erro Supabase:', resultado.error);
              throw resultado.error;
            }
            
            
            await db.propina.update(item.record_id, { 
              sync_status: 'synced' as const,
              updated_at: new Date().toISOString()
            });
            await db.syncQueue.delete(item.id || -1);
            
          } else if (item.operation === 'delete') {
            
            if (!propina.id.startsWith('local_')) {
              await supabase.from('propina').delete().eq('id', propina.id);
            }
            
            
            await db.propina.delete(item.record_id);
            await db.syncQueue.delete(item.id || -1);
          }

          } catch (itemError) {
          console.error(`[Sync] Erro na propina ${item.record_id}:`, itemError);
          
          
          const novasTentativas = (item.retry_count || 0) + 1;
          await db.syncQueue.update(item.id || -1, {
            retry_count: novasTentativas,
            status: novasTentativas >= 3 ? 'failed' : 'pending'
          });
        }
        
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      } catch (error) {
      console.error('❌ Erro no upload para Supabase:', error);
    }
  },

  
  async syncPendingPropinas() {
    return this.syncAllPending();
  },

  
  async SearchMesesPagos(alunoId: string): Promise<string[]> {
    try {
      const instituicaoId = getActiveInstituicaoId();
      if (!instituicaoId) return [];
      const propinas = await db.propina
        .where('aluno_id')
        .equals(alunoId)
        .and(
          (propina) =>
            propina.estado === 'pago' &&
            !propina.deleted &&
            propina.instituicao_id === instituicaoId
        )
        .toArray();
      
      
      const mesesPagos = new Set<string>();
      propinas.forEach(propina => {
        if (propina.mes_referencia) {
          mesesPagos.add(propina.mes_referencia);
        }
      });
      
      return Array.from(mesesPagos);

    } catch (error) {
      console.error('❌ Erro ao buscar meses pagos:', error);
      return [];
    }
  },

  
  async getByAluno(alunoId: string): Promise<Propina[]> {
    try {
      const instituicaoId = getActiveInstituicaoId();
      if (!instituicaoId) return [];
      const propinas = await db.propina
        .where('aluno_id')
        .equals(alunoId)
        .and((propina) => !propina.deleted && propina.instituicao_id === instituicaoId)
        .toArray();
      
      
      return propinas.sort((a, b) => 
        new Date(b.data_vencimento).getTime() - new Date(a.data_vencimento).getTime()
      );

    } catch (error) {
      console.error('❌ Erro ao buscar propinas do aluno:', error);
      return [];
    }
  },

  
  async grafico(ano?: number) {
    try {
      let propinas = await this.getAllPropinas();
      
      
      if (!ano) {
        const seisMesesAtras = new Date();
        seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
        
        propinas = propinas.filter(propina => 
          new Date(propina.data_vencimento) >= seisMesesAtras
        );
      } else {
        
        propinas = propinas.filter(propina => {
          const anoVencimento = new Date(propina.data_vencimento).getFullYear();
          return anoVencimento === ano;
        });
      }
      
      
      propinas.sort((a, b) => 
        new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
      );
      
      
      const dadosFormatados = propinas.map(propina => ({
        data_pagamento: propina.data_pagamento,
        data_vencimento: propina.data_vencimento,
        estado: propina.estado,
        valor_pago: propina.valor_pago,
        valor_falta: propina.valor_falta,
        mes_referencia: propina.mes_referencia,
        aluno_id: propina.aluno_id
      }));
      
      return dadosFormatados;

    } catch (error) {
      console.error('❌ Erro ao gerar dados para gráfico:', error);
      return [];
    }
  },

  
  async getHistoricoPagamentos(limite = 10) {
    try {
      const instituicaoId = getActiveInstituicaoId();
      if (!instituicaoId) return [];
      const propinas = await db.propina
        .where('data_pagamento')
        .notEqual('')
        .and((propina) => !propina.deleted && propina.instituicao_id === instituicaoId)
        .toArray();
      
      
      propinas.sort((a, b) => 
        new Date(b.data_pagamento || '').getTime() - new Date(a.data_pagamento || '').getTime()
      );
      
      
      const propinasLimitadas = propinas.slice(0, limite);
      
      
      const historicoComNomes = [];
      for (const propina of propinasLimitadas) {
        const aluno = await alunosService.getStudentById(propina.aluno_id);
        historicoComNomes.push({
          ...propina,
          aluno_nome: aluno?.nome_completo || 'Aluno não encontrado'
        });
      }
      
      return historicoComNomes;

    } catch (error) {
      console.error('❌ Erro ao buscar histórico:', error);
      return [];
    }
  },

  
  async updatePropina(id: string, updates: Partial<PropinaFormData>) {
    try {
      const updated_at = new Date().toISOString();
      const instituicaoId = getActiveInstituicaoId();
      const propinaAtual = await db.propina.get(id);
      if (!propinaAtual || !instituicaoId || propinaAtual.instituicao_id !== instituicaoId) {
        throw new Error('Propina não encontrada para a instituição ativa.');
      }
      
      
      if (updates.valor_pago !== undefined) {
        const aluno = await alunosService.getStudentById(propinaAtual.aluno_id);
        const valorPropina = aluno?.propina || 0;
        const valorFalta = valorPropina - updates.valor_pago;
        
        updates.valor_falta = valorFalta;
        updates.estado = valorFalta > 0 ? 'pendente' : 'pago';
      }
      
      await db.propina.update(id, {
        ...updates,
        updated_at,
        sync_status: 'pending' as const
      });

      
      await db.syncQueue.add({
        instituicao_id: instituicaoId,
        table: 'propina',
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });
      
      return await db.propina.get(id);
      
    } catch (error) {
      console.error('Erro ao atualizar propina:', error);
      throw error;
    }
  },

  
  async deletePropina(id: string) {
    try {
      const propina = await db.propina.get(id);
      const instituicaoId = getActiveInstituicaoId();
      if (!propina || !instituicaoId || propina.instituicao_id !== instituicaoId) return;

      if (propina.sync_status === 'synced' && !propina.id.startsWith('local_')) {
        
        await db.propina.update(id, { 
          deleted: true, 
          sync_status: 'pending_delete' as const,
          updated_at: new Date().toISOString()
        });
        
        await db.syncQueue.add({
          instituicao_id: instituicaoId,
          table: 'propina',
          record_id: id,
          operation: 'delete',
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        } else {
        
        await db.propina.delete(id);
        
        
        await db.syncQueue
          .where('record_id')
          .equals(id)
          .and((item) => item.instituicao_id === instituicaoId)
          .delete();
          
        }
      
    } catch (error) {
      console.error('Erro ao deletar propina:', error);
      throw error;
    }
  },

  
  async getByMesReferencia(mes: Propina['mes_referencia'], estado?: Propina['estado']) {
    try {
      const instituicaoId = getActiveInstituicaoId();
      if (!instituicaoId) return [];
      let query = db.propina
        .where('mes_referencia')
        .equals(mes)
        .and((propina) => !propina.deleted && propina.instituicao_id === instituicaoId);
      
      if (estado) {
        query = query.and(propina => propina.estado === estado);
      }
      
      const propinas = await query.toArray();
      
      
      return propinas.sort((a, b) => 
        new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
      );

    } catch (error) {
      console.error('❌ Erro ao buscar propinas por mês:', error);
      return [];
    }
  },

  
  async getAtrasadas(): Promise<Propina[]> {
    try {
      const instituicaoId = getActiveInstituicaoId();
      if (!instituicaoId) return [];
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const propinas = await db.propina
        .where('estado')
        .equals('pendente')
        .and((propina) => !propina.deleted && propina.instituicao_id === instituicaoId)
        .toArray();
      
      
      return propinas.filter(propina => {
        const dataVencimento = new Date(propina.data_vencimento);
        dataVencimento.setHours(0, 0, 0, 0);
        return dataVencimento < hoje;
      }).sort((a, b) => 
        new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
      );

    } catch (error) {
      console.error('❌ Erro ao buscar propinas atrasadas:', error);
      return [];
    }
  },

  
  async atualizarEstadosAtrasados() {
    try {
      const propinasAtrasadas = await this.getAtrasadas();
      const hoje = new Date().toISOString();
      
      for (const propina of propinasAtrasadas) {
        if (propina.estado !== 'atrasado') {
          await this.updatePropina(propina.id, {
            estado: 'atrasado',
            
            multa: propina.multa === 0 ? propina.valor_falta * 0.1 : propina.multa
          });
          }
      }
      
      return propinasAtrasadas.length;
    } catch (error) {
      console.error('❌ Erro ao atualizar estados atrasados:', error);
      return 0;
    }
  },

  
  async calcularTotalRecebido(inicio: Date, fim: Date): Promise<number> {
    try {
      const instituicaoId = getActiveInstituicaoId();
      if (!instituicaoId) return 0;
      const propinas = await db.propina
        .where('estado')
        .equals('pago')
        .and((propina) => !propina.deleted && propina.instituicao_id === instituicaoId)
        .toArray();
      
      return propinas
        .filter(propina => {
          const dataPagamento = propina.data_pagamento ? new Date(propina.data_pagamento) : null;
          return dataPagamento && dataPagamento >= inicio && dataPagamento <= fim;
        })
        .reduce((total, propina) => total + propina.valor_pago, 0);

    } catch (error) {
      console.error('❌ Erro ao calcular total recebido:', error);
      return 0;
    }
  },

  
  async checkDatabaseHealth() {
    try {
      const instituicaoId = getActiveInstituicaoId();
      if (!instituicaoId) {
        return {
          propinasTotal: 0,
          propinasAtivas: 0,
          pendentes: 0,
          atrasadas: 0,
          online: navigator.onLine,
          bancoAberto: db.isOpen(),
          inconsistencia: 0
        };
      }

      const propinaCount = await db.propina
        .filter((p) => p.instituicao_id === instituicaoId)
        .count();
      const queueCount = await db.syncQueue
        .where('instituicao_id')
        .equals(instituicaoId)
        .and(item => item.table === 'propina' && item.status === 'pending')
        .count();
      
      const propinasAtivas = (await this.getAllPropinas()).length;
      const atrasadas = (await this.getAtrasadas()).length;
      
      return {
        propinasTotal: propinaCount,
        propinasAtivas: propinasAtivas,
        pendentes: queueCount,
        atrasadas: atrasadas,
        online: navigator.onLine,
        bancoAberto: db.isOpen(),
        inconsistencia: propinaCount - propinasAtivas 
      };
    } catch (error: any) {
      return {
        error: error.message,
        bancoAberto: false
      };
    }
  },

  
  async getEstatisticas() {
    try {
      const todasPropinas = await this.getAllPropinas();
      
      
      const porEstado: Record<string, number> = {};
      const porMes: Record<string, number> = {};
      let totalRecebido = 0;
      let totalPendente = 0;
      
      todasPropinas.forEach(propina => {
        
        const estado = propina.estado;
        porEstado[estado] = (porEstado[estado] || 0) + 1;
        
        
        const mes = propina.mes_referencia;
        porMes[mes] = (porMes[mes] || 0) + 1;
        
        
        if (estado === 'pago') {
          totalRecebido += propina.valor_pago;
        } else {
          totalPendente += propina.valor_falta;
        }
      });
      
      return {
        total: todasPropinas.length,
        porEstado,
        porMes,
        totalRecebido,
        totalPendente,
        ultimaAtualizacao: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao gerar estatísticas:', error);
      return {
        total: 0,
        porEstado: {},
        porMes: {},
        totalRecebido: 0,
        totalPendente: 0,
        ultimaAtualizacao: new Date().toISOString()
      };
    }
  }
};

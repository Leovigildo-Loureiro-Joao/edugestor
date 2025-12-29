// services/database/frequenciaService.ts
import { supabase } from '../supabase/config';
import db from './db';
import { Frequencia, FrequenciaData, RegistroFrequenciaLote } from '../../types/frequencia';

const generateUniqueId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const frequenciaService = {
  // ✅ Registrar frequência em lote (com suporte offline)
  async registrarFrequenciaLote(registro: RegistroFrequenciaLote): Promise<string[]> {
    try {
      const ids: string[] = [];
      const now = new Date().toISOString();
      const dataAula = registro.data_aula || new Date().toISOString().split('T')[0];
      
      for (const registroAluno of registro.registros) {
        const id = generateUniqueId();
        
        const frequencia = {
          id,
          aula_id: registro.aula_id,
          aluno_id: registroAluno.aluno_id,
          data_aula: dataAula,
          presente: registroAluno.presente,
          justificativa: registroAluno.justificativa || '',
          created_at: now,
          updated_at: now,
          sync_status: 'pending' as const,
          deleted: false,
        } as Frequencia;

        console.log(`📝 Registrando frequência para aluno ${registroAluno.aluno_id}: ${registroAluno.presente ? 'presente' : 'ausente'}`);
        
        await db.frequencias.put(frequencia);
        
        // Adicionar à fila de sincronização
        await db.syncQueue.add({
          table: 'frequencias',
          record_id: id,
          operation: 'upsert',
          status: 'pending',
          created_at: now
        });
        
        ids.push(id);
      }

      console.log(`✅ ${ids.length} frequências registradas localmente para aula ${registro.aula_id}`);
      return ids;
      
    } catch (error) {
      console.error('❌ Erro ao registrar frequências em lote:', error);
      throw error;
    }
  },

  // ✅ Buscar todas as frequências
  async getAllFrequencias(): Promise<Frequencia[]> {
    try {
      console.log('📋 Buscando frequências...');
      
      const todasFrequencias = await db.frequencias.toArray();
      
      // Filtrar as não deletadas
      const frequenciasAtivas = todasFrequencias.filter(freq => !freq.deleted);
      
      // Ordenar por data (mais recente primeiro)
      frequenciasAtivas.sort((a, b) => 
        new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime()
      );
      
      console.log(`✅ Encontradas ${frequenciasAtivas.length} frequências ativas`);
      return frequenciasAtivas;
    } catch (error) {
      console.error('❌ Erro ao buscar frequências:', error);
      return [];
    }
  },

  // ✅ Sincronização bidirecional de frequências
  async syncAllPending() {
    if (!navigator.onLine) {
      console.log('🌐 Offline - sincronização de frequências adiada');
      return;
    }

    try {
      console.log('🔄 Iniciando sincronização bidirecional de frequências...');
      
      // FASE 1: DOWNLOAD - Buscar frequências do Supabase
      console.log('📥 FASE 1: Baixando frequências do Supabase...');
      await this.downloadFromSupabase();
      
      // FASE 2: UPLOAD - Enviar alterações locais para Supabase
      console.log('📤 FASE 2: Enviando alterações locais...');
      await this.uploadToSupabase();
      
      console.log('✅ Sincronização de frequências concluída');
      
    } catch (error) {
      console.error('❌ Erro geral na sincronização de frequências:', error);
    }
  },

  // ✅ DOWNLOAD: Baixar frequências do Supabase
  async downloadFromSupabase() {
    try {
      console.log('📥 Buscando últimas frequências do Supabase...');
      
      const lastSync = localStorage.getItem('last_sync_frequencias');
      console.log('Última sincronização de frequências:', lastSync || 'Primeira vez');
      
      let query = supabase
        .from('frequencias')
        .select('*, alunos(nome_completo)')
        .order('updated_at', { ascending: false });
      
      if (lastSync) {
        query = query.gt('updated_at', lastSync);
      }
      
      const { data: frequenciasSupabase, error } = await query;
      
      if (error) {
        console.error('❌ Erro ao buscar frequências do Supabase:', error);
        return;
      }
      
      console.log(`📥 ${frequenciasSupabase?.length || 0} frequências encontradas no Supabase`);
      
      if (!frequenciasSupabase || frequenciasSupabase.length === 0) {
        console.log('📭 Nenhuma frequência nova/atualizada no Supabase');
        return;
      }
      
      // Processar cada frequência do Supabase
      for (const frequenciaSupabase of frequenciasSupabase) {
        try {
          const frequenciaLocal = await db.frequencias.get(frequenciaSupabase.id);
          
          if (!frequenciaLocal) {
            // NOVA FREQUÊNCIA DO SUPABASE
            const frequenciaParaSalvar = {
              ...frequenciaSupabase,
              sync_status: 'synced' as const,
              deleted: false,
              aluno_nome: frequenciaSupabase.alunos?.nome_completo
            };
            
            await db.frequencias.put(frequenciaParaSalvar);
            console.log(`✅ Nova frequência baixada: aluno ${frequenciaSupabase.aluno_id} na aula ${frequenciaSupabase.aula_id}`);
            
          } else if (frequenciaLocal.sync_status === 'synced') {
            // ATUALIZAÇÃO DO SUPABASE - Só atualizar se não tivermos alterações pendentes
            const localUpdated = new Date(frequenciaLocal.updated_at || 0);
            const remoteUpdated = new Date(frequenciaSupabase.updated_at || 0);
            
            if (remoteUpdated > localUpdated) {
              // Supabase tem versão mais recente
              const frequenciaAtualizada = {
                ...frequenciaLocal,
                ...frequenciaSupabase,
                sync_status: 'synced' as const,
                aluno_nome: frequenciaSupabase.alunos?.nome_completo
              };
              
              await db.frequencias.put(frequenciaAtualizada);
              console.log(`✏️ Frequência atualizada do Supabase: ${frequenciaSupabase.id}`);
            }
          }
          // Se sync_status = 'pending', não sobrescrever (temos alterações locais não enviadas)
          
        } catch (freqError) {
          console.error(`❌ Erro processando frequência ${frequenciaSupabase.id}:`, freqError);
        }
      }
      
      // Atualizar timestamp da última sincronização
      localStorage.setItem('last_sync_frequencias', new Date().toISOString());
      console.log('✅ Download do Supabase concluído');
      
    } catch (error) {
      console.error('❌ Erro no download do Supabase:', error);
    }
  },

  // ✅ UPLOAD: Enviar alterações locais para Supabase
  async uploadToSupabase() {
    try {
      // Buscar itens da fila específicos para frequências
      const pendingItems = await db.syncQueue
        .where('table')
        .equals('frequencias')
        .and(item => item.status === 'pending')
        .toArray();

      console.log(`📤 ${pendingItems.length} frequências pendentes para envio`);

      for (const item of pendingItems) {
        try {
          const frequencia = await db.frequencias.get(item.record_id);
          if (!frequencia) {
            await db.syncQueue.delete(item.id || -1);
            continue;
          }

          if (item.operation === 'upsert') {
            // Preparar dados para envio
            const { sync_status, deleted, aluno_nome, created_at, updated_at, ...dadosParaEnviar } = frequencia;
            
            // Verificar se já existe no Supabase
            let frequenciaExistente = null;
            if (!frequencia.id.startsWith('local_')) {
              const { data } = await supabase
                .from('frequencias')
                .select('id')
                .eq('id', frequencia.id)
                .maybeSingle();
              frequenciaExistente = data;
            }

            let resultado;
            if (frequenciaExistente) {
              // UPDATE no Supabase
              resultado = await supabase
                .from('frequencias')
                .update(dadosParaEnviar)
                .eq('id', frequencia.id)
                .select('*, alunos(nome_completo)')
                .single();
            } else {
              // INSERT no Supabase
              resultado = await supabase
                .from('frequencias')
                .insert(dadosParaEnviar)
                .select('*, alunos(nome_completo)')
                .single();
              
              // Se criou no Supabase, atualizar ID local
              if (resultado.data && frequencia.id.startsWith('local_')) {
                await db.frequencias.update(frequencia.id, {
                  id: resultado.data.id,
                  sync_status: 'synced' as const,
                  aluno_nome: resultado.data.alunos?.nome_completo
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
            await db.frequencias.update(item.record_id, { 
              sync_status: 'synced' as const,
              updated_at: new Date().toISOString()
            });
            await db.syncQueue.delete(item.id || -1);
            
          } else if (item.operation === 'delete') {
            // Só deletar no Supabase se não for um ID local
            if (!frequencia.id.startsWith('local_')) {
              await supabase.from('frequencias').delete().eq('id', frequencia.id);
            }
            
            // Deletar localmente
            await db.frequencias.delete(item.record_id);
            await db.syncQueue.delete(item.id || -1);
          }

          console.log(`[Sync] Frequência ${item.record_id} sincronizada`);
          
        } catch (itemError) {
          console.error(`[Sync] Erro na frequência ${item.record_id}:`, itemError);
          
          // Incrementar tentativas
          const novasTentativas = (item.retryCount || 0) + 1;
          await db.syncQueue.update(item.id || -1, {
            retryCount: novasTentativas,
            status: novasTentativas >= 3 ? 'failed' : 'pending'
          });
        }
        
        // Pausa entre operações
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      console.log('✅ Upload para Supabase concluído');
    } catch (error) {
      console.error('❌ Erro no upload para Supabase:', error);
    }
  },

  // ✅ Função auxiliar para sincronizar frequências pendentes
  async syncPendingFrequencias() {
    return this.syncAllPending();
  },

  // ✅ Buscar frequência por aula (com suporte offline)
  async getFrequenciaPorAula(aulaId: string): Promise<Frequencia[]> {
    try {
      const frequencias = await db.frequencias
        .where('aula_id')
        .equals(aulaId)
        .and(freq => !freq.deleted)
        .toArray();
      
      // Se tiver nomes de alunos já salvos, manter. Caso contrário, podemos buscar.
      // Para performance, considerar cachear nomes de alunos em outra tabela
      
      // Ordenar por aluno_id para consistência
      return frequencias.sort((a, b) => 
        (a.aluno_id || '').localeCompare(b.aluno_id || '')
      );

    } catch (error) {
      console.error('❌ Erro ao buscar frequências da aula:', error);
      return [];
    }
  },

  // ✅ Buscar frequências por aluno
  async getByAluno(alunoId: string, dias?: number): Promise<Frequencia[]> {
    try {
      let frequencias = await db.frequencias
        .where('aluno_id')
        .equals(alunoId)
        .and(freq => !freq.deleted)
        .toArray();
      
      // Filtrar por período se especificado
      if (dias) {
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - dias);
        
        frequencias = frequencias.filter(freq => 
          new Date(freq.data_aula) >= dataLimite
        );
      }
      
      // Ordenar por data (mais recente primeiro)
      return frequencias.sort((a, b) => 
        new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime()
      );

    } catch (error) {
      console.error('❌ Erro ao buscar frequências do aluno:', error);
      return [];
    }
  },

  // ✅ Buscar frequência específica por aluno e aula
  async getFrequenciaAlunoAula(alunoId: string, aulaId: string): Promise<Frequencia | null> {
    try {
      const frequencias = await db.frequencias
        .where('aluno_id')
        .equals(alunoId)
        .and(freq => !freq.deleted)
        .toArray();
      
      return frequencias.find(freq => freq.aula_id === aulaId) || null;

    } catch (error) {
      console.error('❌ Erro ao buscar frequência específica:', error);
      return null;
    }
  },

  // ✅ Atualizar frequência individual
  async updateFrequencia(id: string, updates: Partial<FrequenciaData>) {
    try {
      const updated_at = new Date().toISOString();
      
      await db.frequencias.update(id, {
        ...updates,
        updated_at,
        sync_status: 'pending' as const
      });

      // Adicionar/atualizar na fila
      await db.syncQueue.add({
        table: 'frequencias',
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });
      
      console.log(`✏️ Frequência ${id} marcada para atualização`);
      
      return await db.frequencias.get(id);
      
    } catch (error) {
      console.error('Erro ao atualizar frequência:', error);
      throw error;
    }
  },

  // ✅ Deletar frequência (soft delete)
  async deleteFrequencia(id: string) {
    try {
      const frequencia = await db.frequencias.get(id);
      if (!frequencia) return;

      if (frequencia.sync_status === 'synced' && !frequencia.id.startsWith('local_')) {
        // Se já sincronizado, marcar para deleção remota
        await db.frequencias.update(id, { 
          deleted: true, 
          sync_status: 'pending_delete' as const,
          updated_at: new Date().toISOString()
        });
        
        await db.syncQueue.add({
          table: 'frequencias',
          record_id: id,
          operation: 'delete',
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        console.log(`🗑️ Frequência ${id} marcada para deleção remota`);
      } else {
        // Se nunca sincronizado, deletar completamente
        await db.frequencias.delete(id);
        
        // Remover da fila se existir
        await db.syncQueue
          .where('record_id')
          .equals(id)
          .delete();
          
        console.log(`🗑️ Frequência ${id} deletada localmente`);
      }
      
    } catch (error) {
      console.error('Erro ao deletar frequência:', error);
      throw error;
    }
  },

  // ✅ Deletar todas frequências de uma aula
  async deleteFrequenciasPorAula(aulaId: string) {
    try {
      const frequencias = await this.getFrequenciaPorAula(aulaId);
      
      for (const frequencia of frequencias) {
        await this.deleteFrequencia(frequencia.id);
      }
      
      console.log(`🗑️ ${frequencias.length} frequências da aula ${aulaId} marcadas para deleção`);
      return frequencias.length;
    } catch (error) {
      console.error('Erro ao deletar frequências da aula:', error);
      throw error;
    }
  },

  // ✅ Estatísticas de frequência (com suporte offline)
  async getEstatisticasFrequencia(turmaId: string, mes?: string) {
    try {
      // Primeiro precisamos buscar aulas da turma
      // Como não temos turma_id direto em frequencias, precisamos:
      // 1. Buscar aulas da turma
      // 2. Buscar frequências dessas aulas
      
      // Esta função é mais complexa offline. Por enquanto, vamos focar em estatísticas gerais.
      
      const todasFrequencias = await this.getAllFrequencias();
      
      // Filtrar por período se especificado
      let frequenciasFiltradas = todasFrequencias;
      
      if (mes) {
        const [ano, mesNum] = mes.split('-').map(Number);
        const inicioMes = new Date(ano, mesNum - 1, 1);
        const fimMes = new Date(ano, mesNum, 0);
        
        frequenciasFiltradas = frequenciasFiltradas.filter(freq => {
          const dataFreq = new Date(freq.data_aula);
          return dataFreq >= inicioMes && dataFreq <= fimMes;
        });
      }
      
      const stats = {
        total: frequenciasFiltradas.length,
        presentes: frequenciasFiltradas.filter(f => f.presente).length,
        ausentes: frequenciasFiltradas.filter(f => !f.presente).length,
        taxa_presenca: 0
      };

      stats.taxa_presenca = stats.total > 0 
        ? (stats.presentes / stats.total) * 100 
        : 0;

      return stats;

    } catch (error) {
      console.error('❌ Erro ao gerar estatísticas de frequência:', error);
      return {
        total: 0,
        presentes: 0,
        ausentes: 0,
        taxa_presenca: 0
      };
    }
  },

  // ✅ Calcular frequência por aluno
  async getFrequenciaAluno(alunoId: string, periodoDias?: number) {
    try {
      const frequencias = await this.getByAluno(alunoId, periodoDias);
      
      const stats = {
        total: frequencias.length,
        presentes: frequencias.filter(f => f.presente).length,
        ausentes: frequencias.filter(f => !f.presente).length,
        taxa_presenca: 0,
        diasConsecutivosAusentes: 0,
        ultimaPresenca: '',
        historico: frequencias.slice(0, 10) // Últimos 10 registros
      };

      stats.taxa_presenca = stats.total > 0 
        ? (stats.presentes / stats.total) * 100 
        : 0;

      // Encontrar última presença
      const presencas = frequencias.filter(f => f.presente);
      if (presencas.length > 0) {
        stats.ultimaPresenca = presencas[0].data_aula;
      }

      // Calcular dias consecutivos ausentes
      let diasAusentesConsecutivos = 0;
      const hoje = new Date();
      const frequenciasOrdenadas = [...frequencias].sort((a, b) => 
        new Date(a.data_aula).getTime() - new Date(b.data_aula).getTime()
      );
      
      for (let i = frequenciasOrdenadas.length - 1; i >= 0; i--) {
        if (frequenciasOrdenadas[i].presente) break;
        diasAusentesConsecutivos++;
      }
      
      stats.diasConsecutivosAusentes = diasAusentesConsecutivos;

      return stats;

    } catch (error) {
      console.error('❌ Erro ao calcular frequência do aluno:', error);
      return {
        total: 0,
        presentes: 0,
        ausentes: 0,
        taxa_presenca: 0,
        diasConsecutivosAusentes: 0,
        ultimaPresenca: '',
        historico: []
      };
    }
  },

  // ✅ Verificar se frequência já foi registrada para a aula
  async verificarFrequenciaRegistrada(aulaId: string): Promise<boolean> {
    try {
      const frequencias = await db.frequencias
        .where('aula_id')
        .equals(aulaId)
        .and(freq => !freq.deleted)
        .count();
      
      return frequencias > 0;

    } catch (error) {
      console.error('❌ Erro ao verificar frequência registrada:', error);
      return false;
    }
  },

  // ✅ Obter alunos sem frequência registrada para a aula
  async getAlunosSemFrequencia(aulaId: string, alunosTurma: string[]): Promise<string[]> {
    try {
      const frequencias = await this.getFrequenciaPorAula(aulaId);
      const alunosComFrequencia = new Set(frequencias.map(f => f.aluno_id));
      
      return alunosTurma.filter(alunoId => !alunosComFrequencia.has(alunoId));

    } catch (error) {
      console.error('❌ Erro ao buscar alunos sem frequência:', error);
      return [];
    }
  },

  // ✅ Verificar saúde do banco de frequências
  async checkDatabaseHealth() {
    try {
      const frequenciaCount = await db.frequencias.count();
      const queueCount = await db.syncQueue
        .where('table')
        .equals('frequencias')
        .and(item => item.status === 'pending')
        .count();
      
      const frequenciasAtivas = (await this.getAllFrequencias()).length;
      
      // Calcular taxa de presença geral
      const todasFrequencias = await this.getAllFrequencias();
      const presentes = todasFrequencias.filter(f => f.presente).length;
      const taxaPresenca = todasFrequencias.length > 0 
        ? (presentes / todasFrequencias.length) * 100 
        : 0;
      
      return {
        frequenciasTotal: frequenciaCount,
        frequenciasAtivas: frequenciasAtivas,
        pendentes: queueCount,
        taxaPresencaGeral: Math.round(taxaPresenca * 100) / 100,
        online: navigator.onLine,
        bancoAberto: db.isOpen(),
        duplicatas: frequenciaCount - frequenciasAtivas // Frequências deletadas
      };
    } catch (error: any) {
      return {
        error: error.message,
        bancoAberto: false
      };
    }
  },

  // ✅ Estatísticas de frequências
  async getEstatisticas() {
    try {
      const todasFrequencias = await this.getAllFrequencias();
      
      // Agrupar por data
      const porData: Record<string, { presentes: number; total: number }> = {};
      let totalPresencas = 0;
      let totalRegistros = 0;
      
      todasFrequencias.forEach(freq => {
        const data = freq.data_aula;
        if (!porData[data]) {
          porData[data] = { presentes: 0, total: 0 };
        }
        
        porData[data].total++;
        totalRegistros++;
        
        if (freq.presente) {
          porData[data].presentes++;
          totalPresencas++;
        }
      });
      
      // Calcular taxa por data
      const taxasPorData: Record<string, number> = {};
      Object.entries(porData).forEach(([data, stats]) => {
        taxasPorData[data] = stats.total > 0 
          ? (stats.presentes / stats.total) * 100 
          : 0;
      });
      
      return {
        totalRegistros,
        totalPresencas,
        taxaPresencaGeral: totalRegistros > 0 ? (totalPresencas / totalRegistros) * 100 : 0,
        porData: taxasPorData,
        datasComRegistro: Object.keys(porData).length,
        ultimaAtualizacao: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao gerar estatísticas:', error);
      return {
        totalRegistros: 0,
        totalPresencas: 0,
        taxaPresencaGeral: 0,
        porData: {},
        datasComRegistro: 0,
        ultimaAtualizacao: new Date().toISOString()
      };
    }
  },

  // ✅ Exportar dados de frequência
  async exportarDados(inicio: Date, fim: Date): Promise<any[]> {
    try {
      const todasFrequencias = await this.getAllFrequencias();
      
      return todasFrequencias.filter(freq => {
        const dataFreq = new Date(freq.data_aula);
        return dataFreq >= inicio && dataFreq <= fim;
      }).map(freq => ({
        id: freq.id,
        aula_id: freq.aula_id,
        aluno_id: freq.aluno_id,
        data_aula: freq.data_aula,
        presente: freq.presente,
        justificativa: freq.justificativa,
        created_at: freq.created_at,
        sync_status: freq.sync_status
      }));

    } catch (error) {
      console.error('❌ Erro ao exportar dados:', error);
      return [];
    }
  }
};
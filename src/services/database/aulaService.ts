// services/database/aulaService.ts
import { supabase } from '../supabase/config';
import db from './db';
import { Aula, AulaFormData } from '../../types/aula';

const generateUniqueId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const aulaService = {
  // ✅ Criar aula localmente
  async criarAula(aulaData: AulaFormData): Promise<string> {
    try {
      const id = generateUniqueId();
      const now = new Date().toISOString();
      
      const aula = {
        ...aulaData,
        id,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
        deleted: false,
      } as Aula;

      console.log('💾 Salvando aula:', aula.tema_aula || `Aula ${aula.data_aula}`);
      
      await db.aulas.put(aula);
      
      // Adicionar à fila de sincronização
      await db.syncQueue.add({
        table: 'aulas',
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      console.log('✅ Aula salva com ID:', id);
      return id;
      
    } catch (error) {
      console.error('❌ Erro ao salvar aula:', error);
      throw error;
    }
  },

  // ✅ Buscar todas as aulas
  async getAllAulas(): Promise<Aula[]> {
    try {
      console.log('📋 Buscando aulas...');
      
      const todasAulas = await db.aulas.toArray();
      
      // Filtrar as não deletadas
      const aulasAtivas = todasAulas.filter(aula => !aula.deleted);
      
      // Ordenar por data (mais recente primeiro)
      aulasAtivas.sort((a, b) => 
        new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime()
      );
      
      console.log(`✅ Encontradas ${aulasAtivas.length} aulas ativas`);
      return aulasAtivas;
    } catch (error) {
      console.error('❌ Erro ao buscar aulas:', error);
      return [];
    }
  },

  // ✅ Sincronização bidirecional de aulas
  async syncAllPending() {
    if (!navigator.onLine) {
      console.log('🌐 Offline - sincronização de aulas adiada');
      return;
    }

    try {
      console.log('🔄 Iniciando sincronização bidirecional de aulas...');
      
      // FASE 1: DOWNLOAD - Buscar aulas do Supabase
      console.log('📥 FASE 1: Baixando aulas do Supabase...');
      await this.downloadFromSupabase();
      
      // FASE 2: UPLOAD - Enviar alterações locais para Supabase
      console.log('📤 FASE 2: Enviando alterações locais...');
      await this.uploadToSupabase();
      
      console.log('✅ Sincronização de aulas concluída');
      
    } catch (error) {
      console.error('❌ Erro geral na sincronização de aulas:', error);
    }
  },

  // ✅ DOWNLOAD: Baixar aulas do Supabase
  async downloadFromSupabase() {
    try {
      console.log('📥 Buscando últimas aulas do Supabase...');
      
      const lastSync = localStorage.getItem('last_sync_aulas');
      console.log('Última sincronização de aulas:', lastSync || 'Primeira vez');
      
      let query = supabase
        .from('aulas')
        .select('*, turmas(nome_turma)')
        .order('updated_at', { ascending: false });
      
      if (lastSync) {
        query = query.gt('updated_at', lastSync);
      }
      
      const { data: aulasSupabase, error } = await query;
      
      if (error) {
        console.error('❌ Erro ao buscar aulas do Supabase:', error);
        return;
      }
      
      console.log(`📥 ${aulasSupabase?.length || 0} aulas encontradas no Supabase`);
      
      if (!aulasSupabase || aulasSupabase.length === 0) {
        console.log('📭 Nenhuma aula nova/atualizada no Supabase');
        return;
      }
      
      // Processar cada aula do Supabase
      for (const aulaSupabase of aulasSupabase) {
        try {
          const aulaLocal = await db.aulas.get(aulaSupabase.id);
          
          if (!aulaLocal) {
            // NOVA AULA DO SUPABASE
            const aulaParaSalvar = {
              ...aulaSupabase,
              sync_status: 'synced' as const,
              deleted: false
            };
            
            await db.aulas.put(aulaParaSalvar);
            console.log(`✅ Nova aula baixada: ${aulaSupabase.tema_aula || 'Sem tema da aula'}`);
            
          } else if (aulaLocal.sync_status === 'synced') {
            // ATUALIZAÇÃO DO SUPABASE - Só atualizar se não tivermos alterações pendentes
            const localUpdated = new Date(aulaLocal.updated_at || 0);
            const remoteUpdated = new Date(aulaSupabase.updated_at || 0);
            
            if (remoteUpdated > localUpdated) {
              // Supabase tem versão mais recente
              const aulaAtualizada = {
                ...aulaLocal,
                ...aulaSupabase,
                sync_status: 'synced' as const,
              };
              
              await db.aulas.put(aulaAtualizada);
              console.log(`✏️ Aula atualizada do Supabase: ${aulaSupabase.tema_aula || 'Sem tema da aula'}`);
            }
          }
          // Se sync_status = 'pending', não sobrescrever (temos alterações locais não enviadas)
          
        } catch (aulaError) {
          console.error(`❌ Erro processando aula ${aulaSupabase.id}:`, aulaError);
        }
      }
      
      // Atualizar timestamp da última sincronização
      localStorage.setItem('last_sync_aulas', new Date().toISOString());
      console.log('✅ Download do Supabase concluído');
      
    } catch (error) {
      console.error('❌ Erro no download do Supabase:', error);
    }
  },

  // ✅ UPLOAD: Enviar alterações locais para Supabase
  async uploadToSupabase() {
    try {
      // Buscar itens da fila específicos para aulas
      const pendingItems = await db.syncQueue
        .where('table')
        .equals('aulas')
        .and(item => item.status === 'pending')
        .toArray();

      console.log(`📤 ${pendingItems.length} aulas pendentes para envio`);

      for (const item of pendingItems) {
        try {
          const aula = await db.aulas.get(item.record_id);
          if (!aula) {
            await db.syncQueue.delete(item.id || -1);
            continue;
          }

          if (item.operation === 'upsert') {
            // Preparar dados para envio
            const { sync_status, deleted, created_at, updated_at, ...dadosParaEnviar } = aula;
            
            // Verificar se já existe no Supabase
            let aulaExistente = null;
            if (!aula.id.startsWith('local_')) {
              const { data } = await supabase
                .from('aulas')
                .select('id')
                .eq('id', aula.id)
                .maybeSingle();
              aulaExistente = data;
            }

            let resultado;
            if (aulaExistente) {
              // UPDATE no Supabase
              resultado = await supabase
                .from('aulas')
                .update(dadosParaEnviar)
                .eq('id', aula.id)
                .select('*, turmas(nome_turma)')
                .single();
            } else {
              // INSERT no Supabase
              resultado = await supabase
                .from('aulas')
                .insert(dadosParaEnviar)
                .select('*, turmas(nome_turma)')
                .single();
              
              // Se criou no Supabase, atualizar ID local
              if (resultado.data && aula.id.startsWith('local_')) {
                await db.aulas.update(aula.id, {
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
            await db.aulas.update(item.record_id, { 
              sync_status: 'synced' as const,
              updated_at: new Date().toISOString()
            });
            await db.syncQueue.delete(item.id || -1);
            
          } else if (item.operation === 'delete') {
            // Só deletar no Supabase se não for um ID local
            if (!aula.id.startsWith('local_')) {
              await supabase.from('aulas').delete().eq('id', aula.id);
            }
            
            // Deletar localmente
            await db.aulas.delete(item.record_id);
            await db.syncQueue.delete(item.id || -1);
          }

          console.log(`[Sync] Aula ${item.record_id} sincronizada`);
          
        } catch (itemError) {
          console.error(`[Sync] Erro na aula ${item.record_id}:`, itemError);
          
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

  // ✅ Função auxiliar para sincronizar aulas pendentes
  async syncPendingAulas() {
    return this.syncAllPending();
  },

  // ✅ Buscar aulas recentes (com suporte offline)
  async getAulasRecentes(limite = 50): Promise<Aula[]> {
    try {
      const todasAulas = await this.getAllAulas();
      
      // Ordenar por data (mais recente primeiro) e limitar
      return todasAulas
        .sort((a, b) => new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime())
        .slice(0, limite);

    } catch (error) {
      console.error('❌ Erro ao buscar aulas recentes:', error);
      return [];
    }
  },

  // ✅ Atualizar aula localmente e marcar para sincronização
  async atualizarAula(id: string, updates: Partial<AulaFormData>) {
    try {
      const updated_at = new Date().toISOString();
      
      await db.aulas.update(id, {
        ...updates,
        updated_at,
        sync_status: 'pending' as const
      });

      // Adicionar/atualizar na fila
      await db.syncQueue.add({
        table: 'aulas',
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });
      
      console.log(`✏️ Aula ${id} marcada para atualização`);
      
      // Retornar a aula atualizada
      return await db.aulas.get(id);
      
    } catch (error) {
      console.error('Erro ao atualizar aula:', error);
      throw error;
    }
  },

  // ✅ Deletar aula (soft delete)
  async deletarAula(id: string) {
    try {
      const aula = await db.aulas.get(id);
      if (!aula) return;

      if (aula.sync_status === 'synced' && !aula.id.startsWith('local_')) {
        // Se já sincronizado, marcar para deleção remota
        await db.aulas.update(id, { 
          deleted: true, 
          sync_status: 'pending_delete' as const,
          updated_at: new Date().toISOString()
        });
        
        await db.syncQueue.add({
          table: 'aulas',
          record_id: id,
          operation: 'delete',
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        console.log(`🗑️ Aula ${id} marcada para deleção remota`);
      } else {
        // Se nunca sincronizado, deletar completamente
        await db.aulas.delete(id);
        
        // Remover da fila se existir
        await db.syncQueue
          .where('record_id')
          .equals(id)
          .delete();
          
        console.log(`🗑️ Aula ${id} deletada localmente`);
      }
      
    } catch (error) {
      console.error('Erro ao deletar aula:', error);
      throw error;
    }
  },

  // ✅ Buscar aulas por turma (com suporte offline)
  async getAulasPorTurma(turmaId: string): Promise<Aula[]> {
    try {
      const aulas = await db.aulas
        .where('turma_id')
        .equals(turmaId)
        .and(aula => !aula.deleted)
        .toArray();
      
      // Ordenar por data (mais recente primeiro)
      return aulas.sort((a, b) => 
        new Date(b.data_aula).getTime() - new Date(a.data_aula).getTime()
      );

    } catch (error) {
      console.error('❌ Erro ao buscar aulas por turma:', error);
      return [];
    }
  },

  // ✅ Buscar aula por ID
  async getAulaById(id: string): Promise<Aula | undefined> {
    try {
      const aula = await db.aulas.get(id);
      return aula && !aula.deleted ? aula : undefined;
    } catch (error) {
      console.error('Erro ao buscar aula por ID:', error);
      return undefined;
    }
  },

  // ✅ Buscar aulas por período
  async getAulasPorPeriodo(inicio: Date, fim: Date): Promise<Aula[]> {
    try {
      const todasAulas = await this.getAllAulas();
      
      return todasAulas.filter(aula => {
        const dataAula = new Date(aula.data_aula);
        return dataAula >= inicio && dataAula <= fim;
      }).sort((a, b) => 
        new Date(a.data_aula).getTime() - new Date(b.data_aula).getTime()
      );

    } catch (error) {
      console.error('❌ Erro ao buscar aulas por período:', error);
      return [];
    }
  },

  // ✅ Buscar aulas do dia
  async getAulasDoDia(data: Date = new Date()): Promise<Aula[]> {
    try {
      const inicioDia = new Date(data.setHours(0, 0, 0, 0));
      const fimDia = new Date(data.setHours(23, 59, 59, 999));
      
      return this.getAulasPorPeriodo(inicioDia, fimDia);

    } catch (error) {
      console.error('❌ Erro ao buscar aulas do dia:', error);
      return [];
    }
  },

  // ✅ Buscar aulas da semana
  async getAulasDaSemana(data: Date = new Date()): Promise<Aula[]> {
    try {
      const dia = data.getDay();
      const inicioSemana = new Date(data);
      inicioSemana.setDate(data.getDate() - dia);
      inicioSemana.setHours(0, 0, 0, 0);
      
      const fimSemana = new Date(inicioSemana);
      fimSemana.setDate(inicioSemana.getDate() + 6);
      fimSemana.setHours(23, 59, 59, 999);
      
      return this.getAulasPorPeriodo(inicioSemana, fimSemana);

    } catch (error) {
      console.error('❌ Erro ao buscar aulas da semana:', error);
      return [];
    }
  },

  // ✅ Verificar se já existe aula no mesmo horário
  async verificarConflitoHorario(
    turmaId: string, 
    dataAula: Date, 
    horaInicio: string, 
    horaFim: string, 
    excluirId?: string
  ): Promise<boolean> {
    try {
      const aulasTurma = await this.getAulasPorTurma(turmaId);
      
      return aulasTurma.some(aula => {
        // Pular a própria aula se estiver atualizando
        if (excluirId && aula.id === excluirId) return false;
        
        // Verificar se é no mesmo dia
        const dataAulaExistente = new Date(aula.data_aula);
        const dataNovaAula = new Date(dataAula);
        
        if (dataAulaExistente.toDateString() !== dataNovaAula.toDateString()) {
          return false;
        }
        
        // Verificar conflito de horário
        const inicioExistente = aula.hora_inicio;
        const fimExistente = aula.hora_fim;
        
        // Converte horários para minutos do dia
        const toMinutes = (time: string) => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };
        
        const inicioNovo = toMinutes(horaInicio);
        const fimNovo = toMinutes(horaFim);
        const inicioExistenteMin = toMinutes(inicioExistente);
        const fimExistenteMin = toMinutes(fimExistente);
        
        // Verifica sobreposição
        return (
          (inicioNovo >= inicioExistenteMin && inicioNovo < fimExistenteMin) ||
          (fimNovo > inicioExistenteMin && fimNovo <= fimExistenteMin) ||
          (inicioNovo <= inicioExistenteMin && fimNovo >= fimExistenteMin)
        );
      });

    } catch (error) {
      console.error('❌ Erro ao verificar conflito de horário:', error);
      return false;
    }
  },

  // ✅ Verificar saúde do banco de aulas
  async checkDatabaseHealth() {
    try {
      const aulaCount = await db.aulas.count();
      const queueCount = await db.syncQueue
        .where('table')
        .equals('aulas')
        .and(item => item.status === 'pending')
        .count();
      
      const aulasAtivas = (await this.getAllAulas()).length;
      
      return {
        aulasTotal: aulaCount,
        aulasAtivas: aulasAtivas,
        pendentes: queueCount,
        online: navigator.onLine,
        bancoAberto: db.isOpen(),
        conflitos: aulaCount - aulasAtivas // Aulas deletadas (soft delete)
      };
    } catch (error: any) {
      return {
        error: error.message,
        bancoAberto: false
      };
    }
  },

  // ✅ Estatísticas de aulas
  async getEstatisticas() {
    try {
      const todasAulas = await this.getAllAulas();
      
      // Agrupar por turma
      const porTurma: Record<string, number> = {};
      const porMes: Record<string, number> = {};
      
      todasAulas.forEach(aula => {
        // Por turma
        const turmaKey = aula.turma_id || 'sem_turma';
        porTurma[turmaKey] = (porTurma[turmaKey] || 0) + 1;
        
        // Por mês
        const data = new Date(aula.data_aula);
        const mesKey = `${data.getFullYear()}-${(data.getMonth() + 1).toString().padStart(2, '0')}`;
        porMes[mesKey] = (porMes[mesKey] || 0) + 1;
      });
      
      return {
        total: todasAulas.length,
        porTurma,
        porMes,
        ultimaAtualizacao: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao gerar estatísticas:', error);
      return {
        total: 0,
        porTurma: {},
        porMes: {},
        ultimaAtualizacao: new Date().toISOString()
      };
    }
  }
};
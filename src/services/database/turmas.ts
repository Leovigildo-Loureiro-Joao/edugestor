import { create } from 'domain';
import { HorarioAula, HorarioAulaForm, Turma, TurmaFormData } from '../../types/turma';
import { supabase } from '../supabase/config'
import Dexie from 'dexie';

import db from './db';

export const turmaService = { 
    // Criar turma
  async createTurma(turmaData:TurmaFormData) {
    const {data,error}= await supabase.from("turmas")
    .insert([{...turmaData}]);
    if (error) throw new Error(`Erro ao criar turma: ${error.message}`)
    return data
  },
  async getTurmas(): Promise<Turma[]> {
    try {
      console.log('📋 Buscando turmas...');
      
      // FORMA CORRETA: buscar todos e filtrar manualmente
      const todasTurmas = await db.turmas.toArray();
      
      // Filtrar os não deletados
      const turmasActivas = todasTurmas.filter((turma:Turma) => !turma.deleted);
      
      // Ordenar por nome
      turmasActivas.sort((a:Turma, b:Turma) => 
        (a.nome_turma || '').localeCompare(b.nome_turma || '')
      );
      
      console.log(`✅ Encontrados ${turmasActivas.length} turmas ativos`);
      return turmasActivas;
    } catch (error) {
      console.error('❌ Erro ao buscar turmas:', error);
      return [];
    }
  },
  async getId(nome:string) {
    const {data}= await supabase.from("turmas")
    .select("id")
    .eq("nome_turma",nome);
    return data
  },
  async findBy(id:string) {
    const {data,error}= await supabase.from("turmas")
    .select("*")
    .eq("id",id);
    if (error) throw new Error(`Erro ao buscar turma: ${error.message}`)
    return data[0];
  },
  async deleteTurma(id:string) {
     const {error}= await supabase.from("turmas")
    .delete()
    .eq("id",id);
    if (error) throw new Error(`Erro ao deletar turma: ${error.message}`)
  },
  async editTurma(id:string,turmaData:TurmaFormData) {
    const {error}= await supabase.from("turmas")
    .update({...turmaData})
    .eq("id",id);
    if (error) throw new Error(`Erro ao editar turma: ${error.message}`)
  },
  async getHoraios(id:string){
    const {data,error} = await supabase.from('turma_horarios')
    .select("*")
    .eq('turma_id', id)
    if (error) throw new Error(`Erro ao editar turma: ${error.message}`)
    return data
  },
  // No turmas.ts
async createHorario(horario: HorarioAulaForm, turmaId: string) {
  const { data, error } = await supabase
    .from('turma_horarios')
    .insert([{
      ...horario,
      turma_id: turmaId
    }])
    .select();
  
  if (error) throw new Error(`Erro ao criar horário: ${error.message}`);
  return data;
},

async updateHorario(id: string, horario: Partial<HorarioAulaForm>) {
  const { data, error } = await supabase
    .from('turma_horarios')
    .update(horario)
    .eq('id', id)
    .select();
  
  if (error) throw new Error(`Erro ao atualizar horário: ${error.message}`);
  return data;
}
,
async excluirHorario(id: string) {
  const { error } = await supabase
    .from('turma_horarios')
    .delete()
    .eq('id', id);
  
  if (error) throw new Error(`Erro ao excluir horário: ${error.message}`);
},
    async syncAllPending() {
      if (!navigator.onLine) {
        console.log('🌐 Offline - sincronização adiada');
        return;
      }
    
      try {
        console.log('🔄 Iniciando sincronização bidirecional...');
        
        // 🔄 FASE 1: DOWNLOAD - Buscar turmas do Supabase
        console.log('📥 FASE 1: Baixando turmas do Supabase...');
        await this.downloadFromSupabase();
        
        // 🔄 FASE 2: UPLOAD - Enviar alterações locais para Supabase
        console.log('📤 FASE 2: Enviando alterações locais...');
        await this.uploadToSupabase();
        
        console.log('✅ Sincronização bidirecional concluída');
        
      } catch (error) {
        console.error('❌ Erro geral na sincronização:', error);
      }
    },
    
    // 🔄 NOVA FUNÇÃO: Baixar turmas do Supabase
    async downloadFromSupabase() {
      try {
        console.log('📥 Buscando últimos turmas do Supabase...');
        
        // Buscar última data de sincronização
        const lastSync = localStorage.getItem('last_sync_turmas');
        console.log('Última sincronização:', lastSync || 'Primeira vez');
        
        let query = supabase
          .rpc('get_turmas_with_course_name')
        
        // Se já sincronizou antes, buscar apenas alterações recentes
        if (lastSync) {
          query = query.gt('updated_at', lastSync);
        }
        
        const { data: turmasSupabase, error } = await query;
        
        if (error) {
          console.error('❌ Erro ao buscar turmas do Supabase:', error);
          return;
        }
        
        console.log(`📥 ${turmasSupabase?.length || 0} turmas encontrados no Supabase`);
        
        if (!turmasSupabase || turmasSupabase.length === 0) {
          console.log('📭 Nenhum turma novo/atualizado no Supabase');
          return;
        }
        
        // Processar cada turma do Supabase
        for (const turmasupabase of turmasSupabase) {
          try {
            // Verificar se já existe localmente
            const turmaLocal = await db.turmas.get(turmasupabase.id);
            
            if (!turmaLocal) {
              // 🔴 NOVO turma DO SUPABASE - Criar localmente
              const turmaParaSalvar = {
                ...turmasupabase,
                // Garantir que temos todos os campos necessários
                sync_status: 'synced',
                deleted: false
              };
              
              await db.turmas.put(turmaParaSalvar);
              console.log(`✅ Novo turma baixado: ${turmasupabase.nome_completo}`);
              
            } else if (turmaLocal.sync_status === 'synced') {
              // 🔴 ATUALIZAÇÃO DO SUPABASE - Só atualizar se não tivermos alterações pendentes
              // Comparar timestamps para ver quem é mais recente
              const localUpdated = new Date(turmaLocal.updated_at || 0);
              const remoteUpdated = new Date(turmasupabase.updated_at || 0);
              
              if (remoteUpdated > localUpdated) {
                // Supabase tem versão mais recente
                const turmaAtualizado = {
                  ...turmaLocal,           // Manter campos locais
                  ...turmasupabase,        // Sobrescrever com dados do Supabase
                  sync_status: 'synced',   // Manter sincronizado
                };
                
                await db.turmas.put(turmaAtualizado);
                console.log(`✏️ turma atualizado do Supabase: ${turmasupabase.nome_completo}`);
              }
            }
            // Se sync_status = 'pending', não sobrescrever (temos alterações locais não enviadas)
            
          } catch (turmaError) {
            console.error(`❌ Erro processando turma ${turmasupabase.id}:`, turmaError);
          }
        }
        
        // Atualizar timestamp da última sincronização
        localStorage.setItem('last_sync_turmas', new Date().toISOString());
        console.log('✅ Download do Supabase concluído');
        
      } catch (error) {
        console.error('❌ Erro no download do Supabase:', error);
      }
    },
    
    // 🔄 FUNÇÃO: Enviar alterações locais para Supabase (mantém a sua lógica)
    async uploadToSupabase() {
       try {
          // Buscar apenas itens da tabela 'turmas'
          const pendingItems = await db.syncQueue
          .where('status')
          .equals('pending')
          .toArray();
    
            console.log(`📤 ${pendingItems.length} itens pendentes para envio`);
    
          for (const item of pendingItems) {
            try {
              // Buscar turma da tabela 'turmas'
              const turma = await db.turmas.get(item.record_id);
              if (!turma) {
                await db.syncQueue.delete(item.id||-1);
                continue;
              }
    
              if (item.operation === 'upsert') {
                // Preparar dados para envio (remover campos internos)
                const { sync_status, deleted, created_at, updated_at, ...dadosParaEnviar } = turma;
                
                // VERIFICAÇÃO CRÍTICA: turma já existe no Supabase?
                let turmaExistente = null;
                if (!turma.id.startsWith('local_')) {
                  const { data } = await supabase
                    .from('turmas')
                    .select('id')
                    .eq('id', turma.id)
                    .maybeSingle();
                  turmaExistente = data;
                }
    
                let resultado;
                if (turmaExistente) {
                  // UPDATE no Supabase
                  resultado = await supabase
                    .from('turmas')
                    .update(dadosParaEnviar)
                    .eq('id', turma.id);
                } else {
                  // INSERT no Supabase
                  resultado = await supabase
                    .from('turmas')
                    .insert(dadosParaEnviar)
                    .select()
                    .single();
                  
                  // Se criou no Supabase, atualizar ID local
                  if (resultado.data && turma.id.startsWith('local_')) {
                    await db.turmas.update(turma.id, {
                      id: resultado.data.id,
                      sync_status: 'synced'
                    });
                    
                    // Atualizar referência na fila
                    await db.syncQueue.update(item.id||-1, {
                      record_id: resultado.data.id
                    });
                  }
                }
    
                if (resultado.error) {
                  console.error('Erro Supabase:', resultado.error);
                  throw resultado.error;
                }
                
                // Marcar como sincronizado
                await db.turmas.update(item.record_id, { 
                  sync_status: 'synced',
                  updated_at: new Date().toISOString()
                });
                await db.syncQueue.delete(item.id||-1);
                
              } else if (item.operation === 'delete') {
                // Só deletar no Supabase se não for um ID local
                if (!turma.id.startsWith('local_')) {
                  await supabase.from('turmas').delete().eq('id', turma.id);
                }
                
                // Deletar localmente
                await db.turmas.delete(item.record_id);
                await db.syncQueue.delete(item.id||-1);
              }
    
              console.log(`[Sync] turma ${item.record_id} sincronizado`);
              
            } catch (itemError) {
              console.error(`[Sync] Erro na turma ${item.record_id}:`, itemError);
              
              // Incrementar tentativas
              const novasTentativas = (item.retryCount || 0) + 1;
              await db.syncQueue.update(item.id||-1, {
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



}
  
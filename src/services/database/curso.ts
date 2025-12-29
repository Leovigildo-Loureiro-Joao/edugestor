import { CourseFormData } from "../../types/curso";
import { supabase } from "../supabase/config";
import db from "./db";

export const cursosService={
    async create(course:CourseFormData) {
      const { data, error } = await supabase.from("cursos")
        .insert(course)
         .select();

        if (error) throw error;
        return data;
    },
    
    async getCourse() {
      try {
          const todosCursos = await db.cursos.toArray();
          const cursosAtivos = todosCursos.filter(curso => !curso.deleted);
          cursosAtivos.sort((a,b)=>a.nome.localeCompare(b.nome))
          return cursosAtivos;
      } catch (error:any) {
        console.error("Erro ao carregar os cursos"+error.message)
      }


    },

    async getCourseId(id:string) {
      const { data, error } = await supabase.from("cursos")
        .select("*,cursos(curso),turmas(nome_turma)")
        .eq("id=",id);
        if (error) throw error;
        return data[0];
    },
    async syncAllPending() {
      if (!navigator.onLine) {
        console.log('🌐 Offline - sincronização adiada');
        return;
      }
    
      try {
        console.log('🔄 Iniciando sincronização bidirecional...');
        
        // 🔄 FASE 1: DOWNLOAD - Buscar cursos do Supabase
        console.log('📥 FASE 1: Baixando cursos do Supabase...');
        await this.downloadFromSupabase();
        
        // 🔄 FASE 2: UPLOAD - Enviar alterações locais para Supabase
        console.log('📤 FASE 2: Enviando alterações locais...');
        await this.uploadToSupabase();
        
        console.log('✅ Sincronização bidirecional concluída');
        
      } catch (error) {
        console.error('❌ Erro geral na sincronização:', error);
      }
    },
    
    // 🔄 NOVA FUNÇÃO: Baixar cursos do Supabase
    async downloadFromSupabase() {
      try {
        console.log('📥 Buscando últimos cursos do Supabase...');
        
        // Buscar última data de sincronização
        const lastSync = localStorage.getItem('last_sync_cursos');
        console.log('Última sincronização:', lastSync || 'Primeira vez');
        
        let query = supabase
          .rpc('get_courses_with_counts_and_turmas')
        
        // Se já sincronizou antes, buscar apenas alterações recentes
        if (lastSync) {
          query = query.gt('updated_at', lastSync);
        }
        
        const { data: cursosSupabase, error } = await query;
        
        if (error) {
          console.error('❌ Erro ao buscar cursos do Supabase:', error);
          return;
        }
        
        console.log(`📥 ${cursosSupabase?.length || 0} cursos encontrados no Supabase`);
        
        if (!cursosSupabase || cursosSupabase.length === 0) {
          console.log('📭 Nenhum curso novo/atualizado no Supabase');
          return;
        }
        
        // Processar cada curso do Supabase
        for (const cursosupabase of cursosSupabase) {
          try {
            // Verificar se já existe localmente
            const cursoLocal = await db.cursos.get(cursosupabase.id);
            
            if (!cursoLocal) {
              // 🔴 NOVO curso DO SUPABASE - Criar localmente
              const cursoParaSalvar = {
                ...cursosupabase,
                // Garantir que temos todos os campos necessários
                sync_status: 'synced',
                deleted: false
              };
              
              await db.cursos.put(cursoParaSalvar);
              console.log(`✅ Novo curso baixado: ${cursosupabase.nome_completo}`);
              
            } else if (cursoLocal.sync_status === 'synced') {
              // 🔴 ATUALIZAÇÃO DO SUPABASE - Só atualizar se não tivermos alterações pendentes
              // Comparar timestamps para ver quem é mais recente
              const localUpdated = new Date(cursoLocal.updated_at || 0);
              const remoteUpdated = new Date(cursosupabase.updated_at || 0);
              
              if (remoteUpdated > localUpdated) {
                // Supabase tem versão mais recente
                const cursoAtualizado = {
                  ...cursoLocal,           // Manter campos locais
                  ...cursosupabase,        // Sobrescrever com dados do Supabase
                  sync_status: 'synced',   // Manter sincronizado
                };
                
                await db.cursos.put(cursoAtualizado);
                console.log(`✏️ curso atualizado do Supabase: ${cursosupabase.nome_completo}`);
              }
            }
            // Se sync_status = 'pending', não sobrescrever (temos alterações locais não enviadas)
            
          } catch (cursoError) {
            console.error(`❌ Erro processando curso ${cursosupabase.id}:`, cursoError);
          }
        }
        
        // Atualizar timestamp da última sincronização
        localStorage.setItem('last_sync_cursos', new Date().toISOString());
        console.log('✅ Download do Supabase concluído');
        
      } catch (error) {
        console.error('❌ Erro no download do Supabase:', error);
      }
    },
    
    // 🔄 FUNÇÃO: Enviar alterações locais para Supabase (mantém a sua lógica)
    async uploadToSupabase() {
       try {
          // Buscar apenas itens da tabela 'cursos'
          const pendingItems = await db.syncQueue
          .where('status')
          .equals('pending')
          .toArray();
    
            console.log(`📤 ${pendingItems.length} itens pendentes para envio`);
    
          for (const item of pendingItems) {
            try {
              // Buscar curso da tabela 'cursos'
              const curso = await db.cursos.get(item.record_id);
              if (!curso) {
                await db.syncQueue.delete(item.id||-1);
                continue;
              }
    
              if (item.operation === 'upsert') {
                // Preparar dados para envio (remover campos internos)
                const { sync_status, deleted, created_at, updated_at, ...dadosParaEnviar } = curso;
                
                // VERIFICAÇÃO CRÍTICA: curso já existe no Supabase?
                let cursoExistente = null;
                if (!curso.id.startsWith('local_')) {
                  const { data } = await supabase
                    .from('cursos')
                    .select('id')
                    .eq('id', curso.id)
                    .maybeSingle();
                  cursoExistente = data;
                }
    
                let resultado;
                if (cursoExistente) {
                  // UPDATE no Supabase
                  resultado = await supabase
                    .from('cursos')
                    .update(dadosParaEnviar)
                    .eq('id', curso.id);
                } else {
                  // INSERT no Supabase
                  resultado = await supabase
                    .from('cursos')
                    .insert(dadosParaEnviar)
                    .select()
                    .single();
                  
                  // Se criou no Supabase, atualizar ID local
                  if (resultado.data && curso.id.startsWith('local_')) {
                    await db.cursos.update(curso.id, {
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
                await db.cursos.update(item.record_id, { 
                  sync_status: 'synced',
                  updated_at: new Date().toISOString()
                });
                await db.syncQueue.delete(item.id||-1);
                
              } else if (item.operation === 'delete') {
                // Só deletar no Supabase se não for um ID local
                if (!curso.id.startsWith('local_')) {
                  await supabase.from('cursos').delete().eq('id', curso.id);
                }
                
                // Deletar localmente
                await db.cursos.delete(item.record_id);
                await db.syncQueue.delete(item.id||-1);
              }
    
              console.log(`[Sync] curso ${item.record_id} sincronizado`);
              
            } catch (itemError) {
              console.error(`[Sync] Erro no curso ${item.record_id}:`, itemError);
              
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
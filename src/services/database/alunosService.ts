import { Student, StudentFormData } from "../../types";
import db from "./db";
import { supabase } from "./db";

const generateUniqueId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const alunosService = {
  // ✅ Criar aluno
  async saveStudent(studentData: StudentFormData): Promise<string> {
    try {
      const id = generateUniqueId();
      const now = new Date().toISOString();
      
      const aluno = {
        ...studentData,
        id,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
        deleted: false,
      };

      console.log('💾 Salvando aluno:', aluno.nome_completo);
      
      await db.alunos.put(aluno as Student);
      
      // Adicionar à fila de sincronização
      await db.syncQueue.add({
        table: 'alunos',
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      console.log('✅ Aluno salvo com ID:', id);
      return id;
      
    } catch (error) {
      console.error('❌ Erro ao salvar aluno:', error);
      throw error;
    }
  },

  // ✅ Buscar todos os alunos - CORRIGIDO
  async getAllStudents(): Promise<Student[]> {
    try {
      console.log('📋 Buscando alunos...');
      
      // FORMA CORRETA: buscar todos e filtrar manualmente
      const todosAlunos = await db.alunos.toArray();
      
      // Filtrar os não deletados
      const alunosAtivos = todosAlunos.filter(aluno => !aluno.deleted);
      
      // Ordenar por nome
      alunosAtivos.sort((a, b) => 
        (a.nome_completo || '').localeCompare(b.nome_completo || '')
      );
      
      console.log(`✅ Encontrados ${alunosAtivos.length} alunos ativos`);
      return alunosAtivos;
    } catch (error) {
      console.error('❌ Erro ao buscar alunos:', error);
      return [];
    }
  },

async syncAllPending() {
  if (!navigator.onLine) {
    console.log('🌐 Offline - sincronização adiada');
    return;
  }

  try {
    console.log('🔄 Iniciando sincronização bidirecional...');
    
    // 🔄 FASE 1: DOWNLOAD - Buscar alunos do Supabase
    console.log('📥 FASE 1: Baixando alunos do Supabase...');
    await this.downloadFromSupabase();
    
    // 🔄 FASE 2: UPLOAD - Enviar alterações locais para Supabase
    console.log('📤 FASE 2: Enviando alterações locais...');
    await this.uploadToSupabase();
    
    console.log('✅ Sincronização bidirecional concluída');
    
  } catch (error) {
    console.error('❌ Erro geral na sincronização:', error);
  }
},

// 🔄 NOVA FUNÇÃO: Baixar alunos do Supabase
async downloadFromSupabase() {
  try {
    console.log('📥 Buscando últimos alunos do Supabase...');
    
    // Buscar última data de sincronização
    const lastSync = localStorage.getItem('last_sync_alunos');
    console.log('Última sincronização:', lastSync || 'Primeira vez');
    
    let query = supabase
      .rpc('get_alunos_with_names')
      .order('updated_at', { ascending: false })
    
    // Se já sincronizou antes, buscar apenas alterações recentes
    if (lastSync) {
      query = query.gt('updated_at', lastSync);
    }
    
    const { data: alunosSupabase, error } = await query;
    
    if (error) {
      console.error('❌ Erro ao buscar alunos do Supabase:', error);
      return;
    }
    
    console.log(`📥 ${alunosSupabase?.length || 0} alunos encontrados no Supabase`);
    
    if (!alunosSupabase || alunosSupabase.length === 0) {
      console.log('📭 Nenhum aluno novo/atualizado no Supabase');
      return;
    }
    
    // Processar cada aluno do Supabase
    for (const alunoSupabase of alunosSupabase) {
      try {
        // Verificar se já existe localmente
        const alunoLocal = await db.alunos.get(alunoSupabase.id);
        
        if (!alunoLocal) {
          // 🔴 NOVO ALUNO DO SUPABASE - Criar localmente
          const alunoParaSalvar = {
            ...alunoSupabase,
            // Garantir que temos todos os campos necessários
            sync_status: 'synced',
            deleted: false
          };
          
          await db.alunos.put(alunoParaSalvar);
          console.log(`✅ Novo aluno baixado: ${alunoSupabase.nome_completo}`);
          
        } else if (alunoLocal.sync_status === 'synced') {
          // 🔴 ATUALIZAÇÃO DO SUPABASE - Só atualizar se não tivermos alterações pendentes
          // Comparar timestamps para ver quem é mais recente
          const localUpdated = new Date(alunoLocal.updated_at || 0);
          const remoteUpdated = new Date(alunoSupabase.updated_at || 0);
          
          if (remoteUpdated > localUpdated) {
            // Supabase tem versão mais recente
            const alunoAtualizado = {
              ...alunoLocal,           // Manter campos locais
              ...alunoSupabase,        // Sobrescrever com dados do Supabase
              sync_status: 'synced',   // Manter sincronizado
            };
            
            await db.alunos.put(alunoAtualizado);
            console.log(`✏️ Aluno atualizado do Supabase: ${alunoSupabase.nome_completo}`);
          }
        }
        // Se sync_status = 'pending', não sobrescrever (temos alterações locais não enviadas)
        
      } catch (alunoError) {
        console.error(`❌ Erro processando aluno ${alunoSupabase.id}:`, alunoError);
      }
    }
    
    // Atualizar timestamp da última sincronização
    localStorage.setItem('last_sync_alunos', new Date().toISOString());
    console.log('✅ Download do Supabase concluído');
    
  } catch (error) {
    console.error('❌ Erro no download do Supabase:', error);
  }
},

// 🔄 FUNÇÃO: Enviar alterações locais para Supabase (mantém a sua lógica)
async uploadToSupabase() {
   try {
      // Buscar apenas itens da tabela 'alunos'
      const pendingItems = await db.syncQueue
      .where('status')
      .equals('pending')
      .toArray();

        console.log(`📤 ${pendingItems.length} itens pendentes para envio`);

      for (const item of pendingItems) {
        try {
          // Buscar aluno da tabela 'alunos'
          const aluno = await db.alunos.get(item.record_id);
          if (!aluno) {
            await db.syncQueue.delete(item.id||-1);
            continue;
          }

          if (item.operation === 'upsert') {
            // Preparar dados para envio (remover campos internos)
            const { sync_status, deleted, created_at, updated_at, ...dadosParaEnviar } = aluno;
            
            // VERIFICAÇÃO CRÍTICA: Aluno já existe no Supabase?
            let alunoExistente = null;
            if (!aluno.id.startsWith('local_')) {
              const { data } = await supabase
                .from('alunos')
                .select('id')
                .eq('id', aluno.id)
                .maybeSingle();
              alunoExistente = data;
            }

            let resultado;
            if (alunoExistente) {
              // UPDATE no Supabase
              resultado = await supabase
                .from('alunos')
                .update(dadosParaEnviar)
                .eq('id', aluno.id);
            } else {
              // INSERT no Supabase
              resultado = await supabase
                .from('alunos')
                .insert(dadosParaEnviar)
                .select()
                .single();
              
              // Se criou no Supabase, atualizar ID local
              if (resultado.data && aluno.id.startsWith('local_')) {
                await db.alunos.update(aluno.id, {
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
            await db.alunos.update(item.record_id, { 
              sync_status: 'synced',
              updated_at: new Date().toISOString()
            });
            await db.syncQueue.delete(item.id||-1);
            
          } else if (item.operation === 'delete') {
            // Só deletar no Supabase se não for um ID local
            if (!aluno.id.startsWith('local_')) {
              await supabase.from('alunos').delete().eq('id', aluno.id);
            }
            
            // Deletar localmente
            await db.alunos.delete(item.record_id);
            await db.syncQueue.delete(item.id||-1);
          }

          console.log(`[Sync] Aluno ${item.record_id} sincronizado`);
          
        } catch (itemError) {
          console.error(`[Sync] Erro no aluno ${item.record_id}:`, itemError);
          
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

  // ✅ Buscar aluno por ID
  async getStudentById(id: string): Promise<Student | undefined> {
    try {
      return await db.alunos.get(id);
    } catch (error) {
      console.error('Erro ao buscar aluno:', error);
      return undefined;
    }
  },

  // ✅ Buscar aluno por número de estudante
  async getStudentByNumeroEstudante(numero: number): Promise<Student | undefined> {
    try {
      const alunos = await db.alunos
        .where('numero_estudante')
        .equals(numero)
        .toArray();
      
      return alunos.find(aluno => !aluno.deleted);
    } catch (error) {
      console.error('Erro ao buscar por número:', error);
      return undefined;
    }
  },

  // ✅ Atualizar aluno
  async updateStudent(id: string, studentData: Partial<StudentFormData>) {
    try {
      const updated_at = new Date().toISOString();
      
      await db.alunos.update(id, {
        ...studentData,
        updated_at,
        sync_status: 'pending'
      });

      // Adicionar/atualizar na fila
      await db.syncQueue.add({
        table: 'alunos',
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });
      
      console.log(`✏️ Aluno ${id} marcado para atualização`);
      
    } catch (error) {
      console.error('Erro ao atualizar aluno:', error);
      throw error;
    }
  },

  // ✅ Deletar aluno (soft delete)
  async deleteStudent(id: string) {
    try {
      const aluno = await db.alunos.get(id);
      if (!aluno) return;

      if (aluno.sync_status === 'synced' && !aluno.id.startsWith('local_')) {
        // Se já sincronizado, marcar para deleção remota
        await db.alunos.update(id, { 
          deleted: true, 
          sync_status: 'pending_delete',
          updated_at: new Date().toISOString()
        });
        
        await db.syncQueue.add({
          table: 'alunos',
          record_id: id,
          operation: 'delete',
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        console.log(`🗑️ Aluno ${id} marcado para deleção remota`);
      } else {
        // Se nunca sincronizado, deletar completamente
        await db.alunos.delete(id);
        
        // Remover da fila se existir
        await db.syncQueue
          .where('record_id')
          .equals(id)
          .delete();
          
        console.log(`🗑️ Aluno ${id} deletado localmente`);
      }
      
    } catch (error) {
      console.error('Erro ao deletar aluno:', error);
      throw error;
    }
  },

  // ✅ Gerar próximo número de estudante
  async gerarProximoNumeroEstudante(): Promise<number> {
    try {
      const alunos = await db.alunos.toArray();
      const numeros = alunos
        .filter(a => !a.deleted && a.numero_estudante)
        .map(a => a.numero_estudante);
      
      const maior = numeros.length > 0 ? Math.max(...numeros) : 0;
      return maior + 1;
    } catch (error) {
      console.error('Erro ao gerar número:', error);
      return 1; // Fallback
    }
  },

  // ✅ Verificar saúde do banco
  async checkDatabaseHealth() {
    try {
      const alunoCount = await db.alunos.count();
      const queueCount = await db.syncQueue
        .where('status')
        .equals('pending')
        .count();
      
      return {
        alunosTotal: alunoCount,
        alunosAtivos: (await this.getAllStudents()).length,
        pendentes: queueCount,
        online: navigator.onLine,
        bancoAberto: db.isOpen()
      };
    } catch (error:any) {
      return {
        error: error.message,
        bancoAberto: false
      };
    }
  },

  // ✅ Limpar banco (apenas para testes)
  async clearDatabase() {
    if (confirm('TEM CERTEZA? Isso apaga TODOS os dados locais!')) {
      await db.alunos.clear();
      await db.syncQueue.clear();
      console.log('🗑️ Banco limpo com sucesso');
      return true;
    }
    return false;
  }
};
import db from "./db";
import { generateUniqueId } from "../../utils/idGenarator";
import { EventFormData } from "../../types/eventos";


export const eventoService = {
  // ============ LISTAR EVENTOS ============
  async listarEventos() {
    try {
    let query = db.evento.toArray().then(eventos => 
        eventos.filter(evento => !evento.deleted)
      );

      return query || [];
    } catch (error) {
      console.error('Erro ao listar evento:', error);
      throw new Error('Erro ao listar evento');
    }
  },

  // ============ LISTAR EVENTO POR ID ============
  async listarEventoPorId(eventoId: string): Promise<EventFormData | null> {
    try {
      const evento = await db.evento.get(eventoId);
      
      if (!evento || evento.deleted) {
        return null;
      }
      
      return evento as EventFormData;
    } catch (error) {
      console.error(`Erro ao buscar evento ${eventoId}:`, error);
      throw new Error(`Erro ao buscar evento ${eventoId}`);
    }
  },

  // ============ CRIAR EVENTO ============
  async criarEvento(eventoData: EventFormData): Promise<EventFormData> {
    try {
      const id = eventoData.id || generateUniqueId();
      const now = new Date().toISOString();
      
      const evento = {
        ...eventoData,
        id,
        created_at: eventoData.created_at || now,
        updated_at: now,
        sync_status: 'pending',
        deleted: false,
      };

      console.log('💾 Salvando evento:', evento.title || evento.description);
      
      await db.evento.put(evento);
      
      // Adicionar à fila de sincronização
      await db.syncQueue.add({
        table: 'evento',
        record_id: id+"",
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      console.log('✅ Evento salvo com ID:', id);
      return evento;
      
    } catch (error) {
      console.error('❌ Erro ao criar evento:', error);
      throw new Error('Erro ao criar evento');
    }
  },

  // ============ ATUALIZAR EVENTO ============
  async atualizarEvento(eventoId: string, eventoData: Partial<EventFormData>): Promise<EventFormData> {
    try {
      const eventoExistente = await db.evento.get(eventoId);
      
      if (!eventoExistente || eventoExistente.deleted) {
        throw new Error(`Evento ${eventoId} não encontrado`);
      }

      const updated_at = new Date().toISOString();
      
      const eventoAtualizado = {
        ...eventoExistente,
        ...eventoData,
        id: eventoId, // Garantir que o ID não seja alterado
        updated_at,
        sync_status: 'pending'
      };

      await db.evento.put(eventoAtualizado);

      // Adicionar/atualizar na fila de sincronização
      await db.syncQueue.add({
        table: 'evento',
        record_id: eventoId,
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });

      console.log(`✏️ Evento ${eventoId} atualizado`);
      
      return eventoAtualizado as EventFormData;
    } catch (error) {
      console.error(`Erro ao atualizar evento ${eventoId}:`, error);
      throw new Error(`Erro ao atualizar evento ${eventoId}`);
    }
  },

  // ============ DELETAR EVENTO ============
  async deletarEvento(eventoId: string): Promise<boolean> {
    try {
      const evento = await db.evento.get(eventoId);
      if (!evento) return false;

      if (evento.sync_status === 'synced' && !evento.id!.startsWith('local_')) {
        // Se já sincronizado, marcar para deleção remota
        await db.evento.update((eventoId||""), { 
          deleted: true, 
          sync_status: 'pending_delete',
          updated_at: new Date().toISOString()
        });
        
        await db.syncQueue.add({
          table: 'evento',
          record_id: eventoId,
          operation: 'delete',
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        console.log(`🗑️ Evento ${eventoId} marcado para deleção remota`);
      } else {
        // Se nunca sincronizado, deletar completamente
        await db.evento.delete(eventoId);
        
        // Remover da fila se existir
        await db.syncQueue
          .where('record_id')
          .equals(eventoId)
          .delete();
          
        console.log(`🗑️ Evento ${eventoId} deletado localmente`);
      }
      
      return true;
    } catch (error) {
      console.error(`Erro ao deletar evento ${eventoId}:`, error);
      throw new Error(`Erro ao deletar evento ${eventoId}`);
    }
  },

  // ============ MÉTODOS ADICIONAIS ÚTEIS ============

  // Buscar evento por data
  async listarEventosPorData(dataInicio: string, dataFim?: string) {
    try {
      let query = db.evento.toArray().then(eventos => 
        eventos.filter(evento => !evento.deleted)
      );
      
      if (dataFim) {
        // Buscar entre datas
        query = query.filter(evento => 
          evento.date >= dataInicio && evento.date <= dataFim
        );
      } else {
        // Buscar em uma data específica
        query = query.filter(evento => 
          evento.date.startsWith(dataInicio)
        );
      }
      
      const evento = await query.toArray();
      return evento.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Erro ao buscar evento por data:', error);
      return [];
    }
  },

  // Buscar evento próximos (futuros)
  async listarProximosEventos(limite: number = 10) {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      
      const evento = await db.evento
        .where('deleted')
        .equals(false)
        .filter(evento => evento.date >= hoje)
        .sortBy('date');
      
      return evento.slice(0, limite);
    } catch (error) {
      console.error('Erro ao buscar próximos evento:', error);
      return [];
    }
  },

  // Buscar evento passados
  async listarEventosPassados(limite: number = 10) {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      
      const evento = await db.evento
        .where('deleted')
        .equals(false)
        .filter(evento => evento.date < hoje)
        .sortBy('date');
      
      return evento.slice(0, limite);
    } catch (error) {
      console.error('Erro ao buscar evento passados:', error);
      return [];
    }
  },

  // Buscar evento por tipo/categoria
  async listarEventosPorTipo(tipo: string) {
    try {
      const evento = await db.evento
        .where('deleted')
        .equals(false)
        .and(evento => evento.type === tipo)
        .sortBy('date');
      
      return evento || [];
    } catch (error) {
      console.error(`Erro ao buscar evento do tipo ${tipo}:`, error);
      return [];
    }
  },

  // ============ SINCRONIZAÇÃO ============
  async sincronizarEventos() {
    try {
      // Buscar evento pendentes de sincronização
      const eventoParaSincronizar = await db.evento
        .where('sync_status')
        .anyOf(['pending', 'pending_delete'])
        .toArray();

      console.log(`🔄 Sincronizando ${eventoParaSincronizar.length} evento...`);
      
      // Aqui você implementaria a lógica para sincronizar com Supabase
      for (const evento of eventoParaSincronizar) {
        try {
          if (evento.sync_status === 'pending_delete') {
            // Lógica para deletar no Supabase
            console.log(`🗑️  Deletando evento ${evento.id} do servidor`);
            // await supabase.from('evento').delete().eq('id', evento.id);
          } else {
            // Lógica para upsert no Supabase
            console.log(`📤 Enviando evento ${evento.id} para servidor`);
            // const { error } = await supabase
            //   .from('evento')
            //   .upsert({
            //     ...evento,
            //     id: evento.id.startsWith('local_') ? undefined : evento.id
            //   });
            // if (error) throw error;
          }
          
          // Atualizar status local após sincronização bem-sucedida
          await db.evento.update(evento.id, { 
            sync_status: 'synced',
            updated_at: new Date().toISOString()
          });
          
          // Remover da fila de sincronização
          await db.syncQueue
            .where('record_id')
            .equals(evento.id)
            .delete();
            
        } catch (syncError) {
          console.error(`Erro ao sincronizar evento ${evento.id}:`, syncError);
          
          // Marcar como falha
          await db.evento.update(evento.id, { 
            sync_status: 'failed',
            updated_at: new Date().toISOString()
          });
        }
      }

      return { 
        success: true, 
        count: eventoParaSincronizar.length,
        message: `Sincronização de evento concluída` 
      };
    } catch (error) {
      console.error('Erro ao sincronizar evento:', error);
      throw new Error('Erro ao sincronizar evento');
    }
  },

  // ============ ESTATÍSTICAS ============
  async obterEstatisticasEventos() {
    try {
      const evento = await db.evento
        .where('deleted')
        .equals(false)
        .toArray();

      const hoje = new Date().toISOString().split('T')[0];
      
      const passados = evento.filter(e => e.date < hoje).length;
      const futuros = evento.filter(e => e.date >= hoje).length;
      
      // Agrupar por tipo se houver campo tipo
      const porTipo: Record<string, number> = {};
      evento.forEach(evento => {
        if (evento.type) {
          porTipo[evento.type] = (porTipo[evento.type] || 0) + 1;
        }
      });

      // Próximo evento
      const proximoEvento = evento
        .filter(e => e.date >= hoje)
        .sort((a, b) => a.date.localeCompare(b.date))[0];

      return {
        total: evento.length,
        passados,
        futuros,
        porTipo,
        proximoEvento: proximoEvento || null
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return {
        total: 0,
        passados: 0,
        futuros: 0,
        porTipo: {},
        proximoEvento: null
      };
    }
  },

  // ============ LIMPAR EVENTOS DELETADOS ============
  async limparEventosDeletados() {
    try {
      const eventoDeletados = await db.evento
        .where('deleted')
        .equals(true)
        .toArray();

      await Promise.all(
        eventoDeletados.map(evento => 
          db.evento.delete(evento.id)
        )
      );

      console.log(`🧹 Limpos ${eventoDeletados.length} evento deletados`);
      return eventoDeletados.length;
    } catch (error) {
      console.error('Erro ao limpar evento deletados:', error);
      return 0;
    }
  }
};
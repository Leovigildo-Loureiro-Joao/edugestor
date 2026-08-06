import db from "./db";
import { generateUniqueId } from "../../utils/idGenerator";
import { EventFormData } from "../../types/eventos";
import { instituicaoIdValue } from "../../utils/getInstituicaoID";
import { SyncStatus } from "../../types/base";


export const eventoService = {
  
  async listarEventos() {
    try {
    let query = db.evento.toArray().then(eventos => 
        eventos.filter(evento => !evento.deleted&&evento.instituicao_id===instituicaoIdValue())
      );

      return query || [];
    } catch (error) {
      console.error('Erro ao listar evento:', error);
      throw new Error('Erro ao listar evento');
    }
  },

  
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

  
  async criarEvento(eventoData: EventFormData): Promise<EventFormData> {
    try {
      const id = eventoData.id || generateUniqueId();
      const now = new Date().toISOString();
      
      const evento = {
        ...eventoData,
        id,
        created_at: eventoData.created_at || now,
        updated_at: now,
        sync_status: 'pending' as SyncStatus,
        deleted: false,
      };
      
      await db.evento.put(evento);
      
      
      await db.syncQueue.add({
        table: 'evento',
        instituicao_id:instituicaoIdValue(),
        record_id: id+"",
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      return evento;
      
    } catch (error) {
      console.error('❌ Erro ao criar evento:', error);
      throw new Error('Erro ao criar evento');
    }
  },

  
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
        id: eventoId, 
        updated_at,
        sync_status: 'pending' as SyncStatus
      };

      await db.evento.put(eventoAtualizado);

      
      await db.syncQueue.add({
        table: 'evento',
        instituicao_id:instituicaoIdValue(),
        record_id: eventoId,
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });

      return eventoAtualizado as EventFormData;
    } catch (error) {
      console.error(`Erro ao atualizar evento ${eventoId}:`, error);
      throw new Error(`Erro ao atualizar evento ${eventoId}`);
    }
  },

  
  async deletarEvento(eventoId: string): Promise<boolean> {
    try {
      const evento = await db.evento.get(eventoId);
      if (!evento) return false;

      if (evento.sync_status === 'synced' && !evento.id!.startsWith('local_')) {
        
        await db.evento.update((eventoId||""), { 
          deleted: true, 
          sync_status: 'pending_delete',
          updated_at: new Date().toISOString()
        });
        
        await db.syncQueue.add({
          table: 'evento',
          instituicao_id:instituicaoIdValue(),
          record_id: eventoId,
          operation: 'delete',
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        } else {
        
        await db.evento.delete(eventoId);
        
        
        await db.syncQueue
          .where('record_id')
          .equals(eventoId)
          .delete();
          
        }
      
      return true;
    } catch (error) {
      console.error(`Erro ao deletar evento ${eventoId}:`, error);
      throw new Error(`Erro ao deletar evento ${eventoId}`);
    }
  },

  

  
  async listarEventosPorData(dataInicio: string, dataFim?: string) {
    try {
      let query =  (await db.evento.toArray()).filter(evento => !evento.deleted)
      
      if (dataFim) {
        
        query = query.filter(evento => 
          evento.date >= dataInicio && evento.date <= dataFim
        );
      } else {
        
        query = query.filter(evento => 
          evento.date.startsWith(dataInicio)
        );
      }
      
      return query.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Erro ao buscar evento por data:', error);
      return [];
    }
  },

  
  async listarProximosEventos(limite: number = 10) {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      
      const evento = await db.evento
        .filter(evento => evento.date >= hoje && !evento.deleted)
        .sortBy('date');
      
      return evento.slice(0, limite);
    } catch (error) {
      console.error('Erro ao buscar próximos evento:', error);
      return [];
    }
  },

  
  async listarEventosPassados(limite: number = 10) {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      
      const evento = await db.evento
        .filter(evento => evento.date < hoje && !evento.deleted)
        .sortBy('date');
      
      return evento.slice(0, limite);
    } catch (error) {
      console.error('Erro ao buscar evento passados:', error);
      return [];
    }
  },

  
  async listarEventosPorTipo(tipo: string) {
    try {
      const evento = await db.evento
        .filter(evento => evento.type === tipo && !evento.deleted)
        .sortBy('date');
      
      return evento || [];
    } catch (error) {
      console.error(`Erro ao buscar evento do tipo ${tipo}:`, error);
      return [];
    }
  },

  
  async sincronizarEventos() {
    try {
      
      const eventoParaSincronizar = await db.evento
        .where('sync_status')
        .anyOf(['pending', 'pending_delete'])
        .toArray();

      
      for (const evento of eventoParaSincronizar) {
        try {
          if (evento.sync_status === 'pending_delete') {
            
            
          } else {
            
            
            
            
            
            
            
            
          }
          
          
          await db.evento.update(evento.id, { 
            sync_status: 'synced',
            updated_at: new Date().toISOString()
          });
          
          
          await db.syncQueue
            .where('record_id')
            .equals(evento.id)
            .delete();
            
        } catch (syncError) {
          console.error(`Erro ao sincronizar evento ${evento.id}:`, syncError);
          
          
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

  
  async obterEstatisticasEventos() {
    try {
      const evento = await db.evento
        .filter(f=> !f.deleted)
        .toArray();

      const hoje = new Date().toISOString().split('T')[0];
      
      const passados = evento.filter(e => e.date < hoje).length;
      const futuros = evento.filter(e => e.date >= hoje).length;
      
      
      const porTipo: Record<string, number> = {};
      evento.forEach(evento => {
        if (evento.type) {
          porTipo[evento.type] = (porTipo[evento.type] || 0) + 1;
        }
      });

      
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

  
  async limparEventosDeletados() {
    try {
      const eventoDeletados = await db.evento
        .filter(d=> d.deleted?d.deleted:false)
        .toArray();

      await Promise.all(
        eventoDeletados.map(evento => 
          db.evento.delete(evento.id)
        )
      );

      return eventoDeletados.length;
    } catch (error) {
      console.error('Erro ao limpar evento deletados:', error);
      return 0;
    }
  }
};
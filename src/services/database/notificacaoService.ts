// services/notificacaoService.ts
import db from "./db";
import { generateUniqueId } from "../../utils/idGenarator";

// Tipos
export interface NotificacaoMeta {
  [key: string]: any;
}

export interface Notificacao {
  id: string;
  titulo: string;
  corpo: string;
  tipo: string;
  lida: boolean;
  data_envio: string;
  meta: NotificacaoMeta;
  instituicao_id: number;
  aluno_id?: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
  sync_status: 'pending' | 'synced' | 'pending_delete' | 'failed';
  deleted: boolean;
}

export type NotificacaoFormData = Omit<Notificacao, 
  'id' | 'created_at' | 'updated_at' | 'sync_status' | 'deleted'
>;

export const notificacaoService = {
  // ============ CRUD BÁSICO ============
  
  async criarNotificacao(notificacaoData: Partial<NotificacaoFormData>): Promise<Notificacao> {
    try {
      const now = new Date().toISOString();
      
      const notificacao: Notificacao = {
        id: generateUniqueId(),
        titulo: notificacaoData.titulo || 'Nova Notificação',
        corpo: notificacaoData.corpo || '',
        tipo: notificacaoData.tipo || 'info',
        lida: false,
        data_envio: notificacaoData.data_envio || now,
        meta: notificacaoData.meta || {},
        instituicao_id: notificacaoData.instituicao_id || 1,
        aluno_id: notificacaoData.aluno_id,
        user_id: notificacaoData.user_id,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
        deleted: false
      };

      console.log(`🔔 Criando notificação: ${notificacao.titulo}`);
      
      await db.notificacao.put(notificacao);
      
      // Adicionar à fila de sincronização
      await db.syncQueue.add({
        table: 'notificacao',
        record_id: notificacao.id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      console.log(`✅ Notificação criada com ID: ${notificacao.id}`);
      return notificacao;
      
    } catch (error) {
      console.error('❌ Erro ao criar notificação:', error);
      throw error;
    }
  },

  async listarNotificacoes(
    filtros: {
      lida?: boolean;
      tipo?: string;
      instituicao_id?: number;
      aluno_id?: string;
      user_id?: string;
      data_inicio?: string;
      data_fim?: string;
    } = {}
  ): Promise<Notificacao[]> {
    try {
      let query = (await db.notificacao.toArray()).filter(notif => !notif.deleted);

      // Aplicar filtros
      if (filtros.lida !== undefined) {
        query = query.filter(notif => notif.lida === filtros.lida);
      }

      if (filtros.tipo) {
        query = query.filter(notif => notif.tipo === filtros.tipo);
      }

      if (filtros.instituicao_id) {
        query = query.filter(notif => notif.instituicao_id === filtros.instituicao_id);
      }

      if (filtros.aluno_id) {
        query = query.filter(notif => notif.aluno_id === filtros.aluno_id);
      }

      if (filtros.user_id) {
        query = query.filter(notif => notif.user_id === filtros.user_id);
      }

      if (filtros.data_inicio) {
        const inicio = new Date(filtros.data_inicio);
        query = query.filter(notif => new Date(notif.data_envio) >= inicio);
      }

      if (filtros.data_fim) {
        const fim = new Date(filtros.data_fim);
        fim.setHours(23, 59, 59, 999); // Fim do dia
        query = query.filter(notif => new Date(notif.data_envio) <= fim);
      }

      const notificacao = query;
      
      // Ordenar por data_envio (mais recentes primeiro)
      return notificacao.sort((a, b) => 
        new Date(b.data_envio).getTime() - new Date(a.data_envio).getTime()
      );
    } catch (error) {
      console.error('Erro ao listar notificações:', error);
      return [];
    }
  },

  async buscarNotificacaoPorId(id: string): Promise<Notificacao | null> {
    try {
      const notificacao = await db.notificacao.get(id);
      return notificacao && !notificacao.deleted ? notificacao : null;
    } catch (error) {
      console.error(`Erro ao buscar notificação ${id}:`, error);
      return null;
    }
  },

  async atualizarNotificacao(id: string, dados: Partial<Notificacao>): Promise<Notificacao> {
    try {
      const now = new Date().toISOString();
      
      await db.notificacao.update(id, {
        ...dados,
        updated_at: now,
        sync_status: 'pending'
      });

      await db.syncQueue.add({
        table: 'notificacao',
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      console.log(`✏️ Notificação ${id} atualizada`);
      
      const updated = await this.buscarNotificacaoPorId(id);
      if (!updated) throw new Error('Notificação não encontrada');
      return updated;
    } catch (error) {
      console.error(`Erro ao atualizar notificação ${id}:`, error);
      throw error;
    }
  },

  async deletarNotificacao(id: string): Promise<void> {
    await this.markForDelete('notificacao', id);
  },

  // ============ OPERAÇÕES ESPECÍFICAS ============
  
  async marcarComoLida(id: string): Promise<Notificacao> {
    return this.atualizarNotificacao(id, { lida: true });
  },

  async marcarComoNaoLida(id: string): Promise<Notificacao> {
    return this.atualizarNotificacao(id, { lida: false });
  },

  async marcarTodasComoLidas(): Promise<number> {
    try {
      const notificacaoNaoLidas = await db.notificacao
        .where('lida')
        .equals(false)
        .and(notif => !notif.deleted)
        .toArray();

      const now = new Date().toISOString();
      const idsParaAtualizar = notificacaoNaoLidas.map(n => n.id);

      await Promise.all(
        notificacaoNaoLidas.map(async (notif) => {
          await db.notificacao.update(notif.id, {
            lida: true,
            updated_at: now,
            sync_status: 'pending'
          });

          await db.syncQueue.add({
            table: 'notificacao',
            record_id: notif.id,
            operation: 'upsert',
            status: 'pending',
            created_at: now
          });
        })
      );

      console.log(`✅ ${notificacaoNaoLidas.length} notificações marcadas como lidas`);
      return notificacaoNaoLidas.length;
    } catch (error) {
      console.error('Erro ao marcar notificações como lidas:', error);
      throw error;
    }
  },

  async buscarNotificacoesNaoLidas(): Promise<Notificacao[]> {
    return this.listarNotificacoes({ lida: false });
  },

  async contarNotificacoesNaoLidas(): Promise<number> {
    try {
      return (await db.notificacao.toArray())
      .filter(notif => !notif.deleted && !notif.lida).length;
    } catch (error) {
      console.error('Erro ao contar notificações não lidas:', error);
      return 0;
    }
  },

  // ============ NOTIFICAÇÕES AUTOMÁTICAS ============
  
  async criarNotificacaoSistema(params: {
    titulo: string;
    corpo: string;
    tipo?: string;
    meta?: NotificacaoMeta;
    aluno_id?: string;
    user_id?: string;
  }): Promise<Notificacao> {
    return this.criarNotificacao({
      ...params,
      tipo: params.tipo || 'sistema',
      instituicao_id: 1 // ID da instituição padrão
    });
  },

  async criarNotificacaoAluno(params: {
    aluno_id: string;
    titulo: string;
    corpo: string;
    tipo?: string;
    meta?: NotificacaoMeta;
  }): Promise<Notificacao> {
    return this.criarNotificacao({
      ...params,
      tipo: params.tipo || 'aluno',
      instituicao_id: 1
    });
  },

  async criarNotificacaoUsuario(params: {
    user_id: string;
    titulo: string;
    corpo: string;
    tipo?: string;
    meta?: NotificacaoMeta;
  }): Promise<Notificacao> {
    return this.criarNotificacao({
      ...params,
      tipo: params.tipo || 'usuario',
      instituicao_id: 1
    });
  },

  // ============ MÉTODOS DE BUSCA AVANÇADA ============
  
  async buscarPorTipo(tipo: string): Promise<Notificacao[]> {
    return this.listarNotificacoes({ tipo });
  },

  async buscarPorAluno(aluno_id: string): Promise<Notificacao[]> {
    return this.listarNotificacoes({ aluno_id });
  },

  async buscarPorUsuario(user_id: string): Promise<Notificacao[]> {
    return this.listarNotificacoes({ user_id });
  },

  async buscarPorPeriodo(data_inicio: string, data_fim: string): Promise<Notificacao[]> {
    return this.listarNotificacoes({ data_inicio, data_fim });
  },

  async buscarHoje(): Promise<Notificacao[]> {
    const hoje = new Date().toISOString().split('T')[0];
    return this.listarNotificacoes({ 
      data_inicio: hoje,
      data_fim: hoje 
    });
  },

  async buscarEstaSemana(): Promise<Notificacao[]> {
    const hoje = new Date();
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay()); // Domingo
    
    const fimSemana = new Date(hoje);
    fimSemana.setDate(hoje.getDate() + (6 - hoje.getDay())); // Sábado

    return this.listarNotificacoes({
      data_inicio: inicioSemana.toISOString().split('T')[0],
      data_fim: fimSemana.toISOString().split('T')[0]
    });
  },

  // ============ ESTATÍSTICAS E RELATÓRIOS ============
  
  async getEstatisticas(): Promise<{
    total: number;
    naoLidas: number;
    lidas: number;
    porTipo: Record<string, number>;
    porDia: Array<{ dia: string; count: number }>;
  }> {
    try {
      const notificacao = await this.listarNotificacoes();
      
      const porTipo: Record<string, number> = {};
      const porDiaMap: Record<string, number> = {};

      notificacao.forEach(notif => {
        // Contagem por tipo
        porTipo[notif.tipo] = (porTipo[notif.tipo] || 0) + 1;
        
        // Contagem por dia
        const dia = notif.data_envio.split('T')[0];
        porDiaMap[dia] = (porDiaMap[dia] || 0) + 1;
      });

      // Converter map para array ordenada (últimos 7 dias)
      const hoje = new Date();
      const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
        const dia = new Date(hoje);
        dia.setDate(hoje.getDate() - (6 - i));
        return dia.toISOString().split('T')[0];
      });

      const porDia = ultimos7Dias.map(dia => ({
        dia: new Date(dia).toLocaleDateString('pt-BR', { weekday: 'short' }),
        count: porDiaMap[dia] || 0
      }));

      const naoLidas = notificacao.filter(n => !n.lida).length;
      const lidas = notificacao.filter(n => n.lida).length;

      return {
        total: notificacao.length,
        naoLidas,
        lidas,
        porTipo,
        porDia
      };
    } catch (error) {
      console.error('Erro ao gerar estatísticas:', error);
      return {
        total: 0,
        naoLidas: 0,
        lidas: 0,
        porTipo: {},
        porDia: []
      };
    }
  },

  async getDashboardData(): Promise<{
    total: number;
    naoLidas: number;
    tendencia: 'alta' | 'baixa' | 'estavel';
    tiposMaisFrequentes: Array<{ tipo: string; count: number }>;
    ultimasNotificacoes: Notificacao[];
  }> {
    try {
      const estatisticas = await this.getEstatisticas();
      const notificacao = await this.listarNotificacoes();

      // Calcular tendência (comparar últimos 2 dias)
      const hoje = new Date().toISOString().split('T')[0];
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      const dataOntem = ontem.toISOString().split('T')[0];

      const notificacaoHoje = await this.listarNotificacoes({ 
        data_inicio: hoje,
        data_fim: hoje 
      });

      const notificacaoOntem = await this.listarNotificacoes({ 
        data_inicio: dataOntem,
        data_fim: dataOntem 
      });

      let tendencia: 'alta' | 'baixa' | 'estavel' = 'estavel';
      if (notificacaoHoje.length > notificacaoOntem.length * 1.2) {
        tendencia = 'alta';
      } else if (notificacaoHoje.length < notificacaoOntem.length * 0.8) {
        tendencia = 'baixa';
      }

      // Tipos mais frequentes (top 3)
      const tiposArray = Object.entries(estatisticas.porTipo)
        .map(([tipo, count]) => ({ tipo, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      // Últimas 5 notificações
      const ultimasNotificacoes = notificacao.slice(0, 5);

      return {
        total: estatisticas.total,
        naoLidas: estatisticas.naoLidas,
        tendencia,
        tiposMaisFrequentes: tiposArray,
        ultimasNotificacoes
      };
    } catch (error) {
      console.error('Erro ao gerar dados do dashboard:', error);
      return {
        total: 0,
        naoLidas: 0,
        tendencia: 'estavel',
        tiposMaisFrequentes: [],
        ultimasNotificacoes: []
      };
    }
  },

  // ============ LIMPEZA E MANUTENÇÃO ============
  
  async limparNotificacoesAntigas(dias: number = 30): Promise<number> {
    try {
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - dias);
      
      const notificacaoAntigas = await db.notificacao
        .where('deleted')
        .equals(false)
        .filter(notif => new Date(notif.data_envio) < dataLimite)
        .toArray();

      const idsParaLimpar = notificacaoAntigas.map(n => n.id);

      await Promise.all(
        notificacaoAntigas.map(notif => this.deletarNotificacao(notif.id))
      );

      console.log(`🧹 ${notificacaoAntigas.length} notificações antigas removidas`);
      return notificacaoAntigas.length;
    } catch (error) {
      console.error('Erro ao limpar notificações antigas:', error);
      throw error;
    }
  },

  async exportarNotificacoes(formato: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const notificacao = await this.listarNotificacoes();
      
      if (formato === 'csv') {
        const headers = ['ID', 'Título', 'Corpo', 'Tipo', 'Lida', 'Data Envio', 'Aluno ID', 'User ID'];
        const rows = notificacao.map(notif => [
          notif.id,
          `"${notif.titulo.replace(/"/g, '""')}"`,
          `"${notif.corpo.replace(/"/g, '""')}"`,
          notif.tipo,
          notif.lida ? 'Sim' : 'Não',
          notif.data_envio,
          notif.aluno_id || '',
          notif.user_id || ''
        ]);
        
        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      } else {
        return JSON.stringify(notificacao, null, 2);
      }
    } catch (error) {
      console.error('Erro ao exportar notificações:', error);
      throw error;
    }
  },

  // ============ SINCRONIZAÇÃO ============
  
  async sincronizarNotificacoes(): Promise<void> {
    try {
      const notificacaoParaSincronizar = await db.notificacao
        .where('sync_status')
        .anyOf(['pending', 'pending_delete'])
        .toArray();

      console.log(`🔄 Sincronizando ${notificacaoParaSincronizar.length} notificações...`);

      for (const notificacao of notificacaoParaSincronizar) {
        try {
          // Implementar lógica de sincronização com Supabase aqui
          if (notificacao.sync_status === 'pending_delete') {
            console.log(`🗑️  Deletando notificação ${notificacao.id} do servidor`);
          } else {
            console.log(`📤 Enviando notificação ${notificacao.id} para servidor`);
          }

          // Atualizar status após sincronização
          await db.notificacao.update(notificacao.id, {
            sync_status: 'synced',
            updated_at: new Date().toISOString()
          });

          // Remover da fila de sincronização
          await db.syncQueue
            .where('record_id')
            .equals(notificacao.id)
            .delete();

        } catch (syncError) {
          console.error(`Erro ao sincronizar notificação ${notificacao.id}:`, syncError);
          await db.notificacao.update(notificacao.id, {
            sync_status: 'failed',
            updated_at: new Date().toISOString()
          });
        }
      }

      console.log('✅ Sincronização de notificações concluída');
    } catch (error) {
      console.error('❌ Erro ao sincronizar notificações:', error);
      throw error;
    }
  },

  // ============ FUNÇÃO AUXILIAR DELEÇÃO ============
  
   async markForDelete(table: string, id: string): Promise<void> {
    try {
      const record = await db[table].get(id);
      if (!record) return;

      if (record.sync_status === 'synced' && !record.id.startsWith('local_')) {
        await db[table].update(id, { 
          deleted: true, 
          sync_status: 'pending_delete',
          updated_at: new Date().toISOString()
        });
        
        await db.syncQueue.add({
          table,
          record_id: id,
          operation: 'delete',
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        console.log(`🗑️ ${table} ${id} marcado para deleção remota`);
      } else {
        await db[table].delete(id);
        
        await db.syncQueue
          .where('record_id')
          .equals(id)
          .delete();
          
        console.log(`🗑️ ${table} ${id} deletado localmente`);
      }
    } catch (error) {
      console.error(`Erro ao deletar ${table}:`, error);
      throw error;
    }
  }
};
// services/database/estrategia/planeamentoService
import { PlaneamentoAnual } from "../../../types/planeamento";
import { PlaneamentoDiario, PlaneamentoMensal, PlaneamentoSemanalType } from "../../../types/planeamento";
import { instituicaoIdValue } from "../../../utils/getInsitituicaoID";
import { generateUniqueId } from "../../../utils/idGenarator";
import db from "../db";
import { estrategiaService } from "../estrategiaService";

export const estrategiaPlaneamentoService = {
  getActiveInstituicaoId() {
    return instituicaoIdValue() || '';
  },

  async sincronizarMetasPorPlaneamentos(metasIds: string[], instituicaoId?: string) {
    const activeInstituicaoId = instituicaoId || this.getActiveInstituicaoId();
    if (!activeInstituicaoId || !Array.isArray(metasIds) || metasIds.length === 0) return;

    const metasUnicas = Array.from(new Set(metasIds.filter(Boolean)));
    const now = new Date().toISOString();

    for (const metaId of metasUnicas) {
      const planeamentosDaMeta = await db.planeamentos
        .filter(
          (plano: any) =>
            !plano.deleted &&
            plano.instituicao_id === activeInstituicaoId &&
            Array.isArray(plano.metas_ids) &&
            plano.metas_ids.includes(metaId)
        )
        .toArray();

      const tarefasRelacionadas = Array.from(
        new Set(
          planeamentosDaMeta.flatMap((plano: any) =>
            Array.isArray(plano.tarefas_ids) ? plano.tarefas_ids : []
          )
        )
      );

      await db.metas.update(metaId, {
        tarefas_relacionadas: tarefasRelacionadas,
        updated_at: now,
        sync_status: "pending",
      });

      await db.syncQueue.add({
        table: "metas",
        record_id: metaId,
        instituicao_id: activeInstituicaoId,
        operation: "upsert",
        status: "pending",
        created_at: now,
      });
    }
  },

  // ========== MÉTODOS EXISTENTES ==========
  async getPlanos(type: string) {
    try {
      const activeInstituicaoId = this.getActiveInstituicaoId();
      const planos = await db.planeamentos
        .where("tipo")
        .equals(type)
        .and((p: any) => !p.deleted && p.instituicao_id === activeInstituicaoId)
        .toArray();
      return planos || [];
    } catch (error) {
      console.error("Erro ao buscar planos:", error);
      throw error;
    }
  },

  async getPlanoById(id: string) {
    try {
      const activeInstituicaoId = this.getActiveInstituicaoId();
      const plano = await db.planeamentos.get(id);
      if (!plano || plano.deleted || plano.instituicao_id !== activeInstituicaoId) {
        return null;
      }
      return plano;
    } catch (error) {
      console.error("Erro ao buscar plano:", error);
      throw error;
    }
  },

  async savePlano(planoData: any) {
    try {
      const activeInstituicaoId = planoData?.instituicao_id || this.getActiveInstituicaoId();
      if (!activeInstituicaoId) {
        throw new Error("Instituição ativa não encontrada para salvar planeamento.");
      }
      const id = generateUniqueId();
      const now = new Date().toISOString();

      const plano = {
        ...planoData,
        instituicao_id: activeInstituicaoId,
        id,
        created_at: now,
        updated_at: now,
        sync_status: "pending",
        deleted: false,
      };

      await db.planeamentos.put(plano);

      await db.syncQueue.add({
        table: "planeamentos",
        record_id: id,
        instituicao_id: activeInstituicaoId,
        operation: "upsert",
        status: "pending",
        created_at: now,
      });

      await this.sincronizarMetasPorPlaneamentos(plano.metas_ids || [], activeInstituicaoId);

      return id;
    } catch (error) {
      console.error("❌ Erro ao salvar plano:", error);
      throw error;
    }
  },

  async deletePlano(id: string) {
    await estrategiaService.markForDelete("planeamentos", id);
  },

  async updatePlano(planoId: string, planoData: Partial<PlaneamentoDiario | PlaneamentoSemanalType | PlaneamentoMensal | PlaneamentoAnual>): Promise<{ success: boolean; id: string; data: any }> {
    try {
      const activeInstituicaoId = this.getActiveInstituicaoId();
      const planoAtual = await db.planeamentos.get(planoId);
      if (!planoAtual || planoAtual.deleted || planoAtual.instituicao_id !== activeInstituicaoId) {
        throw new Error("Planeamento não encontrado para a instituição ativa.");
      }

      const updated_at = new Date().toISOString();

      await db.planeamentos.update(planoId, {
        ...planoData,
        updated_at,
        sync_status: "pending",
      } as any);

      await db.syncQueue.add({
        table: "planeamentos",
        record_id: planoId,
        instituicao_id: activeInstituicaoId,
        operation: "upsert",
        status: "pending",
        created_at: updated_at,
      });

      const planoAtualizado = await this.getPlanoById(planoId);
      return { success: true, id: planoId, data: planoAtualizado };
    } catch (error) {
      console.error("Erro ao atualizar plano:", error);
      throw error;
    }
  },
  
  // ========== MÉTODOS DE BUSCA POR TIPO ==========
  
  /**
   * Busca planejamento diário por data específica
   */
  async getPlanejamentoDiario(data: string): Promise<PlaneamentoDiario | null> {
    try {
      const activeInstituicaoId = this.getActiveInstituicaoId();
      const planejamentos = await db.planeamentos
        .where('tipo')
        .equals('diario')
        .and(p => !p.deleted && p.instituicao_id === activeInstituicaoId && p.data_inicio === data)
        .toArray();
      
      return planejamentos[0] as PlaneamentoDiario || null;
    } catch (error) {
      console.error('Erro ao buscar planejamento diário:', error);
      return null;
    }
  },

  /**
   * Busca planejamento semanal - verifica se a data está DENTRO da semana
   */
  async getPlanejamentoSemanal(data: string): Promise<PlaneamentoSemanalType | null> {
    try {
      const activeInstituicaoId = this.getActiveInstituicaoId();
      const dataBusca = new Date(data);
      
      const planejamentos = await db.planeamentos
        .where('tipo')
        .equals('semanal')
        .and((p: any) => !p.deleted && p.instituicao_id === activeInstituicaoId)
        .toArray() as PlaneamentoSemanalType[];
      
      // Filtra: dataBusca está entre data_inicio e data_fim
      const encontrado = planejamentos.find(p => {
        const inicio = new Date(p.data_inicio);
        const fim = new Date(p.data_fim);
        return dataBusca >= inicio && dataBusca <= fim;
      });
      
      return encontrado || null;
    } catch (error) {
      console.error('Erro ao buscar planejamento semanal:', error);
      return null;
    }
  },

  /**
   * Busca planejamento mensal - verifica se a data está DENTRO do mês
   */
  async getPlanejamentoMensal(data: string): Promise<PlaneamentoMensal | null> {
    try {
      const activeInstituicaoId = this.getActiveInstituicaoId();
      const dataBusca = new Date(data);
      
      const planejamentos = await db.planeamentos
        .where('tipo')
        .equals('mensal')
        .and((p: any) => !p.deleted && p.instituicao_id === activeInstituicaoId)
        .toArray() as PlaneamentoMensal[];
      
      // Filtra: mesmo mês e ano
      const encontrado = planejamentos.find(p => {
        const inicio = new Date(p.data_inicio);
        const fim = new Date(p.data_fim);
        return dataBusca >= inicio && dataBusca <= fim;
      });
      
      return encontrado || null;
    } catch (error) {
      console.error('Erro ao buscar planejamento mensal:', error);
      return null;
    }
  },

  /**
   * Busca planejamento por data e tipo - VERSÃO CORRIGIDA
   */
  async getPlanejamentoPorData<T>(
    data: string, 
    tipo: 'diario' | 'semanal' | 'mensal'
  ): Promise<T | null> {
    switch(tipo) {
      case 'diario':
        return this.getPlanejamentoDiario(data) as Promise<T | null>;
      case 'semanal':
        return this.getPlanejamentoSemanal(data) as Promise<T | null>;
      case 'mensal':
        return this.getPlanejamentoMensal(data) as Promise<T | null>;
      default:
        return null;
    }
  },

  /**
   * Busca planejamento pela data atual (hoje/esta semana/este mês)
   */
  async getPlanejamentoAtual(tipo: 'diario' | 'semanal' | 'mensal'): Promise<any | null> {
    const hoje = new Date().toISOString().split('T')[0];
    return this.getPlanejamentoPorData(hoje, tipo);
  },

  /**
   * Verifica se existe planejamento para hoje (diário)
   */
  async existePlanejamentoHoje(): Promise<boolean> {
    const planejamento = await this.getPlanejamentoDiario(
      new Date().toISOString().split('T')[0]
    );
    return !!planejamento;
  },

  /**
   * Busca planejamento por semana específica (número da semana)
   */
  async getPlanejamentoPorSemana(data: string, tipo: 'semanal'): Promise<PlaneamentoSemanalType | null> {
    return this.getPlanejamentoSemanal(data);
  },

  /**
   * Busca planejamento por mês específico
   */
  async getPlanejamentoPorMes(data: string, tipo: 'mensal'): Promise<PlaneamentoMensal | null> {
    return this.getPlanejamentoMensal(data);
  }
};

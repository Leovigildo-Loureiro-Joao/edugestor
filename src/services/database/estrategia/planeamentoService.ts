// services/database/estrategia/planeamentoService.ts
import { PlaneamentoAnual } from "../../../types/planeamento";
import { PlaneamentoDiario, PlaneamentoMensal, PlaneamentoSemanal } from "../../../types/planeamento";
import { generateUniqueId } from "../../../utils/idGenarator";
import db from "../db";
import { estrategiaService } from "../estrategiaService";

export const estrategiaPlaneamentoService = {

  // ========== MÉTODOS EXISTENTES ==========
  async getPlanos(type: string) {
    try {
      const planos = await db.planeamentos.where("tipo").equals(type).toArray();
      return planos || [];
    } catch (error) {
      console.error("Erro ao buscar planos:", error);
      throw error;
    }
  },

  async getPlanoById(id: string) {
    try {
      const planos = await db.planeamentos
        .orderBy("created_at")
        .and((a) => a.id === id)
        .toArray();
      return planos[0] || null;
    } catch (error) {
      console.error("Erro ao buscar plano:", error);
      throw error;
    }
  },

  async savePlano(planoData: any) {
    try {
      const id = generateUniqueId();
      const now = new Date().toISOString();

      const plano = {
        ...planoData,
        id,
        created_at: now,
        updated_at: now,
        sync_status: "pending",
        deleted: false,
      };

      console.log("💾 Salvando plano:", plano.titulo || plano.descricao);
      await db.planeamentos.put(plano);

      await db.syncQueue.add({
        table: "planeamentos",
        record_id: id,
        operation: "upsert",
        status: "pending",
        created_at: now,
      });

      console.log("✅ Plano salvo com ID:", id);
      return id;
    } catch (error) {
      console.error("❌ Erro ao salvar plano:", error);
      throw error;
    }
  },

  async deletePlano(id: string) {
    await estrategiaService.markForDelete("planeamentos", id);
  },

  async updatePlano(planoId: string, planoData: Partial<PlaneamentoDiario | PlaneamentoSemanal | PlaneamentoMensal | PlaneamentoAnual>): Promise<{ success: boolean; id: string; data: any }> {
    try {
      const updated_at = new Date().toISOString();

      await db.planeamentos.update(planoId, {
        ...planoData,
        updated_at,
        sync_status: "pending",
      });

      await db.syncQueue.add({
        table: "planeamentos",
        record_id: planoId,
        operation: "upsert",
        status: "pending",
        created_at: updated_at,
      });

      const planoAtualizado = await this.getPlanoById(planoId);
      console.log(`✏️ Plano ${planoId} atualizado`);
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
      const planejamentos = await db.planeamentos
        .where('tipo')
        .equals('diario')
        .and(p => p.data_inicio === data)
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
  async getPlanejamentoSemanal(data: string): Promise<PlaneamentoSemanal | null> {
    try {
      const dataBusca = new Date(data);
      
      const planejamentos = await db.planeamentos
        .where('tipo')
        .equals('semanal')
        .toArray() as PlaneamentoSemanal[];
      
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
      const dataBusca = new Date(data);
      
      const planejamentos = await db.planeamentos
        .where('tipo')
        .equals('mensal')
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
  async getPlanejamentoPorSemana(data: string, tipo: 'semanal'): Promise<PlaneamentoSemanal | null> {
    return this.getPlanejamentoSemanal(data);
  },

  /**
   * Busca planejamento por mês específico
   */
  async getPlanejamentoPorMes(data: string, tipo: 'mensal'): Promise<PlaneamentoMensal | null> {
    return this.getPlanejamentoMensal(data);
  }
};

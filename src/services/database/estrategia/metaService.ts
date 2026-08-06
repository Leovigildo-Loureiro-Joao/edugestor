import { estrategiaService } from ".";
import { Meta } from "../../../types/eventos";
import { instituicaoIdValue } from "../../../utils/getInstituicaoID";
import { generateUniqueId } from "../../../utils/idGenerator";
import db from "../db";
import { syncManager } from "../syncManager";

export const estrategiaMetaService = {
  getActiveInstituicaoId() {
    return instituicaoIdValue() || '';
  },

  async getMetas() {
    try {
      const activeInstituicaoId = this.getActiveInstituicaoId();
      const metas = await db.metas.filter((meta)=> !meta.deleted&&meta.instituicao_id===activeInstituicaoId).toArray();
      return metas || [];
    } catch (error) {
      console.error("Erro ao buscar metas:", error);
      throw error;
    }
  },

  async getMetasID(id: string) {
    try {
      const activeInstituicaoId = this.getActiveInstituicaoId();
      const meta = await db.metas.get(id);
      if (!meta || meta.deleted || meta.instituicao_id !== activeInstituicaoId) {
        return null;
      }
      return meta;
    } catch (error) {
      console.error("Erro ao buscar metas:", error);
      throw error;
    }
  },

  async saveMeta(metaData: any) {
    try {
      const activeInstituicaoId = this.getActiveInstituicaoId();
      if (!activeInstituicaoId) {
        throw new Error("Instituição ativa não encontrada para salvar meta.");
      }

      const id = generateUniqueId();
      const now = new Date().toISOString();

      const meta = {
        ...metaData,
        instituicao_id: activeInstituicaoId,
        id,
        created_at: now,
        updated_at: now,
        sync_status: "pending",
        deleted: false,
      };

      await db.metas.put(meta);

      await db.syncQueue.add({
        table: "metas",
        instituicao_id: activeInstituicaoId,
        record_id: id,
        operation: "upsert",
        status: "pending",
        created_at: now,
      });

      return id;
    } catch (error) {
      console.error("❌ Erro ao salvar meta:", error);
      throw error;
    }
  },

  async syncMetas() {
    if (navigator.onLine) {
      return Promise.all([
        syncManager.uploadTableBatch("metas"),
        syncManager.downloadTableBatch("metas", new Date(0)),
      ]);
    }
    throw new Error("sem net");
  },

  async deleteMeta(id: string) {
    await estrategiaService.markForDelete("metas", id);
  },

  async updateMeta(metaId: string, metaData: Partial<Meta>) {
    try {
      const activeInstituicaoId = this.getActiveInstituicaoId();
      const metaAtual = await db.metas.get(metaId);
      if (!metaAtual || metaAtual.deleted || metaAtual.instituicao_id !== activeInstituicaoId) {
        throw new Error("Meta não encontrada para a instituição ativa.");
      }

      const updated_at = new Date().toISOString();

      await db.metas.update(metaId, {
        ...metaData,
        updated_at,
        sync_status: "pending",
      });

      await db.syncQueue.add({
        table: "metas",
        instituicao_id: activeInstituicaoId,
        record_id: metaId,
        operation: "upsert",
        status: "pending",
        created_at: updated_at,
      });

      return { success: true, id: metaId };
    } catch (error) {
      console.error("Erro ao atualizar meta:", error);
      throw error;
    }
  },

  async getMetasAtivas(): Promise<Meta[]> {
    try {
      const activeInstituicaoId = this.getActiveInstituicaoId();
      const metas = await db.metas
        .where("status")
        .anyOf(["nao_iniciada", "em_andamento"])
        .and((m) => !m.deleted && m.instituicao_id === activeInstituicaoId)
        .toArray();
      return metas || [];
    } catch (error) {
      console.error("Erro ao buscar metas ativas:", error);
      return [];
    }
  },

  async getMetasPorTipo(tipo: Meta["tipo"]): Promise<Meta[]> {
    try {
      const activeInstituicaoId = this.getActiveInstituicaoId();
      const metas = await db.metas
        .where("tipo")
        .equals(tipo)
        .and((m) => !m.deleted && m.instituicao_id === activeInstituicaoId)
        .toArray();
      return metas || [];
    } catch (error) {
      console.error("Erro ao buscar metas por tipo:", error);
      return [];
    }
  },

  async getMetasPorPrioridade(prioridade: Meta["prioridade"]): Promise<Meta[]> {
    try {
      const activeInstituicaoId = this.getActiveInstituicaoId();
      const metas = await db.metas
        .where("prioridade")
        .equals(prioridade)
        .and((m) => !m.deleted && m.instituicao_id === activeInstituicaoId)
        .toArray();
      return metas || [];
    } catch (error) {
      console.error("Erro ao buscar metas por prioridade:", error);
      return [];
    }
  },

  async verificarPrazosMetas(): Promise<void> {
    try {
      const metas = await this.getMetasAtivas();
      const hoje = new Date();

      for (const meta of metas) {
        const dataFim = new Date(meta.data_fim);

        if (hoje > dataFim && meta.status === "em_andamento") {
          await this.updateMeta(meta.id, { status: "atrasada" });
          } else if (
          hoje >= new Date(meta.data_inicio) &&
          meta.status === "nao_iniciada"
        ) {
          await this.updateMeta(meta.id, { status: "em_andamento" });
          }
      }
    } catch (error) {
      console.error("Erro ao verificar prazos:", error);
    }
  },

  async getMetasAdemicas() {
    const activeInstituicaoId = this.getActiveInstituicaoId();
    const metas = await db.metas
      .filter((m) => m.tipo == "academica" && !m.deleted && m.instituicao_id === activeInstituicaoId)
      .toArray();
    return metas.map((meta: Meta) => {
      return {
        label: meta.titulo,
        atual: meta.progresso,
        meta: 100,
        kpi: meta.kpis?.map((m) => ({
          label: m.nome,
          atual: m.valor_atual,
          meta: m.valor_meta,
        })),
      };
    });
  },
};

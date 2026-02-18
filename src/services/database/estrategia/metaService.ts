import { estrategiaService } from ".";
import { Meta } from "../../../types/eventos";
import { instituicaoIdValue } from "../../../utils/getInsitituicaoID";
import { generateUniqueId } from "../../../utils/idGenarator";
import db from "../db";
import { syncManager } from "../syncManager";

export const estrategiaMetaService = {
  async getMetas() {
    try {
      const activeInstituicaoId = instituicaoIdValue() || '';
      const metas = await db.metas.filter((meta)=> !meta.deleted&&meta.instituicao_id===activeInstituicaoId).toArray();
      return metas || [];
    } catch (error) {
      console.error("Erro ao buscar metas:", error);
      throw error;
    }
  },

  async getMetasID(id: string) {
    try {
      const metas = await db.metas
        .orderBy("created_at")
        .and((a) => a.id === id)
        .toArray();
      return metas[0] || [];
    } catch (error) {
      console.error("Erro ao buscar metas:", error);
      throw error;
    }
  },

  async saveMeta(metaData: any) {
    try {
      const id = generateUniqueId();
      const now = new Date().toISOString();

      const meta = {
        ...metaData,
        id,
        created_at: now,
        updated_at: now,
        sync_status: "pending",
        deleted: false,
      };

      console.log("💾 Salvando meta:", meta.titulo || meta.descricao);

      await db.metas.put(meta);

      await db.syncQueue.add({
        table: "metas",
        instituicao_id:instituicaoIdValue(),
        record_id: id,
        operation: "upsert",
        status: "pending",
        created_at: now,
      });

      console.log("✅ Meta salva com ID:", id);
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
      const updated_at = new Date().toISOString();

      await db.metas.update(metaId, {
        ...metaData,
        updated_at,
        sync_status: "pending",
      });

      await db.syncQueue.add({
        table: "metas",
        instituicao_id:instituicaoIdValue(),
        record_id: metaId,
        operation: "upsert",
        status: "pending",
        created_at: updated_at,
      });

      console.log(`✏️ Meta ${metaId} atualizada`);
      return { success: true, id: metaId };
    } catch (error) {
      console.error("Erro ao atualizar meta:", error);
      throw error;
    }
  },

  async getMetasAtivas(): Promise<Meta[]> {
    try {
      const metas = await db.metas
        .where("status")
        .anyOf(["nao_iniciada", "em_andamento"])
        .toArray();
      return metas || [];
    } catch (error) {
      console.error("Erro ao buscar metas ativas:", error);
      return [];
    }
  },

  async getMetasPorTipo(tipo: Meta["tipo"]): Promise<Meta[]> {
    try {
      const metas = await db.metas.where("tipo").equals(tipo).toArray();
      return metas || [];
    } catch (error) {
      console.error("Erro ao buscar metas por tipo:", error);
      return [];
    }
  },

  async getMetasPorPrioridade(prioridade: Meta["prioridade"]): Promise<Meta[]> {
    try {
      const metas = await db.metas.where("prioridade").equals(prioridade).toArray();
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
          console.log(`⚠️ Meta "${meta.titulo}" marcada como atrasada`);
        } else if (
          hoje >= new Date(meta.data_inicio) &&
          meta.status === "nao_iniciada"
        ) {
          await this.updateMeta(meta.id, { status: "em_andamento" });
          console.log(`▶️ Meta "${meta.titulo}" iniciada automaticamente`);
        }
      }
    } catch (error) {
      console.error("Erro ao verificar prazos:", error);
    }
  },

  async getMetasAdemicas() {
    const metas = await db.metas.filter((m) => m.tipo == "academica" && !m.deleted).toArray();
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

import { generateUniqueId } from "../../../utils/idGenerator";
import db from "../db";
import { syncManager } from "../syncManager";
import { instituicaoIdValue } from "../../../utils/getInstituicaoID";

export const estrategiaRotinaService = {
  async getRotinasDiarias() {
    try {
      const rotinas = await db.rotinas.orderBy("created_at").toArray();
      return rotinas || [];
    } catch (error) {
      console.error("Erro ao buscar rotinas:", error);
      throw error;
    }
  },

  async saveRotina(rotinaData: any) {
    try {
      const id = generateUniqueId();
      const now = new Date().toISOString();

      const rotina = {
        ...rotinaData,
        id,
        created_at: now,
        updated_at: now,
        sync_status: "pending",
        deleted: false,
      };

      await db.rotinas.put(rotina);

      await db.syncQueue.add({
        table: "rotinas",
        instituicao_id: instituicaoIdValue(),
        record_id: id,
        operation: "upsert",
        status: "pending",
        created_at: now,
      });

      return id;
    } catch (error) {
      console.error("❌ Erro ao salvar rotina:", error);
      throw error;
    }
  },

  async updateRotinaStatus(rotinaId: string, status: string) {
    return this.updateRotina(rotinaId, { status });
  },

  async executarRotina(rotinaId: string) {
    try {
      const updated_at = new Date().toISOString();

      await db.rotinas.update(rotinaId, {
        status: "suspensa",
        updated_at,
        sync_status: "pending",
      });

      await db.syncQueue.add({
        table: "rotinas",
        instituicao_id: instituicaoIdValue(),
        record_id: rotinaId,
        operation: "upsert",
        status: "pending",
        created_at: updated_at,
      });

      return { success: true, id: rotinaId };
    } catch (error) {
      console.error("Erro ao executar rotina:", error);
      throw error;
    }
  },

  async syncRotinas() {
    if (navigator.onLine) {
      return Promise.all([
        syncManager.uploadTableBatch("rotinas"),
        syncManager.downloadTableBatch("rotinas", new Date(0)),
      ]);
    }
    throw new Error("sem net");
  },

  async syncPlanosAcao() {
    },

  async deleteRotina(id: string) {
    await this.markForDelete("rotinas", id);
  },

  async markForDelete(table: "rotinas", id: string) {
    const now = new Date().toISOString();
    await db.rotinas.update(id, {
      deleted: true,
      sync_status: "pending_delete",
      updated_at: now
    });

    await db.syncQueue.add({
      table,
      instituicao_id: instituicaoIdValue(),
      record_id: id,
      operation: "delete",
      status: "pending",
      created_at: now
    });
  },

  async updateRotina(rotinaId: string, rotinaData: Partial<any>) {
    try {
      const updated_at = new Date().toISOString();

      await db.rotinas.update(rotinaId, {
        ...rotinaData,
        updated_at,
        sync_status: "pending",
      });

      await db.syncQueue.add({
        table: "rotinas",
        instituicao_id: instituicaoIdValue(),
        record_id: rotinaId,
        operation: "upsert",
        status: "pending",
        created_at: updated_at,
      });

      return { success: true, id: rotinaId };
    } catch (error) {
      console.error("Erro ao atualizar rotina:", error);
      throw error;
    }
  },
};

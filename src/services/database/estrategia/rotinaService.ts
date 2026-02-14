import { generateUniqueId } from "../../../utils/idGenarator";
import db from "../db";
import { syncManager } from "../syncManager";

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

      console.log("💾 Salvando rotina:", rotina.titulo || rotina.descricao || rotina.nome);
      await db.rotinas.put(rotina);

      await db.syncQueue.add({
        table: "rotinas",
        record_id: id,
        operation: "upsert",
        status: "pending",
        created_at: now,
      });

      console.log("✅ Rotina salva com ID:", id);
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
        record_id: rotinaId,
        operation: "upsert",
        status: "pending",
        created_at: updated_at,
      });

      console.log(`✅ Rotina ${rotinaId} executada`);
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
    console.log("Sync planos de ação...");
  },

  async deleteRotina(id: string) {
    await this.markForDelete("rotinas", id);
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
        record_id: rotinaId,
        operation: "upsert",
        status: "pending",
        created_at: updated_at,
      });

      console.log(`✏️ Rotina ${rotinaId} atualizada`);
      return { success: true, id: rotinaId };
    } catch (error) {
      console.error("Erro ao atualizar rotina:", error);
      throw error;
    }
  },
};

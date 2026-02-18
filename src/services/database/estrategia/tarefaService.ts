import { estrategiaService } from ".";
import { instituicaoIdValue } from "../../../utils/getInsitituicaoID";
import { generateUniqueId } from "../../../utils/idGenarator";
import db from "../db";
import { syncManager } from "../syncManager";

export const estrategiaTarefaService = {
  async getResumoEstrategico() {
    try {
      const activeInstituicaoId=instituicaoIdValue()
      const [totametasConcluidas, tarefasPendentes, metasAtrasadas] =
        await Promise.all([
          db.metas.where("status").equals("concluida").filter(m=> m.instituicao_id===activeInstituicaoId).count(),
          db.tarefas.filter(tarefa => !tarefa.deleted&&tarefa.concluida&&tarefa.instituicao_id===activeInstituicaoId).count(),
          db.metas.where("status").equals("nao_iniciada").filter(m=> m.instituicao_id===activeInstituicaoId).count(),
        ]);

      return {
        tarefasPendentes: tarefasPendentes || 0,
        metasConcluidas: totametasConcluidas || 0,
        metasAtrasadas: metasAtrasadas || 0,
        proximasAtividades: [],
      };
    } catch (error) {
      console.error("Erro ao buscar resumo estratégico:", error);
      throw error;
    }
  },

  async getTarefas() {
    try {
      const activeInstituicaoId=instituicaoIdValue()
      const tarefas = await db.tarefas.orderBy("created_at").reverse().filter(ta=>ta.instituicao_id==activeInstituicaoId).toArray();
      return tarefas || [];
    } catch (error) {
      console.error("Erro ao buscar tarefas:", error);
      throw error;
    }
  },

  async saveTarefa(tarefaData: any) {
    try {
      const id = generateUniqueId();
      const now = new Date().toISOString();

      const tarefa = {
        ...tarefaData,
        id,
        created_at: now,
        updated_at: now,
        sync_status: "pending",
        deleted: false,
      };

      console.log("💾 Salvando tarefa:", tarefa.titulo || tarefa.descricao);

      await db.tarefas.put(tarefa);

      await db.syncQueue.add({
        table: "tarefas",
        record_id: id,
        operation: "upsert",
        status: "pending",
        instituicao_id:instituicaoIdValue(),
        created_at: now,
      });

      console.log("✅ Tarefa salva com ID:", id);
      return id;
    } catch (error) {
      console.error("❌ Erro ao salvar tarefa:", error);
      throw error;
    }
  },

  async updateTarefaStatus(tarefaId: string, concluida: string) {
    return this.updateTarefa(tarefaId, { status: concluida });
  },

  async syncTarefas() {
    if (navigator.onLine) {
      return Promise.all([
        syncManager.uploadTableBatch("tarefas"),
        syncManager.downloadTableBatch("tarefas", new Date(0)),
      ]);
    }

    throw new Error("sem net");
  },

  async deleteTarefa(id: string) {
    await estrategiaService.markForDelete("tarefas", id);
  },

  async updateTarefa(tarefaId: string, tarefaData: Partial<any>) {
    try {
      const updated_at = new Date().toISOString();

      await db.tarefas.update(tarefaId, {
        ...tarefaData,
        updated_at,
        sync_status: "pending",
      });

      await db.syncQueue.add({
        table: "tarefas",
        instituicao_id:instituicaoIdValue(),
        record_id: tarefaId,
        operation: "upsert",
        status: "pending",
        created_at: updated_at,
      });

      console.log(`✏️ Tarefa ${tarefaId} atualizada`);
      return { success: true, id: tarefaId };
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      throw error;
    }
  },
};

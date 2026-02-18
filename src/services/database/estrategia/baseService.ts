import db from "../db";
import { instituicaoIdValue } from "../../../utils/getInsitituicaoID";

type EstrategiaTable = "metas" | "tarefas" | "planeamentos" | "rotinas";

export const estrategiaBaseService = {
  async markForDelete(table: EstrategiaTable, id: string) {
    try {
      const record = await db[table].get(id);
      if (!record) return;

      if (record.sync_status === "synced" && !record.id.startsWith("local_")) {
        await db[table].update(id, {
          deleted: true,
          sync_status: "pending_delete",
          updated_at: new Date().toISOString(),
        });

        await db.syncQueue.add({
          instituicao_id: instituicaoIdValue(),
          table,
          record_id: id,
          operation: "delete",
          status: "pending",
          created_at: new Date().toISOString(),
        });

        console.log(`🗑️ ${table} ${id} marcado para deleção remota`);
      } else {
        await db[table].delete(id);

        const instituicaoId = instituicaoIdValue();
        await db.syncQueue
          .where("record_id")
          .equals(id)
          .and((item) => item.instituicao_id === instituicaoId)
          .delete();

        console.log(`🗑️ ${table} ${id} deletado localmente`);
      }
    } catch (error) {
      console.error(`Erro ao deletar ${table}:`, error);
      throw error;
    }
  },
};

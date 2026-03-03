import db, { supabase } from "../services/database/db";
import { syncManager } from "../services/database/syncManager";
import { instituicaoIdValue } from "./getInsitituicaoID";

export function emitPendingSync(tableName: string, count: number) {
  // Salvar no localStorage para acesso global
  localStorage.setItem(`pending_sync_${tableName}`, count.toString());
  
  // Emitir evento customizado
  const event = new CustomEvent('sync-pending', {
    detail: { table: tableName, count }
  });
  window.dispatchEvent(event);
}

export function emitDbChanged(tableName: string, action?: string) {
  const event = new CustomEvent('db-changed', {
    detail: { table: tableName, action }
  });
  window.dispatchEvent(event);
}

export const getPendingCount = async (table: string): Promise<number> => {
    try {
      const instituicaoId = instituicaoIdValue();
      if (!instituicaoId) return 0;
      // Tentar do localStorage primeiro
      
      const pendingItems = await db.syncQueue
        .where('instituicao_id')
        .equals(instituicaoId)
        .and(item => item.table === table && item.status === 'pending')
        .toArray();

        return syncManager.processarRegistrosUnicos(pendingItems,table).length;
    } catch (error) {
      return 0;
    }
  };

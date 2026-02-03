import db from "../services/database/db";

export function emitPendingSync(tableName: string, count: number) {
  // Salvar no localStorage para acesso global
  localStorage.setItem(`pending_sync_${tableName}`, count.toString());
  
  // Emitir evento customizado
  const event = new CustomEvent('sync-pending', {
    detail: { table: tableName, count }
  });
  window.dispatchEvent(event);
}

export const getPendingCount = async (table: string): Promise<number> => {
    try {
      // Tentar do localStorage primeiro
      const cached = localStorage.getItem(`pending_sync_${table}`);
      if (cached) return parseInt(cached, 10);

      // Se não, buscar do IndexedDB
      const pendingItems = await db.syncQueue
        .where('table')
        .equals(table)
        .and(item => item.status === 'pending'||item.status === 'pending_delete')
        .toArray();

        console.log(pendingItems)
      return pendingItems.length;
    } catch (error) {
      return 0;
    }
  };

import db from "../services/database/db";
import { syncManager } from "../services/database/syncManager";
import { instituicaoIdValue } from "./getInsitituicaoID";

export interface SyncError {
  id: string;
  table: string;
  data: any;
  error: string;
  timestamp: Date;
  retry_count: number;
}

const getErrorKey = (tableName: string) => `sync_errors_${tableName}`;

  export const getErrorCount = async (table: string): Promise<number> => {
    try {
      const instituicaoId = instituicaoIdValue();
      if (!instituicaoId) return 0;
      
      const failedItems = await db.syncQueue
        .where('instituicao_id')
        .equals(instituicaoId)
        .and(item => item.table === table && item.status === 'failed')
        .toArray();

        return syncManager.processarRegistrosUnicos(failedItems,table).length;
    } catch (error) {
      return 0;
    }
  };

export const addSyncError = (
  tableName: string, 
  data: any, 
  error: string,
  id?: string
): void => {
  try {
    const errorKey = getErrorKey(tableName);
    const errorsJson = localStorage.getItem(errorKey);
    let errors: SyncError[] = errorsJson ? JSON.parse(errorsJson) : [];
    
    const syncError: SyncError = {
      id: id || `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      table: tableName,
      data,
      error,
      timestamp: new Date(),
      retry_count: 0
    };
    
    errors.push(syncError);
    localStorage.setItem(errorKey, JSON.stringify(errors));
    
    window.dispatchEvent(new CustomEvent('sync-failed', {
      detail: { table: tableName, error: syncError }
    }));
  } catch (error) {
    console.error('Erro ao salvar erro de sincronização:', error);
  }
};

export const removeSyncError = (tableName: string, errorId: string): void => {
  try {
    const errorKey = getErrorKey(tableName);
    const errorsJson = localStorage.getItem(errorKey);
    
    if (!errorsJson) return;
    
    let errors: SyncError[] = JSON.parse(errorsJson);
    errors = errors.filter(e => e.id !== errorId);
    
    localStorage.setItem(errorKey, JSON.stringify(errors));
    
    window.dispatchEvent(new CustomEvent('sync-error-removed', {
      detail: { table: tableName, errorId }
    }));
  } catch (error) {
    console.error('Erro ao remover erro de sincronização:', error);
  }
};

export const getSyncErrors = (tableName: string): SyncError[] => {
  try {
    const errorKey = getErrorKey(tableName);
    const errorsJson = localStorage.getItem(errorKey);
    
    if (!errorsJson) return [];
    
    const errors: SyncError[] = JSON.parse(errorsJson);
    return Array.isArray(errors) ? errors : [];
  } catch (error) {
    console.error('Erro ao obter erros de sincronização:', error);
    return [];
  }
};

export const clearSyncErrors = (tableName: string): void => {
  try {
    const errorKey = getErrorKey(tableName);
    localStorage.removeItem(errorKey);
    
    window.dispatchEvent(new CustomEvent('sync-errors-cleared', {
      detail: { table: tableName }
    }));
  } catch (error) {
    console.error('Erro ao limpar erros de sincronização:', error);
  }
};

export const incrementRetryCount = (tableName: string, errorId: string): void => {
  try {
    const errorKey = getErrorKey(tableName);
    const errorsJson = localStorage.getItem(errorKey);
    
    if (!errorsJson) return;
    
    let errors: SyncError[] = JSON.parse(errorsJson);
    errors = errors.map(error => {
      if (error.id === errorId) {
        return { ...error, retry_count: error.retry_count + 1 };
      }
      return error;
    });
    
    localStorage.setItem(errorKey, JSON.stringify(errors));
  } catch (error) {
    console.error('Erro ao incrementar retry count:', error);
  }
};

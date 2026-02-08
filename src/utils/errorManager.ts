// utils/errorManager.ts

import db from "../services/database/db";
import { syncManager } from "../services/database/syncManager";

// Interface para armazenar informações de erro
export interface SyncError {
  id: string;
  table: string;
  data: any;
  error: string;
  timestamp: Date;
  retryCount: number;
}

// Chave para localStorage
const getErrorKey = (tableName: string) => `sync_errors_${tableName}`;

// Função para obter contagem de erros
  export const getErrorCount = async (table: string): Promise<number> => {
    try {
      // Tentar do localStorage primeiro
      
      const failedItems = await db.syncQueue
        .where('table')
        .equals(table)
        .and(item => item.status === 'failed')
        .toArray();

        console.log(failedItems)
      return syncManager.processarRegistrosUnicos(failedItems,table).length;
    } catch (error) {
      return 0;
    }
  };

// Função para adicionar um erro
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
      retryCount: 0
    };
    
    errors.push(syncError);
    localStorage.setItem(errorKey, JSON.stringify(errors));
    
    // Disparar evento para atualizar UI
    window.dispatchEvent(new CustomEvent('sync-failed', {
      detail: { table: tableName, error: syncError }
    }));
  } catch (error) {
    console.error('Erro ao salvar erro de sincronização:', error);
  }
};

// Função para remover um erro (quando resolvido)
export const removeSyncError = (tableName: string, errorId: string): void => {
  try {
    const errorKey = getErrorKey(tableName);
    const errorsJson = localStorage.getItem(errorKey);
    
    if (!errorsJson) return;
    
    let errors: SyncError[] = JSON.parse(errorsJson);
    errors = errors.filter(e => e.id !== errorId);
    
    localStorage.setItem(errorKey, JSON.stringify(errors));
    
    // Disparar evento para atualizar UI
    window.dispatchEvent(new CustomEvent('sync-error-removed', {
      detail: { table: tableName, errorId }
    }));
  } catch (error) {
    console.error('Erro ao remover erro de sincronização:', error);
  }
};

// Função para obter todos os erros de uma tabela
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

// Função para limpar todos os erros de uma tabela
export const clearSyncErrors = (tableName: string): void => {
  try {
    const errorKey = getErrorKey(tableName);
    localStorage.removeItem(errorKey);
    
    // Disparar evento para atualizar UI
    window.dispatchEvent(new CustomEvent('sync-errors-cleared', {
      detail: { table: tableName }
    }));
  } catch (error) {
    console.error('Erro ao limpar erros de sincronização:', error);
  }
};

// Função para incrementar contador de retentativas
export const incrementRetryCount = (tableName: string, errorId: string): void => {
  try {
    const errorKey = getErrorKey(tableName);
    const errorsJson = localStorage.getItem(errorKey);
    
    if (!errorsJson) return;
    
    let errors: SyncError[] = JSON.parse(errorsJson);
    errors = errors.map(error => {
      if (error.id === errorId) {
        return { ...error, retryCount: error.retryCount + 1 };
      }
      return error;
    });
    
    localStorage.setItem(errorKey, JSON.stringify(errors));
  } catch (error) {
    console.error('Erro ao incrementar retry count:', error);
  }
};
import React, { useState, useEffect } from 'react';
import { FiRefreshCw, FiAlertCircle, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { syncManager } from '../../services/database/syncManager';
import { getPendingCount } from '../../utils/emitPendingSync';
import { getErrorCount } from '../../utils/errorManager';
import { supabase } from '../../services/database/db';

interface SyncStatusBadgeProps {
  tableName: string;
  showCount?: boolean;
  className?: string;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  tableName,
  showCount = true,
  className = ''
}) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [pending, errors] = await Promise.all([
          getPendingCount(tableName),
          getErrorCount(tableName)
        ]);
        
        setPendingCount(Math.max(0, pending || 0));
        setErrorCount(Math.max(0, errors || 0));
      } catch (error) {
        console.error('Erro ao carregar contadores:', error);
        setPendingCount(0);
        setErrorCount(0);
      }
    };

    loadCounts();

    const handleSyncEvent = (e: CustomEvent) => {
      if (e.detail?.table === tableName || e.detail?.table === 'all') {
        loadCounts();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes(`sync_${tableName}`) || e.key?.includes('sync_status')) {
        loadCounts();
      }
    };

    window.addEventListener('sync-pending', handleSyncEvent as EventListener);
    window.addEventListener('sync-complete', handleSyncEvent as EventListener);
    window.addEventListener('sync-failed', handleSyncEvent as EventListener);
    window.addEventListener('storage', handleStorageChange);
    
    const interval = setInterval(loadCounts, 30000);

    return () => {
      window.removeEventListener('sync-pending', handleSyncEvent as EventListener);
      window.removeEventListener('sync-complete', handleSyncEvent as EventListener);
      window.removeEventListener('sync-failed', handleSyncEvent as EventListener);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [tableName]);

  const handleSyncNow = async () => {
    if (isSyncing) return;
    
    try {
      setIsSyncing(true);
      await syncManager.uploadBatch();
      
      setTimeout(async () => {
        try {
          const [pending, errors] = await Promise.all([
            getPendingCount(tableName),
            getErrorCount(tableName)
          ]);
          
          setPendingCount(Math.max(0, pending || 0));
          setErrorCount(Math.max(0, errors || 0));
        } catch (error) {
          console.error('Erro ao recarregar contadores:', error);
        } finally {
          setIsSyncing(false);
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      setIsSyncing(false);
    }
  };

  const handleRetryErrors = async () => {
    await syncManager.cleanupOrphanedSyncQueue({ statuses: ['failed'], dryRun: false })

    if (isSyncing) return;
    
    try {
      setIsSyncing(true);
      await syncManager.rentryErrorsTable(tableName);
      
      setTimeout(async () => {
        try {
          const [pending, errors] = await Promise.all([
            getPendingCount(tableName),
            getErrorCount(tableName)
          ]);
          
          setPendingCount(Math.max(0, pending || 0));
          setErrorCount(Math.max(0, errors || 0));
        } catch (error) {
          console.error('Erro ao recarregar contadores:', error);
        } finally {
          setIsSyncing(false);
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Erro ao retentar:', error);
      setIsSyncing(false);
    }
  };

  const getDisplayName = () => {
    const names: Record<string, string> = {
      'alunos': 'Alunos',
      'turmas': 'Turmas',
      'cursos': 'Cursos',
      'aulas': 'Aulas',
      'avaliacoes': 'Avaliações',
      'frequencias': 'Frequências',
      'notificacao': 'Notificações',
      'transacoes': 'Transações',
      'propina': 'Propinas',
      'metas': 'Metas',
      'plano_aulas': 'Planos de Aula'
    };
    
    return names[tableName] || tableName;
  };

  if (errorCount > 0) {
    return (
      <button
        onClick={handleRetryErrors}
        disabled={isSyncing}
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all hover:opacity-90 active:scale-95 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 ${className}`}
        title={`${errorCount} ${getDisplayName().toLowerCase()} falharam na sincronização. Clique para tentar novamente.`}
      >
        {isSyncing ? (
          <>
            <FiRefreshCw className="mr-1 animate-spin" size={12} />
            <span>Reenviando...</span>
          </>
        ) : (
          <>
            <FiXCircle className="mr-1" size={12} />
            <span>
              {showCount ? `${errorCount} ` : ''}
              erro{errorCount > 1 ? 's' : ''}
            </span>
          </>
        )}
      </button>
    );
  }

  if (pendingCount === 0) {
    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 ${className}`}>
        <FiCheckCircle className="mr-1" size={12} />
        <span>Sincronizado</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleSyncNow}
      disabled={isSyncing}
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all hover:opacity-90 active:scale-95 ${
        isSyncing 
          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
          : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
      } ${className}`}
      title={`${pendingCount} ${getDisplayName().toLowerCase()} pendentes de sincronização`}
    >
      {isSyncing ? (
        <>
          <FiRefreshCw className="mr-1 animate-spin" size={12} />
          <span>Sincronizando...</span>
        </>
      ) : (
        <>
          <FiAlertCircle className="mr-1" size={12} />
          <span>
            {showCount ? `${pendingCount} ` : ''}
            {pendingCount === 1 ? 'pendente' : 'pendentes'}
          </span>
        </>
      )}
    </button>
  );
};

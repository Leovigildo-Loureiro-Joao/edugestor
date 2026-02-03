import React, { useState, useEffect } from 'react';
import { FiRefreshCw, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { syncManager } from '../../services/database/syncManager';
import db from '../../services/database/db';
import { getPendingCount } from '../../utils/emitPendingSync';

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    // 1. Carregar contagem inicial
    const loadPendingCount = async () => {
      try {
        const count = await getPendingCount(tableName);
        setPendingCount(count);
      } catch (error) {
        console.error('Erro ao carregar pendentes:', error);
      }
    };

    loadPendingCount();

    // 2. Ouvir eventos de sincronização
    const handleSyncEvent = (e: CustomEvent) => {
      if (e.detail?.table === tableName || e.detail?.table === 'all') {
        loadPendingCount();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `pending_sync_${tableName}`) {
        loadPendingCount();
      }
    };

    // 3. Configurar listeners
    window.addEventListener('sync-pending', handleSyncEvent as EventListener);
    window.addEventListener('storage', handleStorageChange);
    
    // Polling para atualização (a cada 30 segundos)
    const interval = setInterval(loadPendingCount, 30000);

    return () => {
      window.removeEventListener('sync-pending', handleSyncEvent as EventListener);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [tableName]);

  const handleSyncNow = async () => {
    if (isSyncing) return;
    
    try {
      setIsSyncing(true);
      console.log(`🔄 Sincronizando ${tableName}...`);
      
      await syncManager.uploadBatch();
      
      // Aguardar um pouco e recarregar
      setTimeout(async () => {
        const newCount = await getPendingCount(tableName);
        setPendingCount(newCount);
        setIsSyncing(false);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      setIsSyncing(false);
    }
  };

  const getDisplayName = () => {
    const names: Record<string, string> = {
      'alunos': 'Alunos',
      'turmas': 'Turmas',
      'cursos': 'Cursos',
      'aulas': 'Aulas',
      'notificacao': 'Notificações',
      'transacoes': 'Transações',
      'propina': 'Propinas'
    };
    
    return names[tableName] || tableName;
  };

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
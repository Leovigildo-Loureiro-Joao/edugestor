import React, { useState, useEffect } from 'react';
import { FiRefreshCw, FiAlertCircle, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { syncManager } from '../../services/database/syncManager';
import { getPendingCount } from '../../utils/emitPendingSync';
import { getErrorCount } from '../../utils/errorManager'; // Você vai criar essa função

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
    // Função para carregar ambos os contadores
    const loadCounts = async () => {
      try {
        // Carregar pendentes e erros separadamente
        const [pending, errors] = await Promise.all([
          getPendingCount(tableName),
          getErrorCount(tableName)
        ]);
        
        // Proteção contra valores negativos
        setPendingCount(Math.max(0, pending || 0));
        setErrorCount(Math.max(0, errors || 0));
      } catch (error) {
        console.error('Erro ao carregar contadores:', error);
        // Em caso de erro, garantir valores não negativos
        setPendingCount(0);
        setErrorCount(0);
      }
    };

    loadCounts();

    // 2. Ouvir eventos de sincronização
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

    // 3. Configurar listeners
    window.addEventListener('sync-pending', handleSyncEvent as EventListener);
    window.addEventListener('sync-complete', handleSyncEvent as EventListener);
    window.addEventListener('sync-failed', handleSyncEvent as EventListener);
    window.addEventListener('storage', handleStorageChange);
    
    // Polling para atualização (a cada 30 segundos)
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
      console.log(`🔄 Sincronizando ${tableName}...`);
      
      await syncManager.uploadBatch();
      
      // Aguardar um pouco e recarregar
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
    if (isSyncing) return;
    
    try {
      setIsSyncing(true);
      console.log(`🔄 Reenviando itens com erro para ${tableName}...`);
      
      // Chamar função específica para retentar erros
      await syncManager.rentryErrorsTable(tableName);
      
      // Aguardar e recarregar
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
      'metas': 'Metas'
    };
    
    return names[tableName] || tableName;
  };

  // SE HÁ ERROS: mostrar botão vermelho para retentar
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

  // SE ESTÁ SINCRONIZADO: mostrar verde
  if (pendingCount === 0) {
    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 ${className}`}>
        <FiCheckCircle className="mr-1" size={12} />
        <span>Sincronizado</span>
      </div>
    );
  }

  // SE HÁ PENDENTES (sem erros): mostrar laranja/laranja
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

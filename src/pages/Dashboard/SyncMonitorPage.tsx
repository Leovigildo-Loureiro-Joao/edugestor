import React, { useCallback, useEffect, useState } from 'react';
import { FiAlertCircle, FiRefreshCw, FiTrash2, FiXCircle } from 'react-icons/fi';
import db from '../../services/database/db';
import { syncManager } from '../../services/database/syncManager';
import { instituicaoIdValue } from '../../utils/getInsitituicaoID';

type MonitorStats = {
  pending: number;
  failed6: number;
  orphans: number;
  orphanByTable: Record<string, number>;
};

const SyncMonitorPage: React.FC = () => {
  const [stats, setStats] = useState<MonitorStats>({
    pending: 0,
    failed6: 0,
    orphans: 0,
    orphanByTable: {}
  });
  const [loading, setLoading] = useState(false);

  const loadStats = useCallback(async () => {
    const instituicaoId = instituicaoIdValue();
    if (!instituicaoId) return;

    const queueItems = await db.syncQueue
      .where('instituicao_id')
      .equals(instituicaoId)
      .toArray();

    const pending = queueItems.filter((item) => item.status === 'pending').length;
    const failed6 = queueItems.filter((item) => item.status === 'failed' && (item.retry_count || 0) >= 6).length;

    const orphanDiagnosis = await syncManager.findOrphanedSyncQueueItems({
      statuses: ['pending', 'failed']
    });

    setStats({
      pending,
      failed6,
      orphans: orphanDiagnosis.orphanCount || 0,
      orphanByTable: orphanDiagnosis.byTable || {}
    });
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const withBusy = async (fn: () => Promise<void>) => {
    if (loading) return;
    try {
      setLoading(true);
      await fn();
      await loadStats();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">Sync Monitor</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Monitoramento da fila: pending, failed & orphans</p>
        </div>
        <button
          onClick={() => withBusy(loadStats)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm text-amber-700">Pending</div>
          <div className="text-3xl font-bold text-amber-900">{stats.pending}</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="text-sm text-red-700">Failed ({'>=6'})</div>
          <div className="text-3xl font-bold text-red-900">{stats.failed6}</div>
        </div>
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
          <div className="text-sm text-purple-700">Orphans</div>
          <div className="text-3xl font-bold text-purple-900">{stats.orphans}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Ações</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() =>
              withBusy(async () => {
                await syncManager.retryFailedItems(10);
              })
            }
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
          >
            <FiXCircle />
            Reenviar Failed
          </button>
          <button
            onClick={() =>
              withBusy(async () => {
                await syncManager.cleanupOrphanedSyncQueue({
                  statuses: ['pending', 'failed'],
                  dryRun: false
                });
              })
            }
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
          >
            <FiTrash2 />
            Limpar Orphans
          </button>
          <button
            onClick={() =>
              withBusy(async () => {
                await syncManager.uploadBatch();
              })
            }
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            <FiAlertCircle />
            Forçar Upload
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Orphans por tabela</h2>
        {Object.keys(stats.orphanByTable).length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Sem órfãos detectados.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(stats.orphanByTable).map(([table, count]) => (
              <div key={table} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-700/40 px-3 py-2">
                <span className="text-sm text-gray-700 dark:text-gray-200">{table}</span>
                <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SyncMonitorPage;

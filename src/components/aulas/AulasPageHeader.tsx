import React from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiRefreshCw } from 'react-icons/fi';
import { SyncStatusBadge } from '../ui/SyncStatusBadge';

interface AulasPageHeaderProps {
  onQuickAdd: () => void;
  onDetailedAdd: () => void;
  onRefresh: () => void;
}

export const AulasPageHeader: React.FC<AulasPageHeaderProps> = ({
  onQuickAdd,
  onDetailedAdd,
  onRefresh
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 flex justify-between items-center flex-wrap gap-4"
    >
      <div className="flex items-start sm:items-center gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">Gestão de Aulas</h1>
            <SyncStatusBadge tableName="aulas" />
          </div>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-200 mt-1">
            Planeie, ministre e analise o impacto das suas aulas
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={onQuickAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-medium shadow-sm"
        >
          <FiPlus className="h-5 w-5" />
          Aula Rápida
        </button>

        <button
          onClick={onDetailedAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium shadow-sm"
        >
          <FiPlus className="h-5 w-5" />
          Nova Aula Detalhada
        </button>

        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 transition-all font-medium"
        >
          <FiRefreshCw className="h-5 w-5" />
          Atualizar
        </button>
      </div>
    </motion.div>
  );
};

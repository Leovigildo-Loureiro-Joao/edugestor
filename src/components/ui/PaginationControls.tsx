import React from 'react';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalItems: number;
  startItem: number;
  endItem: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  sizeOptions?: number[];
  className?: string;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  page,
  totalPages,
  totalItems,
  startItem,
  endItem,
  pageSize,
  onPageChange,
  onPageSizeChange,
  sizeOptions = [10, 20, 50],
  className = ''
}) => {
  if (totalItems === 0) return null;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/40 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <span>{startItem}-{endItem} de {totalItems}</span>
        <span className="text-gray-400">|</span>
        <label className="flex items-center gap-2">
          <span>Por página</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm"
          >
            {sizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Anterior
        </button>
        <span className="text-sm text-gray-700 dark:text-gray-200">
          {page}/{totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Próxima
        </button>
      </div>
    </div>
  );
};

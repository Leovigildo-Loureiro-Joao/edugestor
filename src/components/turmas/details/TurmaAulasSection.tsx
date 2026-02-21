import React from 'react';
import { FiBook, FiPlus } from 'react-icons/fi';
import { AulaCardMin } from '../../aulas/AulaCard';
import { Aula } from '../../../types/aula';
import { AulaStatus } from '../../aulas/AulaCard-min';
import { usePagination } from '../../../hooks/usePagination';
import { PaginationControls } from '../../ui/PaginationControls';

interface TurmaAulasSectionProps {
  aulas: Aula[];
  onNovaAula: () => void;
  onAulaRapida: () => void;
  onEditarAula: (aula: Aula) => void;
  onDeletarAula: (aula: Aula) => void;
  onActualizarAula: (status: AulaStatus, aula: Aula) => void;
}

export const TurmaAulasSection: React.FC<TurmaAulasSectionProps> = ({
  aulas,
  onNovaAula,
  onAulaRapida,
  onEditarAula,
  onDeletarAula,
  onActualizarAula
}) => {
  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
    startItem,
    endItem,
    paginatedItems
  } = usePagination<Aula>({
    items: aulas,
    initialPageSize: 8,
    resetDeps: [aulas]
  });

  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex w-full items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white flex items-center">
            <FiBook className="mr-2" />
            Lista de Aulas
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">
            Gerencie e visualize suas aulas
          </p>
        </div>
        <div className="gap-5 flex">
          <button
            onClick={onNovaAula}
            className="px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
          >
            <FiPlus className="inline mr-2" />
            Nova Aula
          </button>
          <button
            onClick={onAulaRapida}
            className="px-4 py-2 bg-violet-100 text-violet-700 dark:bg-violet-800 dark:text-violet-300 rounded-lg hover:bg-violet-200 dark:hover:bg-violet-700 transition-colors"
          >
            <FiPlus className="inline mr-2" />
            Aula Rapida
          </button>
        </div>
      </div>

      {aulas.length > 0 ? (
        paginatedItems.map((aula, index) => (
          <AulaCardMin
            key={aula.id}
            aula={aula}
            onEditar={() => onEditarAula(aula)}
            onDeletar={onDeletarAula}
            index={index}
            onActualizar={(status: AulaStatus) => onActualizarAula(status, aula)}
          />
        ))
      ) : (
        <div className="text-center py-12 w-full">
          <FiBook className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Nenhuma aula encontrada</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Sem turmas</p>
        </div>
      )}

      <div className="w-full">
        <PaginationControls
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          startItem={startItem}
          endItem={endItem}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          sizeOptions={[8, 16, 30]}
        />
      </div>
    </div>
  );
};

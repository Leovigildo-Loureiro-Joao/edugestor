import { useState } from 'react';
import { FiList, FiGrid, FiCalendar, FiChevronDown, FiBook } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Aula } from '../../types/aula';

interface ViewModeNavbarProps {
  viewMode: 'cards' | 'timeline' | 'list';
  onViewModeChange: (mode: 'cards' | 'timeline' | 'list') => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  filterCount?: number;
  showFilters?: boolean;
  onToggleFilters?: () => void;
}

export const ViewModeNavbar: React.FC<ViewModeNavbarProps> = ({
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  filterCount = 0,
  showFilters = false,
  onToggleFilters
}) => {
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const sortOptions = [
    { value: 'data_desc', label: 'Mais Recentes' },
    { value: 'data_asc', label: 'Mais Antigas' },
    { value: 'disciplina_asc', label: 'Disciplina (A-Z)' },
    { value: 'disciplina_desc', label: 'Disciplina (Z-A)' },
    { value: 'status', label: 'Status' },
  ];

  const getSortLabel = () => {
    return sortOptions.find(opt => opt.value === sortBy)?.label || 'Ordenar por';
  };

  return (
    <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-4 px-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Lado Esquerdo - Título e Filtros */}
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
              <FiBook className="mr-2" />
              Lista de Aulas
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Gerencie e visualize suas aulas
            </p>
          </div>

          {/* Botão Filtros */}
          {onToggleFilters && (
            <button
              onClick={onToggleFilters}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showFilters || filterCount > 0
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-sm font-medium">Filtros</span>
              {filterCount > 0 && (
                <span className="ml-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                  {filterCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Lado Direito - Controles de Visualização */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Ordenação */}
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300"
            >
              <span className="text-sm font-medium">{getSortLabel()}</span>
              <FiChevronDown className={`w-4 h-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown de Ordenação */}
            <AnimatePresence>
              {showSortDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="py-1">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          onSortChange(option.value);
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          sortBy === option.value
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Toggle de Visualização */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => onViewModeChange('timeline')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                viewMode === 'timeline'
                  ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Visualização em Timeline"
            >
              <FiCalendar className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Timeline</span>
            </button>

            <button
              onClick={() => onViewModeChange('cards')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Visualização em Cards"
            >
              <FiGrid className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Cards</span>
            </button>

            <button
              onClick={() => onViewModeChange('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Visualização em Lista"
            >
              <FiList className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Lista</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


interface ListaViewProps {
  aulas: Aula[];
  onEditar: (aula: Aula) => void;
  onDeletar: (aula: Aula) => void;
  onExpandir: (aula: Aula) => void;
}

export const ListaView: React.FC<ListaViewProps> = ({ aulas, onEditar, onDeletar, onExpandir }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-700">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Disciplina
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Data & Hora
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Tema
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Turma
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {aulas.map((aula) => (
            <tr 
              key={aula.id} 
              className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
              onClick={() => onExpandir(aula)}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {aula.disciplina}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-white">
                  {new Date(aula.data_aula).toLocaleDateString('pt-AO')}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {aula.hora_inicio?.slice(0, 5)} - {aula.hora_fim?.slice(0, 5)}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900 dark:text-white truncate max-w-xs">
                  {aula.tema_aula || 'Sem tema definido'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
                  {aula.turmas?.nome_turma}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  aula.status === 'ministrada' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                  aula.status === 'planeada' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                  aula.status === 'cancelada' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                }`}>
                  {aula.status === 'ministrada' ? 'Ministrada' :
                   aula.status === 'planeada' ? 'Planeada' :
                   aula.status === 'cancelada' ? 'Cancelada' : 'Adiada'}
                </span>
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onEditar(aula)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                    title="Editar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDeletar(aula)}
                    className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                    title="Excluir"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
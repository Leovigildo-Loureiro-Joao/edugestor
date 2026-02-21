import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiEdit, FiTrash2, FiBook, FiUsers, FiClock, FiChevronRight, FiUser } from 'react-icons/fi';
import { Turma } from '../../types/turma';

interface TurmaTableProps {
  turmas: Turma[];
  onDelete: (turma: Turma) => void;
  selectTurmaIds?: string[];
  onReload: () => void;
  searchTerm?: string;
}

export const TurmaTable: React.FC<TurmaTableProps> = ({
  turmas,
  onDelete,
  selectTurmaIds = [],
  onReload,
  searchTerm = ''
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const abrirTurma = (turmaID: string): void => {
    navigate(`/turmas/${turmaID}`);
  };

  // Versão Mobile com Cards
  if (isMobile) {
    return (
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          
          {turmas.map((turma, index) => {
            const isSelected = selectTurmaIds.includes(turma.id);

            return<motion.div
              key={turma.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
      
                  className={`
                    bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 transition-all duration-200
                    ${isSelected 
                      ? 'border-blue-500 dark:border-blue-400 shadow-md shadow-blue-100 dark:shadow-blue-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                    }
                  `}
                >
              {/* Cabeçalho do Card - sempre visível */}
              <div 
                className="p-4 cursor-pointer"
                onClick={() => abrirTurma(turma.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-shrink-0 h-12 w-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400">
                      <FiBook size={20} />
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        {turma.nome_turma}
                        <FiChevronRight className="text-gray-400" size={16} />
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {turma.curso_nome} • {turma.ano_lectivo}
                      </p>
                    </div>
                  </div>

                  {/* Badge de Turno */}
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                    turma.turno.toLowerCase() === 'manhã' 
                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                      : turma.turno.toLowerCase() === 'tarde'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                  }`}>
                    {turma.turno}
                  </span>
                </div>
              </div>

              {/* Detalhes do Card */}
              <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Professor</span>
                    <span className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                      <FiUser size={12} className="text-gray-400" />
                      {turma.professor || 'N/A'}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Capacidade</span>
                    <span className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                      <FiUsers size={12} className="text-gray-400" />
                      {turma.capacidade_maxima} alunos
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Alunos</span>
                    <span className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                      <FiUsers size={12} className="text-gray-400" />
                      {turma.qtd || 0} matriculados
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Ano Lectivo</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {turma.ano_lectivo}
                    </span>
                  </div>
                </div>

                {/* Barra de progresso de capacidade */}
                {turma.capacidade_maxima > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500 dark:text-gray-400">Ocupação</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {Math.round(((turma.qtd || 0) / turma.capacidade_maxima) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${((turma.qtd || 0) / turma.capacidade_maxima) * 100}%` }}
                        transition={{ duration: 0.5 }}
                        className={`h-full rounded-full ${
                          ((turma.qtd || 0) / turma.capacidade_maxima) > 0.9
                            ? 'bg-red-500'
                            : ((turma.qtd || 0) / turma.capacidade_maxima) > 0.7
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* Ações */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Link
                    to={`/turmas/editar/${turma.id}`}
                    className="p-2 text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                    title="Editar turma"
                  >
                    <FiEdit size={18} />
                  </Link>
                  <button
                    onClick={() => onDelete(turma)}
                    className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Excluir turma"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          })}
        </AnimatePresence>

        {/* Estado vazio */}
        {turmas.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 px-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <FiBook className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhuma turma encontrada</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Tente ajustar os termos da busca.' : 'Comece criando uma nova turma.'}
            </p>
            <button 
              className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 my-5 hover:to-indigo-800 text-white px-8 py-2 rounded-lg font-medium"
              onClick={onReload}
            >
              Recarregar página
            </button>
          </motion.div>
        )}
      </div>
    );
  }

  // Versão Desktop (tabela original com scroll)
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead className="bg-primary-600 dark:bg-primary-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Turma
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Curso
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Professor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Turno
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Capacidade
              </th>
              <th className="px-6 py-3 whitespace-nowrap text-left text-xs font-medium text-white uppercase tracking-wider">
                Qtd Alunos
              </th>
              <th className="px-6 py-3 whitespace-nowrap text-left text-xs font-medium text-white uppercase tracking-wider">
                Ano Lectivo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {turmas.map((turma, index) => (
              <motion.tr
                key={turma.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap" onClick={() => abrirTurma(turma.id)}>
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                      <FiBook />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {turma.nome_turma}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                  {turma?.curso_nome}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                  {turma.professor}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    turma.turno.toLowerCase() === 'manhã' 
                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                      : turma.turno.toLowerCase() === 'tarde'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                  }`}>
                    {turma.turno}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                  <div className="flex items-center space-x-2">
                    <FiUsers className="text-gray-400 dark:text-gray-500" />
                    <span>{turma.capacidade_maxima} alunos</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                  <div className="flex items-center space-x-2">
                    <FiUsers className="text-gray-400 dark:text-gray-500" />
                    <span>{turma.qtd || 0} alunos</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                  {turma.ano_lectivo}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link
                    to={`/turmas/editar/${turma.id}`}
                    className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 transition-colors inline-block mr-3"
                  >
                    <FiEdit size={16} />
                  </Link>
                  <button
                    onClick={() => onDelete(turma)}
                    className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors inline-block"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {turmas.length === 0 && (
        <div className="text-center py-12">
          <FiBook className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhuma turma encontrada</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm ? 'Tente ajustar os termos da busca.' : 'Comece criando uma nova turma.'}
          </p>
          <button 
            className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 my-5 hover:to-indigo-800 text-white px-8 py-2 rounded-lg font-medium"
            onClick={onReload}
          >
            Recarregar página
          </button>
        </div>
      )}
    </div>
  );
};
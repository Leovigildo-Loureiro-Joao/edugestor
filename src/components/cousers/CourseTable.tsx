import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiEdit, FiTrash2, FiBook, FiUsers, FiChevronRight, FiClock, FiBookOpen } from 'react-icons/fi';
import { FaMoneyBillWave, FaChalkboardTeacher } from 'react-icons/fa';
import { Course } from '../../types/curso';

interface CourseTableProps {
  cursos: Course[];
  onDelete: (curso: Course) => void;
  onReload: () => void;
  searchTerm?: string;
}

export const CourseTable: React.FC<CourseTableProps> = ({
  cursos,
  onDelete,
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

  const abrirCurso = (cursoId: string) => {
    navigate(`/cursos/${cursoId}`);
  };

  // Versão Mobile com Cards
  if (isMobile) {
    return (
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {cursos.map((curso, index) => (
            <motion.div
              key={curso.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
              className={`
                bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 overflow-hidden
                ${curso.ativo 
                  ? 'border-green-200 dark:border-green-900/50' 
                  : 'border-red-200 dark:border-red-900/50'
                }
              `}
            >
              {/* Cabeçalho do Card */}
              <div 
                className="p-4 cursor-pointer"
                onClick={() => abrirCurso(curso.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`
                      flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center
                      ${curso.ativo 
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      }
                    `}>
                      <FiBook size={20} />
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        {curso.nome}
                        <FiChevronRight className="text-gray-400" size={16} />
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <FaMoneyBillWave size={10} />
                        {curso.preco.toLocaleString('pt-AO')} AOA/mês
                      </p>
                    </div>
                  </div>

                  {/* Badge de Status */}
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                    curso.ativo 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                  }`}>
                    {curso.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>

              {/* Detalhes do Card */}
              <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                {/* Grid de informações principais */}
                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Vagas</span>
                    <span className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                      <FiUsers size={12} className="text-gray-400" />
                      {curso.alunos ?? 0}/{curso.vagas}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Turmas</span>
                    <span className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                      <FaChalkboardTeacher size={12} className="text-gray-400" />
                      {curso.turmas?.length || 0}
                    </span>
                  </div>
                </div>

                {/* Barra de progresso de ocupação */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Ocupação</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {Math.round(((curso.alunos ?? 0) / curso.vagas) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${((curso.alunos ?? 0) / curso.vagas) * 100}%` }}
                      transition={{ duration: 0.5 }}
                      className={`h-full rounded-full ${
                        ((curso.alunos ?? 0) / curso.vagas) > 0.9
                          ? 'bg-red-500'
                          : ((curso.alunos ?? 0) / curso.vagas) > 0.7
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Disciplinas */}
                {curso.disciplinas.length > 0 && (
                  <div className="mb-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                      Disciplinas
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {curso.disciplinas.slice(0, 4).map((disciplina, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                        >
                          <FiBookOpen size={8} className="mr-1" />
                          {disciplina}
                        </span>
                      ))}
                      {curso.disciplinas.length > 4 && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          +{curso.disciplinas.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Turmas */}
                {(curso.turmas?.length ?? 0) > 0 && (
                  <div className="mb-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                      Turmas
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(curso.turmas??[]).slice(0, 3).map((turma, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                        >
                          <FaChalkboardTeacher size={8} className="mr-1" />
                          {turma.nome_turma}
                        </span>
                      ))}
                      {(curso.turmas??[]).length > 3 && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          +{(curso.turmas??[]).length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Ações */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <Link
                    to={`/cursos/editar/${curso.id}`}
                    className="p-2 text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                    title="Editar curso"
                  >
                    <FiEdit size={18} />
                  </Link>
                  <button
                    onClick={() => onDelete(curso)}
                    className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Excluir curso"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Estado vazio */}
        {cursos.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 px-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <FiBook className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhum curso encontrado</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Tente ajustar os termos da busca.' : 'Comece adicionando um novo curso.'}
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
          <thead className="bg-primary-600">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Curso
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Preço
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Disciplinas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Vagas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Turmas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {cursos.map((curso, index) => (
              <motion.tr
                key={curso.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all cursor-pointer"
                onClick={() => abrirCurso(curso.id)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`
                      flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center
                      ${curso.ativo 
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      }
                    `}>
                      <FiBook />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium dark:text-white text-gray-900">
                        {curso.nome}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap dark:text-white text-sm text-gray-900">
                  {curso.preco.toLocaleString('pt-AO')} AOA
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1 max-w-[150px]">
                    {curso.disciplinas.slice(0, 3).map((disciplina, idx) => (
                      <span 
                        key={idx}
                        className="inline-block bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs px-2 py-1 rounded"
                      >
                        {disciplina}
                      </span>
                    ))}
                    {curso.disciplinas.length > 3 && (
                      <span className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 text-xs px-2 py-1 rounded">
                        +{curso.disciplinas.length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-white text-gray-900">
  <div className="flex items-center gap-2">
    <span className={(curso.alunos??0) > curso.vagas ? 'text-red-600 font-bold' : ''}>
      {curso.alunos ?? 0}/{curso.vagas}
    </span>
    <div className="w-16 max-w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 relative">
      {/* Barra base (até 100%) */}
      <div 
        className={`h-2 rounded-full absolute top-0 left-0 ${
          ((curso.alunos ?? 0) / curso.vagas) > 0.9
            ? 'bg-red-500'
            : ((curso.alunos ?? 0) / curso.vagas) > 0.7
            ? 'bg-yellow-500'
            : 'bg-green-500'
        }`}
        style={{ 
          width: `${Math.min(((curso.alunos ?? 0) / curso.vagas) * 100, 100)}%` 
        }}
      />
      
      {/* Indicador de excesso (se > 100%) */}
      {(curso.alunos??0) > curso.vagas && (
        <div 
          className="h-2 rounded-full bg-red-700 absolute top-0 left-0"
          style={{ 
            width: '4px',
            left: `${Math.min(100, ((curso.vagas) / curso.vagas) * 100)}%`
          }}
        />
      )}
    </div>
    
    {/* Badge de excesso */}
    {(curso.alunos??0) > curso.vagas && (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
        +{(curso.alunos??0) - curso.vagas}
      </span>
    )}
  </div>
</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {(curso.turmas??[]).slice(0, 2).map((turma, idx) => (
                      <span 
                        key={idx}
                        className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded"
                      >
                        {turma.nome_turma}
                      </span>
                    ))}
                    {(curso.turmas??[]).length > 2 && (
                      <span className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 text-xs px-2 py-1 rounded">
                        +{(curso.turmas??[]).length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    curso.ativo 
                      ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300'
                  }`}>
                    {curso.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link
                    to={`/cursos/editar/${curso.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 transition-colors inline-block mr-3"
                  >
                    <FiEdit size={16} />
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(curso);
                    }}
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

      {cursos.length === 0 && (
        <div className="text-center py-12">
          <FiBook className="mx-auto h-12 w-12 dark:text-gray-400 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium dark:text-white text-gray-900">Nenhum curso encontrado</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm ? 'Tente ajustar os termos da busca.' : 'Comece adicionando um novo curso.'}
          </p>
          <button 
            className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-8 py-2 rounded-lg font-medium hover:from-blue-700 my-5 hover:to-indigo-800"
            onClick={onReload}
          >
            Recarregar página
          </button>
        </div>
      )}
    </div>
  );
};

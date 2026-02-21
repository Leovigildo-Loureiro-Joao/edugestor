import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiEdit, FiTrash2, FiUser, FiChevronRight } from 'react-icons/fi';
import { Student } from '../../types';

interface StudentsTableProps {
  filteredStudents: Student[];
  reforcoStudents: Student[];
  selectedStudentIds: string[];
  searchTerm: string;
  onToggleSelectAllReforco: () => void;
  onToggleStudentSelection: (studentId: string) => void;
  onOpenStudent: (studentId: string) => void;
  onDeleteStudent: (student: Student) => void;
  onReload: () => void;
}

// Componente de checkbox reutilizável
const CheckboxPersonalizado = ({ 
  checked, 
  indeterminate, 
  onChange, 
  label,
  className = ''
}: { 
  checked: boolean; 
  indeterminate?: boolean; 
  onChange: () => void; 
  label?: string;
  className?: string;
}) => (
  <label className={`relative flex items-center justify-center cursor-pointer group ${className}`}>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="sr-only"
    />
    <motion.div
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className={`
        w-5 h-5 rounded-md border-2 transition-all duration-200
        flex items-center justify-center
        ${checked
          ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500'
          : indeterminate
          ? 'bg-blue-600/50 border-blue-600 dark:bg-blue-500/50 dark:border-blue-500'
          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 group-hover:border-blue-400 dark:group-hover:border-blue-500'
        }
      `}
    >
      <AnimatePresence mode="wait">
        {checked && (
          <motion.svg
            key="check"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-3.5 h-3.5 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </motion.svg>
        )}
        {indeterminate && !checked && (
          <motion.div
            key="indeterminate"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="w-2 h-2 bg-white dark:bg-white rounded-sm"
          />
        )}
      </AnimatePresence>
    </motion.div>
    {label && <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{label}</span>}
  </label>
);

export const StudentsTable: React.FC<StudentsTableProps> = ({
  filteredStudents,
  reforcoStudents,
  selectedStudentIds,
  searchTerm,
  onToggleSelectAllReforco,
  onToggleStudentSelection,
  onOpenStudent,
  onDeleteStudent,
  onReload
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Versão Mobile com Cards
  if (isMobile) {
    const allSelected = reforcoStudents.length > 0 && 
      reforcoStudents.every((student) => selectedStudentIds.includes(student.id));
    const someSelected = reforcoStudents.some((student) => selectedStudentIds.includes(student.id)) && !allSelected;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header com seleção all e contador */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckboxPersonalizado
                checked={allSelected}
                indeterminate={someSelected}
                onChange={onToggleSelectAllReforco}
              />
              <span className="text-sm font-medium text-white">
                {allSelected ? 'Todos selecionados' : someSelected ? `${selectedStudentIds.length} selecionados` : 'Selecionar todos'}
              </span>
            </div>
            {selectedStudentIds.length > 0 && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-white/20 dark:bg-white/10 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm"
              >
                {selectedStudentIds.length} {selectedStudentIds.length === 1 ? 'aluno' : 'alunos'}
              </motion.span>
            )}
          </div>
        </div>

        {/* Lista de Cards */}
        <div className="p-4 space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredStudents.map((student, index) => {
              const isSelected = selectedStudentIds.includes(student.id);
              const isReforco = student.tipo_matricula === 'reforco_personalizado';

              return (
                <motion.div
                  key={student.id}
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
                  {/* Cabeçalho do Card */}
                  <div 
                    className="p-4 cursor-pointer"
                    onClick={() => onOpenStudent(student.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Avatar e Nome */}
                      <div className="flex items-center gap-3 flex-1">
                        {isReforco ? (
                          <CheckboxPersonalizado
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              onToggleStudentSelection(student.id);
                            }}
                          />
                        ) : (
                          <div className="w-5 h-5" /> // Espaço reservado
                        )}
                        
                        <div className="flex items-center gap-3">
                          <div className={`
                            flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center
                            ${isSelected 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                            }
                          `}>
                            <FiUser size={20} />
                          </div>
                          
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                              {student.nome_completo}
                              <FiChevronRight className="text-gray-400" size={16} />
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {student.numero_estudante} • {student.contacto_principal}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Badge de Estado */}
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                        student.estado === 'ativo'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : student.estado === 'transferido'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {student.estado}
                      </span>
                    </div>
                  </div>

                  {/* Detalhes do Card */}
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 block">Professor</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {student.professor || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 block">Turma</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {student.turma_nome || 'Sem turma'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 block">Cartão</span>
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          student.cartao_pago
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {student.cartao_pago ? 'possui' : 'não possui'}
                        </span>
                      </div>
                    </div>

                    {/* Disciplinas de Reforço */}
                    {isReforco && student.disciplinas_reforco?.length > 0 && (
                      <div className="mb-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                          Disciplinas de reforço
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {student.disciplinas_reforco.map((disciplina) => (
                            <span
                              key={`${student.id}-${disciplina}`}
                              className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                            >
                              {disciplina}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ações */}
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Link
                        to={`/alunos/editar/${student.id}`}
                        className="p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Editar aluno"
                      >
                        <FiEdit size={18} />
                      </Link>
                      <button
                        onClick={() => onDeleteStudent(student)}
                        className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Excluir aluno"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Estado vazio */}
        {filteredStudents.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 px-4"
          >
            <FiUser className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhum aluno encontrado</h3>
            <button
              className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 my-5 hover:to-indigo-800 text-white px-8 py-2 rounded-lg font-medium"
              onClick={onReload}
            >
              Recarregar página
            </button>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Tente ajustar os termos da busca.' : 'Comece adicionando um novo aluno.'}
            </p>
          </motion.div>
        )}
      </div>
    );
  }

  // Versão Desktop (tabela original com scroll horizontal)
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead className="bg-blue-600 dark:bg-blue-700">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative flex items-center justify-center"
                >
                  <label className="relative flex items-center justify-center cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={
                        reforcoStudents.length > 0 &&
                        reforcoStudents.every((student) => selectedStudentIds.includes(student.id))
                      }
                      onChange={onToggleSelectAllReforco}
                      className="sr-only"
                    />
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={`
                        w-5 h-5 rounded-md border-2 transition-all duration-200
                        flex items-center justify-center
                        ${reforcoStudents.length > 0 &&
                          reforcoStudents.every((student) => selectedStudentIds.includes(student.id))
                          ? 'bg-white border-white'
                          : reforcoStudents.some((student) => selectedStudentIds.includes(student.id))
                          ? 'bg-white/50 border-white'
                          : 'bg-white/20 dark:bg-white/10 border-white/60 group-hover:bg-white/30'
                        }
                      `}
                    >
                      <AnimatePresence>
                        {reforcoStudents.length > 0 &&
                          reforcoStudents.every((student) => selectedStudentIds.includes(student.id)) && (
                          <motion.svg
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="w-3.5 h-3.5 text-blue-600"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </motion.svg>
                        )}
                      </AnimatePresence>
                      <AnimatePresence>
                        {reforcoStudents.some((student) => selectedStudentIds.includes(student.id)) &&
                          !reforcoStudents.every((student) => selectedStudentIds.includes(student.id)) && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="w-2 h-2 bg-white dark:bg-white rounded-sm"
                          />
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </label>
                </motion.div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Aluno</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Professor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Nº Estudante</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Turma</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Reforço</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Cartão</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredStudents.map((student, index) => (
              <motion.tr
                key={student.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <td className="px-3 py-4">
                  {student.tipo_matricula === 'reforco_personalizado' ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.05 + 0.1 }}
                      className="relative flex items-center justify-center"
                    >
                      <label className="relative flex items-center justify-center cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(student.id)}
                          onChange={() => onToggleStudentSelection(student.id)}
                          className="sr-only"
                        />
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className={`
                            w-5 h-5 rounded-md border-2 transition-all duration-200
                            flex items-center justify-center
                            ${selectedStudentIds.includes(student.id)
                              ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 group-hover:border-blue-400 dark:group-hover:border-blue-500'
                            }
                          `}
                        >
                          <AnimatePresence>
                            {selectedStudentIds.includes(student.id) && (
                              <motion.svg
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="w-3.5 h-3.5 text-white"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </motion.svg>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      </label>
                    </motion.div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div
                      onClick={() => onOpenStudent(student.id)}
                      className={`
                        flex-shrink-0 cursor-pointer transition-all duration-200
                        h-10 w-10 rounded-full flex items-center justify-center
                        text-blue-600 hover:text-white hover:bg-blue-700 bg-blue-100 dark:bg-blue-900
                      `}
                    >
                      <FiUser />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{student.nome_completo}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-300">{student.contacto_principal}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{student.professor || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{student.numero_estudante}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{student.turma_nome || 'Sem turma'}</td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                  {student.tipo_matricula === 'reforco_personalizado' && (student.disciplinas_reforco || []).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-w-xs">
                      {student.disciplinas_reforco.slice(0, 3).map((disciplina) => (
                        <span
                          key={`${student.id}-${disciplina}`}
                          className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                        >
                          {disciplina}
                        </span>
                      ))}
                      {student.disciplinas_reforco.length > 3 && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          +{student.disciplinas_reforco.length - 3}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    student.estado === 'ativo'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      : student.estado === 'transferido'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                  }`}>
                    {student.estado}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    student.cartao_pago
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                  }`}>
                    {student.cartao_pago ? 'possui' : 'ñ possui'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link
                    to={`/alunos/editar/${student.id}`}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 inline-block mr-3"
                  >
                    <FiEdit size={16} />
                  </Link>
                  <button
                    onClick={() => onDeleteStudent(student)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 inline-block"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-12">
          <FiUser className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhum aluno encontrado</h3>
          <button
            className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 my-5 hover:to-indigo-800 text-white px-8 py-2 rounded-lg font-medium"
            onClick={onReload}
          >
            Recarregar página
          </button>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm ? 'Tente ajustar os termos da busca.' : 'Comece adicionando um novo aluno.'}
          </p>
        </div>
      )}
    </div>
  );
};

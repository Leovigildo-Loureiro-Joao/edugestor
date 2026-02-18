import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiEdit, FiTrash2, FiUser } from 'react-icons/fi';
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
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
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
                          : 'bg-white/20 border-white/60 group-hover:bg-white/30'
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
                            className="w-2 h-2 bg-white rounded-sm"
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
                          {/* Checkbox customizado */}
                          <label className="relative flex items-center justify-center cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.includes(student.id)}
                              onChange={() => onToggleStudentSelection(student.id)}
                              className="sr-only" // Esconde o checkbox padrão
                            />
                            
                            {/* Background do checkbox */}
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
                              {/* Ícone de check com animação */}
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

                            {/* Tooltip opcional */}
                            <motion.span
                              initial={{ opacity: 0, y: 10 }}
                              whileHover={{ opacity: 1, y: 0 }}
                              className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap
                                      bg-gray-800 text-white text-xs px-2 py-1 rounded-md
                                      opacity-0 group-hover:opacity-100 transition-opacity duration-200
                                      pointer-events-none z-10"
                            >
                              Selecionar para reforço
                            </motion.span>
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
                      {<FiUser />}
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
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <Link
                    to={`/alunos/editar/${student.id}`}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <FiEdit size={16} className="inline" />
                  </Link>
                  <button
                    onClick={() => onDeleteStudent(student)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 ml-2"
                  >
                    <FiTrash2 size={16} className="inline" />
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
  

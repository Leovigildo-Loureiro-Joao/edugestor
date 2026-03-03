// FrequenciasRegistradasView
import { useMemo, useState } from "react";
import { FiCalendar, FiCheckCircle, FiUsers, FiChevronRight, FiChevronDown, FiClock, FiFileText } from "react-icons/fi";
import { AnimatePresence, motion } from "framer-motion";
import { usePagination } from "../../hooks/usePagination";
import { PaginationControls } from "../ui/PaginationControls";
/** @typedef {import('../../types/aluno').Student} Student */

const MotionDiv = motion.div;
const MotionSpan = motion.span;

/**
 * @param {{
 *   frequenciasFiltradas: any[],
 *   filtroData: string,
 *   filtroTurma: string,
 *   alunos?: Student[]
 * }} props
 */
export const FrequenciasRegistradasView = ({frequenciasFiltradas, filtroData, filtroTurma, alunos = []}) => {
  const [expandidaId, setExpandidaId] = useState(null);
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
  } = usePagination({
    items: frequenciasFiltradas,
    initialPageSize: 8,
    resetDeps: [frequenciasFiltradas, filtroData, filtroTurma]
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  const calculatePercentage = (presentes, total) => {
    if (total === 0) return 0;
    return (presentes / total) * 100;
  };

  const alunoMap = useMemo(() => {
    return new Map(alunos.map((aluno) => [aluno.id, aluno]));
  }, [alunos]);

  return (
    <MotionDiv
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {paginatedItems.map((item, index) => {
        const registros = item.registro || [];
        const presentes = registros.filter((f) => f.presente).length;
        const faltas = registros.filter((f) => !f.presente).length;
        const faltasJustificadas = registros.filter((f) => !f.presente && Boolean(f.justificativa?.trim())).length;
        const atrasos = registros.filter((f) => f.presente && (f.atraso ?? (f.participacao === false))).length;
        const total = registros.length;
        const percentage = calculatePercentage(presentes, total);
        const isExpandida = expandidaId === (item.id || index);
        
        return (
          <MotionDiv
            key={item.id || index}
            variants={itemVariants}
            whileHover={{ x: 2 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpandidaId(isExpandida ? null : (item.id || index))}
              className="w-full p-6 text-left"
            >
            <div className="flex justify-between items-start">
              <div className="flex-1 ">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-50 rounded-xl">
                    <FiCheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">{item.disciplina}</h3>
                  <MotionSpan
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full"
                  >
                    Registrada
                  </MotionSpan>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 ml-11">
                  <span className="flex items-center gap-2">
                    <FiCalendar size={14} className="text-gray-400" />
                    <span className="font-medium">
                      {new Date(item.data_aula).toLocaleDateString('pt-AO', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <FiUsers size={14} className="text-gray-400" />
                    <span>{item.turmas?.nome_turma || 'Turma'}</span>
                  </span>
                  <span className="flex items-center gap-2 text-green-600 font-medium">
                    <FiCheckCircle size={14} />
                    {presentes}/{total} presentes
                  </span>
                  <span className="flex items-center gap-2 text-red-600 font-medium">
                    <FiUsers size={14} />
                    {faltas} faltas
                  </span>
                  <MotionSpan
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      percentage >= 80 ? 'bg-green-100 text-green-800' :
                      percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}
                  >
                    {percentage.toFixed(1)}%
                  </MotionSpan>
                </div>
              </div>
              
              <MotionDiv
                whileHover={{ x: 4 }}
                className="text-gray-400 ml-4"
              >
                {isExpandida ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}
              </MotionDiv>
            </div>
            </button>

            <AnimatePresence initial={false}>
              {isExpandida && (
                <MotionDiv
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30"
                >
                  <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-xs sm:text-sm">
                      <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3">
                        <div className="text-gray-500 dark:text-gray-400">Faltas</div>
                        <div className="font-semibold text-red-600">{faltas}</div>
                      </div>
                      <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3">
                        <div className="text-gray-500 dark:text-gray-400">Faltas Justificadas</div>
                        <div className="font-semibold text-amber-600">{faltasJustificadas}</div>
                      </div>
                      <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3">
                        <div className="text-gray-500 dark:text-gray-400">Atrasos</div>
                        <div className="font-semibold text-indigo-600">{atrasos}</div>
                      </div>
                      <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3">
                        <div className="text-gray-500 dark:text-gray-400">Presença</div>
                        <div className="font-semibold text-green-600">{percentage.toFixed(1)}%</div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="text-left text-gray-600 dark:text-gray-300">
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="py-2 pr-3 font-medium">Aluno</th>
                            <th className="py-2 pr-3 font-medium">Estado</th>
                            <th className="py-2 pr-3 font-medium">Justificativa</th>
                            <th className="py-2 pr-3 font-medium">Atraso</th>
                          </tr>
                        </thead>
                        <tbody>
                          {registros.map((reg) => {
                            const aluno = alunoMap.get(reg.aluno_id);
                            const nomeAluno = aluno?.nome_completo || reg.aluno_nome || reg.aluno_id;
                            const isAtraso = reg.presente && (reg.atraso ?? (reg.participacao === false));
                            return (
                              <tr key={reg.id} className="border-b border-gray-100 dark:border-gray-800">
                                <td className="py-2 pr-3 text-gray-800 dark:text-gray-100">{nomeAluno}</td>
                                <td className={`py-2 pr-3 font-medium ${reg.presente ? "text-green-600" : "text-red-600"}`}>
                                  {reg.presente ? "Presente" : "Falta"}
                                </td>
                                <td className="py-2 pr-3 text-gray-600 dark:text-gray-300">
                                  {reg.justificativa?.trim() || "-"}
                                </td>
                                <td className="py-2 pr-3">
                                  {isAtraso ? (
                                    <span className="inline-flex items-center gap-1 text-indigo-600 font-medium">
                                      <FiClock size={14} />
                                      Sim
                                    </span>
                                  ) : (
                                    <span className="text-gray-500 dark:text-gray-400">
                                      <FiFileText size={14} className="inline mr-1" />
                                      Não
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </MotionDiv>
              )}
            </AnimatePresence>
          </MotionDiv>
        );
      })}

      {frequenciasFiltradas.length === 0 && (
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <div className="inline-flex p-4 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full mb-4">
            <FiCalendar className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="mt-4 text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            Nenhuma frequência registrada
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-md mx-auto">
            {filtroData || filtroTurma !== 'Todas Turmas' 
              ? 'Tente ajustar os filtros para encontrar registros' 
              : 'Comece registrando a frequência das aulas pendentes'
            }
          </p>
        </MotionDiv>
      )}
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
    </MotionDiv>
  );
};

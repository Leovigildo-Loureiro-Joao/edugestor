// FrequenciasRegistradasView.tsx
import { FiCalendar, FiCheckCircle, FiUsers, FiChevronRight } from "react-icons/fi";
import { motion } from "framer-motion";

export const FrequenciasRegistradasView = ({frequenciasFiltradas, filtroData, filtroTurma}) => {
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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {frequenciasFiltradas.map((item, index) => {
        const presentes = item.registro.filter(f => f.presente).length;
        const total = item.registro.length;
        const percentage = calculatePercentage(presentes, total);
        
        return (
          <motion.div
            key={item.id || index}
            variants={itemVariants}
            whileHover={{ x: 4 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-50 rounded-xl">
                    <FiCheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">{item.disciplina}</h3>
                  <motion.span
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full"
                  >
                    Registrada
                  </motion.span>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 ml-11">
                  <span className="flex items-center gap-2">
                    <FiCalendar size={14} className="text-gray-400" />
                    <span className="font-medium">
                      {new Date(item.data_aula).toLocaleDateString('pt-AO', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short'
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
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      percentage >= 80 ? 'bg-green-100 text-green-800' :
                      percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}
                  >
                    {percentage.toFixed(1)}%
                  </motion.span>
                </div>
              </div>
              
              <motion.div
                whileHover={{ x: 4 }}
                className="text-gray-400 ml-4"
              >
                <FiChevronRight size={20} />
              </motion.div>
            </div>
          </motion.div>
        );
      })}

      {frequenciasFiltradas.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <div className="inline-flex p-4 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full mb-4">
            <FiCalendar className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
            Nenhuma frequência registrada
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-md mx-auto">
            {filtroData || filtroTurma !== 'Todas Turmas' 
              ? 'Tente ajustar os filtros para encontrar registros' 
              : 'Comece registrando a frequência das aulas pendentes'
            }
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};
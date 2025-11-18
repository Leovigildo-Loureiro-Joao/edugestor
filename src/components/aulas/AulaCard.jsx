import { motion } from 'framer-motion';
import { FiCalendar, FiClock, FiBook, FiUsers, FiEdit2, FiTrash2 } from 'react-icons/fi';

export const AulaCard = ({ aula, onEditar, onDeletar, index }) => {
  const formatarData = (dataString) => {
    return new Date(dataString).toLocaleDateString('pt-BR');
  };

  const formatarHora = (horaString) => {
    return horaString.slice(0, 5); // Remove segundos se houver
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {aula.disciplina}
            </h3>
            
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
              <div className="flex items-center gap-1">
                <FiUsers className="h-4 w-4" />
                <span>Turma {aula.turma_id}</span>
              </div>
              <div className="flex items-center gap-1">
                <FiCalendar className="h-4 w-4" />
                <span>{formatarData(aula.data_aula)}</span>
              </div>
              <div className="flex items-center gap-1">
                <FiClock className="h-4 w-4" />
                <span>{formatarHora(aula.hora_inicio)} - {formatarHora(aula.hora_fim)}</span>
              </div>
            </div>

            {aula.tema_aula && (
              <p className="text-gray-700 mb-2">
                <strong>Tema:</strong> {aula.tema_aula}
              </p>
            )}

            {aula.conteudo_ministrado && (
              <p className="text-gray-600 text-sm">
                <strong>Conteúdo:</strong> {aula.conteudo_ministrado}
              </p>
            )}
          </div>

          <div className="flex gap-2 ml-4">
            <button
              onClick={onEditar}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Editar aula"
            >
              <FiEdit2 className="h-4 w-4" />
            </button>
            <button
              onClick={onDeletar}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Excluir aula"
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          Criada em: {new Date(aula.created_at).toLocaleString('pt-BR')}
        </div>
      </div>
    </motion.div>
  );
};
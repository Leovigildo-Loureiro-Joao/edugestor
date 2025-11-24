import { FiCalendar, FiCheckCircle, FiUsers } from "react-icons/fi";

  // Componente de Frequências Registradas
  export const FrequenciasRegistradasView = ({frequenciasFiltradas,filtroData,filtroTurma}) => (
    <div className="space-y-4">
      {frequenciasFiltradas.map((item, index) => (
        <div key={item.aula.id} className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{item.aula.disciplina}</h3>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <FiCalendar size={14} />
                  {new Date(item.aula.data_aula).toLocaleDateString('pt-AO')}
                </span>
                <span className="flex items-center gap-1">
                  <FiUsers size={14} />
                  {item.aula.turmas?.nome_turma || 'Turma'}
                </span>
                <span className="flex items-center gap-1 text-green-600">
                  <FiCheckCircle size={14} />
                  {item.presentes}/{item.totalAlunos} presentes
                </span>
                <span className="text-green-600 font-medium">
                  {((item.presentes / item.totalAlunos) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Registrada
            </div>
          </div>
        </div>
      ))}

      {frequenciasFiltradas.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FiCheckCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Nenhuma frequência registrada
          </h3>
          <p className="text-gray-500 mt-2">
            {filtroData || filtroTurma !== 'Todas Turmas' 
              ? 'Tente ajustar os filtros' 
              : 'Registre a frequência das aulas pendentes'
            }
          </p>
        </div>
      )}
    </div>
  );
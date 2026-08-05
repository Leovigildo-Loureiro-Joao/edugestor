import { useState, useEffect } from 'react';
import { FiCalendar, FiClock, FiUsers, FiSave, FiEdit, FiCheck, FiX, FiChevronUp, FiChevronDown } from 'react-icons/fi';

export const AulaFrequenciaItem = ({ aula, alunos, onRegistrarFrequencia, isExpandida, onToggleExpandir }) => {
  const [registros, setRegistros] = useState({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const registrosIniciais = {};
    alunos.forEach(aluno => {
      registrosIniciais[aluno.id] = true; 
    });
    setRegistros(registrosIniciais);
  }, [alunos]);

  const togglePresenca = (alunoId) => {
    setRegistros(prev => ({
      ...prev,
      [alunoId]: !prev[alunoId]
    }));
  };

const handleRegistrar = async () => {
  
  const registrosArray = Object.entries(registros).map(([aluno_id, presente]) => ({
    aluno_id,
    presente,
    justificativa: '' 
  }));

  await onRegistrarFrequencia({
      aula_id:  aula.id,
      data_aula: aula.data_aula,
      registros: registrosArray,
  }
);
};

  const alunosPresentes = Object.values(registros).filter(presente => presente).length;
  const totalAlunos = alunos.length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Cabeçalho da Aula */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">{aula.disciplina}</h3>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <FiCalendar size={14} />
                {new Date(aula.data_aula).toLocaleDateString('pt-AO')}
              </span>
              <span className="flex items-center gap-1">
                <FiUsers size={14} />
                {aula.turmas?.nome_turma || 'Turma'}
              </span>
              <span>{alunosPresentes}/{totalAlunos} presentes</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleExpandir}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"
            >
              {isExpandida ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Alunos (Expandível) */}
      {isExpandida && (
        <div className="p-4 bg-white dark:bg-gray-800">
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Lista de Alunos</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {alunos.map(aluno => (
                <div key={aluno.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                  <span className="text-sm">{aluno.nome_completo}</span>
                  <button
                    onClick={() => togglePresenca(aluno.id)}
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      registros[aluno.id] 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {registros[aluno.id] ? 'Presente' : 'Ausente'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleRegistrar}
            disabled={enviando}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {enviando ? 'Registrando...' : 'Confirmar Frequência'}
          </button>
        </div>
      )}
    </div>
  );
};
import { useState, useEffect } from 'react';
import { FiCalendar, FiClock, FiUsers, FiSave, FiEdit, FiCheck, FiX, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { Aula } from '../../types/aula';
import { Student } from '../../types';

export const ModalFrequecia = (
  { aula, alunos, onRegistrarFrequencia, isExpandida, onToggleExpandir }:{
    aula:Aula, 
    alunos:Student[], 
    onRegistrarFrequencia:any, 
    isExpandida:boolean, 
    onToggleExpandir:()=>void
  }) => {
  const [registros, setRegistros] = useState({});
  const [enviando, setEnviando] = useState(false);

  // Inicializar registros como presente por padrão
  useEffect(() => {
    const registrosIniciais = {};
    alunos.forEach(aluno => {
      registrosIniciais[aluno.id] = true; // Presente por padrão
    });
    setRegistros(registrosIniciais);
  }, [alunos]);

  const togglePresenca = (alunoId:string) => {
    setRegistros(prev => ({
      ...prev,
      [alunoId]: !prev[alunoId]
    }));
  };

const handleRegistrar = async () => {
  // Converter objeto para array para a API
  const registrosArray = Object.entries(registros).map(([aluno_id, presente]) => ({
    aluno_id,
    presente,
    justificativa: '' // ou outra lógica
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
    
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Cabeçalho da Aula */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{aula.disciplina}</h3>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
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
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              {isExpandida ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Alunos (Expandível) */}
      {isExpandida && (
        <div className="p-4 bg-white">
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-3">Lista de Alunos</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {alunos.map(aluno => (
                <div key={aluno.id} className="flex items-center justify-between p-2 bg-white rounded border">
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
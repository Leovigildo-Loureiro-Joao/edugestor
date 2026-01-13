import { useState, useEffect } from 'react';
import { FiCalendar, FiClock, FiUsers, FiSave, FiX, FiCheck, FiXCircle } from 'react-icons/fi';
import { Aula } from '../../types/aula';
import { Student } from '../../types';
import { alunosService } from '../../services/database';
import { FaCalendarWeek } from 'react-icons/fa6';
import { RegistroFrequenciaLote } from '../../types/frequencia';

export const ModalFrequencia = ({ aula, onRegistrarFrequencia, setAulaSelect }:{aula:Aula,onRegistrarFrequencia:(registro:RegistroFrequenciaLote) => Promise<void>,setAulaSelect:(aula:Aula) => void}) => {
  const [alunos, setAlunos] = useState<Student[]>([]);
  const [registros, setRegistros] = useState<Record<string, {presente: boolean, participou: boolean}>>({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    loadData();
  }, [aula]);

  async function loadData() {
    const alunosTurma = await alunosService.getAlunosPorTurma(aula.turma_id);
    setAlunos(alunosTurma);
    
    // Inicializar todos como presentes e participantes
    const registrosIniciais: Record<string, {presente: boolean, participou: boolean}> = {};
    alunosTurma.forEach(aluno => {
      registrosIniciais[aluno.id] = { presente: true, participou: true };
    });
    setRegistros(registrosIniciais);
  }

  const togglePresenca = (alunoId: string) => {
    setRegistros(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        presente: !prev[alunoId].presente,
        participou: prev[alunoId].presente ? false : true // Se estava ausente e vai para presente, marca como participou
      }
    }));
  };

  const toggleParticipacao = (alunoId: string) => {
    setRegistros(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        participou: !prev[alunoId].participou
      }
    }));
  };

  const handleRegistrar = async () => {
    setEnviando(true);
    try {
      const registrosArray = Object.entries(registros).map(([aluno_id, dados]) => ({
        aluno_id,
        presente: dados.presente,
        participacao: dados.participou,
        justificativa: ''
      }));

      await onRegistrarFrequencia({
        aula_id: aula.id,
        data_aula: aula.data_aula,
        registros: registrosArray,
      });
      
    } catch (error) {
      console.error('Erro ao registrar:', error);
    } finally {
      setEnviando(false);
    }
  };

  const alunosPresentes = Object.values(registros).filter(r => r.presente).length;
  const alunosParticiparam = Object.values(registros).filter(r => r.participou).length;

  return (
    <div className="bg-white rounded-lg">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b p-6">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
              <FaCalendarWeek className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-primary-700 text-xl">{aula.tema_aula}</h2>
              <h3 className="text-lg font-bold text-gray-900">
                {aula.disciplina || 'Aula Sem Disciplina'}
              </h3>
              <div className="flex items-center gap-4 mt-2 text-gray-600">
                <div className="flex items-center gap-2">
                  <FiCalendar className="h-5 w-5" />
                  <span className="font-medium">
                    {new Date(aula.data_aula).toLocaleDateString('pt-AO')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FiClock className="h-5 w-5" />
                  <span>
                    {aula.hora_inicio?.slice(0, 5)} - {aula.hora_fim?.slice(0, 5)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FiUsers className="h-5 w-5" />
                  <span>{aula.turmas?.nome_turma || 'Turma'}</span>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => setAulaSelect(null)}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>
        
        {/* Status */}
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
            <FiCheck />
            {alunosPresentes} presentes
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            <FiUsers />
            {alunosParticiparam} participaram
          </div>
        </div>
      </div>

      {/* Lista de Alunos */}
      <div className="p-6">
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-4">Registro de Frequência</h4>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {alunos.map(aluno => {
              const registro = registros[aluno.id];
              return (
                <div key={aluno.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium">
                        {aluno.nome_completo.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">{aluno.nome_completo}</span>
                      <p className="text-sm text-gray-500">{aluno.numero_estudante}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => togglePresenca(aluno.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        registro?.presente
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {registro?.presente ? 'Presente' : 'Ausente'}
                    </button>

                    {registro?.presente && (
                      <button
                        onClick={() => toggleParticipacao(aluno.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          registro?.participou
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                            : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        }`}
                      >
                        {registro?.participou ? 'Participou' : 'Não Participou'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-3">
          <button
            onClick={() => setAulaSelect(null)}
            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleRegistrar}
            disabled={enviando}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {enviando ? 'Registrando...' : 'Confirmar Frequência'}
          </button>
        </div>
      </div>
    </div>
  );
};
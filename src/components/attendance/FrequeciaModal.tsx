import { useState, useEffect } from 'react';
import { FiCalendar, FiClock, FiUsers, FiX, FiCheck } from 'react-icons/fi';
import { Aula } from '../../types/aula';
import { Student } from '../../types';
import { alunosService } from '../../services/database';
import { FaCalendarWeek } from 'react-icons/fa6';
import { RegistroFrequenciaLote } from '../../types/frequencia';
import { useAlert } from '../ui/AlertBadge';

export const ModalFrequencia = ({ aula, onRegistrarFrequencia, setAulaSelect }:{aula:Aula,onRegistrarFrequencia:(registro:RegistroFrequenciaLote) => Promise<void>,setAulaSelect:(aula:Aula|null) => void}) => {
  const [alunos, setAlunos] = useState<Student[]>([]);
  const [registros, setRegistros] = useState<Record<string, {presente: boolean, participou: boolean, atraso: boolean}>>({});
  const [enviando, setEnviando] = useState(false);
    const { showAlert } = useAlert(); 
  useEffect(() => {
    loadData();
  }, [aula]);

  async function loadData() {
    const alunosTurma = await alunosService.getAlunosPorTurma(aula.turma_id);
    setAlunos(alunosTurma);
    
    const registrosIniciais: Record<string, {presente: boolean, participou: boolean, atraso: boolean}> = {};
    alunosTurma.forEach(aluno => {
      registrosIniciais[aluno.id] = { presente: true, participou: true, atraso: false };
    });
    setRegistros(registrosIniciais);
  }

  const togglePresenca = (alunoId: string) => {
    setRegistros(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        presente: !prev[alunoId].presente,
        participou: prev[alunoId].presente ? false : true,
        atraso: prev[alunoId].presente ? false : prev[alunoId].atraso
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

  const toggleAtraso = (alunoId: string) => {
    setRegistros(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        atraso: !prev[alunoId].atraso
      }
    }));
  };

  const handleRegistrar = async () => {
    setEnviando(true);
    try {
      const registrosArray = Object.entries(registros).map(([aluno_id, dados]) => ({
        aluno_id,
        presente: dados.presente,
        atraso: dados.presente ? dados.atraso : false,
        participacao: dados.participou,
        justificativa: ''
      }));

      await onRegistrarFrequencia({
        aula_id: aula.id,
        data_aula: aula.data_aula,
        registros: registrosArray,
      });
      showAlert({
        title:"Registrado com sucesso",
        type:"success",
        duration:5000,
        message:"Continue com este progressso"
      })
    } catch (error) {
      showAlert({
        title:"Erro ao registrar",
        type:"error",
        duration:5000,
        message:"Contacte ao administrador para verificar suas permissões"
      })
      console.error('Erro ao registrar:', error);
    } finally {
      setEnviando(false);
    }
  };

  const alunosPresentes = Object.values(registros).filter(r => r.presente).length;
  const alunosParticiparam = Object.values(registros).filter(r => r.participou).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg">
      {/* Header */}
              {/* Header Azul Exatamente como o exemplo */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 border-b border-white/10 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-lg bg-blue-50 border border-blue-100">
                <FaCalendarWeek className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-white text-base sm:text-lg">
                  {aula?.tema_aula || 'Registrar Frequência'}
                </h2>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {aula?.disciplina || 'Aula'}
                </h3>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-blue-100">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <FiCalendar className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="font-medium">
                      {aula?.data_aula ? new Date(aula.data_aula).toLocaleDateString('pt-AO') : 'Data'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <FiClock className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>
                      {aula?.hora_inicio?.slice(0, 5)} - {aula?.hora_fim?.slice(0, 5)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <FiUsers className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>{aula?.turmas?.nome_turma || 'Turma'}</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setAulaSelect(null)}
              className="p-1.5 sm:p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors self-end sm:self-start"
            >
              <FiX className="w-5 h-5 sm:w-6 sm:h-6" />
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
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">Registro de Frequência</h4>
          <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
            {alunos.map(aluno => {
              const registro = registros[aluno.id];
              return (
                <div key={aluno.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium">
                        {aluno.nome_completo.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">{aluno.nome_completo}</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{aluno.numero_estudante}</p>
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
                      <>
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
                        <button
                          onClick={() => toggleAtraso(aluno.id)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            registro?.atraso
                              ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {registro?.atraso ? 'Atrasado' : 'Sem atraso'}
                        </button>
                      </>
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
            className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-900 font-medium"
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

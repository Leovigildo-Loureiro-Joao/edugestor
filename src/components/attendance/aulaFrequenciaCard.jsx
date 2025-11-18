import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCalendar, FiClock, FiUsers, FiSave, FiEdit, FiCheck, FiX } from 'react-icons/fi';
import { frequenciaService } from '../../services/database/frequenciaService';

export const AulaFrequenciaCard = ({ aula, alunos, onRegistrarFrequencia, index }) => {
  const [frequencias, setFrequencias] = useState([]);
  const [editando, setEditando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [registros, setRegistros] = useState([]);

  // Carregar frequências existentes
  useEffect(() => {
    carregarFrequencias();
  }, [aula.id]);

  // Inicializar registros quando carregar alunos ou frequências
  useEffect(() => {
    if (alunos.length > 0) {
      const registrosIniciais = alunos.map(aluno => {
        const frequenciaExistente = frequencias.find(f => f.aluno_id === aluno.id);
        return {
          aluno_id: aluno.id,
          aluno_nome: aluno.nome_completo,
          aluno_numero: aluno.numero_estudante || '',
          presente: frequenciaExistente?.presente ?? true, // Default: presente
          justificativa: frequenciaExistente?.justificativa || ''
        };
      });
      setRegistros(registrosIniciais);
    }
  }, [alunos, frequencias]);

  const carregarFrequencias = async () => {
    try {
      const data = await frequenciaService.getFrequenciaPorAula(aula.id);
      setFrequencias(data || []);
    } catch (error) {
      console.error('Erro ao carregar frequências:', error);
    }
  };

  const togglePresenca = (alunoId) => {
    if (!editando) return;
    
    setRegistros(prev =>
      prev.map(reg =>
        reg.aluno_id === alunoId
          ? { ...reg, presente: !reg.presente, justificativa: !reg.presente ? '' : reg.justificativa }
          : reg
      )
    );
  };

  const atualizarJustificativa = (alunoId, justificativa) => {
    setRegistros(prev =>
      prev.map(reg =>
        reg.aluno_id === alunoId
          ? { ...reg, justificativa }
          : reg
      )
    );
  };

  const salvarFrequencia = async () => {
    try {
      setCarregando(true);
      await onRegistrarFrequencia(aula.id, registros);
      setEditando(false);
      carregarFrequencias(); // Recarrega as frequências atualizadas
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setCarregando(false);
    }
  };

  // Estatísticas
  const totalAlunos = alunos.length;
  const presentes = frequencias.filter(f => f.presente).length;
  const ausentes = frequencias.filter(f => !f.presente).length;
  const taxaFrequencia = totalAlunos > 0 ? (presentes / totalAlunos) * 100 : 0;

  const formatarData = (dataString) => {
    return new Date(dataString).toLocaleDateString('pt-BR');
  };

  const formatarHora = (horaString) => {
    return horaString?.slice(0, 5) || '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200"
    >
      {/* Header do Card */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{aula.disciplina}</h3>
            
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
              <div className="flex items-center gap-1">
                <FiCalendar className="h-4 w-4" />
                <span>{formatarData(aula.data_aula)}</span>
              </div>
              <div className="flex items-center gap-1">
                <FiClock className="h-4 w-4" />
                <span>{formatarHora(aula.hora_inicio)} - {formatarHora(aula.hora_fim)}</span>
              </div>
              <div className="flex items-center gap-1">
                <FiUsers className="h-4 w-4" />
                <span>Turma {aula.turma_id}</span>
              </div>
            </div>

            {aula.tema_aula && (
              <p className="text-gray-700 text-sm">
                <strong>Tema:</strong> {aula.tema_aula}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-3">
            {/* Botão de Editar/Registrar */}
            {!editando ? (
              <button
                onClick={() => setEditando(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <FiEdit className="h-4 w-4" />
                {frequencias.length > 0 ? 'Editar Frequência' : 'Registrar Frequência'}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditando(false);
                    carregarFrequencias(); // Recarrega dados originais
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarFrequencia}
                  disabled={carregando}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <FiSave className="h-4 w-4" />
                  {carregando ? 'Salvando...' : 'Salvar Frequência'}
                </button>
              </div>
            )}

            {/* Estatísticas */}
            {frequencias.length > 0 && (
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <div className="text-green-600 font-semibold">{presentes}</div>
                  <div className="text-gray-500 text-xs">Presentes</div>
                </div>
                <div className="text-center">
                  <div className="text-red-600 font-semibold">{ausentes}</div>
                  <div className="text-gray-500 text-xs">Ausentes</div>
                </div>
                <div className="text-center">
                  <div className="text-blue-600 font-semibold">{taxaFrequencia.toFixed(1)}%</div>
                  <div className="text-gray-500 text-xs">Frequência</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Alunos para Marcar Presença */}
      <AnimatePresence>
        <div className="p-6">
          <div className="mb-4 flex justify-between items-center">
            <h4 className="font-medium text-gray-900">
              {editando ? 'Marque a presença dos alunos:' : 'Lista de alunos:'}
            </h4>
            <span className="text-sm text-gray-500">
              {registros.length} aluno(s)
            </span>
          </div>

          <div className="space-y-2">
            {registros.map((registro, idx) => (
              <motion.div
                key={registro.aluno_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex items-center gap-4 p-3 border rounded-lg transition-all ${
                  editando 
                    ? 'cursor-pointer hover:shadow-md' 
                    : 'cursor-default'
                } ${
                  registro.presente 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}
              >
                {/* Informações do Aluno */}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">{registro.aluno_nome}</span>
                    {registro.aluno_numero && (
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        #{registro.aluno_numero}
                      </span>
                    )}
                  </div>
                  
                  {/* Justificativa */}
                  {!registro.presente && registro.justificativa && (
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Justificativa:</strong> {registro.justificativa}
                    </p>
                  )}
                </div>

                {/* Controles de Presença */}
                <div className="flex items-center gap-3">
                  {editando && (
                    <input
                      type="text"
                      placeholder="Justificativa da ausência"
                      value={registro.justificativa}
                      onChange={(e) => atualizarJustificativa(registro.aluno_id, e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm w-64"
                      disabled={registro.presente}
                    />
                  )}
                  
                  <button
                    onClick={() => togglePresenca(registro.aluno_id)}
                    disabled={!editando}
                    className={`flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors min-w-24 justify-center ${
                      registro.presente
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-red-500 text-white hover:bg-red-600'
                    } ${!editando ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {registro.presente ? (
                      <>
                        <FiCheck className="h-4 w-4" />
                        Presente
                      </>
                    ) : (
                      <>
                        <FiX className="h-4 w-4" />
                        Ausente
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {registros.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhum aluno encontrado para esta turma
            </div>
          )}
        </div>
      </AnimatePresence>
    </motion.div>
  );
};
import { FiAlertCircle, FiCalendar, FiCheckCircle, FiClock, FiEdit2, FiMessageSquare, FiTarget, FiTrash2, FiUsers, FiX } from "react-icons/fi";
import { Aula, AulaFormData } from "../../types/aula";
import { useState } from "react";
import { FaChalkboardTeacher } from "react-icons/fa";
import { AnimatePresence, motion } from "framer-motion";

// No início do componente, adicione:


// Crie uma função para renderizar o modal
interface ModalDetalhesAulaProps {
  aulaExpandida: Aula | null;
  setAulaExpandida: React.Dispatch<React.SetStateAction<Aula | null>>;
  setShowForm: React.Dispatch<React.SetStateAction<boolean>>;
  setAulaEditando: React.Dispatch<React.SetStateAction<Aula | null>>;
  handleEditarAula: (aulaAtualizada: AulaFormData) => Promise<void>;
  handleDeletarAula: (id: string) => Promise<void>;
}

export const ModalDetalhesAula: React.FC<ModalDetalhesAulaProps> = ({
  aulaExpandida,
  setAulaExpandida,
  setShowForm,
  setAulaEditando,
  handleEditarAula,
  handleDeletarAula
}) => {
  if (!aulaExpandida) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planeada': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ministrada': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelada': return 'bg-red-100 text-red-800 border-red-200';
      case 'adiada': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planeada': return FiCalendar;
      case 'ministrada': return FiCheckCircle;
      case 'cancelada': return FiAlertCircle;
      case 'adiada': return FiClock;
      default: return FiCalendar;
    }
  };

  const StatusIcon = getStatusIcon(aulaExpandida.status);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => setAulaExpandida(null)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header do Modal */}
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${getStatusColor(aulaExpandida.status)} border`}>
                  <StatusIcon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {aulaExpandida.disciplina || 'Aula Sem Disciplina'}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      <FiCalendar className="h-5 w-5" />
                      <span className="font-medium">
                        {new Date(aulaExpandida.data_aula).toLocaleDateString('pt-AO', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiClock className="h-5 w-5" />
                      <span>
                        {aulaExpandida.hora_inicio?.slice(0, 5)} - {aulaExpandida.hora_fim?.slice(0, 5)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setAulaExpandida(null)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Conteúdo Detalhado */}
          <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="p-6 space-y-8">
              {/* Informações Básicas em Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Turma</h4>
                    <div className="flex items-center gap-3 text-gray-900 dark:text-white">
                      <FiUsers className="h-5 w-5" />
                      <div>
                        <p className="font-medium">{aulaExpandida.turmas?.nome_turma || 'Não especificada'}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Código da Turma</p>
                      </div>
                    </div>
                  </div>
                  
                 
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Tema da Aula</h4>
                    <p className="text-gray-900 dark:text-white text-lg font-medium">
                      {aulaExpandida.tema_aula || 'Não definido'}
                    </p>
                  </div>
                  
                  {aulaExpandida.conteudo_ministrado && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Conteúdo Ministrado</h4>
                      <p className="text-gray-900 dark:text-white">
                        {aulaExpandida.conteudo_ministrado}
                      </p>
                    </div>
                  )}
                </div>

                {/* Métricas */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Status</h4>
                    <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg ${getStatusColor(aulaExpandida.status)}`}>
                      <StatusIcon className="h-5 w-5" />
                      <span className="font-medium">
                        {aulaExpandida.status === 'ministrada' ? 'Ministrada' :
                         aulaExpandida.status === 'planeada' ? 'Planeada' :
                         aulaExpandida.status === 'cancelada' ? 'Cancelada' : 'Adiada'}
                      </span>
                    </div>
                  </div>
                  
                  {aulaExpandida.status === 'ministrada' && (
                    <div className="space-y-4">
                      {aulaExpandida.taxa_participacao !== undefined && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Participação</h4>
                          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                                  {aulaExpandida.taxa_participacao}%
                                </div>
                                <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                                  Taxa de participação
                                </div>
                              </div>
                              <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                {aulaExpandida.taxa_participacao >= 80 ? 'Excelente' : 
                                 aulaExpandida.taxa_participacao >= 60 ? 'Boa' : 'Regular'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Objetivos de Aprendizagem */}
              {aulaExpandida.objetivos_aprendizagem && aulaExpandida.objetivos_aprendizagem.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                    <FiTarget className="h-6 w-6 text-green-600" />
                    Objetivos de Aprendizagem
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aulaExpandida.objetivos_aprendizagem.map((objetivo, idx) => (
                      <div 
                        key={idx} 
                        className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4"
                      >
                        <div className="flex items-start gap-3">
                          <FiCheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-gray-900 dark:text-white font-medium">Objetivo {idx + 1}</p>
                            <p className="text-gray-700 dark:text-gray-300 mt-1">{objetivo}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Observações */}
              {aulaExpandida.observacoes && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                    <FiMessageSquare className="h-6 w-6 text-amber-600" />
                    Observações do Professor
                  </h4>
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
                    <p className="text-gray-900 dark:text-white whitespace-pre-line leading-relaxed">
                      {aulaExpandida.observacoes}
                    </p>
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setAulaEditando(aulaExpandida);
                      setShowForm(true);
                      setAulaExpandida(null);
                    }}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium flex items-center justify-center gap-3 transition-all"
                  >
                    <FiEdit2 className="h-5 w-5" />
                    Editar Aula
                  </button>
                  
                  {aulaExpandida.status === 'planeada' && (
                    <button
                      onClick={() => {
                        if (window.confirm('Marcar esta aula como ministrada?')) {
                          // Chamar API para atualizar status
                          handleEditarAula({
                            ...aulaExpandida,
                            status: 'ministrada'
                          } as AulaFormData);
                          setAulaExpandida(null);
                        }
                      }}
                      className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium flex items-center justify-center gap-3 transition-all"
                    >
                      <FiCheckCircle className="h-5 w-5" />
                      Marcar como Ministrada
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDeletarAula(aulaExpandida.id)}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium flex items-center justify-center gap-3 transition-all"
                  >
                    <FiTrash2 className="h-5 w-5" />
                    Excluir Aula
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
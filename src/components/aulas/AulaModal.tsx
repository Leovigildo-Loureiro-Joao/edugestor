import { FiAlertCircle, FiCalendar, FiCheckCircle, FiClock, FiEdit2, FiInfo, FiMessageSquare, FiTarget, FiTrash2, FiTrendingDown, FiUsers, FiX, FiBook, FiClipboard, FiTool, FiAward, FiBarChart2 } from "react-icons/fi";
import { Aula, AulaFormData, PlanoAula } from "../../types/aula";
import { useState } from "react";
import { FaChalkboardTeacher } from "react-icons/fa";
import { AnimatePresence, motion } from "framer-motion";

interface ModalDetalhesAulaProps {
  aulaExpandida: Aula | null;
  setAulaExpandida: React.Dispatch<React.SetStateAction<Aula | null>>;
  setShowForm: React.Dispatch<React.SetStateAction<boolean>>;
  setAulaEditando: React.Dispatch<React.SetStateAction<Aula | null>>;
  handleEditarAula: (aulaAtualizada: AulaFormData) => Promise<void>;
  handleDeletarAula: (aula:Aula) => Promise<void>;
  planoAula?: PlanoAula | null;
}

export const ModalDetalhesAula: React.FC<ModalDetalhesAulaProps> = ({
  aulaExpandida,
  setAulaExpandida,
  setShowForm,
  setAulaEditando,
  handleEditarAula,
  handleDeletarAula,
  planoAula
}) => {
  if (!aulaExpandida) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planeada': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
      case 'ministrada': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
      case 'cancelada': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
      case 'adiada': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-AO', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={() => setAulaExpandida(null)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-none sm:max-w-6xl h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header do Modal */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/20 dark:bg-white/10 rounded-lg">
                  <StatusIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                    <h3 className="text-lg sm:text-xl font-bold text-white leading-tight">
                      {aulaExpandida.disciplina || 'Aula Sem Disciplina'}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(aulaExpandida.status)}`}>
                      {aulaExpandida.status}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-blue-100">
                    <div className="flex items-center gap-2">
                      <FiCalendar className="h-4 w-4" />
                      <span className="font-medium capitalize">
                        {formatDate(aulaExpandida.data_aula)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiClock className="h-4 w-4" />
                      <span>
                        {aulaExpandida.hora_inicio?.slice(0, 5)} - {aulaExpandida.hora_fim?.slice(0, 5)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiUsers className="h-4 w-4" />
                      <span>{aulaExpandida.dia_semana}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setAulaExpandida(null)}
                className="p-2 hover:bg-blue-800 rounded-lg transition-colors text-white/80 hover:text-white"
              >
                <FiX className="h-5 w-5" />
              </motion.button>
            </div>
          </div>

          {/* Info Bar */}
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <FiBook className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Turma:</span> {aulaExpandida.turmas?.nome_turma || 'Não especificada'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FaChalkboardTeacher className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Professor:</span> {aulaExpandida.turmas?.professor || 'Não especificado'}
                </span>
              </div>
              {aulaExpandida.taxa_participacao !== undefined && (
                <div className="flex items-center gap-2">
                  <FiUsers className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Participação:</span> {aulaExpandida.taxa_participacao}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Conteúdo Detalhado */}
          <div className="overflow-y-auto max-h-[calc(90vh-200px)] scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
            <div className="p-6 space-y-6">
              {/* Grid Principal */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coluna 1: Tema e Conteúdo */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Tema da Aula */}
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <FiBook className="h-4 w-4" />
                      Tema da Aula
                    </h4>
                    <p className="text-gray-900 dark:text-white text-lg font-medium">
                      {aulaExpandida.tema_aula || 'Não definido'}
                    </p>
                  </div>

                  {/* Conteúdo Ministrado */}
                  {aulaExpandida.conteudo_ministrado && (
                    <div className="bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                      <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <FiClipboard className="h-4 w-4" />
                        Conteúdo Ministrado
                      </h4>
                      <p className="text-gray-900 dark:text-white whitespace-pre-line leading-relaxed">
                        {aulaExpandida.conteudo_ministrado}
                      </p>
                    </div>
                  )}
                </div>

                {/* Coluna 2: Status e Métricas */}
                <div className="space-y-6">
                  {/* Status Card */}
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Status da Aula</h4>
                    <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg ${getStatusColor(aulaExpandida.status)}`}>
                      <StatusIcon className="h-4 w-4" />
                      <span className="font-medium capitalize">{aulaExpandida.status}</span>
                    </div>
                  </div>

                  {/* Participação (se ministrada) */}
                  {aulaExpandida.status === 'ministrada' && aulaExpandida.taxa_participacao !== undefined && (
                    <div className="bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                      <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <FiBarChart2 className="h-4 w-4" />
                        Participação
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-3xl font-bold text-gray-900 dark:text-white">
                            {aulaExpandida.taxa_participacao}%
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            aulaExpandida.taxa_participacao >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                            aulaExpandida.taxa_participacao >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {aulaExpandida.taxa_participacao >= 80 ? 'Excelente' : 
                             aulaExpandida.taxa_participacao >= 60 ? 'Boa' : 'Regular'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${aulaExpandida.taxa_participacao}%` }}
                            transition={{ duration: 0.5 }}
                            className={`h-2 rounded-full ${
                              aulaExpandida.taxa_participacao >= 80 ? 'bg-green-500' :
                              aulaExpandida.taxa_participacao >= 60 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ações Rápidas (para aulas planeadas) */}
                  {aulaExpandida.status === 'planeada' && (
                    <div className="bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                      <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Ações Rápidas</h4>
                      <div className="space-y-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            handleEditarAula({
                              ...aulaExpandida,
                              status: 'ministrada'
                            } as AulaFormData);
                            setAulaExpandida(null);
                          }}
                          className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-3 transition-all"
                        >
                          <FiCheckCircle className="h-5 w-5" />
                          Marcar como Ministrada
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            handleEditarAula({
                              ...aulaExpandida,
                              status: 'adiada'
                            } as AulaFormData);
                            setAulaExpandida(null);
                          }}
                          className="w-full px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium flex items-center justify-center gap-3 transition-all"
                        >
                          <FiClock className="h-5 w-5" />
                          Adiar Aula
                        </motion.button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Objetivos de Aprendizagem */}
              {aulaExpandida.objetivos_aprendizagem && aulaExpandida.objetivos_aprendizagem.length > 0 && (
                <div className="bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                  <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FiTarget className="h-4 w-4" />
                    Objetivos de Aprendizagem
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {aulaExpandida.objetivos_aprendizagem.map((objetivo, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800"
                      >
                        <FiCheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Objetivo {idx + 1}</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{objetivo}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recursos Utilizados */}
              {aulaExpandida.recursos_utilizados && (
                <div className="bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                  <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FiTool className="h-4 w-4" />
                    Recursos Utilizados
                  </h4>
                  <p className="text-gray-900 dark:text-white">{aulaExpandida.recursos_utilizados}</p>
                </div>
              )}

              {/* Observações do Professor */}
              {aulaExpandida.observacoes_professor && (
                <div className="bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                  <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FiMessageSquare className="h-4 w-4" />
                    Observações do Professor
                  </h4>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-100 dark:border-amber-800">
                    <p className="text-gray-900 dark:text-white whitespace-pre-line leading-relaxed">
                      {aulaExpandida.observacoes_professor}
                    </p>
                  </div>
                </div>
              )}

              {/* Plano de Aula Relacionado */}
              {planoAula && (
                <div className="bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                  <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FiAward className="h-4 w-4" />
                    Plano de Aula Relacionado
                  </h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{planoAula.titulo}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {planoAula.tipo} • {planoAula.aulas_planeadas} aulas planeadas
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      planoAula.status === 'ativo' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                      planoAula.status === 'rascunho' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {planoAula.status}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer com Ações */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-end gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setAulaEditando(aulaExpandida);
                  setShowForm(true);
                  setAulaExpandida(null);
                }}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 transition-all"
              >
                <FiEdit2 className="h-4 w-4" />
                Editar Aula
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleDeletarAula(aulaExpandida)}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2 transition-all"
              >
                <FiTrash2 className="h-4 w-4" />
                Excluir Aula
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  FiUsers, FiBook, FiClock, FiCalendar, 
  FiFolder, FiUser, FiPlus, FiGitMerge,
  FiInfo, FiCheckCircle, FiAlertCircle,
  FiX
} from 'react-icons/fi';
import { Turma } from '../../types/turma';

type SectionForm = {
  modo: 'nova' | 'existente';
  turmaExistenteId: string;
  nomeTurma: string;
  professor: string;
  turno: 'manhã' | 'tarde' | 'noite';
  cursoId: string;
  anoLectivo: string;
};

interface ReforcoSectionModalProps {
  show: boolean;
  creating: boolean;
  selectedCount: number;
  availableTurmas: Turma[];
  form: SectionForm;
  onClose: () => void;
  onChange: (patch: Partial<SectionForm>) => void;
  onSubmit: () => void;
}

export const ReforcoSectionModal: React.FC<ReforcoSectionModalProps> = ({
  show,
  creating,
  selectedCount,
  availableTurmas,
  form,
  onClose,
  onChange,
  onSubmit
}) => {
  const isFormValid = () => {
    if (form.modo === 'existente') {
      return form.turmaExistenteId !== '';
    }
    return form.nomeTurma.trim() !== '' && 
           form.professor.trim() !== '' && 
           form.anoLectivo.trim() !== '';
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !creating && onClose()}
        >
          <motion.div
            className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-800 border border-gray-500 dark:border-gray-700 shadow-2xl overflow-hidden "
            initial={{ y: 24, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 16, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header com gradiente */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <FiUsers className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      Agrupar Alunos de Reforço
                      <span className="px-2 py-0.5 bg-white/20 text-xs rounded-full">
                        {selectedCount} aluno{selectedCount !== 1 ? 's' : ''}
                      </span>
                    </h3>
                    <p className="text-sm text-primary-100">
                      Organize os alunos em turmas de reforço personalizado
                    </p>
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  disabled={creating}
                  className="p-1.5 hover:bg-primary-800 rounded-lg transition-colors text-white/80 hover:text-white"
                >
                  <FiX className="h-5 w-5" />
                </motion.button>
              </div>
            </div>

            {/* Informação adicional */}
            <div className="px-6 py-3 bg-primary-50 dark:bg-primary-900/20 border-b border-primary-100 dark:border-primary-800 ">
              <div className="flex items-start gap-2 text-sm">
                <FiInfo className="h-4 w-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                <p className="text-primary-800 dark:text-primary-300">
                  Turmas fictícias novas usam sempre o curso padrão <span className="font-semibold">"Reforço"</span>
                </p>
              </div>
            </div>

            {/* Conteúdo principal */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Seletor de Modo */}
              <div className="grid grid-cols-2 gap-3">
                <motion.label
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    relative flex items-center p-4 rounded-xl border-2 cursor-pointer
                    transition-all duration-200
                    ${form.modo === 'nova' 
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="modoSecao"
                    checked={form.modo === 'nova'}
                    onChange={() => onChange({ modo: 'nova' })}
                    className="sr-only"
                  />
                  <FiPlus className={`h-5 w-5 mr-3 ${
                    form.modo === 'nova' ? 'text-primary-600' : 'text-gray-400'
                  }`} />
                  <div>
                    <span className={`block font-medium ${
                      form.modo === 'nova' ? 'text-primary-700' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      Criar nova seção
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Crie uma turma de reforço do zero
                    </span>
                  </div>
                  {form.modo === 'nova' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2"
                    >
                      <FiCheckCircle className="h-4 w-4 text-primary-600" />
                    </motion.div>
                  )}
                </motion.label>

                <motion.label
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    relative flex items-center p-4 rounded-xl border-2 cursor-pointer
                    transition-all duration-200
                    ${form.modo === 'existente' 
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="modoSecao"
                    checked={form.modo === 'existente'}
                    onChange={() => onChange({ modo: 'existente' })}
                    className="sr-only"
                  />
                  <FiGitMerge className={`h-5 w-5 mr-3 ${
                    form.modo === 'existente' ? 'text-primary-600' : 'text-gray-400'
                  }`} />
                  <div>
                    <span className={`block font-medium ${
                      form.modo === 'existente' ? 'text-primary-700' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      Usar turma existente
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Adicione a uma turma já criada
                    </span>
                  </div>
                  {form.modo === 'existente' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2"
                    >
                      <FiCheckCircle className="h-4 w-4 text-primary-600" />
                    </motion.div>
                  )}
                </motion.label>
              </div>

              {/* Conteúdo condicional */}
              <AnimatePresence mode="wait">
                {form.modo === 'existente' && (
                  <motion.div
                    key="existente"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Selecionar turma existente
                      </label>
                      <select
                        value={form.turmaExistenteId}
                        onChange={(e) => onChange({ turmaExistenteId: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Escolha uma turma</option>
                        {availableTurmas.map((turma) => (
                          <option key={turma.id} value={turma.id}>
                            {turma.nome_turma} {turma.professor ? `• ${turma.professor}` : ''}
                          </option>
                        ))}
                      </select>
                      
                      {availableTurmas.length === 0 && (
                        <div className="mt-2 flex items-center gap-2 text-amber-600 text-xs">
                          <FiAlertCircle className="h-3 w-3" />
                          <span>Nenhuma turma disponível. Crie uma nova seção.</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {form.modo === 'nova' && (
                  <motion.div
                    key="nova"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden space-y-4"
                  >
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <FiFolder className="inline mr-1 h-3 w-3" />
                        Nome da Seção
                      </label>
                      <input
                        type="text"
                        value={form.nomeTurma}
                        onChange={(e) => onChange({ nomeTurma: e.target.value })}
                        placeholder="Ex: Reforço Tarde A"
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <FiUser className="inline mr-1 h-3 w-3" />
                          Professor
                        </label>
                        <input
                          type="text"
                          value={form.professor}
                          onChange={(e) => onChange({ professor: e.target.value })}
                          placeholder="Nome do professor"
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <FiClock className="inline mr-1 h-3 w-3" />
                          Turno
                        </label>
                        <select
                          value={form.turno}
                          onChange={(e) => onChange({ turno: e.target.value as SectionForm['turno'] })}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="manhã">Manhã</option>
                          <option value="tarde">Tarde</option>
                          <option value="noite">Noite</option>
                        </select>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <FiCalendar className="inline mr-1 h-3 w-3" />
                          Ano letivo
                        </label>
                        <input
                          type="text"
                          value={form.anoLectivo}
                          onChange={(e) => onChange({ anoLectivo: e.target.value })}
                          placeholder="2025-2026"
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <FiBook className="inline mr-1 h-3 w-3" />
                          Curso (automático)
                        </label>
                        <div className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                          <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
                          Reforço Personalizado
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer com ações */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                disabled={creating}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancelar
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSubmit}
                disabled={creating || !isFormValid()}
                className={`
                  px-6 py-2 rounded-lg text-sm font-medium text-white
                  transition-all duration-200 flex items-center gap-2
                  ${isFormValid() && !creating
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800' 
                    : 'bg-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {creating ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    {form.modo === 'nova' ? <FiPlus className="h-4 w-4" /> : <FiGitMerge className="h-4 w-4" />}
                    <span>
                      {form.modo === 'nova' 
                        ? 'Criar seção e vincular' 
                        : 'Vincular à turma'}
                    </span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
// src/components/modals/HorarioModal.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiX, 
  FiClock, 
  FiCalendar, 
  FiBook, 
  FiMapPin, 
  FiUser,
  FiSave,
  FiTrash2
} from 'react-icons/fi';
import { HorarioAula, HorarioAulaForm } from '../../types/turma';


interface HorarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (horario: HorarioAulaForm) => void;
  onDelete?: (id: string) => void;
  horarioEdit?: HorarioAula | null;
  turmaId?: string;
  title?: string;
}

const HorarioModal: React.FC<HorarioModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  horarioEdit,
  turmaId,
  title = 'Adicionar Horário'
}) => {
  const [formData, setFormData] = useState<HorarioAulaForm>({
    dia_semana: 'segunda',
    hora_inicio: '08:00',
    hora_fim: '09:30',
    disciplina: '',
    sala: '',
    professor_responsavel: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dias da semana
  const diasSemana = [
    { value: 'segunda', label: 'Segunda-feira' },
    { value: 'terca', label: 'Terça-feira' },
    { value: 'quarta', label: 'Quarta-feira' },
    { value: 'quinta', label: 'Quinta-feira' },
    { value: 'sexta', label: 'Sexta-feira' },
    { value: 'sabado', label: 'Sábado' },
  ];

  // Disciplinas sugeridas
  const disciplinasSugeridas = [
    'Matemática', 'Português', 'Física', 'Química', 'Biologia',
    'História', 'Geografia', 'Inglês', 'Francês', 'Filosofia',
    'Educação Visual', 'Álgebra', 'Geometria',
    'Literatura', 'Gramática', 'Cálculo', 'Estatística'
  ];

  // Preencher formulário se estiver editando
  useEffect(() => {
    if (horarioEdit) {
      setFormData({
        ...horarioEdit,
        hora_inicio: formatTimeForInput(horarioEdit.hora_inicio),
        hora_fim: formatTimeForInput(horarioEdit.hora_fim),
      });
    } else {
      // Reset form
      setFormData({
        dia_semana: 'segunda',
        hora_inicio: '08:00',
        hora_fim: '09:30',
        disciplina: '',
        sala: '',
        professor_responsavel: '',
      });
    }
    setErrors({});
  }, [horarioEdit, isOpen]);

  // Formatar hora para input type="time"
  const formatTimeForInput = (time: string) => {
    if (time.includes(':')) {
      return time.length === 5 ? time : time.substring(0, 5);
    }
    return '08:00';
  };

  // Validar hora
  const isValidTime = (time: string) => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  // Validar se hora fim é maior que hora início
  const validateTimes = (inicio: string, fim: string) => {
    if (!isValidTime(inicio) || !isValidTime(fim)) {
      return 'Horas inválidas';
    }
    
    const [h1, m1] = inicio.split(':').map(Number);
    const [h2, m2] = fim.split(':').map(Number);
    
    const totalMinutes1 = h1 * 60 + m1;
    const totalMinutes2 = h2 * 60 + m2;
    
    if (totalMinutes2 <= totalMinutes1) {
      return 'Hora de término deve ser maior que hora de início';
    }
    
    if (totalMinutes2 - totalMinutes1 > 180) {
      return 'Aula não pode durar mais de 3 horas';
    }
    
    return '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpar erro do campo
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Validar horas em tempo real
    if (name === 'hora_inicio' || name === 'hora_fim') {
      const timeError = validateTimes(
        name === 'hora_inicio' ? value : formData.hora_inicio,
        name === 'hora_fim' ? value : formData.hora_fim
      );
      
      if (timeError) {
        setErrors(prev => ({ ...prev, [name]: timeError }));
      }
    }
  };

  const handleSelectDisciplina = (disciplina: string) => {
    setFormData(prev => ({
      ...prev,
      disciplina
    }));
    if (errors.disciplina) {
      setErrors(prev => ({ ...prev, disciplina: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.disciplina.trim()) {
      newErrors.disciplina = 'Selecione uma disciplina';
    }

    if (!formData.sala.trim()) {
      newErrors.sala = 'Informe a sala';
    }

    if (!formData.professor_responsavel.trim()) {
      newErrors.professor_responsavel = 'Informe o professor';
    }

    const timeError = validateTimes(formData.hora_inicio, formData.hora_fim);
    if (timeError) {
      newErrors.hora_fim = timeError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateForm()) {
    return;
  }

  setIsSubmitting(true);

  try {
    // Formatar horas para salvar
    const horarioParaSalvar: HorarioAulaForm = {
      dia_semana: formData.dia_semana,
      hora_inicio: formData.hora_inicio.padStart(5, '0'),
      hora_fim: formData.hora_fim.padStart(5, '0'),
      disciplina: formData.disciplina,
      sala: formData.sala,
      professor_responsavel: formData.professor_responsavel,
    };

    await onSubmit(horarioParaSalvar);
    onClose();
  } catch (error) {
    console.error('Erro ao salvar horário:', error);
  } finally {
    setIsSubmitting(false);
  }
};

  const handleDelete = async () => {
    if (horarioEdit?.id && onDelete) {
      if (window.confirm('Tem certeza que deseja excluir este horário?')) {
        try {
          await onDelete(horarioEdit.id);
          onClose();
        } catch (error) {
          console.error('Erro ao excluir horário:', error);
        }
      }
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  // Calcular duração
  const calcularDuracao = () => {
    const [h1, m1] = formData.hora_inicio.split(':').map(Number);
    const [h2, m2] = formData.hora_fim.split(':').map(Number);
    
    const totalMinutes1 = h1 * 60 + m1;
    const totalMinutes2 = h2 * 60 + m2;
    const duracaoMinutos = totalMinutes2 - totalMinutes1;
    
    const horas = Math.floor(duracaoMinutos / 60);
    const minutos = duracaoMinutos % 60;
    
    return `${horas}h ${minutos > 0 ? `${minutos}min` : ''}`.trim();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <FiClock className="text-blue-600 dark:text-blue-400 text-xl" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {title}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {horarioEdit ? 'Editar horário existente' : 'Adicionar novo horário à turma'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <FiX size={24} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-6">
                  {/* Dia da semana e Horário */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Dia da semana */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <FiCalendar size={16} />
                        Dia da semana *
                      </label>
                      <select
                        name="dia_semana"
                        value={formData.dia_semana}
                        onChange={handleChange}
                        className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      >
                        {diasSemana.map(dia => (
                          <option key={dia.value} value={dia.value}>
                            {dia.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Hora início */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <FiClock size={16} />
                        Hora início *
                      </label>
                      <div className="relative">
                        <input
                          type="time"
                          name="hora_inicio"
                          value={formData.hora_inicio}
                          onChange={handleChange}
                          className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          required
                        />
                        {errors.hora_inicio && (
                          <p className="text-red-500 text-xs mt-1">{errors.hora_inicio}</p>
                        )}
                      </div>
                    </div>

                    {/* Hora fim */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <FiClock size={16} />
                        Hora fim *
                      </label>
                      <div className="relative">
                        <input
                          type="time"
                          name="hora_fim"
                          value={formData.hora_fim}
                          onChange={handleChange}
                          className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          required
                        />
                        {errors.hora_fim && (
                          <p className="text-red-500 text-xs mt-1">{errors.hora_fim}</p>
                        )}
                        
                        {/* Duração */}
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
                            {calcularDuracao()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Disciplina */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <FiBook size={16} />
                      Disciplina *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="disciplina"
                        value={formData.disciplina}
                        onChange={handleChange}
                        placeholder="Selecione ou digite a disciplina"
                        className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        required
                      />
                      {errors.disciplina && (
                        <p className="text-red-500 text-xs mt-1">{errors.disciplina}</p>
                      )}
                    </div>
                    
                    {/* Sugestões de disciplinas */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {disciplinasSugeridas.slice(0, 6).map(disciplina => (
                        <button
                          key={disciplina}
                          type="button"
                          onClick={() => handleSelectDisciplina(disciplina)}
                          className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                            formData.disciplina === disciplina
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {disciplina}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, disciplina: '' }))}
                        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  {/* Sala e Professor */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Sala */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <FiMapPin size={16} />
                        Sala *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="sala"
                          value={formData.sala}
                          onChange={handleChange}
                          placeholder="Ex: Sala 1, Laboratório, Auditório"
                          className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          required
                        />
                        {errors.sala && (
                          <p className="text-red-500 text-xs mt-1">{errors.sala}</p>
                        )}
                      </div>
                    </div>

                    {/* Professor */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <FiUser size={16} />
                        Professor responsável *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="professor_responsavel"
                          value={formData.professor_responsavel}
                          onChange={handleChange}
                          placeholder="Nome do professor"
                          className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          required
                        />
                        {errors.professor_responsavel && (
                          <p className="text-red-500 text-xs mt-1">{errors.professor_responsavel}</p>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    {horarioEdit && onDelete && (
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        <FiTrash2 size={18} />
                        Excluir
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isSubmitting}
                      className="px-5 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <FiSave size={18} />
                          {horarioEdit ? 'Atualizar Horário' : 'Salvar Horário'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default HorarioModal;
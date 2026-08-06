// src/components/modals/HorarioModal
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
import { cursosService, turmaService } from '../../services/database';
import { useConfirmModal } from '../ui/ComfirmModal';
import { useAlert } from '../ui/AlertBadge';
import { instituicaoIdValue } from '../../utils/getInstituicaoID';
import db from '../../services/database/db';
import { SelectTyped } from '../students/StudentForm';


// No HorarioModal, adicione estas props:
interface HorarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (horario: HorarioAulaForm) => void;
  onDelete?: (id: string) => void;
  confirm: any;
  horarioEdit?: HorarioAula | null;
  turmaId?: string;
  title?: string;
  horariosExistentes?: HorarioAula[]; // Nova prop para horários existentes
}


const HorarioModal: React.FC<HorarioModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  confirm,
  horarioEdit,
  turmaId,
  title = 'Adicionar Horário',
  horariosExistentes
}) => {
  const [formData, setFormData] = useState<HorarioAulaForm>({
    turma_id:turmaId||"",
    dia_semana: 'segunda',
    hora_inicio: '08:00',
    hora_fim: '09:30',
    disciplina: '',
    sala: '',
    instituicao_id:instituicaoIdValue(),
    sync_status:"pending",
    professor_responsavel: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [professorOptions, setProfessorOptions] = useState<{ value: string; label: string }[]>([]);

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
  const [disciplinasSugeridas,setDisciplina] = useState<string[]>();
  const {showAlert} = useAlert()
  // Preencher formulário se estiver editando
  useEffect(() => {
     const addDisciplinas = async () => {
       const turma=await turmaService.getTurmaById(turmaId||"")
        const curso=await cursosService.getCoursesById(turma?.curso_id||"")
       setDisciplina([...(curso?.disciplinas||[])])
    }
    addDisciplinas()
    loadProfessores()
    if (horarioEdit) {
      setFormData({
        ...horarioEdit,
        hora_inicio: formatTimeForInput(horarioEdit.hora_inicio),
        hora_fim: formatTimeForInput(horarioEdit.hora_fim),
      });
    } else {
      // Reset form
      setFormData({
        turma_id:turmaId||"",
        instituicao_id:instituicaoIdValue(),
        sync_status:"pending",
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

  const loadProfessores = async () => {
    try {
      const instituicaoId = instituicaoIdValue();
      const professores = await db.profiles
        .where('role')
        .equals('teacher')
        .toArray();

      const filtrados = instituicaoId
        ? professores.filter((p: any) => p.instituicao_id === instituicaoId)
        : professores;

      let options = filtrados.map((p: any) => {
        const label = p.full_name || p.nome || p.email || 'Professor';
        return { value: label, label };
      });

      if (options.length === 0) {
        options = [{ value: '', label: 'Sem professores' }];
      }

      setProfessorOptions(options);

      if (!horarioEdit && !formData.professor_responsavel && options.length > 0) {
        setFormData((prev) => ({
          ...prev,
          professor_responsavel: options[0].value
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar professores:', error);
    }
  };


  const verificarConflitoNoModal = (
    horario: HorarioAulaForm,
    horariosExistentes?: HorarioAula[],
    isEdicao?: boolean,
    horarioEditId?: string
  ): string | null => {
    if (!horariosExistentes || horariosExistentes.length === 0) {
      return null;
    }
    
    const { dia_semana, hora_inicio, hora_fim } = horario;
    
    // Converter horas para minutos
    const toMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const inicioNovo = toMinutes(hora_inicio);
    const fimNovo = toMinutes(hora_fim);
    
    for (const horarioExistente of horariosExistentes) {
      // Ignorar o próprio horário durante edição
      if (isEdicao && horarioExistente.id === horarioEditId) {
        continue;
      }
      
      if (horarioExistente.dia_semana === dia_semana) {
        const inicioExistente = toMinutes(horarioExistente.hora_inicio);
        const fimExistente = toMinutes(horarioExistente.hora_fim);
        
        const sobrepoe = (
          (inicioNovo >= inicioExistente && inicioNovo < fimExistente) ||
          (fimNovo > inicioExistente && fimNovo <= fimExistente) ||
          (inicioNovo <= inicioExistente && fimNovo >= fimExistente)
        );
        
        if (sobrepoe) {
          return `Conflito com: ${horarioExistente.disciplina} (${horarioExistente.hora_inicio} - ${horarioExistente.hora_fim})`;
        }
      }
    }
    
    return null;
  };

  // No handleSubmit do HorarioModal, adicione a validação:
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    if (!validateForm()) {
      return;
    }

    // Verificar conflito antes de submeter
    const conflito = verificarConflitoNoModal(
      formData,
      horariosExistentes, // Passar os horários existentes como prop
      !!horarioEdit,
      horarioEdit?.id
    );
    
    if (conflito) {
      setErrors(prev => ({
        ...prev,
        hora_fim: conflito,
        hora_inicio: 'Conflito de horário'
      }));
      return;
    }

    setIsSubmitting(true);

    try {
      // Formatar horas para salvar
      const horarioParaSalvar: HorarioAulaForm | HorarioAula = {
        id: horarioEdit?.id|| "",
        turma_id: turmaId || "",
        dia_semana: formData.dia_semana,
        hora_inicio: formData.hora_inicio.padStart(5, '0'),
        hora_fim: formData.hora_fim.padStart(5, '0'),
        disciplina: formData.disciplina,
        sala: formData.sala,
        professor_responsavel: formData.professor_responsavel,
        instituicao_id: instituicaoIdValue(),
        sync_status: "pending",
      };

      await onSubmit(horarioParaSalvar);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar horário:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Adicione validação em tempo real nas mudanças de hora:
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
      } else {
        // Verificar conflito com horários existentes
        const conflito = verificarConflitoNoModal(
          { ...formData, [name]: value },
          horariosExistentes,
          !!horarioEdit,
          horarioEdit?.id
        );
        
        if (conflito) {
          setErrors(prev => ({
            ...prev,
            hora_fim: conflito,
            hora_inicio: 'Conflito de horário'
          }));
        }
      }
    }
  };

  // Adicione uma função para mostrar horários disponíveis:
  const getHorariosDisponiveis = (dia: string) => {
    if (!horariosExistentes) return [];
    
    const horariosDoDia = horariosExistentes
      .filter(h => h.dia_semana === dia)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
    
    return horariosDoDia;
  };
   


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


  const handleDelete = async () => {
    if (horarioEdit?.id && onDelete) {
       await confirm({
            type: 'delete',
            title: 'Excluir Horário',
            message: `Tem certeza que deseja excluir o horário? `,
            isDestructive: true,
            confirmText: 'Excluir',
            onConfirm: async () => {
              try {
                onDelete(horarioEdit.id);
                onClose();
                showAlert({
                  type: 'success',
                  title: 'Horário excluído!',
                  message: `Tem certeza que deseja excluir este horário?`,
                  duration: 3000
                });
                
              } catch (error) {
                showAlert({
                  type: 'error',
                  title: 'Erro ao excluir',
                  message: 'Não foi possível excluir o aluno. Verifique sua conexão.',
                  duration: 5000
                });
                console.error('Erro ao excluir horário:', error);
              }
            }
          });
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
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-none sm:max-w-6xl h-[90vh] sm:h-auto sm:max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-2xl"
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
              <form onSubmit={handleSubmit} className="p-6 overflow-auto max-h-[80vh]">
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
                      <div className="mt-2">
                        {getHorariosDisponiveis(formData.dia_semana).length > 0 && (
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            <p className="font-medium mb-1">Horários já existentes neste dia:</p>
                            {getHorariosDisponiveis(formData.dia_semana).map((h, idx) => (
                              <div key={idx} className="flex items-center gap-2 mb-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                                <span>
                                  {h.disciplina}: {h.hora_inicio} - {h.hora_fim} ({h.sala})
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

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
                      {(disciplinasSugeridas??[]).slice(0, 6).map(disciplina => (
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
                      <SelectTyped
                        vect={professorOptions}
                        icon={FiUser}
                        onChange={(value: string) =>
                          setFormData((prev) => ({ ...prev, professor_responsavel: value }))
                        }
                        value={formData.professor_responsavel}
                      />
                      {errors.professor_responsavel && (
                        <p className="text-red-500 text-xs mt-1">{errors.professor_responsavel}</p>
                      )}
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

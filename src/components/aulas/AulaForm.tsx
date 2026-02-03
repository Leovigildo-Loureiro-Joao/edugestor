import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiBook, FiCalendar, FiClock, FiUsers, FiX, 
  FiTarget, FiCheckCircle, FiAlertCircle, FiEdit3,
  FiMessageSquare, FiTrendingUp, FiFileText,
  FiAlertTriangle // Adicione este ícone
} from 'react-icons/fi';
import { FaChalkboardTeacher, FaGraduationCap } from 'react-icons/fa';
import { SelectTyped } from '../students/StudentForm';
import { turmaService } from '../../services/database/turmas';
import { cursosService } from '../../services/database/curso';
import { useAlert } from '../ui/AlertBadge';
import { ConfirmModalProps } from '../ui/ComfirmModal';

interface AulaFormProps {
  aula: any;
  turmas: any[];
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  comfirm: (props: Omit<ConfirmModalProps, "isOpen" | "onClose">) => Promise<boolean>;
  loading?: boolean;
  turmaHorarios?: any[]; // Nova prop para horários da turma
}

export const AulaForm = ({ 
  aula, 
  turmas, 
  onSubmit, 
  onCancel, 
  comfirm,
  loading = false,
  turmaHorarios = [] // Valor padrão
}: AulaFormProps) => {
  // No estado inicial do formData no AulaForm
const [formData, setFormData] = useState({
  turma_id: '',
  disciplina: '',
  data_aula: '',
  hora_inicio: '',
  hora_fim: '',
  conteudo_ministrado: '',
  tema_aula: '',
  status: 'planeada',
  objetivos_aprendizagem: [] as string[],
  recursos_utilizados: [] as string[],
  nivel_dificuldade: 'medio' as 'baixo' | 'medio' | 'alto',
  observacoes_professor: '',
  dia_semana: '' // Adicione este campo
});
const [disciplinas, setDisciplinas] = useState<string[]>(['Selecione uma disciplina']);
  const [novoObjetivo, setNovoObjetivo] = useState('');
  const [novoRecurso, setNovoRecurso] = useState('');
  const [turmaSelecionada, setTurmaSelecionada] = useState<any>(aula ? aula.turmas : []);
  const [horariosDaTurma, setHorariosDaTurma] = useState<any[]>([]);
  const [validacaoHorario, setValidacaoHorario] = useState<{
    isValid: boolean;
    message: string;
    tipo: 'sucesso' | 'aviso' | 'erro' | 'info';
    horarioCorrespondente?: any;
  }>({
    isValid: true,
    message: '',
    tipo: 'info'
  });
  
  const { showAlert } = useAlert();

// Função para obter dia da semana a partir da data
const getDiaSemanaFromDate = (dateString: string): string => {
  const dias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const date = new Date(dateString);
  return dias[date.getDay()];
};

// Atualize o useEffect que inicializa formData
useEffect(() => {
  if (aula) {
    const diaSemana = aula.data_aula ? getDiaSemanaFromDate(aula.data_aula) : '';
    
    setFormData({
      turma_id: aula.turma_id || '',
      disciplina: aula.disciplina || '',
      data_aula: aula.data_aula || '',
      hora_inicio: aula.hora_inicio || '',
      hora_fim: aula.hora_fim || '',
      conteudo_ministrado: aula.conteudo_ministrado || '',
      tema_aula: aula.tema_aula || '',
      status: aula.status || 'planeada',
      objetivos_aprendizagem: aula.objetivos_aprendizagem || [],
      recursos_utilizados: aula.recursos_utilizados || [],
      nivel_dificuldade: aula.nivel_dificuldade || 'medio',
      observacoes_professor: aula.observacoes_professor || '',
      dia_semana: diaSemana // Adicionar dia da semana
    });
    
    if (aula.turma_id) {
      carregarDisciplinas(aula.turma_id);
      carregarHorariosDaTurma(aula.turma_id);
    }
  } else {
    // Reset para novo formulário
    const hoje = new Date().toISOString().split('T')[0];
    const diaSemanaHoje = getDiaSemanaFromDate(hoje);
    
    setFormData({
      turma_id: '',
      disciplina: '',
      data_aula: hoje,
      hora_inicio: '08:00',
      hora_fim: '09:30',
      conteudo_ministrado: '',
      tema_aula: '',
      status: 'planeada',
      objetivos_aprendizagem: [],
      recursos_utilizados: [],
      nivel_dificuldade: 'medio',
      observacoes_professor: '',
      dia_semana: diaSemanaHoje // Adicionar dia da semana
    });
  }
}, [aula]);

// Atualize o handler de mudança de data
const handleDataChange = (dateString: string) => {
  const diaSemana = getDiaSemanaFromDate(dateString);
  
  setFormData(prev => ({
    ...prev,
    data_aula: dateString,
    dia_semana: diaSemana
  }));
  
};

// Atualize a validação para incluir dia da semana
const validarHorarioAulaComDiaSemana = () => {
  if (!formData.turma_id || !formData.disciplina || !formData.hora_inicio || !formData.hora_fim || !formData.dia_semana) {
    return;
  }

  // Verificar se há horários definidos para a turma
  if (horariosDaTurma.length === 0) {
    setValidacaoHorario({
      isValid: false,
      message: '⚠️ Esta turma não possui horários definidos. A aula será registrada sem validação de horário.',
      tipo: 'aviso'
    });
    return;
  }

  // Converter horas para minutos
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const inicioAula = toMinutes(formData.hora_inicio);
  const fimAula = toMinutes(formData.hora_fim);
  const diaSemanaAula = formData.dia_semana;

  // Verificar se há horário correspondente para esta disciplina, dia e horário
  const horariosCorrespondentes = horariosDaTurma.filter(horario => {
    if (horario.disciplina !== formData.disciplina) {
      return false;
    }

    if (horario.dia_semana !== diaSemanaAula) {
      return false; // Verificar mesmo dia da semana
    }

    const inicioHorario = toMinutes(horario.hora_inicio);
    const fimHorario = toMinutes(horario.hora_fim);

    // Verificar se a aula está dentro do horário definido (com margem de 15 minutos)
    const margem = 15; // minutos
    return (
      inicioAula >= (inicioHorario - margem) &&
      fimAula <= (fimHorario + margem)
    );
  });

  if (horariosCorrespondentes.length > 0) {
    setValidacaoHorario({
      isValid: true,
      message: `✅ Horário validado! Aula dentro do horário previsto para ${diaSemanaAula}: ${horariosCorrespondentes[0].hora_inicio} - ${horariosCorrespondentes[0].hora_fim}`,
      tipo: 'sucesso',
      horarioCorrespondente: horariosCorrespondentes[0]
    });
  } else {
    // Verificar se há horários para esta disciplina no mesmo dia
    const horariosMesmaDisciplinaDia = horariosDaTurma.filter(h => 
      h.disciplina === formData.disciplina && h.dia_semana === diaSemanaAula
    );
    
    if (horariosMesmaDisciplinaDia.length > 0) {
      // A disciplina tem horário neste dia, mas não corresponde
      const sugerirHorarios = horariosMesmaDisciplinaDia.slice(0, 3);
      const sugestoes = sugerirHorarios.map(h => `${h.hora_inicio} - ${h.hora_fim}`).join(', ');
      
      setValidacaoHorario({
        isValid: false,
        message: `⚠️ Aula fora do horário previsto para ${diaSemanaAula}. Horários disponíveis neste dia: ${sugestoes}`,
        tipo: 'aviso'
      });
    } else {
      // Verificar se há horários para esta disciplina em outros dias
      const horariosDisciplinaOutrosDias = horariosDaTurma.filter(h => h.disciplina === formData.disciplina);
      
      if (horariosDisciplinaOutrosDias.length > 0) {
        const outrosDias = [...new Set(horariosDisciplinaOutrosDias.map(h => h.dia_semana))];
        
        setValidacaoHorario({
          isValid: false,
          message: `⚠️ Esta disciplina não tem horário definido para ${diaSemanaAula}. Dias disponíveis: ${outrosDias.join(', ')}`,
          tipo: 'aviso'
        });
      } else {
        // Disciplina não tem horário definido em nenhum dia
        
        // Verificar se o horário conflita com outras disciplinas no mesmo dia
        const horariosConflitantes = horariosDaTurma.filter(horario => {
          if (horario.dia_semana !== diaSemanaAula) {
            return false; // Só verificar conflitos no mesmo dia
          }

          const inicioHorario = toMinutes(horario.hora_inicio);
          const fimHorario = toMinutes(horario.hora_fim);

          return (
            (inicioAula >= inicioHorario && inicioAula < fimHorario) ||
            (fimAula > inicioHorario && fimAula <= fimHorario) ||
            (inicioAula <= inicioHorario && fimAula >= fimHorario)
          );
        });

        if (horariosConflitantes.length > 0) {
          const conflito = horariosConflitantes[0];
          setValidacaoHorario({
            isValid: false,
            message: `❌ Conflito de horário no ${diaSemanaAula} com ${conflito.disciplina} (${conflito.hora_inicio} - ${conflito.hora_fim})`,
            tipo: 'erro'
          });
        } else {
          setValidacaoHorario({
            isValid: true,
            message: `✅ Horário disponível. Esta disciplina não possui horário fixo definido para ${diaSemanaAula}.`,
            tipo: 'info'
          });
        }
      }
    }
  }
};

// Atualize o useEffect para usar a nova função de validação
useEffect(() => {
  if (formData.turma_id && formData.disciplina && formData.hora_inicio && formData.hora_fim && formData.dia_semana) {
    validarHorarioAulaComDiaSemana();
  }
}, [formData.turma_id, formData.disciplina, formData.hora_inicio, formData.hora_fim, formData.dia_semana]);

  // Carregar horários quando turmaHorarios prop mudar
  useEffect(() => {
    if (turmaHorarios.length > 0 && formData.turma_id) {
      setHorariosDaTurma(turmaHorarios);
      validarHorarioAulaComDiaSemana();
    }
  }, [turmaHorarios, formData.turma_id]);

  const carregarDisciplinas = async (turmaId: string) => {
    try {
      const turma = await turmaService.findById(turmaId);
      if (turma?.curso_id) {
        const curso = await cursosService.getCoursesById(turma.curso_id);
        const disciplinasCurso = curso?.disciplinas || [];
        setDisciplinas(['Selecione uma disciplina', ...disciplinasCurso]);
        setTurmaSelecionada(turma);
      }
    } catch (error) {
      showAlert({
        title: "Erro ao carregar disciplina",
        type: "error",
        duration: 5000,
        message: "Faça reload a página"
      });
      console.error('Erro ao carregar disciplinas:', error);
    }
  };

  const carregarHorariosDaTurma = async (turmaId: string) => {
    try {
      const horarios = await turmaService.getHorarios(turmaId);
      setHorariosDaTurma(horarios);
      if (formData.turma_id && formData.disciplina && formData.hora_inicio && formData.hora_fim && formData.dia_semana) {
        validarHorarioAulaComDiaSemana();
      }
    } catch (error) {
      console.error('Erro ao carregar horários da turma:', error);
    }
  };

  const handleTurmaChange = async (turmaId: string) => {
    setFormData(prev => ({
      ...prev,
      turma_id: turmaId,
      disciplina: '' // Reset disciplina quando trocar turma
    }));

    if (turmaId) {
      await carregarDisciplinas(turmaId);
      await carregarHorariosDaTurma(turmaId);
    } else {
      setDisciplinas(['Selecione uma disciplina']);
      setTurmaSelecionada(null);
      setHorariosDaTurma([]);
      setValidacaoHorario({
        isValid: true,
        message: '',
        tipo: 'info'
      });
    }
  };
  
  // Atualizar validação quando dados relevantes mudarem
  useEffect(() => {
    if (formData.turma_id && formData.disciplina && formData.hora_inicio && formData.hora_fim) {
      validarHorarioAulaComDiaSemana();
    }
  }, [formData.turma_id, formData.disciplina, formData.hora_inicio, formData.hora_fim]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações básicas
    if (!formData.turma_id) {
      showAlert({
        type: 'warning',
        title: 'Selecione uma turma',
        message: 'Toda aula neste sistema relacionada a uma turma.',
        duration: 3000
      });
      return;
    }
    
    if (!formData.disciplina || formData.disciplina === 'Selecione uma disciplina') {
      showAlert({
        type: 'warning',
        title: 'Disciplina não selecionada',
        message: 'Selecione a disciplina da aula em causa.',
        duration: 3000
      });
      return;
    }
    
    if (!formData.data_aula) {
      showAlert({
        type: 'warning',
        title: 'Data não definida',
        message: 'Determine a data da aula',
        duration: 3000
      });
      return;
    }
    
    if (!formData.hora_inicio || !formData.hora_fim) {
      showAlert({
        type: 'warning',
        title: 'Horário não definido',
        message: 'Defina o horário da aula',
        duration: 3000
      });
      return;
    }

    // Adicione uma função de validação mais robusta:

    // Verificar se hora_fim é depois de hora_inicio
    const inicio = new Date(`2000-01-01T${formData.hora_inicio}`);
    const fim = new Date(`2000-01-01T${formData.hora_fim}`);
    if (fim <= inicio) {
      showAlert({
        type: 'error',
        title: 'Horário mal definido',
        message: 'A hora de término deve ser após a hora de início',
        duration: 5000
      });
      return;
    }
    if (validacaoHorario.tipo === 'erro') {
      await comfirm({
        type: 'warning',
        title: 'Conflito de horário',
        message: 'Esta aula está em conflito com horários já definidos. Deseja continuar mesmo assim?',
        confirmText: 'Continuar',
        cancelText: 'Corrigir',
        onConfirm: () => {
          // Usuario confirmou que quer continuar com o conflito
          onSubmit(formData);
        },
      });
      return;
    }

    if (validacaoHorario.tipo === 'aviso') {
      await comfirm({
        type: 'warning',
        title: 'Horário fora do previsto',
        message: 'Esta aula não está dentro dos horários definidos para esta disciplina. Deseja continuar?',
        confirmText: 'Continuar',
        cancelText: 'Corrigir',
        onConfirm: () => {
          onSubmit(formData);
        }
      });
      return;
    }

    // Se tudo estiver ok, submeter normalmente
    onSubmit(formData);
  };

  const validarHorarioCompleto = () => {
      // Verificar se todos os campos necessários estão preenchidos
      if (!formData.turma_id || 
          !formData.disciplina || 
          formData.disciplina === 'Selecione uma disciplina' ||
          !formData.hora_inicio || 
          !formData.hora_fim || 
          !formData.dia_semana) {
        return false;
      }
      return true;
    };

  // Função para sincronizar com horário definido
  const sincronizarComHorario = () => {
    if (validacaoHorario.horarioCorrespondente) {
      setFormData(prev => ({
        ...prev,
        hora_inicio: validacaoHorario.horarioCorrespondente.hora_inicio,
        hora_fim: validacaoHorario.horarioCorrespondente.hora_fim
      }));
    }
  };

  // Adicione estas funções (mantenha as já existentes)
  const addObjetivo = () => {
    if (novoObjetivo.trim()) {
      setFormData(prev => ({
        ...prev,
        objetivos_aprendizagem: [...prev.objetivos_aprendizagem, novoObjetivo.trim()]
      }));
      setNovoObjetivo('');
    }
  };

  const removeObjetivo = (index: number) => {
    setFormData(prev => ({
      ...prev,
      objetivos_aprendizagem: prev.objetivos_aprendizagem.filter((_, i) => i !== index)
    }));
  };

  const addRecurso = () => {
    if (novoRecurso.trim()) {
      setFormData(prev => ({
        ...prev,
        recursos_utilizados: [...prev.recursos_utilizados, novoRecurso.trim()]
      }));
      setNovoRecurso('');
    }
  };

  const removeRecurso = (index: number) => {
    setFormData(prev => ({
      ...prev,
      recursos_utilizados: prev.recursos_utilizados.filter((_, i) => i !== index)
    }));
  };

  const isEditing = !!aula;
  const title = isEditing ? 'Editar Aula' : 'Nova Aula';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg">
                <FiBook className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {isEditing ? 'Atualize os detalhes da aula' : 'Preencha os detalhes da nova aula'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo Rolável */}
        <div className="flex-1 overflow-y-auto max-h-[calc(90vh-140px)] p-6">
          {/* Grid Principal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coluna Esquerda - Informações Básicas */}
            <div className="space-y-6">
              <div className="rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiBook className="text-blue-600" />
                  Informações Básicas
                </h3>

                {/* Turma */}
                <div className="space-y-2 mb-4">
                  <label className="block text-sm font-semibold text-gray-700">
                    <FiUsers className="inline mr-2" />
                    Turma *
                  </label>
                  <SelectTyped
                    vect={['Selecione uma turma', ...turmas.map(t => t.label)]}
                    value={turmaSelecionada.nome_turma || 'Selecione uma turma'}
                    onChange={(value: any) => handleTurmaChange(
                      turmas.find(t => t.label === value)?.value || ''
                    )}
                    placeholder="Selecione a turma"
                  />
                  
                  {/* Info da turma selecionada */}
                  {turmaSelecionada && (
                    <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                      <div><strong>Curso:</strong> {turmaSelecionada.curso_nome}</div>
                      <div><strong>Professor:</strong> {turmaSelecionada.professor || 'Não definido'}</div>
                      <div><strong>Horários definidos:</strong> {horariosDaTurma.length}</div>
                    </div>
                  )}
                </div>

                {/* Disciplina */}
                <div className="space-y-2 mb-4">
                  <label className="block text-sm font-semibold text-gray-700">
                    <FaGraduationCap className="inline mr-2" />
                    Disciplina *
                  </label>
                  <SelectTyped
                    vect={disciplinas}
                    value={formData.disciplina}
                    onChange={(value: any) => setFormData(prev => ({ ...prev, disciplina: value }))}
                    placeholder="Selecione a disciplina"
                    disabled={!formData.turma_id}
                  />
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    <FiCheckCircle className="inline mr-2" />
                    Status da Aula
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'planeada', label: 'Planeada', icon: FiCalendar, color: 'bg-blue-100 text-blue-800' },
                      { value: 'ministrada', label: 'Ministrada', icon: FiCheckCircle, color: 'bg-green-100 text-green-800' },
                      { value: 'cancelada', label: 'Cancelada', icon: FiAlertCircle, color: 'bg-red-100 text-red-800' },
                      { value: 'adiada', label: 'Adiada', icon: FiEdit3, color: 'bg-yellow-100 text-yellow-800' }
                    ].map((status) => (
                      <button
                        key={status.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, status: status.value }))}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                          formData.status === status.value
                            ? `${status.color} ring-2 ring-opacity-50`
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <status.icon className="h-4 w-4" />
                        <span className="text-sm">{status.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Data e Horário */}
              <div className="rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiCalendar className="text-green-600" />
                  Data e Horário
                </h3>

                {/* Data */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Data da Aula *
                    {formData.data_aula && (
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        ({formData.dia_semana})
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={formData.data_aula}
                      onChange={(e) => handleDataChange(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                    />
                  </div>

                  {/* Nível de Dificuldade */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Nível de Dificuldade
                    </label>
                    <SelectTyped
                      vect={['baixo', 'medio', 'alto']}
                      value={formData.nivel_dificuldade}
                      onChange={(value: any) => setFormData(prev => ({ 
                        ...prev, 
                        nivel_dificuldade: value as 'baixo' | 'medio' | 'alto'
                      }))}
                      placeholder="Selecione o nível"
                    />
                  </div>

                  {/* Hora Início */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Hora Início *
                    </label>
                    <div className="relative">
                      <FiClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="time"
                        value={formData.hora_inicio}
                        onChange={(e) => setFormData(prev => ({ ...prev, hora_inicio: e.target.value }))}
                        required
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                      />
                    </div>
                  </div>

                  {/* Hora Fim */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Hora Término *
                    </label>
                    <div className="relative">
                      <FiClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="time"
                        value={formData.hora_fim}
                        onChange={(e) => setFormData(prev => ({ ...prev, hora_fim: e.target.value }))}
                        required
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Validação de Horário */}
                {formData.turma_id && formData.disciplina && formData.hora_inicio && formData.hora_fim && (
                  <div className={`mt-4 p-3 rounded-lg ${
                    validacaoHorario.tipo === 'sucesso' ? 'bg-green-50 border border-green-200' :
                    validacaoHorario.tipo === 'aviso' ? 'bg-yellow-50 border border-yellow-200' :
                    validacaoHorario.tipo === 'erro' ? 'bg-red-50 border border-red-200' :
                    'bg-blue-50 border border-blue-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      {validacaoHorario.tipo === 'sucesso' && <FiCheckCircle className="text-green-600 mt-0.5" />}
                      {validacaoHorario.tipo === 'aviso' && <FiAlertTriangle className="text-yellow-600 mt-0.5" />}
                      {validacaoHorario.tipo === 'erro' && <FiAlertCircle className="text-red-600 mt-0.5" />}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          validacaoHorario.tipo === 'sucesso' ? 'text-green-800' :
                          validacaoHorario.tipo === 'aviso' ? 'text-yellow-800' :
                          validacaoHorario.tipo === 'erro' ? 'text-red-800' :
                          'text-blue-800'
                        }`}>
                          {validacaoHorario.message}
                        </p>
                        {validacaoHorario.horarioCorrespondente && (
                          <button
                            type="button"
                            onClick={sincronizarComHorario}
                            className="mt-2 text-sm text-green-700 hover:text-green-900 underline"
                          >
                            Sincronizar com horário definido
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Mostrar horários disponíveis para a disciplina no dia selecionado */}
                {formData.disciplina && formData.disciplina !== 'Selecione uma disciplina' && formData.dia_semana && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Horários definidos para "{formData.disciplina}" no {formData.dia_semana}:
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {horariosDaTurma
                        .filter(h => h.disciplina === formData.disciplina && h.dia_semana === formData.dia_semana)
                        .map((horario, index) => (
                          <div 
                            key={index}
                            className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <FiClock className="text-gray-500" size={12} />
                              <span>{horario.hora_inicio} - {horario.hora_fim}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  hora_inicio: horario.hora_inicio,
                                  hora_fim: horario.hora_fim
                                }));
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Usar
                            </button>
                          </div>
                        ))}
                      {horariosDaTurma.filter(h => h.disciplina === formData.disciplina && h.dia_semana === formData.dia_semana).length === 0 && (
                        <div>
                          <p className="text-sm text-gray-500 italic mb-1">
                            Nenhum horário específico definido para esta disciplina no {formData.dia_semana}
                          </p>
                          {/* Mostrar horários em outros dias */}
                          {horariosDaTurma.filter(h => h.disciplina === formData.disciplina).length > 0 && (
                            <div className="text-xs text-gray-600">
                              <p className="font-medium">Horários em outros dias:</p>
                              {[...new Set(horariosDaTurma
                                .filter(h => h.disciplina === formData.disciplina)
                                .map(h => `${h.dia_semana}: ${h.hora_inicio} - ${h.hora_fim}`)
                              )].map((horarioStr, idx) => (
                                <div key={idx} className="ml-2">• {horarioStr}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Coluna Direita - Conteúdo e Objetivos */}
            <div className="space-y-6">
              {/* Tema e Conteúdo */}
              <div className="rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiTarget className="text-purple-600" />
                  Conteúdo da Aula
                </h3>

                {/* Tema */}
                <div className="space-y-2 mb-4">
                  <label className="block text-sm font-semibold text-gray-700">
                    Tema da Aula
                  </label>
                  <input
                    type="text"
                    value={formData.tema_aula}
                    onChange={(e) => setFormData(prev => ({ ...prev, tema_aula: e.target.value }))}
                    placeholder="Ex: Equações do 2º grau"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                  />
                </div>

                {/* Conteúdo Ministrado */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Conteúdo Ministrado
                  </label>
                  <textarea
                    value={formData.conteudo_ministrado}
                    onChange={(e) => setFormData(prev => ({ ...prev, conteudo_ministrado: e.target.value }))}
                    rows={4}
                    placeholder="Descreva o conteúdo que será ministrado nesta aula..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none bg-white"
                  />
                </div>
              </div>

              {/* Objetivos de Aprendizagem */}
              <div className="rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiTrendingUp className="text-amber-600" />
                  Objetivos de Aprendizagem
                </h3>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={novoObjetivo}
                      onChange={(e) => setNovoObjetivo(e.target.value)}
                      placeholder="Adicionar um objetivo..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addObjetivo())}
                    />
                    <button
                      type="button"
                      onClick={addObjetivo}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                    >
                      Adicionar
                    </button>
                  </div>

                  {/* Lista de Objetivos */}
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {formData.objetivos_aprendizagem.map((objetivo, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <FiCheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-gray-700">{objetivo}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeObjetivo(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FiX className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recursos Utilizados */}
              <div className="rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiFileText className="text-emerald-600" />
                  Recursos Utilizados
                </h3>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={novoRecurso}
                      onChange={(e) => setNovoRecurso(e.target.value)}
                      placeholder="Adicionar um recurso..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRecurso())}
                    />
                    <button
                      type="button"
                      onClick={addRecurso}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                      Adicionar
                    </button>
                  </div>

                  {/* Lista de Recursos */}
                  <div className="flex flex-wrap gap-2">
                    {formData.recursos_utilizados.map((recurso, index) => (
                      <div key={index} className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full border">
                        <span className="text-sm text-gray-700">{recurso}</span>
                        <button
                          type="button"
                          onClick={() => removeRecurso(index)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <FiX className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Observações (Full Width) */}
          <div className="mt-6">
            <div className="rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiMessageSquare className="text-blue-600" />
                Observações do Professor
              </h3>
              <textarea
                value={formData.observacoes_professor}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes_professor: e.target.value }))}
                rows={3}
                placeholder="Adicione observações sobre a aula, pontos importantes, etc..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none bg-white"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {formData.turma_id && formData.disciplina && (
                <div className={`flex items-center gap-2 ${
                  validacaoHorario.tipo === 'sucesso' ? 'text-green-600' :
                  validacaoHorario.tipo === 'aviso' ? 'text-yellow-600' :
                  validacaoHorario.tipo === 'erro' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    validacaoHorario.tipo === 'sucesso' ? 'bg-green-500' :
                    validacaoHorario.tipo === 'aviso' ? 'bg-yellow-500' :
                    validacaoHorario.tipo === 'erro' ? 'bg-red-500' : 'bg-gray-500'
                  }`}></div>
                  <span>{validacaoHorario.message || 'Turma e disciplina selecionadas'}</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !validarHorarioCompleto()}
                className={`px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                  validacaoHorario.tipo === 'erro' 
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                    : validacaoHorario.tipo === 'aviso'
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Salvando...
                  </>
                ) : validacaoHorario.tipo === 'erro' ? (
                  'Continuar com Conflito'
                ) : validacaoHorario.tipo === 'aviso' ? (
                  'Continuar Fora do Horário'
                ) : isEditing ? (
                  'Atualizar Aula'
                ) : (
                  'Criar Aula'
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
};
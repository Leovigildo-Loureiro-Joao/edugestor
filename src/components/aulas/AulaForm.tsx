import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiBook, FiCalendar, FiClock, FiUsers, FiX, 
  FiTarget, FiCheckCircle, FiAlertCircle, FiEdit3,
  FiMessageSquare, FiTrendingUp, FiFileText
} from 'react-icons/fi';
import { FaChalkboardTeacher, FaGraduationCap } from 'react-icons/fa';
import { SelectTyped } from '../students/StudentForm';
import { turmaService } from '../../services/database/turmas';
import { cursosService } from '../../services/database/curso';

interface AulaFormProps {
  aula: any;
  turmas: any[];
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const AulaForm = ({ aula, turmas, onSubmit, onCancel, loading = false }: AulaFormProps) => {
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
    observacoes_professor: ''
  });

  const [disciplinas, setDisciplinas] = useState<string[]>(['Selecione uma disciplina']);
  const [novoObjetivo, setNovoObjetivo] = useState('');
  const [novoRecurso, setNovoRecurso] = useState('');
  const [turmaSelecionada, setTurmaSelecionada] = useState<any>(null);

  // Inicializar formData quando aula muda
  useEffect(() => {
    if (aula) {
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
        observacoes_professor: aula.observacoes_professor || ''
      });

      // Carregar disciplinas se já houver turma
      if (aula.turma_id) {
        carregarDisciplinas(aula.turma_id);
      }
    } else {
      // Reset para novo formulário
      setFormData({
        turma_id: '',
        disciplina: '',
        data_aula: new Date().toISOString().split('T')[0],
        hora_inicio: '08:00',
        hora_fim: '09:30',
        conteudo_ministrado: '',
        tema_aula: '',
        status: 'planeada',
        objetivos_aprendizagem: [],
        recursos_utilizados: [],
        nivel_dificuldade: 'medio',
        observacoes_professor: ''
      });
    }
  }, [aula]);

  const carregarDisciplinas = async (turmaId: string) => {
    try {
      const turma = await turmaService.findById(turmaId);
      if (turma?.curso_id) {
        const curso = await cursosService.getCourseById(turma.curso_id);
        const disciplinasCurso = curso?.disciplinas || [];
        setDisciplinas(['Selecione uma disciplina', ...disciplinasCurso]);
        setTurmaSelecionada(turma);
      }
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
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
    } else {
      setDisciplinas(['Selecione uma disciplina']);
      setTurmaSelecionada(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!formData.turma_id) {
      alert('Selecione uma turma');
      return;
    }
    
    if (!formData.disciplina || formData.disciplina === 'Selecione uma disciplina') {
      alert('Selecione uma disciplina');
      return;
    }
    
    if (!formData.data_aula) {
      alert('Selecione uma data');
      return;
    }
    
    if (!formData.hora_inicio || !formData.hora_fim) {
      alert('Defina o horário da aula');
      return;
    }

    // Verificar se hora_fim é depois de hora_inicio
    const inicio = new Date(`2000-01-01T${formData.hora_inicio}`);
    const fim = new Date(`2000-01-01T${formData.hora_fim}`);
    if (fim <= inicio) {
      alert('A hora de término deve ser após a hora de início');
      return;
    }

    onSubmit(formData);
  };

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
              <div className=" rounded-xl p-4">
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
                    onChange={(value:any) => handleTurmaChange(
                      turmas.find(t => t.label === value)?.value || ''
                    )}
                    placeholder="Selecione a turma"
                  />
                  
                  {/* Info da turma selecionada */}
                  {turmaSelecionada && (
                    <div className="mt-2 text-sm text-gray-600 bg-white p-2 rounded-lg">
                      <div><strong>Curso:</strong> {turmaSelecionada.curso_nome}</div>
                      <div><strong>Professor:</strong> {turmaSelecionada.professor || 'Não definido'}</div>
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
                    onChange={(value:any) => setFormData(prev => ({ ...prev, disciplina: value }))}
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
              <div className=" rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiCalendar className="text-green-600" />
                  Data e Horário
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Data */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Data da Aula *
                    </label>
                    <div className="relative">
                      <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        value={formData.data_aula}
                        onChange={(e) => setFormData(prev => ({ ...prev, data_aula: e.target.value }))}
                        required
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                      />
                    </div>
                  </div>

                  {/* Nível de Dificuldade */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Nível de Dificuldade
                    </label>
                    <SelectTyped
                      vect={['baixo', 'medio', 'alto']}
                      value={formData.nivel_dificuldade}
                      onChange={(value:any) => setFormData(prev => ({ 
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
              </div>
            </div>

            {/* Coluna Direita - Conteúdo e Objetivos */}
            <div className="space-y-6">
              {/* Tema e Conteúdo */}
              <div className=" rounded-xl p-4">
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
              <div className=" rounded-xl p-4">
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
              <div className=" rounded-xl p-4">
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
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Turma e disciplina selecionadas</span>
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
                disabled={loading}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Salvando...
                  </>
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
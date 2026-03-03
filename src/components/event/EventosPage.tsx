// pages/EventosPage
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiCalendar, 
  FiClock, 
  FiMapPin,
  FiTag,
  FiAlertCircle,
  FiUsers,
  FiFileText,
  FiArrowLeft,
  FiTarget,
  FiCheckCircle,
  FiEdit3,
  FiTrash2,
  FiPlus,
  FiSearch,
  FiFilter,
  FiBarChart2,
  FiEye,
  FiList,
  FiGrid,
  FiDownload,
  FiPrinter,
  FiShare2,
  FiRefreshCw
} from 'react-icons/fi';
import { EventFormData } from '../../types/eventos';
import { eventoService } from '../../services/database/eventoService';
import { estrategiaService } from '../../services/database/estrategiaService';
import { generateUniqueId } from '../../utils/idGenarator';
import { useAlert } from '../ui/AlertBadge';
import { useConfirmModal } from '../ui/ComfirmModal';

const EventosPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;
    const { confirm, ModalComponent } = useConfirmModal();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<EventFormData[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventFormData[]>([]);
  const [metas, setMetas] = useState<any[]>([]);
  const [loadingMetas, setLoadingMetas] = useState(true);
  const [participantInput, setParticipantInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterImportance, setFilterImportance] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'upcoming'>('list');
  const [selectedEvent, setSelectedEvent] = useState<EventFormData | null>(null);
  const { showAlert } = useAlert(); 
  const {date}=useParams();
  // Form states
  const [formData, setFormData] = useState<EventFormData>({
    id:generateUniqueId(),
    title: '',
    date: date?date.split('T')[0]:new Date().toISOString().split('T')[0],
    time: '08:00',
    location: '',
    type: 'event',
    description: '',
    participants: [],
    duration: '60',
    importance: 'medium',
    meta_id: '',
    meta_titulo: '',
    objetivo_evento: ''
  });
  
  
  // Carregar dados
  useEffect(() => {
    loadData();
  }, []);
  
  // Carregar evento específico se for edição
  useEffect(() => {
    if (isEditMode && id) {
      loadEventForEdit(id);
    }
  }, [id, isEditMode]);
  
  // Filtrar eventos
  useEffect(() => {
    let result = events;
    
    if (searchTerm) {
      result = result.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.participants.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (filterType !== 'all') {
      result = result.filter(event => event.type === filterType);
    }
    
    if (filterImportance !== 'all') {
      result = result.filter(event => event.importance === filterImportance);
    }
    
    if (viewMode === 'upcoming') {
      const today = new Date();
      result = result.filter(event => new Date(event.date) >= today);
    }
    
    setFilteredEvents(result);
  }, [events, searchTerm, filterType, filterImportance, viewMode]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      const [eventsData, metasData] = await Promise.all([
        eventoService.listarEventos(),
        estrategiaService.getMetas()
      ]);
      
      setEvents(eventsData);
      setMetas(metasData);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
      setLoadingMetas(false);
    }
  };
  
  const loadEventForEdit = async (eventId: string) => {
    try {
      setLoading(true);
      const evento = await eventoService.listarEventoPorId(eventId);
      if (evento) {
        setFormData({
          ...evento,
          date: evento.date ? new Date(evento.date).toISOString().split('T')[0] : ''
        });
        setSelectedEvent(evento);
      }
    } catch (error) {
      console.error('Erro ao carregar evento:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      showAlert({
        type: 'warning',
        title: 'Preencha todos campos obrigatórios',
        message: 'Título é obrigatório',
        duration: 3000
      });
      return;
    }

    setSaving(true);
    try {
      if (isEditMode && id) {
        const updatedEvent = await eventoService.atualizarEvento(id, formData);
        setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
        showAlert({
          type: 'success',
          title: 'Operação concluída',
          message: 'Evento atualizado com sucesso!',
          duration: 3000
        });
      } else {
        const newEvent = await eventoService.criarEvento(formData);
        setEvents(prev => [newEvent, ...prev]);
        showAlert({
          type: 'success',
          title: 'Operação concluída',
          message: 'Evento criado com sucesso!',
          duration: 3000
        });
      }

      navigate('/eventos');
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Erro ao salvar o evento',
        message: 'Não foi possivel efectuar a operação',
        duration: 5000
      });
      console.error('Erro ao salvar evento:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    await confirm({
      type: 'delete',
      title: 'Excluir Evento',
      message: `'Tem certeza que deseja excluir este evento?'`,
      isDestructive: true,
      confirmText: 'Excluir',
      onConfirm: async () => {
        try {
          await eventoService.deletarEvento(eventId.toString());
          setEvents(prev => prev.filter(e => e.id !== eventId));
          showAlert({
            type: 'success',
            title: 'Operação concluída',
            message: 'Evento excluído com sucesso!',
            duration: 3000
          });
        } catch (error) {
          console.error('Erro ao excluir evento:', error);
          showAlert({
            type: 'error',
            title: 'Erro ao excluir evento',
            message: 'Não foi possivel efectuar a operação',
            duration: 5000
          });
        }
      }
    });
  };
  
  const handleDuplicateEvent = (event: EventFormData) => {
    const duplicatedEvent = {
      ...event,
      title: `${event.title} (CÓPIA)`
    };
    
    setFormData(duplicatedEvent);
    setSelectedEvent(duplicatedEvent);
    // Remover parâmetro de URL se existir
    navigate('/eventos/novo');
  };
  
  const addParticipant = () => {
    if (participantInput.trim()) {
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, participantInput.trim()]
      }));
      setParticipantInput('');
    }
  };
  
  const removeParticipant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter((_, i) => i !== index)
    }));
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Configurações
  const eventTypes = [
    { value: 'event', label: 'Evento Geral', color: 'bg-blue-100 text-blue-800' },
    { value: 'academic', label: 'Acadêmico', color: 'bg-purple-100 text-purple-800' },
    { value: 'meeting', label: 'Reunião', color: 'bg-green-100 text-green-800' },
    { value: 'holiday', label: 'Feriado/Folga', color: 'bg-red-100 text-red-800' },
    { value: 'exam', label: 'Avaliação', color: 'bg-orange-100 text-orange-800' },
    { value: 'other', label: 'Outro', color: 'bg-gray-100 text-gray-800 dark:text-gray-100' }
  ];
  
  const importanceLevels = [
    { value: 'low', label: 'Baixa', color: 'bg-green-100 text-green-800' },
    { value: 'medium', label: 'Média', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: 'Alta', color: 'bg-red-100 text-red-800' }
  ];
  
  const durationPresets = [
    { label: '30 min', value: '30' },
    { label: '1 hora', value: '60' },
    { label: '1.5 horas', value: '90' },
    { label: '2 horas', value: '120' },
    { label: '3 horas', value: '180' },
    { label: 'Meio dia (4h)', value: '240' },
    { label: 'Dia inteiro (8h)', value: '480' },
    { label: 'Customizado', value: 'custom' }
  ];
  
  const formatarDuracao = (minutos: number): string => {
    if (minutos < 60) return `${minutos}min`;
    const horas = Math.floor(minutos / 60);
    const minsRestantes = minutos % 60;
    return minsRestantes === 0 ? `${horas}h` : `${horas}h${minsRestantes}min`;
  };
  
  // Estatísticas
  const estatisticas = {
    total: events.length,
    hoje: events.filter(e => new Date(e.date).toDateString() === new Date().toDateString()).length,
    proximos7Dias: events.filter(e => {
      const eventDate = new Date(e.date);
      const hoje = new Date();
      const seteDias = new Date();
      seteDias.setDate(hoje.getDate() + 7);
      return eventDate >= hoje && eventDate <= seteDias;
    }).length,
    comMeta: events.filter(e => e.meta_id).length
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-6 py-8">
          <button
            onClick={() => navigate('/estrategia/eventos')}
            className="flex items-center font-semibold text-blue-100 hover:text-white mb-6"
          >
            <FiArrowLeft className="mr-2" />
            Voltar
          </button>
        <ModalComponent/>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                {isEditMode ? ' Editar Evento' : ' Novo Evento'}
              </h1>
              <p className="text-sm sm:text-base text-blue-100">
                {isEditMode 
                  ? 'Atualize os detalhes do evento' 
                  : 'Crie um novo evento para o calendário do centro'}
              </p>
            </div>
            
            {!isEditMode && (
              <div className="mt-4 md:mt-0 flex space-x-3">
                <button
                  onClick={() => navigate('/estrategia/eventos')}
                  className="px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 rounded-lg font-medium hover:bg-blue-50"
                >
                  <FiList className="inline mr-2" />
                  Ver Todos
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
                >
                  <FiPrinter className="inline mr-2" />
                  Imprimir
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Conteúdo Principal */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulário */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="border-b p-6">
                <h2 className="text-lg sm:text-xl font-bold flex items-center">
                  <FiCalendar className="mr-2" />
                  Detalhes do Evento
                </h2>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-6">
                  {/* Título */}
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                      Título do Evento *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      required
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: Reunião de Pais, Prova Trimestral, Workshop de Matemática"
                    />
                  </div>
                  
                  {/* Data e Hora */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2 flex items-center">
                        <FiCalendar className="mr-2" />
                        Data *
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        required
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2 flex items-center">
                        <FiClock className="mr-2" />
                        Hora *
                      </label>
                      <input
                        type="time"
                        name="time"
                        value={formData.time}
                        onChange={handleChange}
                        required
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Local e Duração */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2 flex items-center">
                        <FiMapPin className="mr-2" />
                        Local
                      </label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Sala 1, Auditório, Online..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                        Duração
                      </label>
                      <select
                        name="duration"
                        value={formData.duration}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {durationPresets.map(preset => (
                          <option key={preset.value} value={preset.value}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                      {formData.duration && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Duração: {formatarDuracao(parseInt(formData.duration))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Tipo e Importância */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2 flex items-center">
                        <FiTag className="mr-2" />
                        Tipo de Evento
                      </label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {eventTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2 flex items-center">
                        <FiAlertCircle className="mr-2" />
                        Prioridade
                      </label>
                      <select
                        name="importance"
                        value={formData.importance}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {importanceLevels.map(level => (
                          <option key={level.value} value={level.value}>
                            {level.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Meta Relacionada */}
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2 flex items-center">
                      <FiTarget className="mr-2" />
                      Meta Estratégica Relacionada
                    </label>
                    <select
                      value={formData.meta_id || ''}
                      onChange={(e) => {
                        const metaSelecionada = metas.find(m => m.id === e.target.value);
                        setFormData({
                          ...formData,
                          meta_id: e.target.value,
                          meta_titulo: metaSelecionada?.titulo || ''
                        });
                      }}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={loadingMetas}
                    >
                      <option value="">Nenhuma meta específica</option>
                      {metas.map(meta => (
                        <option key={meta.id} value={meta.id}>
                          {meta.titulo.length > 50 
                            ? `${meta.titulo.substring(0, 50)}...` 
                            : meta.titulo}
                        </option>
                      ))}
                    </select>
                    
                    {formData.meta_id && (
                      <div className="mt-3">
                        <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                          Objetivo deste evento
                        </label>
                        <textarea
                          name="objetivo_evento"
                          value={formData.objetivo_evento}
                          onChange={handleChange}
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-24"
                          placeholder="Como este evento contribui para a meta? (Ex: Avaliar progresso, treinar professores, engajar pais...)"
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Participantes */}
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2 flex items-center">
                      <FiUsers className="mr-2" />
                      Participantes
                    </label>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={participantInput}
                        onChange={(e) => setParticipantInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addParticipant())}
                        className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg"
                        placeholder="Nome do participante"
                      />
                      <button
                        type="button"
                        onClick={addParticipant}
                        className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      >
                        Adicionar
                      </button>
                    </div>
                    
                    {formData.participants.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.participants.map((participant, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full"
                          >
                            <span>{participant}</span>
                            <button
                              type="button"
                              onClick={() => removeParticipant(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Descrição */}
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2 flex items-center">
                      <FiFileText className="mr-2" />
                      Descrição
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={4}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Detalhes sobre o evento, observações importantes, materiais necessários..."
                    />
                  </div>
                  
                  {/* Botões */}
                  <div className="flex justify-between items-center pt-6 border-t">
                    <div className="text-gray-600 dark:text-gray-400 text-sm">
                      <FiAlertCircle className="inline mr-2" />
                      Campos com * são obrigatórios
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => navigate('/estrategia/eventos')}
                        className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:bg-gray-900"
                        disabled={saving}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-800 flex items-center disabled:opacity-50"
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Salvando...
                          </>
                        ) : (
                          <>
                            <FiCheckCircle className="mr-2" />
                            {isEditMode ? 'Atualizar Evento' : 'Criar Evento'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Estatísticas */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
                <FiBarChart2 className="mr-2" />
                Estatísticas
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Total de Eventos</span>
                  <span className="font-bold text-2xl">{estatisticas.total}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Eventos Hoje</span>
                  <span className="font-bold text-blue-600">{estatisticas.hoje}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Próximos 7 Dias</span>
                  <span className="font-bold text-green-600">{estatisticas.proximos7Dias}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Com Meta</span>
                  <span className="font-bold text-purple-600">{estatisticas.comMeta}</span>
                </div>
              </div>
            </div>
            
            {/* Ações Rápidas */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Ações Rápidas</h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/eventos/novo')}
                  className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center"
                >
                  <FiPlus className="mr-2" />
                  Novo Evento
                </button>
                
                <button
                  onClick={loadData}
                  className="w-full px-4 py-3 bg-gray-100 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 flex items-center justify-center"
                >
                  <FiRefreshCw className="mr-2" />
                  Atualizar Lista
                </button>
                
                {isEditMode && selectedEvent && (
                  <>
                    <button
                      onClick={() => handleDuplicateEvent(selectedEvent)}
                      className="w-full px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center justify-center"
                    >
                      <FiPlus className="mr-2" />
                      Duplicar Evento
                    </button>
                    
                    <button
                      onClick={() => selectedEvent.id && handleDeleteEvent(selectedEvent.id)}
                      className="w-full px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center justify-center"
                    >
                      <FiTrash2 className="mr-2" />
                      Excluir Evento
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {/* Meta Relacionada (se houver) */}
            {formData.meta_id && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-xl p-6 border border-blue-200">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
                  <FiTarget className="mr-2 text-blue-600" />
                  Meta Relacionada
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Meta</div>
                    <div className="font-medium">{formData.meta_titulo}</div>
                  </div>
                  
                  {formData.objetivo_evento && (
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Objetivo do Evento</div>
                      <div className="text-sm">{formData.objetivo_evento}</div>
                    </div>
                  )}
                  
                  <button
                    onClick={() => navigate(`/estrategia/metas/${formData.meta_id}`)}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <FiEye className="mr-1" />
                    Ver detalhes da meta
                  </button>
                </div>
              </div>
            )}
            
            {/* Pré-visualização */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Pré-visualização</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Data:</span>
                  <span className="font-medium">
                    {new Date(formData.date).toLocaleDateString('pt-AO')}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Hora:</span>
                  <span className="font-medium">{formData.time}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Duração:</span>
                  <span className="font-medium">
                    {formatarDuracao(parseInt(formData.duration))}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Tipo:</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    eventTypes.find(t => t.value === formData.type)?.color || 'bg-gray-100'
                  }`}>
                    {eventTypes.find(t => t.value === formData.type)?.label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventosPage;

import React, { useState, useEffect } from 'react';
import { 
  FiCalendar, 
  FiClock, 
  FiMapPin,
  FiX,
  FiTag,
  FiAlertCircle,
  FiUsers,
  FiFileText
} from 'react-icons/fi';
import { EventFormData } from '../../types/eventos';
import { eventoService } from '../../services/database/eventoService';

 interface EventModalFormProps {
  event?: EventFormData|null;
  isOpen: boolean;
  date?: string;
  onClose: () => void;
  onSubmit: (eventData: EventFormData) => void;
  mode?: 'create' | 'edit';
}





const EventModalForm: React.FC<EventModalFormProps> = ({ 
  event,
  date,
  isOpen, 
  onClose,
  onSubmit,
  mode = 'create'
}) => {
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    date: '',
    time: '',
    location: '',
    type: 'event',
    description: '',
    participants: [],
    duration: '60',
    importance: 'medium'
  });

  const [participantInput, setParticipantInput] = useState('');

  // Preencher formulário se estiver editando
  useEffect(() => {
    if (event) {
      setFormData({
        ...event,
        date: event.date ? new Date(event.date).toISOString().split('T')[0] : ''
      });
    } else {
      // Reset para novo evento
      setFormData({
        title: '',
        date: new Date().toISOString().split('T')[0],
        time: '08:00',
        location: '',
        type: 'event',
        description: '',
        participants: [],
        duration: '60',
        importance: 'medium'
      });
    }
  }, [event, mode]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

  const handleSubmit = (e: React.FormEvent) => {
    formData.date = date || formData.date;
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const eventTypes = [
    { value: 'event', label: 'Evento Geral', icon: '📅' },
    { value: 'academic', label: 'Acadêmico', icon: '📚' },
    { value: 'meeting', label: 'Reunião', icon: '👥' },
    { value: 'holiday', label: 'Feriado/Folga', icon: '🏖️' },
    { value: 'exam', label: 'Avaliação', icon: '📝' },
    { value: 'other', label: 'Outro', icon: '🔖' }
  ];

  const importanceLevels = [
    { value: 'low', label: 'Baixa', color: 'text-green-600' },
    { value: 'medium', label: 'Média', color: 'text-yellow-600' },
    { value: 'high', label: 'Alta', color: 'text-red-600' }
  ];

  // 1. Manter minutos internamente (para cálculos)
// 2. Mostrar formato legível
// 3. Adicionar opções rápidas

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

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-300">
          {/* Cabeçalho */}
          <div className="p-6 border-b dark:border-gray-700">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                  <span className="text-xl">{eventTypes.find(t => t.value === formData.type)?.icon || '📅'}</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {mode === 'create' ? 'Criar Novo Evento' : 'Editar Evento'}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Preencha os detalhes do evento
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-150px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Coluna 1 */}
              <div className="space-y-4">
                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Título do Evento *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="Ex: Reunião de Pais, Prova Trimestral, Evento Escolar"
                  />
                </div>

                {/* Data e Hora */}
                <div className="grid grid-cols-2 gap-4">
                 
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <FiClock className="inline mr-1" /> Hora *
                    </label>
                    <input
                      type="time"
                      name="time"
                      value={formData.time}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
     
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <FiMapPin className="inline mr-1" /> Local
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Sala, Auditório, Online..."
                    />
                  </div>
                </div>

                {/* Tipo e Importância */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <FiTag className="inline mr-1" /> Tipo
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {eventTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <FiAlertCircle className="inline mr-1" /> Prioridade
                    </label>
                    <select
                      name="importance"
                      value={formData.importance}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {importanceLevels.map(level => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Coluna 2 */}
              <div className="space-y-4">
                {/* Localização e Duração */}
                

                {/* Participantes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <FiUsers className="inline mr-1" /> Participantes (opcional)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={participantInput}
                      onChange={(e) => setParticipantInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addParticipant())}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Nome do participante"
                    />
                    <button
                      type="button"
                      onClick={addParticipant}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  
                  {formData.participants.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.participants.map((participant, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full"
                        >
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {participant}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeParticipant(index)}
                            className="ml-1 text-gray-500 hover:text-red-500"
                          >
                            <FiX className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Descrição */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <FiFileText className="inline mr-1" /> Descrição (opcional)
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    placeholder="Detalhes sobre o evento, observações importantes..."
                  />
                </div>
              </div>
            </div>
             <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Duração
                    </label>
                    
                    {/* Opções rápidas */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {durationPresets.map(preset => (
                        <button
                          type="button"
                          key={preset.value}
                          onClick={() => setFormData(prev => ({ ...prev, duration: preset.value }))}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            formData.duration === preset.value
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Input customizado (mostrar apenas se selecionar custom) */}
                    {(formData.duration === 'custom' || !durationPresets.find(p => p.value === formData.duration)) && (
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Duração customizada
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <input
                                type="range"
                                min="15"
                                max="480"
                                step="15"
                                value={formData.duration}
                                onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                              />
                              <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>15min</span>
                                <span>8h</span>
                              </div>
                            </div>
                            <div className="w-24">
                              <input
                                type="number"
                                value={formData.duration}
                                onChange={handleChange}
                                name="duration"
                                min="15"
                                max="480"
                                step="15"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-center"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="text-lg font-semibold text-primary-600 min-w-[80px]">
                          {formatarDuracao(parseInt(formData.duration))}
                        </div>
                      </div>
                    )}
                  </div>      
            {/* Botões de ação */}
            <div className="flex justify-end gap-3 mt-2 pt-2 border-t dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                {mode === 'create' ? 'Criar Evento' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default EventModalForm;
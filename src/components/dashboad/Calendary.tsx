import { JSX, useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from 'framer-motion';
import { FiBookOpen, FiCalendar, FiDollarSign, FiMapPin, FiPlus, FiUsers, FiClock as FiTime, FiFlag, FiEdit, FiTrash, FiEye } from "react-icons/fi";
import { eventoService } from "../../services/database/eventoService";
import { EventFormData } from "../../types/eventos";
import Holidays from 'date-holidays';
import { IconType } from "react-icons";
import EventModalForm from "../event/EventosPage";
import { useAlert } from "../ui/AlertBadge";
import { useConfirmModal } from "../ui/ComfirmModal";

// Adicione este tipo
type ModalMode = 'list' | 'view' | 'edit' | 'create';
export const CalendarWithEvents = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<EventFormData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const { confirm, ModalComponent } = useConfirmModal();
  const [selectedEvent, setSelectedEvent] = useState<EventFormData | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('list'); // Nova state para controlar o modo
  const [loading, setLoading] = useState<boolean>(false);
  const currentYear = currentDate.getFullYear();
  const { showAlert } = useAlert(); 

  // Inicializar date-holidays para Angola
  const hd = useMemo(() => {
    try {
      const holidays = new Holidays('AO');
      holidays.setLanguages(['pt']);
      return holidays;
    } catch (error) {
      
      console.error('Erro ao inicializar date-holidays:', error);
       showAlert({
          title:"Erro ao inicializar date-holidays",
          type:"error",
          duration:5000,
          message:"Não foi possivel aceder aos feriados"
        })
      return null;
    }
  }, []);

  const getMetaBadge = (metaId?: string, metaTitulo?: string) => {
    if (!metaId) return null;
    
    const cores = ['bg-blue-100', 'bg-green-100', 'bg-purple-100', 'bg-orange-100', 'bg-pink-100'];
    const cor = cores[parseInt(metaId.charAt(metaId.length - 1)) % cores.length];
    
    return (
      <span className={`text-xs ${cor} text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full ml-2`}>
        📊 {metaTitulo?.substring(0, 15)}...
      </span>
    );
  };


  // Obter feriados para o ano atual
  const feriadosAngola = useMemo((): EventFormData[] => {
    if (!hd) return [];

    try {
      const holidays = hd.getHolidays(currentYear);
      
      return holidays.map((holiday: any, index: number) => {
        const holidayDate = holiday.date instanceof Date 
          ? holiday.date 
          : new Date(holiday.date);
          
        return {
          id: -(index + 1000)+"",
          title: holiday.name,
          date: holidayDate.toISOString().split('T')[0],
          time: '00:00',
          location: 'Angola',
          type: 'holiday',
          description: holiday.name + (holiday.type ? ` (${holiday.type})` : ''),
          participants: [],
          duration: 'Dia inteiro',
          importance: 'high'
        };
      });
    } catch (error) {
       showAlert({
          title:"Erro ao carregar feriados",
          type:"warning",
          duration:5000,
          message:"Não foi possivel aceder aos feriados"
        })
      console.warn('Não foi possível carregar feriados:', error);
      return [];
    }
  }, [hd, currentYear]);

  // Função para combinar eventos do usuário + feriados
  const getAllEvents = useMemo((): EventFormData[] => {
    const eventosUsuario = events.filter(e => e.id);
    return [...eventosUsuario, ...feriadosAngola];
  }, [events, feriadosAngola]);

  // Verificar se uma data é feriado
  const isHolidayDate = (date: Date): boolean => {
    if (!hd) return false;
    
    try {
      const dateStr = date.toISOString().split('T')[0];
      return feriadosAngola.some(feriado => feriado.date === dateStr);
    } catch (error) {
      return false;
    }
  };

  const handleCreateEvent = (): void => {
    setSelectedEvent(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditEvent = (event: EventFormData): void => {
    if (event.id) {
      showAlert({
          type: 'error',
          title: 'Feriados nacionais não podem ser editados.',
          message: 'Não foi possível editar o evento '+event.title,
          duration: 5000
        });
      return;
    }
    setSelectedEvent(event);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleViewEvent = (event: EventFormData): void => {
    setSelectedEvent(event);
    setModalMode('view');
  };

  const handleBackToList = (): void => {
    setSelectedEvent(null);
    setModalMode('list');
  };

  const SaveEvent = async (eventData: EventFormData, mode: 'create' | 'edit'): Promise<EventFormData> => {
    if (mode === 'create') {
      return await eventoService.criarEvento(eventData);
    } else {
      if (!eventData.id) throw new Error('Event ID is required for updating an event.');
      return await eventoService.atualizarEvento(eventData.id.toString(), eventData);
    }
  };

  const handleEventSubmit = (eventData: EventFormData): void => {
    SaveEvent(eventData, selectedEvent ? 'edit' : 'create')
      .then((savedEvent) => {
        if (selectedEvent) {
          setEvents(prevEvents => prevEvents.map(ev => ev.id === savedEvent.id ? savedEvent : ev));
        } else {
          setEvents(prevEvents => [...prevEvents, savedEvent]);
        }
        setModalMode('list');
        setIsModalOpen(false);
        setSelectedEvent(null);
      })
      .catch((error) => {
        console.error('Erro ao salvar o evento:', error);
      });
  };

  const handleDeleteEvent = async (eventId: string) => {
      const confirmed = await confirm({
          type: 'delete',
          title: 'Excluir Evento',
          message: `Tem certeza que deseja remover este evento?`,
          isDestructive: true,
          confirmText: 'Excluir',
          onConfirm: async () => {
            try {
              const eve=events.find(s => s.id === eventId)
              await eventoService.deletarEvento(eventId);
              setEvents(prev => prev.filter(s => s.id !== eventId));
              setModalMode('list');
              setSelectedEvent(null);
              showAlert({ type: 'success', title: 'Aula excluída com sucesso!' });
              showAlert({
                type: 'success',
                title: 'Evento excluido com sucesso!',
                message: `Evento ${eve?.title} foi removido do sistema`,
                duration: 3000
              });
              
            } catch (error) {
              showAlert({
                type: 'error',
                title: 'Erro ao excluir',
                message: 'Não foi possível excluir o evento. Verifique sua conexão.',
                duration: 5000
              });
            }
          }
        });
  };

  const buscarEventos = async (): Promise<void> => {
    setLoading(true);
    try {
      const eventos = await eventoService.listarEventos();
      setEvents(eventos);
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscarEventos();
  }, []);

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction: number): void => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  };

  const getEventsForDate = (date: Date): EventFormData[] => {
    const dateStr = date.toISOString().split('T')[0];
    const allEvents = getAllEvents;
    
    return allEvents.filter(event => event.date === dateStr);
  };

  const getEventTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      meeting: 'bg-blue-100 text-blue-800 border-blue-200',
      finance: 'bg-green-100 text-green-800 border-green-200',
      academic: 'bg-purple-100 text-purple-800 border-purple-200',
      event: 'bg-orange-100 text-orange-800 border-orange-200',
      holiday: 'bg-red-100 text-red-800 border-red-200',
      other: 'bg-gray-100 dark:bg-gray-700 text-gray-800 border-gray-200 dark:border-gray-700'
    };
    return colors[type] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 border-gray-200 dark:border-gray-700';
  };

  const getEventTypeIcon = (type: string): IconType => {
    const icons: Record<string, IconType> = {
      meeting: FiUsers,
      finance: FiDollarSign,
      academic: FiBookOpen,
      event: FiCalendar,
      holiday: FiFlag
    };
    return icons[type] || FiCalendar;
  };

  const renderCalendarDays = (): JSX.Element[] => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days: JSX.Element[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-18 p-1"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = getEventsForDate(date);
      const isToday = new Date().toDateString() === date.toDateString();
      const isHoliday = isHolidayDate(date);

      days.push(
        <div
          key={day}
          className={`h-18 p-1 dark:bg-gray-800 dark:border-gray-700 border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
            isToday ? 'bg-blue-50 border-blue-200' : ''
          } ${isHoliday ? 'bg-red-50 border-red-200' : ''}`}
          onClick={() => {
            setSelectedDate(date);
            setModalMode('list'); // Sempre abre em modo lista
          }}
        >
          <div className="flex justify-between items-start">
            <span className={`text-sm font-medium ${
              isToday ? 'text-blue-600' : 
              isHoliday ? 'text-red-600 font-bold' : 
              'text-gray-900 dark:text-white'
            }`}>
              {day}
              {isHoliday && ' 🏳️'}
            </span>
            {dayEvents.length > 0 && (
              <span className={`text-xs rounded-full w-4 h-4 flex items-center justify-center ${
                isHoliday ? 'bg-red-500' : 'bg-blue-500'
              } text-white`}>
                {dayEvents.length}
              </span>
            )}
          </div>
          
          <div className="mt-1 space-y-1 max-h-16 overflow-y-auto">
            {dayEvents.slice(0, 2).map((event) => {
              const EventIcon = getEventTypeIcon(event.type);
              const isAutoHoliday = event.id;
              
              return (
                <div
                  key={event.id || `${event.title}-${event.date}`}
                  className={`text-xs p-1 rounded border ${getEventTypeColor(event.type)} truncate cursor-default`}
                  title={event.title}
                  onClick={(e) => e.stopPropagation()} // Impede que clique no evento abra a modal
                >
                  <EventIcon className="inline w-3 h-3 mr-1" />
                  {event.title}
                  {isAutoHoliday && ' ⭐'}
                </div>
              );
            })}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                +{dayEvents.length - 2} mais
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const EventModal = (): JSX.Element | null => {
    if (!selectedDate) return null;
    
    const dayEvents = getEventsForDate(selectedDate);
    const isHoliday = isHolidayDate(selectedDate);
    const canAddEvent = new Date().setHours(0, 0, 0, 0) <= selectedDate.setHours(0, 0, 0, 0);

    const renderEventList = () => (
    
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {dayEvents.map(event => {
          const EventIcon = getEventTypeIcon(event.type);
          const isAutoHoliday = event.id;
          
          return (
            <div
              key={event.id}
              className={`p-3 rounded-lg border-l-4 ${getEventTypeColor(event.type)} ${
                isAutoHoliday ? 'border-l-red-500' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <EventIcon className="w-4 h-4" />
                    <h4 className="font-semibold text-sm">{event.title}</h4>
                    {isAutoHoliday && (
                      <span className="text-xs bg-red-500 text-white px-1 rounded">Feriado</span>
                    )}

                    {event.importance === 'high' && !isAutoHoliday && (
                      <span className="text-xs bg-yellow-500 text-white px-1 rounded">Alta</span>
                    )}
                     {/* BADGE DA META */}
                      {event.meta_id && getMetaBadge(event.meta_id, event.meta_titulo)}
                      
                      {event.importance === 'high' && (
                        <span className="text-xs bg-yellow-500 text-white px-1 rounded">Alta</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{event.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <FiTime className="w-3 h-3" />
                      {event.time} {event.duration && `(${event.duration} min)`}
                    </div>
                    <div className="flex items-center gap-1">
                      <FiMapPin className="w-3 h-3" />
                      {event.location}
                    </div>
                  </div>
                  {event.participants && event.participants.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Participantes:</span> {event.participants.slice(0, 3).join(', ')}
                      {event.participants.length > 3 && ` +${event.participants.length - 3}`}
                    </div>
                  )}
                  
                </div>
              </div>
              
              <div className="mt-3 flex gap-2 justify-end">
                {!isAutoHoliday && (
                  <>
                    <button
                      onClick={() => handleEditEvent(event)}
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 dark:text-white"
                    >
                      <FiEdit className="w-3 h-3" />
                      Editar
                    </button>
                    <button
                      onClick={() => event.id && handleDeleteEvent(event.id)}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800"
                    >
                      <FiTrash className="w-3 h-3" />
                      Remover
                    </button>
                  </>
                )}
              </div>
              
              {isAutoHoliday && (
                <div className="mt-2 text-xs text-green-600 font-medium">
                  ⭐ Feriado Nacional
                </div>
              )}
            </div>
          );
        })}
      </div>
    );

   

    const renderContent = () => {
      switch (modalMode) {
        case 'edit':
        case 'create':
          navigate("/eventos/add/"+selectedDate.toISOString());
          break
        case 'list':
        default:
          return loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-gray-500 dark:text-gray-400">Carregando eventos...</p>
            </div>
          ) : dayEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FiCalendar className="mx-auto text-3xl mb-2" />
              <p>
                {canAddEvent 
                  ? "Nenhum evento para esta data"
                  : "Esta data já passou, não é possível adicionar um evento"
                }
              </p>
            </div>
          ) : renderEventList();
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
        onClick={() => {
          if (modalMode === 'list') {
            setSelectedDate(null);
          } else {
            handleBackToList();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-none sm:max-w-xl h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">
                {modalMode === 'view' ? 'Detalhes do Evento' : 
                 modalMode === 'edit' ? 'Editar Evento' :
                 modalMode === 'create' ? 'Criar Novo Evento' :
                 `Eventos - ${selectedDate.toLocaleDateString('pt-AO')}`}
              </h3>
              {isHoliday && modalMode === 'list' && (
                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full mt-1 inline-block">
                  🏳️ Feriado Nacional de Angola
                </span>
              )}
            </div>
            <button
              onClick={() => {
                if (modalMode === 'list') {
                  setSelectedDate(null);
                } else {
                  handleBackToList();
                }
              }}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {renderContent()}
          </div>

          {modalMode === 'list' && (
            <div className="mt-4 pt-4 border-t flex justify-end">
              <button
                disabled={!canAddEvent}
                onClick={handleCreateEvent}
                className="disabled:bg-slate-500 disabled:cursor-not-allowed flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                <FiPlus className="w-4 h-4" />
                Novo Evento
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    );
  };

  const monthNames: string[] = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const dayNames: string[] = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="bg-white border dark:bg-gray-800 rounded-lg   border-gray-200 dark:border-gray-700 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold dark:text-white text-gray-900 dark:text-white">Calendário Académico - Angola</h3>
        <div className="flex items-center gap-4">
          <button onClick={() => navigateMonth(-1)}>‹</button>
          <span>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
          <button onClick={() => navigateMonth(1)}>›</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-white py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {loading ? (
          <div className="col-span-7 text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Carregando calendário...</p>
          </div>
        ) : (
          renderCalendarDays()
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-900">
        <h4 className="text-sm font-medium text-gray-700 mb-3 dark:text-white">Legenda</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
            <span className="dark:text-white">Reuniões</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
            <span className="dark:text-white">Financeiro</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-100 border border-purple-200 rounded"></div>
            <span className="dark:text-white">Académico</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></div>
            <span className="dark:text-white">Eventos</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
            <span className="dark:text-white">🏳️ Feriados</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded"></div>
            <span className="dark:text-white">Outros</span>
          </div>
        </div>
      </div>

      <EventModal />
      <ModalComponent/>
    </div>
  );
};

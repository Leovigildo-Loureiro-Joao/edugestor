import { useEffect, useState } from "react";
import { motion } from 'framer-motion';

import { FiBookOpen, FiCalendar, FiDollarSign, FiMapPin, FiPlus, FiUsers ,FiClock as FiTime} from "react-icons/fi";

export const CalendarWithEvents = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  // Eventos de exemplo - depois vem da API
  const sampleEvents = [
    {
      id: 1,
      title: 'Reunião de Professores',
      date: new Date(new Date().getFullYear(), new Date().getMonth(), 15),
      time: '14:00',
      location: 'Sala de Reuniões',
      type: 'meeting',
      description: 'Reunião mensal com todos os professores'
    },
    {
      id: 2,
      title: 'Pagamento de Propinas',
      date: new Date(new Date().getFullYear(), new Date().getMonth(), 5),
      time: '09:00',
      location: 'Secretaria',
      type: 'finance',
      description: 'Data limite para pagamento das propinas'
    },
    {
      id: 3,
      title: 'Prova de Matemática',
      date: new Date(new Date().getFullYear(), new Date().getMonth(), 20),
      time: '08:00',
      location: 'Sala 2',
      type: 'academic',
      description: 'Prova do 2º bimestre - Turma ALPHA'
    },
    {
      id: 4,
      title: 'Festival Cultural',
      date: new Date(new Date().getFullYear(), new Date().getMonth(), 25),
      time: '10:00',
      location: 'Pátio Principal',
      type: 'event',
      description: 'Festival cultural da escola'
    }
  ];

  useEffect(() => {
    // Simular carregamento de eventos da API
    setEvents(sampleEvents);
  }, []);

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  };

  const getEventsForDate = (date) => {
    return events.filter(event => 
      event.date.getDate() === date.getDate() &&
      event.date.getMonth() === date.getMonth() &&
      event.date.getFullYear() === date.getFullYear()
    );
  };

  const getEventTypeColor = (type) => {
    const colors = {
      meeting: 'bg-blue-100 text-blue-800 border-blue-200',
      finance: 'bg-green-100 text-green-800 border-green-200',
      academic: 'bg-purple-100 text-purple-800 border-purple-200',
      event: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getEventTypeIcon = (type) => {
    const icons = {
      meeting: FiUsers,
      finance: FiDollarSign,
      academic: FiBookOpen,
      event: FiCalendar
    };
    return icons[type] || FiCalendar;
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Dias vazios no início
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-18 p-1"></div>);
    }

    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = getEventsForDate(date);
      const isToday = new Date().toDateString() === date.toDateString();

      days.push(
        <div
          key={day}
          className={`h-18 p-1  dark:bg-gray-800 dark:border-gray-700 dark:text-white border-gray-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700  transition-colors ${
            isToday ? 'bg-blue-50 border-blue-200' : ''
          }`}
          onClick={() => setSelectedDate(date)}
        >
          <div className="flex justify-between items-start">
            <span className={`text-sm  font-medium ${
              isToday ? 'text-blue-600' : 'text-gray-900 dark:text-white'
            }`}>
              {day}
            </span>
            {dayEvents.length > 0 && (
              <span className="text-xs bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                {dayEvents.length}
              </span>
            )}
          </div>
          
          <div className="mt-1 space-y-1 max-h-16 overflow-y-auto">
            {dayEvents.slice(0, 2).map((event, index) => {
              const EventIcon = getEventTypeIcon(event.type);
              return (
                <div
                  key={event.id}
                  className={`text-xs p-1 rounded border ${getEventTypeColor(event.type)} truncate`}
                  title={event.title}
                >
                  <EventIcon className="inline w-3 h-3 mr-1" />
                  {event.title}
                </div>
              );
            })}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500 text-center">
                +{dayEvents.length - 2} mais
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const EventModal = () => {
    if (!selectedDate) return null;

    const dayEvents = getEventsForDate(selectedDate);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={() => setSelectedDate(null)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              Eventos - {selectedDate.toLocaleDateString('pt-AO')}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {dayEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FiCalendar className="mx-auto text-3xl mb-2" />
              <p>Nenhum evento para esta data</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {dayEvents.map(event => {
                const EventIcon = getEventTypeIcon(event.type);
                return (
                  <div
                    key={event.id}
                    className={`p-3 rounded-lg border-l-4 ${getEventTypeColor(event.type)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <EventIcon className="w-4 h-4" />
                          <h4 className="font-semibold text-sm">{event.title}</h4>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{event.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <FiTime className="w-3 h-3" />
                            {event.time}
                          </div>
                          <div className="flex items-center gap-1">
                            <FiMapPin className="w-3 h-3" />
                            {event.location}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setShowEventModal(true)}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <FiPlus className="w-4 h-4" />
              Novo Evento
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header do Calendário */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold dark:text-white text-gray-900">Calendário Académico</h3>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ‹
          </button>
          <span className="font-medium text-gray-900 min-w-[140px] text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button
            onClick={() => navigateMonth(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ›
          </button>
        </div>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-white py-2 dark:bg-gray-800 dark:border-gray-700">
            {day}
          </div>
        ))}
      </div>

      {/* Grid do calendário */}
      <div className="grid grid-cols-7 gap-1">
        {renderCalendarDays()}
      </div>

      {/* Legenda */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-900">
        <h4 className="text-sm font-medium text-gray-700 mb-3 dark:text-white">Legenda</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-100 border  border-blue-200 rounded"></div>
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
        </div>
      </div>

      {/* Modal de eventos */}
      <EventModal />
    </div>
  );
};
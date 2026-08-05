import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiCalendar, 
  FiChevronDown, 
  FiChevronUp,
  FiClock,
  FiBook,
  FiUsers,
  FiMapPin,
  FiCheckCircle,
  FiPlayCircle,
  FiXCircle,
  FiAlertCircle,
  FiFilter,
  FiPlus,
  FiEye,
  FiEdit,
  FiTrash,
  FiPercent,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';
import { format, startOfWeek, endOfWeek, isSameWeek, parseISO, eachWeekOfInterval, subWeeks, addWeeks, isSameMonth } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Aula } from '../../types/aula';
import { useAlert } from '../ui/AlertBadge';

interface TimelineWindowsProps {
  aulas: Aula[];
  onAulaClick?: (aula: Aula) => void;
  onEditClick?: (aula: Aula) => void;
  onDeleteClick?: (aula: Aula) => void;
  showActions?: boolean;
}

export const TimelineWindows = ({ 
  aulas, 
  onAulaClick,
  onEditClick,
  onDeleteClick,
  showActions = true 
}: TimelineWindowsProps) => {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [currentYearMonth, setCurrentYearMonth] = useState<string>('');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const { showAlert } = useAlert();

  
  const semanas = useMemo(() => {
    const grouped: Record<string, {
      weekStart: Date;
      weekEnd: Date;
      aulas: Aula[];
      weekNumber: number;
      monthYear: string;
    }> = {};

    
    const hoje = new Date();
    const startDate = subWeeks(hoje, 4);
    const endDate = addWeeks(hoje, 8);
    
    const allWeeks = eachWeekOfInterval(
      { start: startDate, end: endDate },
      { weekStartsOn: 1 }
    );

    
    allWeeks.forEach(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      const monthYear = format(weekStart, 'MMMM yyyy', { locale: pt });
      
      grouped[weekKey] = {
        weekStart,
        weekEnd,
        aulas: [],
        weekNumber: parseInt(format(weekStart, 'w')),
        monthYear
      };
    });

    
    aulas.forEach(aula => {
      try {
        const aulaDate = parseISO(aula.data_aula);
        const weekStart = startOfWeek(aulaDate, { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        
        if (grouped[weekKey]) {
          grouped[weekKey].aulas.push(aula);
        }
      } catch (error) {
        showAlert({
          title: "Erro ao processar a aula",
          type: "error",
          duration: 5000,
          message: "Contacte ao administrador para verificar suas permissões"
        });
        console.error('Erro ao processar aula:', aula, error);
      }
    });

    
    return Object.entries(grouped)
      .sort(([keyA], [keyB]) => new Date(keyB).getTime() - new Date(keyA).getTime());
  }, [aulas, showAlert]);

  
  const visibleMonths = useMemo(() => {
    return [...new Set(semanas.map(([_, data]) => data.monthYear))];
  }, [semanas]);

  
  useEffect(() => {
    if (visibleMonths.length > 0) {
      
      const hoje = new Date();
      const mesAtual = format(hoje, 'MMMM yyyy', { locale: pt });
      
      
      if (visibleMonths.includes(mesAtual)) {
        setCurrentYearMonth(mesAtual);
      } else {
        
        setCurrentYearMonth(visibleMonths[0]);
      }
    }
  }, [visibleMonths]);

  
  const toggleWeek = useCallback((weekKey: string) => {
    setExpandedWeeks(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(weekKey)) {
        newExpanded.delete(weekKey);
      } else {
        newExpanded.add(weekKey);
      }
      return newExpanded;
    });
  }, []);

  const expandAllWithAulas = useCallback(() => {
    const weeksWithAulas = semanas
      .filter(([_, data]) => data.aulas.length > 0)
      .map(([key]) => key);
    setExpandedWeeks(new Set(weeksWithAulas));
  }, [semanas]);

  const collapseAll = useCallback(() => {
    setExpandedWeeks(new Set());
  }, []);

  const formatDateRange = useCallback((start: Date, end: Date) => {
    if (format(start, 'MMM yyyy') === format(end, 'MMM yyyy')) {
      return `${format(start, 'd')} - ${format(end, 'd')} ${format(start, 'MMM yyyy', { locale: pt })}`;
    }
    return `${format(start, 'd MMM')} - ${format(end, 'd MMM yyyy', { locale: pt })}`;
  }, []);

  const getStatusConfig = useCallback((status: Aula['status']) => {
    switch(status) {
      case 'ministrada':
        return { 
          icon: <FiCheckCircle className="w-4 h-4" />,
          color: 'text-green-500',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          borderColor: 'border-green-200 dark:border-green-800',
          label: 'Ministrada'
        };
      case 'planeada':
        return { 
          icon: <FiPlayCircle className="w-4 h-4" />,
          color: 'text-blue-500',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          borderColor: 'border-blue-200 dark:border-blue-800',
          label: 'Planeada'
        };
      case 'cancelada':
        return { 
          icon: <FiXCircle className="w-4 h-4" />,
          color: 'text-red-500',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          borderColor: 'border-red-200 dark:border-red-800',
          label: 'Cancelada'
        };
      case 'adiada':
        return { 
          icon: <FiAlertCircle className="w-4 h-4" />,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          label: 'Adiada'
        };
      default:
        return { 
          icon: <FiCalendar className="w-4 h-4" />,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100 dark:bg-gray-700',
          borderColor: 'border-gray-200 dark:border-gray-600',
          label: 'Agendada'
        };
    }
  }, []);

  const isCurrentWeek = useCallback((weekStart: Date) => {
    const hoje = new Date();
    return isSameWeek(hoje, weekStart, { weekStartsOn: 1 });
  }, []);

  
  const handleAulaClick = useCallback((aula: Aula, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAulaClick) {
      onAulaClick(aula);
    }
  }, [onAulaClick]);

  
  const handleEditClick = useCallback((aula: Aula, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEditClick) {
      onEditClick(aula);
    }
  }, [onEditClick]);

  
  const handleDeleteClick = useCallback((aula: Aula, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteClick) {
      onDeleteClick(aula);
    }
  }, [onDeleteClick]);

  
  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    if (!currentYearMonth) return;
    
    const currentIndex = visibleMonths.indexOf(currentYearMonth);
    if (direction === 'prev' && currentIndex > 0) {
      setCurrentYearMonth(visibleMonths[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < visibleMonths.length - 1) {
      setCurrentYearMonth(visibleMonths[currentIndex + 1]);
    }
  }, [currentYearMonth, visibleMonths]);

  
  const filteredSemanas = useMemo(() => {
    return semanas.filter(([_, data]) => 
      !currentYearMonth || data.monthYear === currentYearMonth
    );
  }, [semanas, currentYearMonth]);

  
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Cabeçalho - Responsivo */}
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <FiCalendar className="text-blue-600 dark:text-blue-400 text-base sm:text-lg" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white">
                Timeline de Aulas
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Organizado por semanas
              </p>
            </div>
          </div>
          
          {/* Ações - Versão Desktop */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={expandAllWithAulas}
              className="px-2 lg:px-3 py-1.5 text-xs lg:text-sm bg-gray-100 dark:bg-gray-700 
                text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 
                dark:hover:bg-gray-600 transition-colors flex items-center gap-1 lg:gap-2"
            >
              <FiEye className="w-3 h-3 lg:w-4 lg:h-4" />
              <span className="hidden lg:inline">Expandir Todas</span>
              <span className="lg:hidden">Expandir</span>
            </button>
            
            <button
              onClick={collapseAll}
              className="px-2 lg:px-3 py-1.5 text-xs lg:text-sm bg-gray-100 dark:bg-gray-700 
                text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 
                dark:hover:bg-gray-600 transition-colors flex items-center gap-1 lg:gap-2"
            >
              <FiChevronUp className="w-3 h-3 lg:w-4 lg:h-4" />
              <span className="hidden lg:inline">Recolher Todas</span>
              <span className="lg:hidden">Recolher</span>
            </button>
          </div>

          {/* Botão de filtro mobile */}
          <div className="sm:hidden">
            <button
              onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 
                dark:text-gray-300 rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <FiFilter className="w-4 h-4" />
                <span className="text-sm">Filtrar por mês</span>
              </div>
              {isMobileFilterOpen ? (
                <FiChevronUp className="w-4 h-4" />
              ) : (
                <FiChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        
        {/* Filtro por mês - Desktop */}
        <div className="hidden sm:block mt-4">
          <div className="flex items-center gap-2 mb-2">
            <FiFilter className="text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Filtrar por mês:</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth('prev')}
              disabled={!currentYearMonth || visibleMonths.indexOf(currentYearMonth) === 0}
              className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 
                dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed
                hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <FiChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex-1 flex flex-wrap gap-2">
              <button
                onClick={() => setCurrentYearMonth('')}
                className={`px-2 lg:px-3 py-1.5 text-xs lg:text-sm rounded-lg transition-colors whitespace-nowrap ${
                  !currentYearMonth
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Todos
              </button>
              
              {visibleMonths.map(month => (
                <button
                  key={month}
                  onClick={() => setCurrentYearMonth(month)}
                  className={`px-2 lg:px-3 py-1.5 text-xs lg:text-sm rounded-lg transition-colors whitespace-nowrap ${
                    currentYearMonth === month
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {month}
                </button>
              ))}
            </div>

            <button
              onClick={() => navigateMonth('next')}
              disabled={!currentYearMonth || visibleMonths.indexOf(currentYearMonth) === visibleMonths.length - 1}
              className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 
                dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed
                hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filtro por mês - Mobile Expandido */}
        <AnimatePresence>
          {isMobileFilterOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="sm:hidden mt-3 overflow-hidden"
            >
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setCurrentYearMonth('');
                    setIsMobileFilterOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-sm rounded-lg text-left transition-colors ${
                    !currentYearMonth
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Todos os meses
                </button>
                
                {visibleMonths.map(month => (
                  <button
                    key={month}
                    onClick={() => {
                      setCurrentYearMonth(month);
                      setIsMobileFilterOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-sm rounded-lg text-left transition-colors ${
                      currentYearMonth === month
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {month}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Timeline */}
      <div 
        ref={timelineRef}
        className="overflow-y-auto scrollbar-thin"
        style={{ maxHeight: isMobile ? 'calc(100vh - 300px)' : 'calc(100vh - 250px)' }}
      >
        <div className="p-3 sm:p-4 lg:p-6">
          {/* Linha vertical da timeline */}
          <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-400 to-transparent opacity-30" />
          </div>

          {filteredSemanas.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <FiCalendar className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400 dark:text-gray-600 mb-2 sm:mb-3" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-1 sm:mb-2">
                Nenhuma aula encontrada
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
                Não há aulas agendadas para o período selecionado.
              </p>
              <button
                onClick={() => setCurrentYearMonth('')}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg 
                  hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium"
              >
                Ver Todos os Períodos
              </button>
            </div>
          ) : (
            filteredSemanas.map(([weekKey, weekData], index) => {
              const isExpanded = expandedWeeks.has(weekKey);
              const isCurrent = isCurrentWeek(weekData.weekStart);
              const hasAulas = weekData.aulas.length > 0;

              return (
                <motion.div
                  key={weekKey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.05, 0.5) }}
                  className="relative pl-10 sm:pl-12 pb-4 sm:pb-6 last:pb-0"
                >
                  {/* Ponto na timeline */}
                  <div className="absolute left-4 sm:left-6 top-0 z-10">
                    <div className="relative">
                      <motion.div
                        whileHover={{ scale: 1.2 }}
                        className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 sm:border-4 
                          border-white dark:border-gray-800 shadow-lg ${
                          isCurrent
                            ? 'bg-blue-500 ring-1 sm:ring-2 ring-blue-300 dark:ring-blue-700'
                            : hasAulas
                            ? 'bg-green-500'
                            : 'bg-gray-400'
                        }`}
                      />
                      {hasAulas && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 
                            rounded-full text-[10px] sm:text-xs flex items-center justify-center 
                            text-white font-bold"
                        >
                          {weekData.aulas.length}
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Card da semana */}
                  <div className={`rounded-lg border ${
                    isCurrent
                      ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50'
                  } hover:shadow-sm transition-all duration-200`}>
                    {/* Cabeçalho da semana */}
                    <button
                      onClick={() => hasAulas && toggleWeek(weekKey)}
                      className={`w-full p-3 sm:p-4 text-left flex items-center justify-between 
                        rounded-t-lg transition-colors ${
                        hasAulas ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer' : 'cursor-default'
                      }`}
                      disabled={!hasAulas}
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`p-1.5 sm:p-2 rounded-lg ${
                          isCurrent
                            ? 'bg-blue-100 dark:bg-blue-900'
                            : 'bg-gray-100 dark:bg-gray-700'
                        }`}>
                          <FiCalendar className={`w-3 h-3 sm:w-4 sm:h-4 ${
                            isCurrent
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-600 dark:text-gray-400'
                          }`} />
                        </div>
                        
                        <div>
                          <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                            {formatDateRange(weekData.weekStart, weekData.weekEnd)}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1 sm:gap-3 mt-1">
                            <span className={`text-xs sm:text-sm ${
                              isCurrent
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              Semana {weekData.weekNumber}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 
                                bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 
                                rounded-full">
                                Esta Semana
                              </span>
                            )}
                            {hasAulas && (
                              <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 
                                bg-green-100 text-green-700 dark:bg-green-900 
                                dark:text-green-300 rounded-full">
                                {weekData.aulas.length} aula{weekData.aulas.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {hasAulas && (
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className={`p-1 rounded-lg ${
                            isCurrent
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          <FiChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                        </motion.div>
                      )}
                    </button>

                    {/* Conteúdo expandido */}
                    <AnimatePresence>
                      {isExpanded && hasAulas && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="border-t border-gray-100 dark:border-gray-700 overflow-hidden"
                        >
                          <div className="p-3 sm:p-4">
                            <div className="space-y-2 sm:space-y-3">
                              {weekData.aulas.map((aula) => {
                                const statusConfig = getStatusConfig(aula.status);
                                
                                return (
                                  <motion.div
                                    key={aula.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className={`group p-2 sm:p-3 rounded-lg border ${statusConfig.borderColor} 
                                      ${statusConfig.bgColor} hover:shadow-sm transition-all duration-200 
                                      cursor-pointer`}
                                    onClick={(e) => handleAulaClick(aula, e)}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                                          <div className={statusConfig.color}>
                                            {statusConfig.icon}
                                          </div>
                                          <h4 className="text-sm sm:text-base font-medium text-gray-900 
                                            dark:text-white truncate">
                                            {aula.disciplina}
                                          </h4>
                                          <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 
                                            py-0.5 rounded-full ${statusConfig.bgColor} 
                                            ${statusConfig.color} border ${statusConfig.borderColor}`}>
                                            {statusConfig.label}
                                          </span>
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 
                                          text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1 sm:mb-2">
                                          <div className="flex items-center gap-1">
                                            <FiCalendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                            <span>
                                              {format(parseISO(aula.data_aula), 'dd/MM/yyyy', { locale: pt })}
                                            </span>
                                          </div>
                                          
                                          <div className="flex items-center gap-1">
                                            <FiClock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                            <span>
                                              {aula.hora_inicio?.slice(0, 5)} - {aula.hora_fim?.slice(0, 5)}
                                            </span>
                                          </div>
                                        </div>
                                        
                                        {aula.tema_aula && (
                                          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 
                                            line-clamp-2 mb-1 sm:mb-2">
                                            {aula.tema_aula}
                                          </p>
                                        )}
                                        
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 
                                          text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                                          <div className="flex items-center gap-1">
                                            <FiUsers className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                            <span>{aula.turmas?.nome_turma || aula.turma_id}</span>
                                          </div>
                                          {aula.taxa_participacao && (
                                            <div className="flex items-center gap-1">
                                              <span>Participação: {aula.taxa_participacao}</span>
                                              <FiPercent className="-ml-1 mb-[0.20rem] w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Ações - Versão Desktop */}
                                      {showActions && !isMobile && (
                                        <div className="ml-2 sm:ml-3 flex items-center gap-1 
                                          opacity-0 group-hover:opacity-100 transition-opacity">
                                          {onEditClick && (
                                            <button
                                              onClick={(e) => handleEditClick(aula, e)}
                                              className="p-1 sm:p-1.5 text-gray-600 dark:text-gray-400 
                                                hover:text-blue-600 dark:hover:text-blue-400 
                                                hover:bg-blue-50 dark:hover:bg-blue-900/30 
                                                rounded-lg transition-colors"
                                              title="Editar aula"
                                            >
                                              <FiEdit className="w-3 h-3 sm:w-4 sm:h-4" />
                                            </button>
                                          )}
                                          
                                          {onDeleteClick && (
                                            <button
                                              onClick={(e) => handleDeleteClick(aula, e)}
                                              className="p-1 sm:p-1.5 text-gray-600 dark:text-gray-400 
                                                hover:text-red-600 dark:hover:text-red-400 
                                                hover:bg-red-50 dark:hover:bg-red-900/30 
                                                rounded-lg transition-colors"
                                              title="Excluir aula"
                                            >
                                              <FiTrash className="w-3 h-3 sm:w-4 sm:h-4" />
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Ações - Versão Mobile */}
                                    {showActions && isMobile && (
                                      <div className="flex items-center justify-end gap-2 mt-2 pt-2 
                                        border-t border-gray-100 dark:border-gray-700">
                                        {onEditClick && (
                                          <button
                                            onClick={(e) => handleEditClick(aula, e)}
                                            className="flex-1 py-1.5 text-xs bg-blue-50 text-blue-600 
                                              dark:bg-blue-900/30 dark:text-blue-400 rounded-lg 
                                              flex items-center justify-center gap-1"
                                          >
                                            <FiEdit className="w-3 h-3" />
                                            Editar
                                          </button>
                                        )}
                                        
                                        {onDeleteClick && (
                                          <button
                                            onClick={(e) => handleDeleteClick(aula, e)}
                                            className="flex-1 py-1.5 text-xs bg-red-50 text-red-600 
                                              dark:bg-red-900/30 dark:text-red-400 rounded-lg 
                                              flex items-center justify-center gap-1"
                                          >
                                            <FiTrash className="w-3 h-3" />
                                            Excluir
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </motion.div>
                                );
                              })}
                            </div>
                            
                            {/* Rodapé da semana */}
                            <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-gray-100 dark:border-gray-700">
                              <div className="flex items-center justify-between text-xs sm:text-sm">
                                <div className="text-gray-600 dark:text-gray-400">
                                  {weekData.aulas.length} aula{weekData.aulas.length !== 1 ? 's' : ''} nesta semana
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Rodapé - Responsivo */}
      <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 
        bg-gray-50 dark:bg-gray-900/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {expandedWeeks.size} semana{expandedWeeks.size !== 1 ? 's' : ''} expandida{expandedWeeks.size !== 1 ? 's' : ''}
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-blue-500"></div>
                <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                  Esta Semana
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500"></div>
                <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                  Com Aulas
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-gray-400"></div>
                <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                  Sem Aulas
                </span>
              </div>
            </div>
            
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Total: {aulas.length} aula{aulas.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


const styles = `
  .scrollbar-thin::-webkit-scrollbar {
    width: 4px;
  }
  
  .scrollbar-thin::-webkit-scrollbar-track {
    background: #f1f1f1;
  }
  
  .scrollbar-thin::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 2px;
  }
  
  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
  
  .dark .scrollbar-thin::-webkit-scrollbar-track {
    background: #374151;
  }
  
  .dark .scrollbar-thin::-webkit-scrollbar-thumb {
    background: #4b5563;
  }
  
  .dark .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
  }
`;


if (typeof document !== 'undefined' && !document.getElementById('timeline-styles')) {
  const styleSheet = document.createElement("style");
  styleSheet.id = 'timeline-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
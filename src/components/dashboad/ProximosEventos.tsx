// components/dashboad/ProximosEventos
import React from 'react';
import { motion } from 'framer-motion';
import { FiCalendar, FiCheckCircle, FiTarget, FiBookOpen, FiClock } from 'react-icons/fi';
import { ProximoEvento } from '../../types';

interface ProximosEventosProps {
  eventos: ProximoEvento[];
}

const getIcon = (tipo: string) => {
  switch (tipo) {
    case 'evento': return FiCalendar;
    case 'tarefa': return FiCheckCircle;
    case 'meta': return FiTarget;
    case 'aula': return FiBookOpen;
    default: return FiClock;
  }
};

const getColor = (tipo: string) => {
  switch (tipo) {
    case 'evento': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30';
    case 'tarefa': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
    case 'meta': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    case 'aula': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
    default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
  }
};

export const ProximosEventos: React.FC<ProximosEventosProps> = ({ eventos }) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const hoje = new Date();
    const amanha = new Date();
    amanha.setDate(hoje.getDate() + 1);
    
    if (date.toDateString() === hoje.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === amanha.toDateString()) {
      return 'Amanhã';
    } else {
      return date.toLocaleDateString('pt-AO', { day: 'numeric', month: 'short' });
    }
  };

  return (
    <div className="space-y-3">
      {eventos.map((evento, index) => {
        const Icon = getIcon(evento.tipo);
        const colorClass = getColor(evento.tipo);
        
        return (
          <motion.div
            key={evento.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            <div className={`p-2 rounded-lg ${colorClass}`}>
              <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {evento.titulo}
              </p>
              {evento.descricao && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {evento.descricao}
                </p>
              )}
            </div>
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
              {formatDate(evento.data)}
            </div>
          </motion.div>
        );
      })}
      
      {eventos.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <FiCalendar className="mx-auto h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">Nenhum evento próximo</p>
        </div>
      )}
    </div>
  );
};
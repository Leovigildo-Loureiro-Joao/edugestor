import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronLeft, FiChevronRight, FiCalendar, FiClock, FiBook } from 'react-icons/fi';

interface CalendarioMiniProps {
  aulas: Array<{
    id: string;
    data_aula: string;
    disciplina: string;
    turmas?: {
      nome_turma: string;
    };
    status: string;
    hora_inicio?: string;
    hora_fim?: string;
  }>;
  onDiaClick?: (data: string) => void;
  onAulaClick?: (aula: any) => void;
}

export const CalendarioMini = ({ aulas, onDiaClick, onAulaClick }: CalendarioMiniProps) => {
  const [dataAtual, setDataAtual] = useState(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);

  const diasDaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  
  const mesAnterior = () => {
    setDataAtual(new Date(dataAtual.getFullYear(), dataAtual.getMonth() - 1, 1));
  };

  const mesSeguinte = () => {
    setDataAtual(new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 1));
  };

  const irParaHoje = () => {
    setDataAtual(new Date());
  };

  
  const diasDoMes = useMemo(() => {
    const ano = dataAtual.getFullYear();
    const mes = dataAtual.getMonth();
    
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    
    const dias: Array<{
      date: Date;
      dia: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      aulas: typeof aulas;
    }> = [];
    
    
    const primeiroDiaSemana = primeiroDia.getDay();
    for (let i = 0; i < primeiroDiaSemana; i++) {
      const data = new Date(ano, mes, -i);
      dias.unshift({
        date: data,
        dia: data.getDate(),
        isCurrentMonth: false,
        isToday: false,
        aulas: []
      });
    }
    
    
    for (let i = 1; i <= ultimoDia.getDate(); i++) {
      const data = new Date(ano, mes, i);
      const dataStr = data.toISOString().split('T')[0];
      const hoje = new Date().toISOString().split('T')[0];
      
      dias.push({
        date: data,
        dia: i,
        isCurrentMonth: true,
        isToday: dataStr === hoje,
        aulas: aulas.filter(aula => aula.data_aula === dataStr)
      });
    }
    
    
    const diasRestantes = 42 - dias.length; 
    for (let i = 1; i <= diasRestantes; i++) {
      const data = new Date(ano, mes + 1, i);
      dias.push({
        date: data,
        dia: data.getDate(),
        isCurrentMonth: false,
        isToday: false,
        aulas: []
      });
    }
    
    return dias;
  }, [dataAtual, aulas]);

  
  const aulasDoDiaSelecionado = useMemo(() => {
    if (!diaSelecionado) return [];
    return aulas.filter(aula => aula.data_aula === diaSelecionado);
  }, [diaSelecionado, aulas]);

  
  const estatisticasMes = useMemo(() => {
    const ano = dataAtual.getFullYear();
    const mes = dataAtual.getMonth();
    
    const aulasMes = aulas.filter(aula => {
      const data = new Date(aula.data_aula);
      return data.getFullYear() === ano && data.getMonth() === mes;
    });
    
    const porStatus = {
      planeada: aulasMes.filter(a => a.status === 'planeada').length,
      ministrada: aulasMes.filter(a => a.status === 'ministrada').length,
      adiada: aulasMes.filter(a => a.status === 'adiada').length,
      cancelada: aulasMes.filter(a => a.status === 'cancelada').length
    };
    
    return {
      total: aulasMes.length,
      ...porStatus
    };
  }, [dataAtual, aulas]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
      {/* Header do Calendário */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FiCalendar className="text-blue-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {meses[dataAtual.getMonth()]} {dataAtual.getFullYear()}
          </h3>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={mesAnterior}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <FiChevronLeft className="text-gray-600 dark:text-gray-400" />
          </button>
          
          <button
            onClick={irParaHoje}
            className="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30"
          >
            Hoje
          </button>
          
          <button
            onClick={mesSeguinte}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <FiChevronRight className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {diasDaSemana.map((dia) => (
          <div key={dia} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">
            {dia}
          </div>
        ))}
      </div>

      {/* Grid de dias */}
      <div className="grid grid-cols-7 gap-1">
        {diasDoMes.map((dia, index) => {
          const dataStr = dia.date.toISOString().split('T')[0];
          const temAula = dia.aulas.length > 0;
          const estaSelecionado = diaSelecionado === dataStr;
          
          return (
            <motion.button
              key={index}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setDiaSelecionado(dataStr);
                if (onDiaClick) onDiaClick(dataStr);
              }}
              className={`
                relative p-2 rounded-lg text-sm transition-all
                ${dia.isCurrentMonth 
                  ? 'text-gray-900 dark:text-white' 
                  : 'text-gray-400 dark:text-gray-600'
                }
                ${dia.isToday 
                  ? 'ring-2 ring-blue-500 dark:ring-blue-400' 
                  : ''
                }
                ${estaSelecionado
                  ? 'bg-blue-100 dark:bg-blue-900/30'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              <span>{dia.dia}</span>
              
              {/* Indicador de aulas */}
              {temAula && (
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                  {dia.aulas.slice(0, 3).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 h-1 rounded-full ${
                        dia.aulas[i].status === 'ministrada'
                          ? 'bg-green-500'
                          : dia.aulas[i].status === 'adiada'
                          ? 'bg-yellow-500'
                          : dia.aulas[i].status === 'cancelada'
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }`}
                    />
                  ))}
                  {dia.aulas.length > 3 && (
                    <span className="text-[8px] text-gray-500">+{dia.aulas.length - 3}</span>
                  )}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Estatísticas rápidas */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
            <span className="text-gray-500 dark:text-gray-400">Total mês</span>
            <div className="font-semibold text-gray-900 dark:text-white mt-1">
              {estatisticasMes.total} aulas
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
            <span className="text-gray-500 dark:text-gray-400">Ministradas</span>
            <div className="font-semibold text-green-600 dark:text-green-400 mt-1">
              {estatisticasMes.ministrada}
            </div>
          </div>
        </div>
      </div>

      {/* Lista de aulas do dia selecionado */}
      <AnimatePresence>
        {diaSelecionado && aulasDoDiaSelecionado.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Aulas do dia {new Date(diaSelecionado).toLocaleDateString('pt-AO')}
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {aulasDoDiaSelecionado.map((aula) => (
                <motion.div
                  key={aula.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => onAulaClick?.(aula)}
                  className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <FiBook className="text-blue-500 flex-shrink-0" size={12} />
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {aula.disciplina}
                      </span>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      aula.status === 'ministrada' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      aula.status === 'planeada' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                      aula.status === 'adiada' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {aula.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <FiClock size={10} />
                    <span>{aula.hora_inicio || '--:--'} - {aula.hora_fim || '--:--'}</span>
                    <span>•</span>
                    <span>{aula.turmas?.nome_turma || 'Sem turma'}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalendarioMini;
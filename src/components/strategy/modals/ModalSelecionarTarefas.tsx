// components/strategy/modals/ModalSelecionarTarefas
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiX, 
  FiList, 
  FiSearch, 
  FiCheckCircle, 
  FiClock,
  FiUser,
  FiCalendar,
  FiFlag
} from 'react-icons/fi';
import { Tarefa } from '../../../types/eventos';
import { estrategiaTarefaService } from '../../../services/database/estrategia/tarefaService';

interface ModalSelecionarTarefasProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tarefasSelecionadas: string[]) => void;
  tarefasConectadas?: string[];
  tipoPlano: 'diario' | 'semanal' | 'mensal';
}

export const ModalSelecionarTarefas: React.FC<ModalSelecionarTarefasProps> = ({
  isOpen,
  onClose,
  onConfirm,
  tarefasConectadas = [],
  tipoPlano
}) => {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>('todas');
  const [filtroStatus, setFiltroStatus] = useState<string>('todas');
  const [selecionadas, setSelecionadas] = useState<string[]>(tarefasConectadas);

  useEffect(() => {
    const carregarTarefas = async () => {
      if (!isOpen) return;
      
      setCarregando(true);
      try {
        const todasTarefas = await estrategiaTarefaService.getTarefas();
        setTarefas(todasTarefas);
      } catch (error) {
        console.error('Erro ao carregar tarefas:', error);
      } finally {
        setCarregando(false);
      }
    };

    carregarTarefas();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSelecionadas(tarefasConectadas);
      setSearchTerm('');
      setFiltroPrioridade('todas');
      setFiltroStatus('todas');
    }
  }, [isOpen, tarefasConectadas]);

  const toggleTarefa = (tarefaId: string) => {
    setSelecionadas(prev => 
      prev.includes(tarefaId)
        ? prev.filter(id => id !== tarefaId)
        : [...prev, tarefaId]
    );
  };

  const handleConfirm = () => {
    onConfirm(selecionadas);
    onClose();
  };

  const getPrioridadeColor = (prioridade: string) => {
    const colors = {
      'baixa': 'bg-blue-100 text-blue-800',
      'media': 'bg-yellow-100 text-yellow-800',
      'alta': 'bg-orange-100 text-orange-800',
      'critica': 'bg-red-100 text-red-800'
    };
    return colors[prioridade as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:text-gray-100';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'pendente': 'bg-gray-100 text-gray-800 dark:text-gray-100',
      'em_andamento': 'bg-blue-100 text-blue-800',
      'concluida': 'bg-green-100 text-green-800',
      'atrasada': 'bg-red-100 text-red-800',
      'cancelada': 'bg-gray-100 text-gray-800 dark:text-gray-100'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:text-gray-100';
  };

  const tarefasFiltradas = tarefas.filter(tarefa => {
    const matchesSearch = tarefa.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tarefa.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPrioridade = filtroPrioridade === 'todas' || tarefa.prioridade === filtroPrioridade;
    const matchesStatus = filtroStatus === 'todas' || tarefa.status === filtroStatus;
    
    return matchesSearch && matchesPrioridade && matchesStatus;
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-none sm:max-w-4xl h-[90vh] sm:h-auto sm:max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FiList className="h-6 w-6 text-white" />
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    Conectar Tarefas ao Planejamento {tipoPlano}
                  </h2>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-orange-500 rounded-lg">
                  <FiX className="h-5 w-5 text-white" />
                </button>
              </div>
              
              <div className="mt-4 relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-200" />
                <input
                  type="text"
                  placeholder="Buscar tarefas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-orange-500/30 text-white placeholder-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
                />
              </div>
            </div>
            
            {/* Filtros */}
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-b flex flex-wrap gap-2">
              <div className="flex items-center mr-2">
                <FiFlag className="text-gray-500 dark:text-gray-400 mr-1" size={14} />
                <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Prioridade:</span>
              </div>
              {['todas', 'baixa', 'media', 'alta', 'critica'].map(prioridade => (
                <button
                  key={prioridade}
                  onClick={() => setFiltroPrioridade(prioridade)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    filtroPrioridade === prioridade
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-200 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                  }`}
                >
                  {prioridade === 'todas' ? 'Todas' : 
                   prioridade.charAt(0).toUpperCase() + prioridade.slice(1)}
                </button>
              ))}
              
              <div className="w-full h-px bg-gray-200 my-2" />
              
              <div className="flex items-center mr-2">
                <FiClock className="text-gray-500 dark:text-gray-400 mr-1" size={14} />
                <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Status:</span>
              </div>
              {['todas', 'pendente', 'em_andamento', 'concluida', 'atrasada'].map(status => (
                <button
                  key={status}
                  onClick={() => setFiltroStatus(status)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    filtroStatus === status
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-200 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                  }`}
                >
                  {status === 'todas' ? 'Todas' :
                   status === 'em_andamento' ? 'Em Andamento' :
                   status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
            
            {/* Lista de Tarefas */}
            <div className="p-6 max-h-[50vh] overflow-y-auto">
              {carregando ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : tarefasFiltradas.length === 0 ? (
                <div className="text-center py-8">
                  <FiList className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">Nenhuma tarefa encontrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tarefasFiltradas.map(tarefa => (
                    <div
                      key={tarefa.id}
                      onClick={() => toggleTarefa(tarefa.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selecionadas.includes(tarefa.id)
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:bg-gray-50 dark:bg-gray-900'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-gray-900 dark:text-white">{tarefa.titulo}</h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getPrioridadeColor(tarefa.prioridade)}`}>
                              {tarefa.prioridade}
                            </span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(tarefa.status)}`}>
                              {tarefa.status === 'em_andamento' ? 'Em Andamento' :
                               tarefa.status === 'concluida' ? 'Concluída' :
                               tarefa.status === 'atrasada' ? 'Atrasada' :
                               tarefa.status}
                            </span>
                          </div>
                          
                          {tarefa.descricao && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                              {tarefa.descricao}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center">
                              <FiUser className="mr-1" size={12} />
                              {tarefa.responsavel_nome}
                            </span>
                            {tarefa.data_limite && (
                              <span className="flex items-center">
                                <FiCalendar className="mr-1" size={12} />
                                {new Date(tarefa.data_limite).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          {selecionadas.includes(tarefa.id) ? (
                            <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center">
                              <FiCheckCircle className="h-4 w-4 text-white" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 rounded-full" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">{selecionadas.length}</span> tarefas selecionadas
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-6 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 flex items-center"
                >
                  <FiCheckCircle className="mr-2" />
                  Confirmar Conexão ({selecionadas.length})
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

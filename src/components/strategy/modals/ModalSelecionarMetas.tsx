// components/strategy/modals/ModalSelecionarMetas.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiX, 
  FiTarget, 
  FiSearch, 
  FiCheckCircle, 
  FiClock,
  FiUser,
  FiCalendar
} from 'react-icons/fi';
import { Meta } from '../../../types/eventos';
import { estrategiaService } from '../../../services/database/estrategiaService';

interface ModalSelecionarMetasProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (metasSelecionadas: string[]) => void; // Retorna array de IDs
  metasConectadas?: string[]; // IDs já conectadas
  tipoPlano: 'diario' | 'semanal' | 'mensal';
}

export const ModalSelecionarMetas: React.FC<ModalSelecionarMetasProps> = ({
  isOpen,
  onClose,
  onConfirm,
  metasConectadas = [],
  tipoPlano
}) => {
  const [metas, setMetas] = useState<Meta[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todas');
  const [selecionadas, setSelecionadas] = useState<string[]>(metasConectadas);

  // Carregar metas do Dexie
  useEffect(() => {
    const carregarMetas = async () => {
      if (!isOpen) return;
      
      setCarregando(true);
      try {
        const todasMetas = await estrategiaService.getMetas();
        setMetas(todasMetas);
      } catch (error) {
        console.error('Erro ao carregar metas:', error);
      } finally {
        setCarregando(false);
      }
    };

    carregarMetas();
  }, [isOpen]);

  // Reset seleção quando abrir
  useEffect(() => {
    if (isOpen) {
      setSelecionadas(metasConectadas);
      setSearchTerm('');
      setFiltroStatus('todas');
    }
  }, [isOpen, metasConectadas]);

  const toggleMeta = (metaId: string) => {
    setSelecionadas(prev => 
      prev.includes(metaId)
        ? prev.filter(id => id !== metaId)
        : [...prev, metaId]
    );
  };

  const handleConfirm = () => {
    onConfirm(selecionadas);
    onClose();
  };

  // Filtros
  const metasFiltradas = metas.filter(meta => {
    // Filtro de busca
    const matchesSearch = meta.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         meta.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro de status
    const matchesStatus = filtroStatus === 'todas' || meta.status === filtroStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    const colors = {
      'nao_iniciada': 'bg-gray-100 text-gray-800 dark:text-gray-100',
      'em_andamento': 'bg-blue-100 text-blue-800',
      'concluida': 'bg-green-100 text-green-800',
      'atrasada': 'bg-red-100 text-red-800',
      'suspensa': 'bg-yellow-100 text-yellow-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:text-gray-100';
  };

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
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FiTarget className="h-6 w-6 text-white" />
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    Conectar Metas ao Planejamento {tipoPlano}
                  </h2>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-purple-500 rounded-lg">
                  <FiX className="h-5 w-5 text-white" />
                </button>
              </div>
              
              {/* Barra de busca */}
              <div className="mt-4 relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-200" />
                <input
                  type="text"
                  placeholder="Buscar metas por título ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-purple-500/30 text-white placeholder-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
                />
              </div>
            </div>
            
            {/* Filtros */}
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-b flex gap-2 overflow-x-auto">
              {['todas', 'nao_iniciada', 'em_andamento', 'concluida', 'atrasada'].map(status => (
                <button
                  key={status}
                  onClick={() => setFiltroStatus(status)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                    filtroStatus === status
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                  }`}
                >
                  {status === 'todas' ? 'Todas' : 
                   status === 'nao_iniciada' ? 'Não Iniciada' :
                   status === 'em_andamento' ? 'Em Andamento' :
                   status === 'concluida' ? 'Concluída' : 'Atrasada'}
                </button>
              ))}
            </div>
            
            {/* Lista de Metas */}
            <div className="p-6 max-h-[50vh] overflow-y-auto">
              {carregando ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : metasFiltradas.length === 0 ? (
                <div className="text-center py-8">
                  <FiTarget className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">Nenhuma meta encontrada</p>
                  <button 
                    onClick={() => window.location.href = '/estrategia/metas/nova'}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Criar Nova Meta
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {metasFiltradas.map(meta => (
                    <div
                      key={meta.id}
                      onClick={() => toggleMeta(meta.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selecionadas.includes(meta.id)
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 hover:bg-gray-50 dark:bg-gray-900'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-gray-900 dark:text-white">{meta.titulo}</h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(meta.status)}`}>
                              {meta.status === 'nao_iniciada' ? 'Não Iniciada' :
                               meta.status === 'em_andamento' ? 'Em Andamento' :
                               meta.status === 'concluida' ? 'Concluída' :
                               meta.status === 'atrasada' ? 'Atrasada' : meta.status}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                            {meta.descricao}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center">
                              <FiUser className="mr-1" size={12} />
                              {meta.responsavel_principal}
                            </span>
                            <span className="flex items-center">
                              <FiCalendar className="mr-1" size={12} />
                              Até {new Date(meta.data_fim).toLocaleDateString('pt-BR')}
                            </span>
                            <span className="flex items-center">
                              <FiTarget className="mr-1" size={12} />
                              {meta.progresso}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          {selecionadas.includes(meta.id) ? (
                            <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
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
                <span className="font-medium">{selecionadas.length}</span> metas selecionadas
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
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 flex items-center"
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

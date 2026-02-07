// components/TarefasKanban.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiCheckCircle, 
  FiClock, 
  FiAlertCircle, 
  FiCalendar,
  FiUser,
  FiFlag,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiFilter,
  FiSearch,
  FiChevronDown,
  FiChevronUp,
  FiBarChart2,
  FiArchive,
  FiRefreshCw
} from 'react-icons/fi';
import { Tarefa } from '../../types/eventos.ts';
import { estrategiaService } from '../../services/database/estrategiaService.ts';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { useNavigate } from 'react-router-dom';

interface TarefasKanbanProps {
  showFilters?: boolean;
  limitPerColumn?: number;
  onTaskClick?: (tarefa: Tarefa) => void;
}

const TarefasKanban: React.FC<TarefasKanbanProps> = ({ 
  showFilters = true, 
  limitPerColumn = 10,
  onTaskClick 
}) => {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResponsavel, setSelectedResponsavel] = useState<string>('todos');
  const [selectedPrioridade, setSelectedPrioridade] = useState<string>('todos');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<Tarefa | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const { user } = useAuth(); // Hook para pegar usuário logado
  const navigate = useNavigate();
  // Função para abrir modal de criação
  const abrirModalNovaTarefa = () => {
    navigate("/estrategia/tarefas/nova");
  };

  
  useEffect(() => {
    loadTarefas();
  }, []);

  const loadTarefas = async () => {
    try {
      setLoading(true);
      const data = await estrategiaService.getTarefas();
      setTarefas(data);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar tarefas
  const filteredTarefas = tarefas.filter(tarefa => {
    // Filtro de busca
    if (searchTerm && !tarefa.titulo.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !tarefa.responsavel_nome.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filtro de responsável
    if (selectedResponsavel !== 'todos' && tarefa.responsavel_id !== selectedResponsavel) {
      return false;
    }
    
    // Filtro de prioridade
    if (selectedPrioridade !== 'todos' && tarefa.prioridade !== selectedPrioridade) {
      return false;
    }
    
    // Mostrar concluídas?
    console.log('tarefa.status', tarefa.status);
    if (!showCompleted && tarefa.status === 'concluida') {
      return false;
    }
    
    return true;
  });

  // Agrupar por status
  const tarefasPorStatus = {
    pendente: filteredTarefas.filter(t => t.status === 'pendente'),
    em_andamento: filteredTarefas.filter(t => t.status === 'em_andamento'),
    concluida: filteredTarefas.filter(t => t.status === 'concluida'),
    atrasada: filteredTarefas.filter(t => t.status === 'atrasada')
  };

  // Responsáveis únicos
  const responsaveisUnicos = Array.from(
    new Set(tarefas.map(t => t.responsavel_id).filter(Boolean))
  ).map(id => {
    const tarefa = tarefas.find(t => t.responsavel_id === id);
    return {
      id,
      nome: tarefa?.responsavel_nome || 'Não definido'
    };
  });

  // Handler de drag and drop
  const handleDragStart = (e: React.DragEvent, tarefa: Tarefa) => {
    setDraggedTask(tarefa);
    e.dataTransfer.setData('text/plain', tarefa.id);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent|null, novoStatus: string) => {
    if (e) e.preventDefault();
    if (!draggedTask) return;

    try {
      // Atualizar status no backend
      await estrategiaService.updateTarefaStatus(draggedTask.id, novoStatus);
      
      // Atualizar estado local
      setTarefas(prev => prev.map(t => 
        t.id === draggedTask.id ? { ...t, status: novoStatus as any } : t
      ));
      
      setDraggedTask(null);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

    const concluir = async (tarefa:string, novoStatus: string) => {
    if (!tarefa) return;

    try {
      // Atualizar status no backend
      await estrategiaService.updateTarefaStatus(tarefa, novoStatus);
      
      // Atualizar estado local
      setTarefas(prev => prev.map(t => 
        t.id === tarefa ? { ...t, status: novoStatus as any } : t
      ));
      
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };



  // Toggle expandir tarefa
  const toggleExpandTask = (taskId: string) => {
    setExpandedTask(expandedTask === taskId ? null : taskId);
  };

  // Renderizar badge de prioridade
  const renderPriorityBadge = (prioridade: string) => {
    const config = {
      baixa: { color: 'bg-blue-100 text-blue-800', icon: '🔵' },
      media: { color: 'bg-yellow-100 text-yellow-800', icon: '🟡' },
      alta: { color: 'bg-orange-100 text-orange-800', icon: '🟠' },
      critica: { color: 'bg-red-100 text-red-800', icon: '🔴' }
    }[prioridade] || { color: 'bg-gray-100 text-gray-800', icon: '⚪' };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {prioridade.toUpperCase()}
      </span>
    );
  };

  // Renderizar badge de categoria
  const renderCategoryBadge = (categoria: string) => {
    const config = {
      importante: { color: 'bg-purple-100 text-purple-800', label: 'IMPORTANTE' },
      urgente: { color: 'bg-red-100 text-red-800', label: 'URGENTE' },
      evento: { color: 'bg-indigo-100 text-indigo-800', label: 'EVENTO' },
      rotina: { color: 'bg-green-100 text-green-800', label: 'ROTINA' },
      melhoria: { color: 'bg-teal-100 text-teal-800', label: 'MELHORIA' }
    }[categoria] || { color: 'bg-gray-100 text-gray-800', label: categoria.toUpperCase() };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Renderizar coluna
  const renderColumn = (status: string, title: string, icon: React.ReactNode, color: string) => {
    const tarefasColuna = tarefasPorStatus[status as keyof typeof tarefasPorStatus];
    const count = tarefasColuna.length;

      function salvarTarefa(tarefa: Partial<Tarefa>): Promise<void> {
          throw new Error('Function not implemented.');
      }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex-1 min-w-[280px] bg-gray-50  rounded-xl border ${color} overflow-hidden`}
      >
        {/* Cabeçalho da coluna */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {icon}
              <h3 className="font-semibold text-gray-800 ml-2">{title}</h3>
              <span className="ml-2 bg-white px-2 py-1 rounded-full text-sm font-medium">
                {count}
              </span>
            </div>

          </div>
          
          {/* Estatísticas da coluna */}
          {status === 'em_andamento' && (
            <div className="mt-2 text-xs text-gray-500 flex items-center ">
              <FiBarChart2 className="mr-1" />
              <span>Progresso médio: {
                tarefasColuna.length > 0 
                  ? Math.round(tarefasColuna.reduce((acc, t) => acc + t.percentual_conclusao, 0) / tarefasColuna.length)
                  : 0
              }%</span>
            </div>
          )}
        </div>

        {/* Área de drop */}
        <div
          className="min-h-[400px] p-2 overflow-y-scroll max-h-96"
          onDragOver={(e) => handleDragOver(e, status)}
          onDrop={(e) => handleDrop(e, status)}
        >
          <AnimatePresence>
            {tarefasColuna.slice(0, limitPerColumn).map((tarefa) => (
              <motion.div
                key={tarefa.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                draggable
                onDragStart={(e: any) => handleDragStart(e, tarefa)}
                className={`mb-3 bg-white  rounded-lg shadow-sm border hover:shadow-md transition-all cursor-move ${
                  expandedTask === tarefa.id ? 'ring-2 ring-blue-300' : ''
                }`}
                onClick={() => onTaskClick?.(tarefa)}
              >
                {/* Cabeçalho da tarefa */}
                <div 
                  className="p-3"
                  onClick={() => toggleExpandTask(tarefa.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {renderPriorityBadge(tarefa.prioridade)}
                          {renderCategoryBadge(tarefa.categoria)}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpandTask(tarefa.id);
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {expandedTask === tarefa.id ? 
                            <FiChevronUp /> : <FiChevronDown />
                          }
                        </button>
                      </div>
                      
                      <h4 className="font-medium text-gray-800 line-clamp-2">
                        {tarefa.titulo}
                      </h4>
                      
                      {/* Responsável */}
                      <div className="flex items-center mt-2">
                        <FiUser className="text-gray-400 mr-2" size={14} />
                        <span className="text-sm text-gray-600">{tarefa.responsavel_nome}</span>
                      </div>
                    </div>
                  </div>

                  {/* Datas */}
                  {tarefa.data_limite && (
                    <div className="flex items-center mt-2 text-sm text-gray-500">
                      <FiCalendar className="mr-1" size={14} />
                      <span>Prazo: {new Date(tarefa.data_limite).toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}

                  {/* Progresso */}
                  {tarefa.percentual_conclusao > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Progresso</span>
                        <span>{tarefa.percentual_conclusao}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-green-500 h-1.5 rounded-full"
                          style={{ width: `${tarefa.percentual_conclusao}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Detalhes expandidos */}
                <AnimatePresence>
                  {expandedTask === tarefa.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t px-3 py-3 bg-gray-50"
                    >
                      {/* Descrição */}
                      {tarefa.descricao && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-600">{tarefa.descricao}</p>
                        </div>
                      )}

                      {/* Checklist */}
                      {tarefa.checklist && tarefa.checklist.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs font-medium text-gray-500 mb-2">Checklist</div>
                          <div className="space-y-1">
                            {tarefa.checklist.length>0&&tarefa.checklist.map((item: any, index: number) => (
                              <div key={index} className="flex items-center text-sm">
                                <input
                                  type="checkbox"
                                  checked={item.concluido}
                                  className="mr-2"
                                  onChange={() => setTarefas(prev => prev.map(t => {
                                    if (t.id === tarefa.id) {
                                      const novoChecklist = t.checklist!.map((chk: any, i: number) => 
                                        i === index ? { ...chk, concluido: !chk.concluido } : chk
                                      );
                                      return { ...t, checklist: novoChecklist };
                                    }
                                    return t;
                                  }))}
                                />
                                <span className={item.concluido ? 'line-through text-gray-400' : ''}>
                                  {item.item}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Ações */}
                      
                      <div className="flex justify-end space-x-2 pt-2 border-t">
                         <button 
                        onClick={
                          ()=> navigate("/estrategia/tarefas/deletar/"+tarefa.id)
                        }
                         className="text-sm px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">
                          <FiTrash2 className="inline mr-1" /> 
                        </button>
                        <button 
                        onClick={
                          ()=> navigate("/estrategia/tarefas/editar/"+tarefa.id)
                        }
                         className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                          <FiEdit2 className="inline mr-1" /> Editar
                        </button>
                       
                           {
                            tarefa.status!=='concluida' ?
                              <button onClick={()=> {
                                concluir(tarefa.id, 'concluida');
                                }} className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
                                  <><FiCheckCircle className="inline mr-1" /> Concluir</> 
                              </button>:
                            <></>
                           } 
                          
                        
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Mensagem quando vazio */}
          {tarefasColuna.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <FiAlertCircle className="mx-auto mb-2" size={24} />
              <p>Nenhuma tarefa aqui</p>
              <p className="text-sm">Arraste tarefas para cá</p>
            </div>
          )}

          {/* Ver mais */}
          {tarefasColuna.length > limitPerColumn && (
            <div className="text-center py-2">
              <button className="text-sm text-blue-600 hover:text-blue-800">
                + {tarefasColuna.length - limitPerColumn} tarefas ocultas
              </button>
            </div>
          )}
        </div>
        
      </motion.div>
     
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros e Estatísticas */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow p-4"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
            {/* Busca */}
            <div className="relative flex-1 md:max-w-md">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar tarefas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
              <select
                value={selectedResponsavel}
                onChange={(e) => setSelectedResponsavel(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="todos">Todos responsáveis</option>
                {responsaveisUnicos.map(r => (
                  <option key={r.id} value={r.id}>{r.nome}</option>
                ))}
              </select>

              <select
                value={selectedPrioridade}
                onChange={(e) => setSelectedPrioridade(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="todos">Todas prioridades</option>
                <option value="critica">Crítica</option>
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>

              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className={`px-3 py-2 rounded-lg text-sm flex items-center ${
                  showCompleted 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                <FiCheckCircle className="mr-2" />
                {showCompleted ? 'Ocultar concluídas' : 'Mostrar concluídas'}
              </button>

              <button
                onClick={loadTarefas}
                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm flex items-center hover:bg-blue-200"
              >
                <FiRefreshCw className="mr-2" />
                Atualizar
              </button>
              <button 
              title='Nova tarefa'
              onClick={()=> abrirModalNovaTarefa()}
               className="px-4 py-2 flex items-center justify-center bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
                  <FiPlus className="inline" />
                </button>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Total</div>
              <div className="text-2xl font-bold">{tarefas.length}</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Em andamento</div>
              <div className="text-2xl font-bold">{tarefasPorStatus.em_andamento.length}</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Atrasadas</div>
              <div className="text-2xl font-bold">{tarefasPorStatus.atrasada.length}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Concluídas</div>
              <div className="text-2xl font-bold">{tarefasPorStatus.concluida.length}</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Kanban Board */}
      <div className="flex flex-col lg:flex-row gap-4 overflow-x-auto pb-4 ">
        {renderColumn('pendente', 'Pendente', <FiClock className="text-yellow-500" />, 'border-yellow-200')}
        {renderColumn('em_andamento', 'Em Andamento', <FiRefreshCw className="text-blue-500" />, 'border-blue-200')}
        {renderColumn('concluida', 'Concluídas', <FiCheckCircle className="text-green-500" />, 'border-green-200')}
        {renderColumn('atrasada', 'Atrasadas', <FiAlertCircle className="text-red-500" />, 'border-red-200')}
      </div>

      {/* Legendas */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span className="text-sm">Prioridade Baixa</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span className="text-sm">Prioridade Média</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
            <span className="text-sm">Prioridade Alta</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span className="text-sm">Prioridade Crítica</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TarefasKanban;
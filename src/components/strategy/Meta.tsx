import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { 
  FiBookOpen, 
  FiCheckCircle, 
  FiChevronRight, 
  FiDollarSign, 
  FiPlus, 
  FiSettings, 
  FiTarget, 
  FiTrendingUp,
  FiBarChart2,
  FiCalendar,
  FiUsers,
  FiClock,
  FiAlertCircle
} from "react-icons/fi";
import { Meta } from "../../types/eventos";
import { useNavigate } from "react-router-dom";
import { useConfirmModal } from "../ui/ComfirmModal";
import { estrategiaService } from "../../services/database/estrategiaService";
import toast from "react-hot-toast";
import { useAlert } from "../ui/AlertBadge";
import { SyncStatusBadge } from "../ui/SyncStatusBadge";
import { SyncDataDetail } from "../ui/SyncDataDetail";
import { getPendingCount } from "../../utils/emitPendingSync";

const MetaComponent = ({ metas, setMetas,loadData }: { 
  metas: Meta[], 
  loadData:any,
  setMetas: React.Dispatch<React.SetStateAction<Meta[]>> 
}) => {
  const navigate = useNavigate();
  const { showAlert } = useAlert(); 
  const { confirm, ModalComponent } = useConfirmModal();
  const [expandedMeta, setExpandedMeta] = useState<string | null>(null);
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
  const [syncStats, setSyncStats] = useState(0);

  useEffect(() => {
        // Monitorar status online
        const handleOnline = () => setOnlineStatus(true);
        const handleOffline = () => setOnlineStatus(false);
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
  
  
        // Carregar estatísticas de sincronização
        const loadSyncStats = async () => {
          try {
            const turmasPendentes = await getPendingCount("metas");
            setSyncStats(turmasPendentes);
          } catch (error) {
            console.error('Erro ao carregar sync stats:', error);
          }
        };
        
        loadSyncStats();
        
        // Ouvir eventos de sincronização
        const handleSyncUpdate = () => {
          loadSyncStats();
        };
  
        const interval=setInterval(handleSyncUpdate,30000)    
        
        window.addEventListener('sync-pending', handleSyncUpdate);
        window.addEventListener('sync-complete', handleSyncUpdate);
        
        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
          window.removeEventListener('sync-pending', handleSyncUpdate);
          window.removeEventListener('sync-complete', handleSyncUpdate);
          clearInterval(interval)
        };
      }, []);
      
      
      const handleForceSync = async () => {
        try {
          await estrategiaService.syncMetas();
          loadData();
         
          showAlert({
            type: 'success',
            title: 'Sincronização concluída!',
            message: 'Os dados foram sincronizados com o servidor.',
            duration: 3000
          });
        
        } catch (error) {
          showAlert({
            type: 'error',
            title: 'Erro na sincronização',
            message: 'Não foi possível sincronizar com o servidor.',
            duration: 5000
          });
        };
      };
    
  
  const toggleMeta = (id: string) => {
    setExpandedMeta(expandedMeta === id ? null : id);
  };

  const getMetaIcon = (tipo: string) => {
    switch(tipo) {
      case 'academica': return <FiBookOpen className="text-blue-500" />;
      case 'financeira': return <FiDollarSign className="text-green-500" />;
      case 'operacional': return <FiSettings className="text-purple-500" />;
      case 'marketing': return <FiTrendingUp className="text-orange-500" />;
      case 'infraestrutura': return <FiSettings className="text-indigo-500" />;
      case 'qualidade': return <FiCheckCircle className="text-teal-500" />;
      default: return <FiTarget className="text-gray-500" />;
    }
  };

  const getStatusColor = (status: Meta['status']) => {
    switch (status) {
      case 'concluida': return 'bg-green-100 text-green-800';
      case 'em_andamento': return 'bg-blue-100 text-blue-800';
      case 'atrasada': return 'bg-red-100 text-red-800';
      case 'suspensa': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getPrioridadeColor = (prioridade: Meta['prioridade']) => {
    switch (prioridade) {
      case 'critica': return 'bg-red-500 text-white';
      case 'alta': return 'bg-orange-500 text-white';
      case 'media': return 'bg-yellow-500 text-black';
      case 'baixa': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white dark:bg-gray-600 dark:text-gray-100';
    }
  };

  const formatarData = (dataString: string) => {
    return new Date(dataString).toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: 'short'
    });
  };

  const calcularDiasRestantes = (dataFim: string) => {
    const hoje = new Date();
    const fim = new Date(dataFim);
    const diff = Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const handleDelete = async (metaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
      const confirmed = await confirm({
          type: 'delete',
          title: 'Excluir Meta',
          message: `'Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.'`,
          isDestructive: true,
          confirmText: 'Excluir',
          onConfirm: async () => {
            try {
              await estrategiaService.deleteMeta(metaId);
              const m=metas.find(meta => meta.id == metaId);      
              setMetas(metas.filter(meta => meta.id !== metaId));      
              // Fechar se estiver expandida
              if (expandedMeta === metaId) {
                setExpandedMeta(null);
              }
              toast.success('Meta excluída com sucesso!');
              showAlert({
                type: 'success',
                title: 'Meta excluída!',
                message: `Meta da ${m?.titulo} foi removida do sistema.`,
                duration: 3000
              });
              
            } catch (error) {
              showAlert({
                type: 'error',
                title: 'Meta ao excluir',
                message: 'Não foi possível excluir a meta. Verifique sua conexão.',
                duration: 5000
              });
            }
          }
        });
  };

  return (
    <div className="p-6 dark:bg-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex gap-3 items-center">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white flex items-center">
              <FiTarget className="mr-2" />
              Metas Estratégicas
            </h2>
            <SyncStatusBadge tableName="metas"/>
          </div>
          
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
            Gerencie e acompanhe o progresso das metas da escola
          </p>
        </div>
        <button 
          onClick={() => navigate("/estrategia/metas/nova")}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md"
        >
          <FiPlus className="h-5 w-5" />
          Nova Meta
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
              <FiTarget className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {metas.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Total de Metas
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
              <FiCheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {metas.filter(m => m.status === 'concluida').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Concluídas
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
              <FiBarChart2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round(metas.reduce((acc, meta) => acc + meta.progresso, 0) / metas.length) || 0}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Progresso Médio
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-800 rounded-lg">
              <FiAlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {metas.filter(m => m.status === 'atrasada').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Atrasadas
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Lista de Metas */}
      <div className="space-y-4">
        {metas.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
            <FiTarget className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nenhuma meta cadastrada
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Comece criando sua primeira meta estratégica
            </p>
            <button 
              onClick={() => navigate("/estrategia/metas/nova")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Criar Primeira Meta
            </button>
          </div>
        ) : (
          metas.map((meta) => {
            const diasRestantes = calcularDiasRestantes(meta.data_fim);
            const isAtrasada = diasRestantes < 0 && meta.status !== 'concluida';
            const isExpanded = expandedMeta === meta.id;
            
            return (
              <motion.div
                key={meta.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Cabeçalho da Meta */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => toggleMeta(meta.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-600 rounded-lg">
                        {getMetaIcon(meta.tipo)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900 dark:text-white">
                            {meta.titulo}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(meta.status)}`}>
                            {meta.status === 'em_andamento' ? 'Em Andamento' : 
                             meta.status === 'concluida' ? 'Concluída' : 
                             meta.status === 'atrasada' ? 'Atrasada' : 
                             meta.status === 'suspensa' ? 'Suspensa' : 'Não Iniciada'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getPrioridadeColor(meta.prioridade)}`}>
                            {meta.prioridade}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-1">
                          {meta.descricao}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <FiCalendar className="h-3 w-3" />
                            {formatarData(meta.data_inicio)} - {formatarData(meta.data_fim)}
                          </span>
                          <span className="flex items-center gap-1">
                            <FiUsers className="h-3 w-3" />
                            {meta.responsavel_principal}
                          </span>
                          <span className="flex items-center gap-1">
                            <FiClock className="h-3 w-3" />
                            {isAtrasada ? `${Math.abs(diasRestantes)} dias atrasado` : `${diasRestantes} dias restantes`}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {meta.progresso}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Progresso
                        </div>
                      </div>
                      
                      <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            meta.progresso >= 80 ? 'bg-green-500' :
                            meta.progresso >= 50 ? 'bg-blue-500' :
                            meta.progresso >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${meta.progresso}%` }}
                        />
                      </div>
                      
                      <FiChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`} />
                    </div>
                  </div>
                  <ModalComponent/>
                </div>

                {/* Conteúdo Expandido */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="border-t border-gray-200 dark:border-gray-600 p-4 bg-gray-50 dark:bg-gray-800/50"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                          <FiBarChart2 className="h-4 w-4" />
                          Indicadores (KPIs)
                        </h4>
                        {meta.kpis && meta.kpis.length > 0 ? (
                          <div className="space-y-2">
                            {meta.kpis.map((kpi, index) => {
                              const progressoKPI = kpi.valor_meta > 0 
                                ? Math.min((kpi.valor_atual / kpi.valor_meta) * 100, 100)
                                : 0;
                              
                              return (
                                <div key={index} className="bg-white dark:bg-gray-700 rounded-lg p-3">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {kpi.nome}
                                    </span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                      {kpi.valor_atual} / {kpi.valor_meta} {kpi.unidade}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                                    <div 
                                      className={`h-1.5 rounded-full ${
                                        progressoKPI >= 100 ? 'bg-green-500' :
                                        progressoKPI >= 70 ? 'bg-blue-500' :
                                        progressoKPI >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min(progressoKPI, 100)}%` }}
                                    />
                                  </div>
                                  <div className="text-right text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {progressoKPI.toFixed(1)}%
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Nenhum indicador definido.
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                          <FiCalendar className="h-4 w-4" />
                          Prazos e Recursos
                        </h4>
                        <div className="space-y-3">
                          <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                            <div className="flex justify-between mb-1">
                              <span className="text-gray-600 dark:text-gray-400">Data Início:</span>
                              <span className="font-medium">{formatarData(meta.data_inicio)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Data Fim:</span>
                              <span className={`font-medium ${isAtrasada ? 'text-red-600 dark:text-red-400' : ''}`}>
                                {formatarData(meta.data_fim)}
                              </span>
                            </div>
                          </div>
                          
                          {meta.orcamento_previsto && (
                            <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-gray-600 dark:text-gray-400">Orçamento:</span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {new Intl.NumberFormat('pt-AO', {
                                    style: 'currency',
                                    currency: 'AOA'
                                  }).format(meta.orcamento_previsto)}
                                </span>
                              </div>
                              {meta.orcamento_alocado && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500 dark:text-gray-400">Alocado:</span>
                                  <span className="text-green-600 dark:text-green-400">
                                    {new Intl.NumberFormat('pt-AO', {
                                      style: 'currency',
                                      currency: 'AOA'
                                    }).format(meta.orcamento_alocado)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                      <button
                        onClick={() => navigate(`/estrategia/metas/${meta.id}`)}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2"
                      >
                        <FiBarChart2 className="h-4 w-4" />
                        Ver Detalhes Completos
                      </button>
                      
                      <button
                        onClick={() => navigate(`/estrategia/metas/editar/${meta.id}`)}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                      >
                        <FiSettings className="h-4 w-4" />
                        Editar
                      </button>
                      
                      <button
                        onClick={(e) => handleDelete(meta.id, e)}
                        className="px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center gap-2"
                      >
                        Excluir
                      </button>
                    </div>
                  </motion.div>
                )}
                
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MetaComponent;

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiTarget, FiCalendar, FiUsers, FiDollarSign, 
  FiCheckCircle, FiClock, FiTrendingUp, FiBarChart2,
  FiChevronRight, FiChevronDown, FiEdit2, FiTrash2,
  FiPlus, FiX, FiAlertCircle, FiBook, FiBriefcase,
  FiHome, FiCheckSquare, FiPercent, FiTrendingDown,
  FiFileText, FiLink, FiDownload, FiEye
} from 'react-icons/fi';
import { Meta } from '../../types/eventos';
import { estrategiaService } from '../../services/database/estrategiaService';
import { toast } from 'react-hot-toast';

interface MetaDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  meta: Meta;
  onEdit: () => void;
  onDelete: () => void;
  onAlocarRecursos: () => void;
}

export const MetaDetailsModal: React.FC<MetaDetailsModalProps> = ({
  isOpen,
  onClose,
  meta,
  onEdit,
  onDelete,
  onAlocarRecursos
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'kpis' | 'submetas' | 'financas'>('overview');
  const [expandedKPI, setExpandedKPI] = useState<string | null>(null);
  const [expandedSubMeta, setExpandedSubMeta] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Estatísticas calculadas
  const kpisCompletos = meta.kpis?.filter(k => k.valor_atual >= k.valor_meta).length || 0;
  const subMetasCompletas = meta.submetas?.filter(sm => sm.status === 'concluida').length || 0;
  const orcamentoUtilizado = meta.orcamento_previsto 
    ? ((meta.orcamento_alocado || 0) / meta.orcamento_previsto) * 100 
    : 0;
  
  const diasRestantes = Math.ceil(
    (new Date(meta.data_fim).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const getStatusColor = (status: Meta['status']) => {
    switch (status) {
      case 'concluida': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'em_andamento': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'atrasada': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'suspensa': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getPrioridadeColor = (prioridade: Meta['prioridade']) => {
    switch (prioridade) {
      case 'critica': return 'bg-red-500 text-white';
      case 'alta': return 'bg-orange-500 text-white';
      case 'media': return 'bg-yellow-500 text-black';
      case 'baixa': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getTipoIcon = (tipo: Meta['tipo']) => {
    switch (tipo) {
      case 'academica': return <FiBook className="h-5 w-5 text-blue-500" />;
      case 'financeira': return <FiDollarSign className="h-5 w-5 text-green-500" />;
      case 'operacional': return <FiBriefcase className="h-5 w-5 text-purple-500" />;
      case 'marketing': return <FiTrendingUp className="h-5 w-5 text-orange-500" />;
      case 'infraestrutura': return <FiHome className="h-5 w-5 text-indigo-500" />;
      case 'qualidade': return <FiCheckCircle className="h-5 w-5 text-teal-500" />;
      default: return <FiTarget className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA'
    }).format(valor);
  };

  const formatarData = (dataString: string) => {
    return new Date(dataString).toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const calcularProgressoKPI = (kpi: Meta['kpis'][0]) => {
    return kpi.valor_meta > 0 
      ? Math.min((kpi.valor_atual / kpi.valor_meta) * 100, 100)
      : 0;
  };

  const handleAtualizarKPI = async (kpiId: string, novoValor: number) => {
    try {
      setLoading(true);
      await estrategiaService.updateKPI(meta.id, kpiId, novoValor);
      toast.success('KPI atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar KPI');
    } finally {
      setLoading(false);
    }
  };

  const handleAtualizarSubMeta = async (subMetaId: string, status: any) => {
    try {
      setLoading(true);
      await estrategiaService.updateSubMetaStatus(meta.id, subMetaId, status);
      toast.success('Sub-meta atualizada!');
    } catch (error) {
      toast.error('Erro ao atualizar sub-meta');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: FiTarget },
    { id: 'kpis', label: 'Indicadores', icon: FiBarChart2, count: meta.kpis?.length },
    { id: 'submetas', label: 'Sub-metas', icon: FiCheckSquare, count: meta.submetas?.length },
    { id: 'financas', label: 'Finanças', icon: FiDollarSign }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 rounded-xl">
                      {getTipoIcon(meta.tipo)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {meta.titulo}
                        </h2>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(meta.status)}`}>
                          {meta.status === 'em_andamento' ? 'Em Andamento' : 
                           meta.status === 'concluida' ? 'Concluída' : 
                           meta.status === 'atrasada' ? 'Atrasada' : 
                           meta.status === 'suspensa' ? 'Suspensa' : 'Não Iniciada'}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300">
                        {meta.descricao}
                      </p>
                      <div className="flex items-center gap-4 mt-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getPrioridadeColor(meta.prioridade)}`}>
                          {meta.prioridade.toUpperCase()}
                        </span>
                        <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <FiUsers className="h-4 w-4" />
                          {meta.responsavel_principal}
                        </span>
                        <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <FiCalendar className="h-4 w-4" />
                          {formatarData(meta.data_inicio)} - {formatarData(meta.data_fim)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onAlocarRecursos}
                      className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                      <FiDollarSign className="h-4 w-4" />
                      Alocar Recursos
                    </button>
                    <button
                      onClick={onEdit}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                    >
                      <FiEdit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={onDelete}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                    >
                      <FiTrash2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={onClose}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <FiX className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Barra de Progresso */}
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Progresso Geral
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {meta.progresso.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        meta.progresso >= 80 ? 'bg-green-500' :
                        meta.progresso >= 50 ? 'bg-blue-500' :
                        meta.progresso >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${meta.progresso}%` }}
                    />
                  </div>
                </div>

                {/* Tabs */}
                <div className="mt-6 flex gap-1 border-b border-gray-200 dark:border-gray-700">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-3 font-medium relative ${
                          isActive 
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500' 
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                        {tab.count !== undefined && (
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            isActive 
                              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' 
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <>
                    {/* Visão Geral */}
                    {activeTab === 'overview' && (
                      <div className="space-y-6">
                        {/* Cards de Estatísticas */}
                        <div className="grid grid-cols-4 gap-4">
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                                <FiBarChart2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {kpisCompletos}/{meta.kpis?.length || 0}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                  KPIs Alcançados
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-xl">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                                <FiCheckSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
                              </div>
                              <div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {subMetasCompletas}/{meta.submetas?.length || 0}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                  Sub-metas Concluídas
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-4 rounded-xl">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 bg-yellow-100 dark:bg-yellow-800 rounded-lg">
                                <FiDollarSign className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                              </div>
                              <div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {orcamentoUtilizado.toFixed(1)}%
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                  Orçamento Utilizado
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-xl">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                                <FiClock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {diasRestantes}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                  Dias Restantes
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* SMART Criteria */}
                        <div className="bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <FiTarget className="text-blue-500" />
                            Critérios SMART
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Específico</h4>
                              <p className="text-gray-900 dark:text-white">{meta.especifico}</p>
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Mensurável</h4>
                              <p className="text-gray-900 dark:text-white">{meta.mensuravel}</p>
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Atingível</h4>
                              <p className="text-gray-900 dark:text-white">
                                {meta.atingivel ? 'Sim' : 'Não'}
                              </p>
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Relevante</h4>
                              <p className="text-gray-900 dark:text-white">{meta.relevante}</p>
                            </div>
                           
                          </div>
                        </div>

                        {/* Resumo Financeiro */}
                        {meta.orcamento_previsto && (
                          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                              <FiDollarSign className="text-yellow-500" />
                              Resumo Financeiro
                            </h3>
                            <div className="grid grid-cols-3 gap-6">
                              <div>
                                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                                  Orçamento Previsto
                                </div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {formatarMoeda(meta.orcamento_previsto)}
                                </div>
                              </div>
                              
                              <div>
                                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                                  Já Alocado
                                </div>
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                  {formatarMoeda(meta.orcamento_alocado || 0)}
                                </div>
                              </div>
                              
                              <div>
                                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                                  Restante
                                </div>
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                  {formatarMoeda(meta.orcamento_previsto - (meta.orcamento_alocado || 0))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* KPIs */}
                    {activeTab === 'kpis' && (
                      <div className="space-y-4">
                        {meta.kpis && meta.kpis.length > 0 ? (
                          meta.kpis.map((kpi) => {
                            const progresso = calcularProgressoKPI(kpi);
                            const isExpanded = expandedKPI === kpi.id;
                            
                            return (
                              <div
                                key={kpi.id}
                                className="bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
                              >
                                <div 
                                  className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors"
                                  onClick={() => setExpandedKPI(isExpanded ? null : kpi.id)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                                        <FiBarChart2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                      </div>
                                      <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">
                                          {kpi.nome}
                                        </h4>
                                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                          <span>Unidade: {kpi.unidade}</span>
                                          <span>•</span>
                                          <span>Frequência: {kpi.frequencia}</span>
                                          <span>•</span>
                                          <span>Peso: {kpi.peso || 10}%</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                      <div className="text-right">
                                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                                          {kpi.valor_atual} / {kpi.valor_meta} {kpi.unidade}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-300">
                                          {progresso.toFixed(1)}% do objetivo
                                        </div>
                                      </div>
                                      
                                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                        progresso >= 100 ? 'bg-green-100 dark:bg-green-900' :
                                        progresso >= 70 ? 'bg-blue-100 dark:bg-blue-900' :
                                        progresso >= 40 ? 'bg-yellow-100 dark:bg-yellow-900' :
                                        'bg-red-100 dark:bg-red-900'
                                      }`}>
                                        <span className={`font-bold ${
                                          progresso >= 100 ? 'text-green-600 dark:text-green-400' :
                                          progresso >= 70 ? 'text-blue-600 dark:text-blue-400' :
                                          progresso >= 40 ? 'text-yellow-600 dark:text-yellow-400' :
                                          'text-red-600 dark:text-red-400'
                                        }`}>
                                          {progresso.toFixed(0)}%
                                        </span>
                                      </div>
                                      
                                      <FiChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${
                                        isExpanded ? 'rotate-180' : ''
                                      }`} />
                                    </div>
                                  </div>
                                  
                                  <div className="mt-4">
                                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                                      <span>Progresso do indicador</span>
                                      <span>{progresso.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                      <div 
                                        className={`h-2.5 rounded-full ${
                                          progresso >= 100 ? 'bg-green-600' :
                                          progresso >= 70 ? 'bg-blue-600' :
                                          progresso >= 40 ? 'bg-yellow-600' : 'bg-red-600'
                                        }`}
                                        style={{ width: `${Math.min(progresso, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                                
                                {isExpanded && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50"
                                  >
                                    <div className="flex gap-4">
                                      <div className="flex-1">
                                        <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                                          Atualizar Valor
                                        </h5>
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="number"
                                            value={kpi.valor_atual}
                                            onChange={(e) => {
                                              const novoValor = parseFloat(e.target.value) || 0;
                                              // Update local state immediately for responsiveness
                                              // The actual save happens on blur
                                            }}
                                            onBlur={(e) => {
                                              const novoValor = parseFloat(e.target.value) || 0;
                                              if (novoValor !== kpi.valor_atual) {
                                                handleAtualizarKPI(kpi.id, novoValor);
                                              }
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                                            step="0.01"
                                          />
                                          <span className="text-gray-500 dark:text-gray-400">
                                            {kpi.unidade}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      <div className="text-sm">
                                        <div className="text-gray-600 dark:text-gray-300 mb-1">
                                          Última atualização
                                        </div>
                                        <div className="font-medium text-gray-900 dark:text-white">
                                          {kpi.ultima_atualizacao 
                                            ? formatarData(kpi.ultima_atualizacao)
                                            : 'Nunca atualizado'
                                          }
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {kpi.descricao && (
                                      <div className="mt-4">
                                        <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                                          Descrição
                                        </h5>
                                        <p className="text-gray-600 dark:text-gray-300">
                                          {kpi.descricao}
                                        </p>
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                            <FiBarChart2 className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                              Nenhum indicador definido
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300">
                              Adicione KPIs para monitorar o progresso desta meta
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sub-metas */}
                    {activeTab === 'submetas' && (
                      <div className="space-y-4">
                        {meta.submetas && meta.submetas.length > 0 ? (
                          meta.submetas.map((subMeta) => {
                            const isExpanded = expandedSubMeta === subMeta.id;
                            const isAtrasada = new Date(subMeta.data_fim) < new Date() && subMeta.status !== 'concluida';
                            
                            return (
                              <div
                                key={subMeta.id}
                                className={`bg-white dark:bg-gray-700/50 border rounded-xl overflow-hidden ${
                                  isAtrasada 
                                    ? 'border-red-300 dark:border-red-700' 
                                    : 'border-gray-200 dark:border-gray-700'
                                }`}
                              >
                                <div 
                                  className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors"
                                  onClick={() => setExpandedSubMeta(isExpanded ? null : subMeta.id)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={`p-2 rounded-lg ${
                                        subMeta.status === 'concluida' ? 'bg-green-100 dark:bg-green-800' :
                                        subMeta.status === 'em_andamento' ? 'bg-blue-100 dark:bg-blue-800' :
                                        subMeta.status === 'atrasada' ? 'bg-red-100 dark:bg-red-800' :
                                        'bg-gray-100 dark:bg-gray-700'
                                      }`}>
                                        <FiCheckSquare className={`h-5 w-5 ${
                                          subMeta.status === 'concluida' ? 'text-green-600 dark:text-green-400' :
                                          subMeta.status === 'em_andamento' ? 'text-blue-600 dark:text-blue-400' :
                                          subMeta.status === 'atrasada' ? 'text-red-600 dark:text-red-400' :
                                          'text-gray-600 dark:text-gray-400'
                                        }`} />
                                      </div>
                                      <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">
                                          {subMeta.titulo}
                                        </h4>
                                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                          <span className="flex items-center gap-1">
                                            <FiCalendar className="h-3 w-3" />
                                            {formatarData(subMeta.data_fim)}
                                          </span>
                                          <span>•</span>
                                          <span className="flex items-center gap-1">
                                            <FiUsers className="h-3 w-3" />
                                            {subMeta.responsavel}
                                          </span>
                                          {isAtrasada && (
                                            <>
                                              <span>•</span>
                                              <span className="text-red-600 dark:text-red-400 font-medium">
                                                Atrasada
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                      <div className="text-right">
                                        {subMeta.custo_estimado && (
                                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {formatarMoeda(subMeta.custo_estimado)}
                                          </div>
                                        )}
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                          subMeta.status === 'concluida' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                          subMeta.status === 'em_andamento' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                                          subMeta.status === 'atrasada' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                                          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                                        }`}>
                                          {subMeta.status === 'concluida' ? 'Concluída' :
                                           subMeta.status === 'em_andamento' ? 'Em Andamento' :
                                           subMeta.status === 'atrasada' ? 'Atrasada' : 'Pendente'}
                                        </span>
                                      </div>
                                      
                                      <FiChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${
                                        isExpanded ? 'rotate-180' : ''
                                      }`} />
                                    </div>
                                  </div>
                                </div>
                                
                                {isExpanded && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50"
                                  >
                                    <div className="grid grid-cols-2 gap-6">
                                      <div>
                                        <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                                          Descrição
                                        </h5>
                                        <p className="text-gray-600 dark:text-gray-300">
                                          {subMeta.descricao}
                                        </p>
                                        
                                        <div className="mt-4">
                                          <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Período
                                          </h5>
                                          <div className="text-sm text-gray-600 dark:text-gray-300">
                                            <div className="flex justify-between">
                                              <span>Início:</span>
                                              <span className="font-medium">{formatarData(subMeta.data_inicio)}</span>
                                            </div>
                                            <div className="flex justify-between mt-1">
                                              <span>Fim:</span>
                                              <span className={`font-medium ${
                                                isAtrasada ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                                              }`}>
                                                {formatarData(subMeta.data_fim)}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <div className="mb-4">
                                          <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Custos
                                          </h5>
                                          <div className="space-y-2">
                                            {subMeta.custo_estimado && (
                                              <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-300">Estimado:</span>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                  {formatarMoeda(subMeta.custo_estimado)}
                                                </span>
                                              </div>
                                            )}
                                            {subMeta.custo_real && (
                                              <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-300">Real:</span>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                  {formatarMoeda(subMeta.custo_real)}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        
                                        <div className="mb-4">
                                          <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Atualizar Status
                                          </h5>
                                          <div className="flex gap-2">
                                            {['pendente', 'em_andamento', 'concluida', 'atrasada'].map((status) => (
                                              <button
                                                key={status}
                                                onClick={() => handleAtualizarSubMeta(subMeta.id, status)}
                                                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                                                  subMeta.status === status
                                                    ? status === 'concluida' ? 'bg-green-600 text-white' :
                                                      status === 'em_andamento' ? 'bg-blue-600 text-white' :
                                                      status === 'atrasada' ? 'bg-red-600 text-white' :
                                                      'bg-gray-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                                }`}
                                              >
                                                {status === 'concluida' ? 'Concluir' :
                                                 status === 'em_andamento' ? 'Iniciar' :
                                                 status === 'atrasada' ? 'Atrasar' : 'Pendente'}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {subMeta.notas && (
                                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                                          Notas
                                        </h5>
                                        <p className="text-gray-600 dark:text-gray-300">
                                          {subMeta.notas}
                                        </p>
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                            <FiCheckSquare className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                              Nenhuma sub-meta definida
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300">
                              Adicione sub-metas para detalhar as ações necessárias
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Finanças */}
                    {activeTab === 'financas' && (
                      <div className="space-y-6">
                        {/* Resumo */}
                        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-6">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                            Resumo Financeiro
                          </h3>
                          <div className="grid grid-cols-3 gap-6">
                            <div className="text-center">
                              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                                {formatarMoeda(meta.orcamento_previsto || 0)}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">Total Previsto</div>
                            </div>
                            
                            <div className="text-center">
                              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                                {formatarMoeda(meta.orcamento_alocado || 0)}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">Alocado</div>
                            </div>
                            
                            <div className="text-center">
                              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                {formatarMoeda((meta.orcamento_previsto || 0) - (meta.orcamento_alocado || 0))}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">Disponível</div>
                            </div>
                          </div>
                          
                          <div className="mt-6">
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
                              <span>Uso do orçamento</span>
                              <span>{orcamentoUtilizado.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                              <div 
                                className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full"
                                style={{ width: `${Math.min(orcamentoUtilizado, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Histórico de Alocações */}
                        <div>
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                              Histórico de Alocações
                            </h3>
                            <button
                              onClick={onAlocarRecursos}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                            >
                              <FiPlus className="h-4 w-4" />
                              Nova Alocação
                            </button>
                          </div>
                          
                          {meta.alocacoes && meta.alocacoes.length > 0 ? (
                            <div className="space-y-3">
                              {meta.alocacoes.map((alocacao) => (
                                <div
                                  key={alocacao.id}
                                  className="bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="font-medium text-gray-900 dark:text-white mb-1">
                                        {formatarMoeda(alocacao.valor)}
                                      </div>
                                      <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                        {alocacao.motivo}
                                      </div>
                                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center gap-1">
                                          <FiCalendar className="h-3 w-3" />
                                          {formatarData(alocacao.data)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <FiUsers className="h-3 w-3" />
                                          {alocacao.responsavel}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        alocacao.tipo === 'completo' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                        alocacao.tipo === 'complementar' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                      }`}>
                                        {alocacao.tipo === 'completo' ? 'Completa' :
                                         alocacao.tipo === 'complementar' ? 'Complementar' : 'Parcial'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                              <FiDollarSign className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                              <p className="text-gray-600 dark:text-gray-300">
                                Nenhuma alocação registrada ainda
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
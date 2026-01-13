// pages/estrategia/MetaDetailsPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FiTarget, FiCalendar, FiUsers, FiDollarSign, 
  FiCheckCircle, FiClock, FiTrendingUp, FiBarChart2,
  FiChevronRight, FiChevronDown, FiEdit2, FiTrash2,
  FiPlus, FiX, FiAlertCircle, FiBook, FiBriefcase,
  FiHome, FiCheckSquare, FiPercent, FiTrendingDown,
  FiFileText, FiLink, FiDownload, FiEye, FiArrowLeft,
  FiActivity, FiPieChart, FiSave, FiRefreshCw
} from 'react-icons/fi';
import { Meta } from '../../types/eventos';
import { estrategiaService } from '../../services/database/estrategiaService';
import { toast } from 'react-hot-toast';
import { AlocacaoRecursosModal } from '../../components/finance/AlocacaoRecursosModal';
import { KPIManager } from '../../components/strategy/KPIManager';
import { SubMetasManager } from '../../components/strategy/SubMetasManager';

export const MetaDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'kpis' | 'submetas' | 'financas'>('overview');
  const [showAlocacaoModal, setShowAlocacaoModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  useEffect(() => {
    if (id) {
      carregarMeta();
    }
  }, [id]);

  const carregarMeta = async () => {
    try {
      setLoading(true);
      const metaData = await estrategiaService.getMetasID(id!);
      setMeta(metaData);
    } catch (error) {
      toast.error('Erro ao carregar meta');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAtualizarMeta = async () => {
    if (!meta) return;
    
    try {
      setAtualizando(true);
      await estrategiaService.calcularProgressoMeta(meta);
      await carregarMeta(); // Recarregar dados atualizados
      toast.success('Meta atualizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar meta');
    } finally {
      setAtualizando(false);
    }
  };

  const handleDelete = async () => {
    if (!meta) return;
    
    try {
      await estrategiaService.deleteMeta(meta.id);
      toast.success('Meta excluída com sucesso!');
      navigate('/estrategia/metas');
    } catch (error) {
      toast.error('Erro ao excluir meta');
    }
  };

  const handleAlocarRecursos = async (dados: any) => {
    try {
      if (!meta) return;
      
      // Aqui você chamaria seu serviço de alocação híbrido
      await estrategiaService.alocarRecursos(meta.id, dados);
      
      setShowAlocacaoModal(false);
      await carregarMeta(); // Recarregar dados atualizados
      toast.success('Recursos alocados com sucesso!');
    } catch (error) {
      toast.error('Erro ao alocar recursos');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FiAlertCircle className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Meta não encontrada</h2>
          <button
            onClick={() => navigate('/estrategia/metas')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voltar para Metas
          </button>
        </div>
      </div>
    );
  }

  // Funções auxiliares
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
      case 'academica': return <FiBook className="h-6 w-6 text-blue-500" />;
      case 'financeira': return <FiDollarSign className="h-6 w-6 text-green-500" />;
      case 'operacional': return <FiBriefcase className="h-6 w-6 text-purple-500" />;
      case 'marketing': return <FiTrendingUp className="h-6 w-6 text-orange-500" />;
      case 'infraestrutura': return <FiHome className="h-6 w-6 text-indigo-500" />;
      case 'qualidade': return <FiCheckCircle className="h-6 w-6 text-teal-500" />;
      default: return <FiTarget className="h-6 w-6 text-gray-500" />;
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

  // Estatísticas calculadas
  const kpisCompletos = meta.kpis?.filter(k => k.valor_atual >= k.valor_meta).length || 0;
  const subMetasCompletas = meta.submetas?.filter(sm => sm.status === 'concluida').length || 0;
  const orcamentoUtilizado = meta.orcamento_previsto 
    ? ((meta.orcamento_alocado || 0) / meta.orcamento_previsto) * 100 
    : 0;
  
  const diasRestantes = Math.ceil(
    (new Date(meta.data_fim).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: FiTarget },
    { id: 'kpis', label: 'Indicadores', icon: FiBarChart2, count: meta.kpis?.length },
    { id: 'submetas', label: 'Sub-metas', icon: FiCheckSquare, count: meta.submetas?.length },
    { id: 'financas', label: 'Finanças', icon: FiDollarSign }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Principal */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/estrategia/metas')}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FiArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 rounded-xl">
                  {getTipoIcon(meta.tipo)}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {meta.titulo}
                  </h1>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(meta.status)}`}>
                      {meta.status === 'em_andamento' ? 'Em Andamento' : 
                       meta.status === 'concluida' ? 'Concluída' : 
                       meta.status === 'atrasada' ? 'Atrasada' : 
                       meta.status === 'suspensa' ? 'Suspensa' : 'Não Iniciada'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getPrioridadeColor(meta.prioridade)}`}>
                      {meta.prioridade.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleAtualizarMeta}
                disabled={atualizando}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <FiRefreshCw className={`h-4 w-4 ${atualizando ? 'animate-spin' : ''}`} />
                {atualizando ? 'Atualizando...' : 'Atualizar'}
              </button>
              
              <button
                onClick={() => setShowAlocacaoModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:opacity-90 flex items-center gap-2"
              >
                <FiDollarSign className="h-4 w-4" />
                Alocar Recursos
              </button>
              
              <button
                onClick={() => navigate(`/estrategia/metas/editar/${meta.id}`)}
                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
              >
                <FiEdit2 className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
              >
                <FiTrash2 className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Descrição e Responsável */}
          <div className="mt-6">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {meta.descricao}
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-2">
                <FiUsers className="h-4 w-4" />
                <span className="font-medium text-gray-900 dark:text-white">
                  {meta.responsavel_principal}
                </span>
                {meta.responsaveis_secundarios && meta.responsaveis_secundarios.length > 0 && (
                  <span className="text-gray-400">
                    +{meta.responsaveis_secundarios.length} colaboradores
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2">
                <FiCalendar className="h-4 w-4" />
                {formatarData(meta.data_inicio)} - {formatarData(meta.data_fim)}
              </span>
              <span className="flex items-center gap-2">
                <FiActivity className="h-4 w-4" />
                {diasRestantes} dias restantes
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progresso Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Progresso Geral
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Atualizado automaticamente com base em KPIs, sub-metas e orçamento
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {meta.progresso.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Total alcançado
              </div>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2">
            <div 
              className={`h-4 rounded-full transition-all duration-500 ${
                meta.progresso >= 80 ? 'bg-green-500' :
                meta.progresso >= 50 ? 'bg-blue-500' :
                meta.progresso >= 30 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${meta.progresso}%` }}
            />
          </div>
          
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
            <span>Início</span>
            <span>Meta: 100%</span>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-lg">
                <FiBarChart2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
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
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-800 rounded-lg">
                <FiCheckSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
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
          
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-800 rounded-lg">
                <FiDollarSign className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
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
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-800 rounded-lg">
                <FiClock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
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

        {/* Navegação por Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium relative ${
                    isActive 
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
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

          {/* Conteúdo das Tabs */}
          <div className="p-6">
            {/* Visão Geral */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* SMART Criteria */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FiTarget className="text-blue-500" />
                    Critérios SMART
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Específico</h4>
                      <p className="text-gray-900 dark:text-white">{meta.especifico}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Mensurável</h4>
                      <p className="text-gray-900 dark:text-white">{meta.mensuravel}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Atingível</h4>
                      <p className="text-gray-900 dark:text-white">
                        {meta.atingivel ? 'Sim' : 'Não'}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Relevante</h4>
                      <p className="text-gray-900 dark:text-white">{meta.relevante}</p>
                    </div>
                    <div className="md:col-span-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Temporal</h4>
                      <p className="text-gray-900 dark:text-white">{meta.temporal}</p>
                    </div>
                  </div>
                </div>

                {/* Resumo Financeiro */}
                {meta.orcamento_previsto && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <FiPieChart className="text-yellow-500" />
                      Resumo Financeiro
                    </h3>
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-6">
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
                  </div>
                )}
              </div>
            )}

            {/* KPIs */}
            {activeTab === 'kpis' && (
              <KPIManager meta={meta} onUpdate={carregarMeta} />
            )}

            {/* Sub-metas */}
            {activeTab === 'submetas' && (
              <SubMetasManager meta={meta} onUpdate={carregarMeta} />
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
                      onClick={() => setShowAlocacaoModal(true)}
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
                          className="bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
          </div>
        </div>
      </div>

      {/* Modal de Alocação de Recursos */}
       <AlocacaoRecursosModal
        isOpen={showAlocacaoModal}
        onClose={() => setShowAlocacaoModal(false)}
        fundosDisponiveis={0}
        metas={meta ? [meta] : []}
        onAlocacaoSalva={handleAlocarRecursos}
        historicoAlocacoes={[]}
    />

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full"
          >
            <div className="text-center">
              <FiAlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Excluir Meta
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Tem certeza que deseja excluir a meta "{meta.titulo}"? 
                Esta ação não pode ser desfeita.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Excluir
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};


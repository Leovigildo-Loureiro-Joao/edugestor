// pages/RotinasPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiClock, 
  FiCalendar, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiUsers,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiFilter,
  FiSearch,
  FiPlay,
  FiPause,
  FiRefreshCw,
  FiBarChart2,
  FiChevronDown,
  FiChevronUp,
  FiList,
  FiActivity,
  FiTrendingUp,
  FiEye,
  FiCopy
} from 'react-icons/fi';
import { Rotina } from '../../types/eventos';
import { estrategiaService } from '../../services/database/estrategiaService.ts';
import { useAlert } from '../ui/AlertBadge.tsx';

const RotinasComponent = () => {
  const [rotinas, setRotinas] = useState<Rotina[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroFase, setFiltroFase] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('ativa');
  const [rotinaExpandida, setRotinaExpandida] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showMetrics, setShowMetrics] = useState(false);
  const { showAlert } = useAlert(); 
  const navigate = useNavigate();

  // Carregar rotinas
  useEffect(() => {
    loadRotinas();
  }, []);

  const loadRotinas = async () => {
    try {
      setLoading(true);
      const data = await estrategiaService.getRotinasDiarias();
      setRotinas(data);
    } catch (error) {
      console.error('Erro ao carregar rotinas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar rotinas
  const rotinasFiltradas = rotinas.filter(rotina => {
    // Busca
    if (searchTerm && !rotina.nome.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !rotina.descricao.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filtro de tipo
    if (filtroTipo !== 'todos' && rotina.tipo !== filtroTipo) {
      return false;
    }
    
    // Filtro de fase
    if (filtroFase !== 'todos' && rotina.fase !== filtroFase) {
      return false;
    }
    
    // Filtro de status
    if (filtroStatus !== 'todos' && rotina.status !== filtroStatus) {
      return false;
    }
    
    return true;
  });

  // Estatísticas
  const estatisticas = {
    total: rotinas.length,
    ativas: rotinas.filter(r => r.status === 'ativa').length,
    diarias: rotinas.filter(r => r.tipo === 'diaria').length,
    emConformidade: rotinas.filter(r => (r.taxa_conformidade || 0) >= 80).length
  };

  // Toggle expandir rotina
  const toggleExpandRotina = (id: string) => {
    setRotinaExpandida(rotinaExpandida === id ? null : id);
  };

  // Alternar status da rotina
  const toggleStatusRotina = async (rotina: Rotina) => {
    try {
      const novoStatus = rotina.status === 'ativa' ? 'inativa' : 'ativa';
      await estrategiaService.updateRotinaStatus(rotina.id, novoStatus);
      
      setRotinas(prev => prev.map(r => 
        r.id === rotina.id ? { ...r, status: novoStatus } : r
      ));
    } catch (error) {
      console.error('Erro ao alternar status:', error);
    }
  };

  // Executar rotina agora
  const executarRotina = async (rotinaId: string) => {
    try {
      await estrategiaService.executarRotina(rotinaId);
      showAlert({
        type: 'success',
        message:"Rotina executada com sucesso!",
        title: 'Executando rotina',
        duration: 3000
      });
    } catch (error) {
      console.error('Erro ao executar rotina:', error);
      showAlert({
        type: 'error',
        message:"Erro ao executar rotina",
        title: 'Não foi possivel executar a rotina',
        duration: 5000
      });
    }
  };

  // Duplicar rotina
  const duplicarRotina = (rotina: Rotina) => {
    const novaRotina = {
      ...rotina,
      nome: `${rotina.nome} (Cópia)`,
      status: 'ativa',
      versao: 1,
      data_implementacao: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Rotina;
    
    setRotinas([novaRotina, ...rotinas]);
  };

  // Renderizar badge de tipo
  const renderTipoBadge = (tipo: string) => {
    const config = {
      diaria: { label: 'DIÁRIA', color: 'bg-blue-100 text-blue-800', icon: '🌅' },
      semanal: { label: 'SEMANAL', color: 'bg-green-100 text-green-800', icon: '📅' },
      mensal: { label: 'MENSAL', color: 'bg-purple-100 text-purple-800', icon: '📆' },
      trimestral: { label: 'TRIMESTRAL', color: 'bg-orange-100 text-orange-800', icon: '📊' },
      anual: { label: 'ANUAL', color: 'bg-red-100 text-red-800', icon: '🎯' }
    }[tipo] || { label: tipo.toUpperCase(), color: 'bg-gray-100 text-gray-800', icon: '📋' };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  // Renderizar badge de fase
  const renderFaseBadge = (fase: string) => {
    const config = {
      abertura: { label: 'ABERTURA', color: 'bg-blue-50 text-blue-700 border border-blue-200' },
      operacao: { label: 'OPERAÇÃO', color: 'bg-green-50 text-green-700 border border-green-200' },
      encerramento: { label: 'ENCERRAMENTO', color: 'bg-purple-50 text-purple-700 border border-purple-200' },
      administrativa: { label: 'ADMINISTRATIVA', color: 'bg-gray-50 text-gray-700 border border-gray-200' }
    }[fase] || { label: fase.toUpperCase(), color: 'bg-gray-50 text-gray-700' };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Renderizar status da rotina
  const renderStatusBadge = (status: string, taxaConformidade?: number) => {
    const statusConfig = {
      ativa: { label: 'ATIVA', color: 'bg-green-100 text-green-800', icon: '✅' },
      inativa: { label: 'INATIVA', color: 'bg-gray-100 text-gray-800', icon: '⏸️' },
      suspensa: { label: 'SUSPENSA', color: 'bg-red-100 text-red-800', icon: '⏸️' }
    }[status] || { label: status.toUpperCase(), color: 'bg-gray-100 text-gray-800', icon: '❓' };

    return (
      <div className="flex items-center space-x-2">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
          <span className="mr-1">{statusConfig.icon}</span>
          {statusConfig.label}
        </span>
        {taxaConformidade !== undefined && status === 'ativa' && (
          <div className="text-xs text-gray-600">
            Conformidade: <span className={`font-semibold ${taxaConformidade >= 80 ? 'text-green-600' : 'text-red-600'}`}>
              {taxaConformidade}%
            </span>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2 flex items-center">
              <FiClock className="mr-3" />
              Rotinas Diárias
            </h1>
            <p className="text-gray-600">
              Gerencie os processos padronizados do centro educacional
            </p>
          </div>
          
          <button
            onClick={() => navigate('/rotinas/nova')}
            className="mt-4 md:mt-0 bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-800 flex items-center"
          >
            <FiPlus className="mr-2" />
            Nova Rotina
          </button>
        </div>
      </div>


      {/* Filtros e Controles */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
          {/* Busca */}
          <div className="relative flex-1 lg:max-w-md">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar rotinas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-4 py-2 border rounded-lg text-sm"
            >
              <option value="todos">Todos os tipos</option>
              <option value="diaria">Diária</option>
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
              <option value="trimestral">Trimestral</option>
              <option value="anual">Anual</option>
            </select>

            <select
              value={filtroFase}
              onChange={(e) => setFiltroFase(e.target.value)}
              className="px-4 py-2 border rounded-lg text-sm"
            >
              <option value="todos">Todas as fases</option>
              <option value="abertura">Abertura</option>
              <option value="operacao">Operação</option>
              <option value="encerramento">Encerramento</option>
              <option value="administrativa">Administrativa</option>
            </select>

            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-4 py-2 border rounded-lg text-sm"
            >
              <option value="todos">Todos status</option>
              <option value="ativa">Ativa</option>
              <option value="inativa">Inativa</option>
              <option value="suspensa">Suspensa</option>
            </select>

            {/* View Mode */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 rounded ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
              >
                <FiCalendar />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
              >
                <FiList />
              </button>
            </div>

            <button
              onClick={() => setShowMetrics(!showMetrics)}
              className={`px-4 py-2 rounded-lg text-sm flex items-center ${
                showMetrics ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <FiBarChart2 className="mr-2" />
              Métricas
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Rotinas */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rotinasFiltradas.map((rotina, index) => (
            <motion.div
              key={rotina.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow"
            >
              {/* Cabeçalho do Card */}
              <div className="p-6 border-b">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      {renderTipoBadge(rotina.tipo)}
                      {renderStatusBadge(rotina.status, rotina.taxa_conformidade)}
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {rotina.nome}
                    </h3>
                    
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {rotina.descricao}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-gray-500">
                        {renderFaseBadge(rotina.fase)}
                      </div>
                      
                      {rotina.horario_ideal && (
                        <div className="flex items-center text-gray-600">
                          <FiClock className="mr-1" size={14} />
                          <span className="text-sm">{rotina.horario_ideal}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Métricas (se ativadas) */}
              {showMetrics && (
                <div className="px-6 py-4 bg-gray-50 border-b">
                  <div className="grid grid-cols-2 gap-4">
                    {rotina.tempo_medio_execucao_minutos && (
                      <div>
                        <div className="text-xs text-gray-500">Tempo Médio</div>
                        <div className="font-semibold">{rotina.tempo_medio_execucao_minutos} min</div>
                      </div>
                    )}
                    {rotina.taxa_conformidade !== undefined && (
                      <div>
                        <div className="text-xs text-gray-500">Conformidade</div>
                        <div className="font-semibold">{rotina.taxa_conformidade}%</div>
                      </div>
                    )}
                    {rotina.incidentes && rotina.incidentes.length > 0 && (
                      <div className="col-span-2">
                        <div className="text-xs text-gray-500">Incidentes</div>
                        <div className="font-semibold text-red-600">
                          {rotina.incidentes.filter(i => !i.resolvido).length} pendentes
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Passos (expandidos) */}
              <AnimatePresence>
                {rotinaExpandida === rotina.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-b"
                  >
                    <div className="p-6">
                      <h4 className="font-semibold text-gray-700 mb-4 flex items-center">
                        <FiList className="mr-2" />
                        Passos da Rotina
                      </h4>
                      
                      <div className="space-y-3">
                        {rotina.passos.map((passo, idx) => (
                          <div key={idx} className="flex items-start p-3 bg-gray-50 rounded-lg">
                            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                              {passo.ordem}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{passo.atividade}</div>
                              {passo.descricao && (
                                <div className="text-sm text-gray-600 mt-1">{passo.descricao}</div>
                              )}
                              <div className="flex items-center justify-between mt-2">
                                <div className="text-xs text-gray-500">
                                  <FiUsers className="inline mr-1" />
                                  {passo.responsavel} • {passo.tempo_estimado_minutos} min
                                </div>
                                {passo.obrigatorio && (
                                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                    Obrigatório
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Ações */}
              <div className="p-4 flex justify-between items-center">
                <div className="flex space-x-2">
                  <button
                    onClick={() => toggleExpandRotina(rotina.id)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Ver detalhes"
                  >
                    {rotinaExpandida === rotina.id ? <FiChevronUp /> : <FiChevronDown />}
                  </button>
                  
                  <button
                    onClick={() => executarRotina(rotina.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Executar agora"
                  >
                    <FiPlay />
                  </button>
                  
                  {rotina.status === 'ativa' && (
                    <button
                      onClick={() => toggleStatusRotina(rotina)}
                      className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                      title="Pausar rotina"
                    >
                      <FiPause />
                    </button>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => duplicarRotina(rotina)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Duplicar rotina"
                  >
                    <FiCopy />
                  </button>
                  
                  <button
                    onClick={() => navigate(`/rotinas/editar/${rotina.id}`)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Editar rotina"
                  >
                    <FiEdit2 />
                  </button>
                  
                  {rotina.status === 'inativa' && (
                    <button
                      onClick={() => toggleStatusRotina(rotina)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Ativar rotina"
                    >
                      <FiRefreshCw />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 text-left text-gray-700 font-semibold">Rotina</th>
                <th className="p-4 text-left text-gray-700 font-semibold">Tipo</th>
                <th className="p-4 text-left text-gray-700 font-semibold">Fase</th>
                <th className="p-4 text-left text-gray-700 font-semibold">Status</th>
                <th className="p-4 text-left text-gray-700 font-semibold">Passos</th>
                <th className="p-4 text-left text-gray-700 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rotinasFiltradas.map((rotina) => (
                <React.Fragment key={rotina.id}>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-semibold text-gray-800">{rotina.nome}</div>
                      <div className="text-sm text-gray-600 mt-1">{rotina.descricao}</div>
                      {rotina.horario_ideal && (
                        <div className="text-xs text-gray-500 mt-1">
                          <FiClock className="inline mr-1" />
                          {rotina.horario_ideal}
                        </div>
                      )}
                    </td>
                    <td className="p-4">{renderTipoBadge(rotina.tipo)}</td>
                    <td className="p-4">{renderFaseBadge(rotina.fase)}</td>
                    <td className="p-4">
                      {renderStatusBadge(rotina.status, rotina.taxa_conformidade)}
                    </td>
                    <td className="p-4">
                      <div className="text-sm">{rotina.passos.length} passos</div>
                      <div className="text-xs text-gray-500">
                        {rotina.passos.reduce((acc, passo) => acc + passo.tempo_estimado_minutos, 0)} min total
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => toggleExpandRotina(rotina.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <FiEye />
                        </button>
                        <button
                          onClick={() => executarRotina(rotina.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        >
                          <FiPlay />
                        </button>
                        <button
                          onClick={() => navigate(`/rotinas/editar/${rotina.id}`)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          <FiEdit2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Linha expandida com detalhes */}
                  {rotinaExpandida === rotina.id && (
                    <tr>
                      <td colSpan={6} className="bg-gray-50 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <h4 className="font-semibold mb-3">Passos</h4>
                            <div className="space-y-2">
                              {rotina.passos.slice(0, 3).map((passo, idx) => (
                                <div key={idx} className="text-sm">
                                  <span className="font-medium">{passo.ordem}. {passo.atividade}</span>
                                  <div className="text-gray-600 ml-4">{passo.responsavel} • {passo.tempo_estimado_minutos}min</div>
                                </div>
                              ))}
                              {rotina.passos.length > 3 && (
                                <div className="text-sm text-blue-600">
                                  + {rotina.passos.length - 3} passos restantes
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-3">Informações</h4>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="font-medium">Criada em:</span> {new Date(rotina.data_implementacao).toLocaleDateString('pt-BR')}
                              </div>
                              <div>
                                <span className="font-medium">Responsável:</span> {rotina.responsavel_criacao}
                              </div>
                              <div>
                                <span className="font-medium">Versão:</span> {rotina.versao}
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-3">Métricas</h4>
                            <div className="space-y-2 text-sm">
                              {rotina.taxa_conformidade !== undefined && (
                                <div>
                                  <span className="font-medium">Conformidade:</span> {rotina.taxa_conformidade}%
                                </div>
                              )}
                              {rotina.tempo_medio_execucao_minutos && (
                                <div>
                                  <span className="font-medium">Tempo médio:</span> {rotina.tempo_medio_execucao_minutos}min
                                </div>
                              )}
                              {rotina.incidentes && rotina.incidentes.length > 0 && (
                                <div>
                                  <span className="font-medium">Incidentes:</span> {rotina.incidentes.length}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mensagem quando não há rotinas */}
      {rotinasFiltradas.length === 0 && (
        <div className="text-center py-16">
          <FiAlertCircle className="mx-auto text-gray-400 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Nenhuma rotina encontrada
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm ? 'Tente ajustar os termos de busca' : 'Comece criando sua primeira rotina'}
          </p>
          <button
            onClick={() => navigate('/rotinas/nova')}
            className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-800"
          >
            <FiPlus className="inline mr-2" />
            Criar Primeira Rotina
          </button>
        </div>
      )}

      {/* Rodapé com resumo */}
      {rotinasFiltradas.length > 0 && (
        <div className="mt-8 bg-white  p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-800">Resumo</h4>
              <p className="text-gray-600 text-sm">
                Mostrando {rotinasFiltradas.length} de {rotinas.length} rotinas
              </p>
            </div>
            
            <div className="mt-4 md:mt-0 flex flex-wrap gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {rotinas.filter(r => r.tipo === 'diaria' && r.status === 'ativa').length}
                </div>
                <div className="text-sm text-gray-600">Diárias ativas</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(
                    rotinas.filter(r => r.taxa_conformidade)
                      .reduce((acc, r) => acc + (r.taxa_conformidade || 0), 0) / 
                    rotinas.filter(r => r.taxa_conformidade).length
                  )}%
                </div>
                <div className="text-sm text-gray-600">Conformidade média</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {rotinas.reduce((acc, r) => acc + r.passos.length, 0)}
                </div>
                <div className="text-sm text-gray-600">Total de passos</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RotinasComponent;
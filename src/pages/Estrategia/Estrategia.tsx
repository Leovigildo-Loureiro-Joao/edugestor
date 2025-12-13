// pages/EstrategiaPage.tsx
import React, { useState, useEffect } from 'react';
import { 
  FiTarget, 
  FiCalendar, 
  FiCheckCircle, 
  FiClock, 
  FiList, 
  FiUsers,
  FiTrendingUp,
  FiPlus,
  FiChevronRight,
  FiAlertCircle,
  FiBarChart2,
  FiDollarSign,
  FiBookOpen,
  FiHome,
  FiSettings
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Tarefa, Meta, Rotina, PlanoAcao } from '../../types/eventos';
import { estrategiaService } from '../../services/strategy/estrategiaService';
import { CalendarWithEvents } from '../../components/dashboad/Calendary';
import TarefasKanban from '../../components/strategy/TarefasKanban';
import { useParams } from 'react-router-dom';

const EstrategiaPage = () => {
  const [activeTab, setActiveTab] = useState('metas');
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [rotinas, setRotinas] = useState<Rotina[]>([]);
  const [planoAtividades, setPlanoAtividades] = useState<PlanoAcao[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMeta, setExpandedMeta] = useState<string | null>(null);
  const [newTask, setNewTask] = useState('');
  const seccaoAtual = useParams().seccao || 'metas';


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setActiveTab(seccaoAtual);
      setLoading(true);
      const [tarefasData, metasData, rotinasData, planoData] = await Promise.all([
        estrategiaService.getTarefas(),
        estrategiaService.getMetas(),
        estrategiaService.getRotinasDiarias(),
        estrategiaService.getPlanoAtividades()
      ]);
      setTarefas(tarefasData);
      setMetas(metasData);
      setRotinas(rotinasData);
      setPlanoAtividades(planoData);
      console.log('Tarefas carregadas:', tarefasData);
      console.log('Metas carregadas:', metasData);
      console.log('Rotinas carregadas:', rotinasData);
      console.log('Plano de Atividades carregado:', planoData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
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
      default: return <FiTarget className="text-gray-500" />;
    }
  };

  const getPriorityColor = (prioridade: string) => {
    switch(prioridade) {
      case 'alta': return 'bg-red-100 text-red-800 border-red-200';
      case 'media': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'baixa': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const tabVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  const tabs = [
    { id: 'metas', label: 'Metas', icon: <FiTarget />, count: metas.length },
    { id: 'tarefas', label: 'Tarefas', icon: <FiList />, count: tarefas.length },
    { id: 'rotinas', label: 'Rotinas', icon: <FiClock /> },
    { id: 'plano', label: 'Plano de Atividades', icon: <FiCalendar /> },
    {id: 'eventos', label: 'Eventos', icon: <FiCalendar /> }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
          Planejamento Estratégico
        </h1>
        <p className="text-gray-600">
          Gerencie metas, tarefas e rotinas do centro educacional
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total de Metas</p>
              <h3 className="text-2xl font-bold">{metas.length}</h3>
            </div>
            <FiTarget className="text-3xl text-blue-500" />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Tarefas Pendentes</p>
              <h3 className="text-2xl font-bold">
                {tarefas.filter(t => !t.concluida).length}
              </h3>
            </div>
            <FiList className="text-3xl text-green-500" />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Rotinas Diárias</p>
              <h3 className="text-2xl font-bold">{rotinas.length}</h3>
            </div>
            <FiClock className="text-3xl text-purple-500" />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Progresso Geral</p>
              <h3 className="text-2xl font-bold">75%</h3>
            </div>
            <FiBarChart2 className="text-3xl text-orange-500" />
          </div>
        </motion.div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-white rounded-xl shadow-md p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              <span className="font-medium">{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-2 py-1 text-xs rounded-full ${
                  activeTab === tab.id
                    ? 'bg-blue-600'
                    : 'bg-gray-200'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={tabVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Metas Tab */}
          {activeTab === 'metas' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                  <FiTarget className="mr-2" />
                  Metas Estratégicas
                </h2>
                <button className="btn btn-primary">
                  <FiPlus className="mr-2" />
                  Nova Meta
                </button>
              </div>

              <div className="space-y-4">
                {metas.map((meta) => (
                  <motion.div
                    key={meta.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div 
                      className="p-4 cursor-pointer"
                      onClick={() => toggleMeta(meta.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getMetaIcon(meta.tipo)}
                          <div>
                            <h3 className="font-semibold text-gray-800">
                              {meta.tipo.charAt(0).toUpperCase() + meta.tipo.slice(1)} Meta
                            </h3>
                            <p className="text-sm text-gray-500">
                              {meta.descricao}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${meta.progresso}%` }}
                            ></div>
                          </div>
                          <span className="font-semibold">{meta.progresso}%</span>
                          <FiChevronRight className={`transform transition-transform ${
                            expandedMeta === meta.id ? 'rotate-90' : ''
                          }`} />
                        </div>
                      </div>
                    </div>

                    {expandedMeta === meta.id && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        className="border-t border-gray-100 p-4 bg-gray-50"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold text-sm text-gray-600 mb-2">
                              Indicadores
                            </h4>
                            <ul className="space-y-1">
                              {meta.kpis?.map((ind, idx) => (
                                <li key={idx} className="flex items-center text-sm">
                                  <FiCheckCircle className="text-green-500 mr-2" />
                                  {ind.nome}: {ind.valor_atual} / {ind.valor_meta} {ind.unidade}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-gray-600 mb-2">
                              Prazos
                            </h4>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Início:</span>
                                <span className="font-medium">
                                  {new Date(meta.data_inicio).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Fim:</span>
                                <span className="font-medium">
                                  {new Date(meta.data_fim).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Tarefas Tab */}
          {activeTab === 'tarefas' && (
          <TarefasKanban />
          )}

          {/* Rotinas Tab */}
          {activeTab === 'rotinas' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center mb-6">
                <FiClock className="mr-2" />
                Rotinas Diárias
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rotinas.map((rotina, index) => (
                  <motion.div
                    key={rotina.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        {rotina.periodo === 'manha' ? (
                          <FiCalendar className="text-blue-600" />
                        ) : rotina.periodo === 'tarde' ? (
                          <FiClock className="text-orange-600" />
                        ) : (
                          <FiHome className="text-purple-600" />
                        )}
                      </div>
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                        {rotina.horario}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">
                      {rotina.titulo}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                      {rotina.descricao}
                    </p>
                    <div className="flex items-center text-sm text-gray-500">
                      <FiUsers className="mr-1" />
                      <span>{rotina.responsavel}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
          {
            activeTab === 'eventos' && (
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center mb-6">
                  <FiCalendar className="mr-2" />
                  Calendário de Eventos
                </h2>
                <CalendarWithEvents />
              </div>
            )
          }
          {/* Plano de Atividades Tab */}
          {activeTab === 'plano' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center mb-6">
                <FiCalendar className="mr-2" />
                Plano de Atividades
              </h2>


              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-3 text-left text-gray-600 font-semibold">Meta</th>
                      <th className="p-3 text-left text-gray-600 font-semibold">Responsável</th>
                      <th className="p-3 text-center text-gray-600 font-semibold">Status</th>
                      <th className="p-3 text-left text-gray-600 font-semibold">Progresso</th>
                      <th className="p-3 text-left text-gray-600 font-semibold">Prazo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metas.map((meta) => {
                      // Calcula dias restantes
                      const diasRestantes = Math.ceil(
                        (new Date(meta.data_fim).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
                      );
                      
                      return (
                        <tr key={meta.id} className="border-b border-gray-100 hover:bg-gray-50">
                          {/* Coluna 1: Meta */}
                          <td className="p-3">
                            <div className="font-medium text-gray-800">{meta.titulo}</div>
                            <div className="text-sm text-gray-500 mt-1">{meta.descricao.substring(0, 80)}...</div>
                            <div className="mt-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                meta.tipo === 'academica' ? 'bg-blue-100 text-blue-800' :
                                meta.tipo === 'financeira' ? 'bg-green-100 text-green-800' :
                                meta.tipo === 'operacional' ? 'bg-purple-100 text-purple-800' :
                                meta.tipo === 'marketing' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {meta.tipo.toUpperCase()}
                              </span>
                            </div>
                          </td>
                          
                          {/* Coluna 2: Responsável */}
                          <td className="p-3">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                                <span className="text-sm font-medium text-gray-600">
                                  {meta.responsavel_principal.substring(0, 1)}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium">{meta.responsavel_principal}</div>
                                <div className="text-sm text-gray-500">Principal</div>
                              </div>
                            </div>
                          </td>
                          
                          {/* Coluna 3: Status */}
                          <td className="p-3">
                            <span className={`inline-flex whitespace-nowrap items-center px-3 py-1 rounded-full text-sm font-medium ${
                              meta.status === 'concluida' ? 'bg-green-100 text-green-800' :
                              meta.status === 'em_andamento' ? 'bg-blue-100 text-blue-800' :
                              meta.status === 'atrasada' ? 'bg-red-100 text-red-800' :
                              meta.status === 'nao_iniciada' ? 'bg-gray-100 text-gray-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {meta.status === 'concluida' ? '✓ Concluída' :
                              meta.status === 'em_andamento' ? '↻ Em Andamento' :
                              meta.status === 'atrasada' ? '⚠ Atrasada' :
                              meta.status === 'nao_iniciada' ? '○ Não Iniciada' :
                              meta.status}
                            </span>
                          </td>
                          
                          {/* Coluna 4: Progresso */}
                          <td className="p-3">
                            <div className="flex items-center">
                              <div className="w-full bg-gray-200 rounded-full h-2 mr-3">
                                <div 
                                  className={`h-2 rounded-full ${
                                    meta.progresso >= 80 ? 'bg-green-500' :
                                    meta.progresso >= 50 ? 'bg-blue-500' :
                                    meta.progresso >= 30 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${meta.progresso}%` }}
                                ></div>
                              </div>
                              <div className="text-sm font-medium w-12 text-right">
                                {meta.progresso}%
                              </div>
                            </div>
                            {meta.kpis && meta.kpis.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                {meta.kpis.length} KPIs monitorados
                              </div>
                            )}
                          </td>
                          
                          {/* Coluna 5: Prazo */}
                          <td className="p-3">
                            <div className="text-sm font-medium">
                              {new Date(meta.data_fim).toLocaleDateString('pt-BR')}
                            </div>
                            <div className={`text-xs mt-1 ${
                              diasRestantes < 7 ? 'text-red-600 font-medium' :
                              diasRestantes < 30 ? 'text-yellow-600' :
                              'text-gray-500'
                            }`}>
                              {diasRestantes > 0 ? `${diasRestantes} dias restantes` : 'Prazo expirado'}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Quick Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 bg-white rounded-xl shadow-lg p-6"
      >
        <h3 className="font-semibold text-gray-800 mb-4">Ações Rápidas</h3>
        <div className="flex flex-wrap gap-3">
          
          <button className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
            <FiCalendar className="inline mr-2" />
            Agendar Reunião
          </button>
          <button className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors">
            <FiUsers className="inline mr-2" />
            Contatar Pais
          </button>
          <button className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors">
            <FiTrendingUp className="inline mr-2" />
            Relatório Mensal
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default EstrategiaPage;
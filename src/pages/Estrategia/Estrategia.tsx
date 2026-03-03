// pages/EstrategiaPage
import React, { useState, useEffect } from 'react';
import { 
  FiTarget, 
  FiCalendar, 
  FiList, 
  FiUsers,
  FiTrendingUp,
  FiBarChart2
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Tarefa, Meta } from '../../types/eventos';
import { estrategiaService } from '../../services/database/estrategiaService';
import { CalendarWithEvents } from '../../components/dashboad/Calendary';
import { useNavigate, useParams } from 'react-router-dom';
import {
  TarefasKanban,
  MetaComponent,
  EventosPorMeta,
  DashboardIntegrado,
  PlaneamentoComponent,
} from '../../components/strategy';
import { useConfirmModal } from '../../components/ui/ComfirmModal';
import { SyncStatusBadge } from '../../components/ui/SyncStatusBadge';
import { PageLoader } from '../../components/ui/PageLoader';


const EstrategiaPage = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(true);
  const { ModalComponent } = useConfirmModal();
  const seccaoAtual = useParams().seccao || 'home';
  const navigate = useNavigate();

  const [estatisticas, setEstatisticas] = useState<{
    progressoGeral: number,
    proximosPrazos?: [],
    alertas?: []
  }>({
    progressoGeral: 0,
    proximosPrazos: [],
    alertas: []
  });

  

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setActiveTab(seccaoAtual);
      setLoading(true);
      const [tarefasData, metasData,progressoData] = await Promise.all([
        estrategiaService.getTarefas(),
        estrategiaService.getMetas(),
        estrategiaService.getProgressoEstrategias(),
      ]);
      setTarefas(tarefasData);
      setMetas(metasData);
      setEstatisticas({
        progressoGeral: progressoData.progressoTotal
      });
      } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  

  const getPriorityColor = (prioridade: string) => {
    switch(prioridade) {
      case 'alta': return 'bg-red-100 text-red-800 border-red-200';
      case 'media': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'baixa': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600';
    }
  };

  const tabVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  // Atualize as tabs para incluir todos os níveis
const tabs = [
  {id:'home', label:'Estatisticas gerais', icon:FiTrendingUp},
  { id: 'planeamento', label: 'Planeamento', icon: FiBarChart2 },
  { id: 'metas', label: 'Metas', icon: FiTarget, count: metas.length },
  { id: 'tarefas', label: 'Tarefas', icon: FiList, count: tarefas.length },
  { id: 'eventos', label: 'Eventos', icon: FiCalendar }
];
  

  if (loading) {
    return <PageLoader title="Carregando estratégia" subtitle="Sincronizando metas, tarefas e planeamento..." />;
  }

  return (
    <div className="min-h-screen rounded-md dark:bg-gray-900  p-4 md:p-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl sm:text-3xl font-bold dark:text-white text-gray-800 mb-2">
          Planeamento Estratégico
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-200">
          Gerencie metas, tarefas e planeamento do centro educacional
        </p>
      </motion.div>

      {/* Tabs Navigation */}
      
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {tabs.map(aba => (
            <button
              key={aba.id}
              onClick={() => {setActiveTab(aba.id as any); navigate('/estrategia/'+aba.id)}}
              className={`flex items-center justify-center gap-2 py-4 px-2 sm:px-1 border-b-2 font-medium text-sm ${
                activeTab === aba.id
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <aba.icon size={18} />
              <span className="hidden sm:inline">{aba.label}</span>
            </button>
          ))}
        </nav>
      </div>
      <ModalComponent/>
      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={tabVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Metas Tab */}
          {activeTab === 'home' && (
            <DashboardIntegrado metas={metas} tarefas={tarefas}/>
          )}
          {
            activeTab ==='planeamento'&&(
              <PlaneamentoComponent setMetas={setMetas} metas={metas} />
            )
          }
          
          {activeTab === 'metas' && (
            <MetaComponent loadData={loadData} metas={metas} setMetas={setMetas}/>
          )}

          {/* Tarefas Tab */}
          {activeTab === 'tarefas' && (
          <TarefasKanban />
          )}
          
          {
            activeTab === 'eventos' && (
              <div className="p-6">
                <div className='p-4'>
                  <div className='flex items-center gap-3'>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                    <FiCalendar className="mr-2" />
                    Calendário de Eventos
                  </h2>
                  <SyncStatusBadge tableName='evento'></SyncStatusBadge>
                </div>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
                    Gerencie e acompanhe os seus eventos bem como os feriados
                  </p>
              </div>
                <div className="space-y-8 p-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                   <EventosPorMeta />
                  <CalendarWithEvents />
                </div>
              </div>
            )
          }
          
        </motion.div>
      </AnimatePresence>

      {/* Quick Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
      >
        <h3 className="text-base sm:text-lg font-semibold dark:text-white text-gray-800 mb-4">Ações Rápidas</h3>
        <div className="flex flex-wrap gap-3">
          
          <button className="px-4 py-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors">
            <FiCalendar className="inline mr-2" />
            Agendar Reunião
          </button>
          <button className="px-4 py-2 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors">
            <FiUsers className="inline mr-2" />
            Contatar Pais
          </button>
          <button className="px-4 py-2 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors">
            <FiTrendingUp className="inline mr-2" />
            Relatório Mensal
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default EstrategiaPage;

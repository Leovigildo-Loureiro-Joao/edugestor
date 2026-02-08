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
import { estrategiaService } from '../../services/database/estrategiaService';
import { CalendarWithEvents } from '../../components/dashboad/Calendary';
import TarefasKanban from '../../components/strategy/TarefasKanban';
import { useParams } from 'react-router-dom';
import MetaComponent from '../../components/strategy/Meta';
import  RotinaComponent  from '../../components/strategy/Rotina';
import EventosPorMeta from '../../components/strategy/EventoPorMeta';
import { useConfirmModal } from '../../components/ui/ComfirmModal';
import { useAlert } from '../../components/ui/AlertBadge';
import { PlanejamentoAnual } from '../../components/strategy/PlaneamentoAnual';
import { PlanejamentoSemanal } from '../../components/strategy/PlaneamentoSemanal';
import { PlanejamentoDiario } from '../../components/strategy/PlaneamentoDiario';
import PlanejamentoMensal from '../../components/strategy/PlaneamentoMensal';
import PlanejamentoTrimestral from '../../components/strategy/PlaneamentoTrimestral';
import DashboardIntegrado from '../../components/strategy/HomeDetails';
import PlaneamentoComponent from '../../components/strategy/Planeamento';
import { FaApper, FaHandPaper, FaPaperPlane } from 'react-icons/fa';


const EstrategiaPage = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [rotinas, setRotinas] = useState<Rotina[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirm, ModalComponent } = useConfirmModal();
  const { showAlert } = useAlert(); 
  const [newTask, setNewTask] = useState('');
  const seccaoAtual = useParams().seccao || 'home';

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
      const [tarefasData, metasData, rotinasData,progressoData] = await Promise.all([
        estrategiaService.getTarefas(),
        estrategiaService.getMetas(),
        estrategiaService.getRotinasDiarias(),
        estrategiaService.getProgressoEstrategias(),
      ]);
      setTarefas(tarefasData);
      setMetas(metasData);
      setRotinas(rotinasData);
      setEstatisticas({
        progressoGeral: progressoData.progressoTotal
      });
      console.log('Tarefas carregadas:', tarefasData);
      console.log('Metas carregadas:', metasData);
      console.log('Rotinas carregadas:', rotinasData);

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
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const tabVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  // Atualize as tabs para incluir todos os níveis
const tabs = [
  {id:'home', label:'Estatisticas gerais', icon:FiTrendingUp},
  { id: 'planeamento', label: 'Planeamento', icon: FaPaperPlane },
  { id: 'metas', label: 'Metas', icon: FiTarget, count: metas.length },
  { id: 'tarefas', label: 'Tarefas', icon: FiList, count: tarefas.length },
  { id: 'eventos', label: 'Eventos', icon: FiCalendar }
];
  

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen rounded-md dark:bg-gray-900  p-4 md:p-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl md:text-3xl font-bold dark:text-white text-gray-800 mb-2">
          Planejamento Estratégico
        </h1>
        <p className="text-gray-600 dark:text-gray-200">
          Gerencie metas, tarefas e rotinas do centro educacional
        </p>
      </motion.div>

      {/* Tabs Navigation */}
      
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {tabs.map(aba => (
            <button
              key={aba.id}
              onClick={() => setActiveTab(aba.id as any)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === aba.id
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <aba.icon size={18} />
              {aba.label}
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
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Metas Tab */}
          {activeTab === 'home' && (
            <DashboardIntegrado metas={metas} tarefas={tarefas}/>
          )}
          {
            activeTab ==='planeamento'&&(
              <PlaneamentoComponent metas={metas} setMetas={setMetas}/>
            )
          }
          
          {activeTab === 'metas' && (
            <MetaComponent metas={metas} setMetas={setMetas}/>
          )}

          {/* Tarefas Tab */}
          {activeTab === 'tarefas' && (
          <TarefasKanban />
          )}

          {
            activeTab === 'eventos' && (
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center mb-6">
                  <FiCalendar className="mr-2" />
                  Calendário de Eventos
                </h2>
                <div className="space-y-8 grid grid-cols-1 md:grid-cols-2 gap-8">
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
        className="mt-8 bg-white dark:bg-gray-700 rounded-xl shadow-lg p-6"
      >
        <h3 className="font-semibold dark:text-white text-gray-800 mb-4">Ações Rápidas</h3>
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
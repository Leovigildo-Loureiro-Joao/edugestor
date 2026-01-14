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

const EstrategiaPage = () => {
  const [activeTab, setActiveTab] = useState('metas');
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [rotinas, setRotinas] = useState<Rotina[]>([]);
  const [loading, setLoading] = useState(true);

  const [newTask, setNewTask] = useState('');
  const seccaoAtual = useParams().seccao || 'metas';


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setActiveTab(seccaoAtual);
      setLoading(true);
      const [tarefasData, metasData, rotinasData] = await Promise.all([
        estrategiaService.getTarefas(),
        estrategiaService.getMetas(),
        estrategiaService.getRotinasDiarias(),
      ]);
      setTarefas(tarefasData);
      setMetas(metasData);
      setRotinas(rotinasData);
      
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

  const tabs = [
    { id: 'metas', label: 'Metas', icon: <FiTarget />, count: metas.length },
    { id: 'tarefas', label: 'Tarefas', icon: <FiList />, count: tarefas.length },
    { id: 'rotinas', label: 'Rotinas', icon: <FiClock /> },
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div 
          whileHover={{ scale: 1.05 }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{delay:0.3}}   
          className="bg-white dark:bg-gray-700 rounded-xl shadow-lg p-6 border-l-4 border-blue-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm dark:text-white">Total de Metas</p>
              <h3 className="text-2xl dark:text-white font-bold">{metas.length}</h3>
            </div>
            <FiTarget className="text-3xl text-blue-500" />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.05 }}
            initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{delay:0.2}}  
          className="bg-white dark:bg-gray-700 rounded-xl shadow-lg p-6 border-l-4 border-green-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 dark:text-white text-sm">Tarefas Pendentes</p>
              <h3 className="text-2xl dark:text-white font-bold">
                {tarefas.filter(t => !t.concluida).length}
              </h3>
            </div>
            <FiList className="text-3xl text-green-500" />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.05 }}
            initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{delay:0.1}}  
          className="bg-white dark:bg-gray-700 rounded-xl shadow-lg p-6 border-l-4 border-purple-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm dark:text-white">Rotinas Diárias</p>
              <h3 className="text-2xl dark:text-white font-bold">{rotinas.length}</h3>
            </div>
            <FiClock className="text-3xl text-purple-500" />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.05 }}
            initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-700 rounded-xl shadow-lg p-6 border-l-4 border-orange-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm dark:text-white">Progresso Geral</p>
              <h3 className="text-2xl font-bold dark:text-white">75%</h3>
            </div>
            <FiBarChart2 className="text-3xl text-orange-500" />
          </div>
        </motion.div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-white dark:bg-gray-700 rounded-xl shadow-md p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white  shadow-lg'
                  : 'text-gray-600 dark:text-white dark:hover:text-gray-500 hover:bg-gray-100'
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
            <MetaComponent metas={metas} setMetas={setMetas}/>
          )}

          {/* Tarefas Tab */}
          {activeTab === 'tarefas' && (
          <TarefasKanban />
          )}

          {/* Rotinas Tab */}
          {activeTab === 'rotinas' && (
           <RotinaComponent rotinas={rotinas} />
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
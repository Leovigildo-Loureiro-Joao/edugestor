import React, { useState, useEffect } from 'react';
import { 
  FiUsers, 
  FiDollarSign, 
  FiUserCheck,
  FiActivity,
  FiClock,
  FiBookOpen,
  FiTarget,
  FiCalendar,
  FiCheckCircle,
  FiAlertTriangle,
  FiTrendingUp
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { AnimatedStat } from '../../components/dashboad/AnimateStates.tsx';
import { dashboardService } from '../../services/dashboard/dashboardService.ts';
import { PropinasChart } from '../../components/dashboad/PropunasChart.jsx';
import { AlunosTurmaChart } from '../../components/dashboad/AlunosTurmaChart.jsx';
import { FrequenciaChart } from '../../components/dashboad/FrequenciaChart.jsx';
import { CalendarWithEvents } from '../../components/dashboad/Calendary.tsx';
import { estrategiaService } from '../../services/strategy/estrategiaService.ts';
import { DashboardStats, EstrategiaStats, StatCard } from '../../types/index.ts';
import { IconType } from 'react-icons';

// Tipos


// Dashboard Principal atualizado
const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [estrategiaStats, setEstrategiaStats] = useState<EstrategiaStats>({
    tarefasPendentes: 0,
    metasConcluidas: 0,
    metasAtrasadas: 0,
    proximasAtividades: []
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [dashboardStats, estrategiaData] = await Promise.all([
          dashboardService.getDashboardStats(),
          estrategiaService.getResumoEstrategico()
        ]);
        setStats(dashboardStats);
        setEstrategiaStats({
          ...estrategiaData,
          proximasAtividades: Array.isArray(estrategiaData.proximasAtividades) 
            ? estrategiaData.proximasAtividades 
            : []
        });
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Função final ajustada para seu caso
  const calcularChangeParaCard = (
    titulo: string, 
    valorAtual: number, 
    valorAnterior: number
  ): string => {
    if (!valorAnterior || valorAnterior === 0) {
      // Se não tinha alunos antes, é um novo início
      return `+${valorAtual} (novo)`;
    }
    
    const variacaoAbsoluta = valorAtual - valorAnterior;
    const variacaoPercentual = (variacaoAbsoluta / valorAnterior) * 100;
    const sinal = variacaoAbsoluta >= 0 ? "+" : "";
    
    // Para variações muito grandes (>500%), mostrar apenas absoluto
    if (Math.abs(variacaoPercentual) > 500) {
      return `${sinal}${variacaoAbsoluta}`;
    }
    
    // Para variações moderadas, mostrar percentual
    return `${sinal}${variacaoPercentual.toFixed(1)}%`;
  };

  const calcularVariacaoMonetaria = (atual: number, anterior: number): string => {
    if (!anterior || anterior === 0) return "+0%";
    
    const variacao = atual - anterior;
    const percentual = (variacao / anterior) * 100;
    const sinal = variacao >= 0 ? "+" : "";
    
    const valorFormatado = Math.abs(variacao).toLocaleString('pt-AO', {
      style: 'currency',
      currency: 'AOA'
    });
    
    return `${sinal}${valorFormatado} (${sinal}${percentual.toFixed(1)}%)`;
  };

  const calcularVariacaoPercentualDireta = (atual: number, anterior: number): string => {
    if (!anterior) return "+0%";
    
    const variacao = atual - anterior;
    const sinal = variacao >= 0 ? "+" : "";
    return `${sinal}${variacao.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center text-gray-500">
        Erro ao carregar estatísticas
      </div>
    );
  }

  // Cálculo de progresso para Visão Estratégica
  const totalMetasEstrategia = estrategiaStats.metasConcluidas + estrategiaStats.metasAtrasadas + 5;
  const progressoEstrategia = Math.round((estrategiaStats.metasConcluidas / totalMetasEstrategia) * 100);

  const statCards: StatCard[] = [
    {
      title: "Total de Alunos",
      value: stats.totalAlunos,
      change: calcularChangeParaCard("Total de Alunos", stats.totalAlunos, stats.totalAlunosAnterior),
      color: "blue",
      icon: FiUsers,
      aux: "",
      fix: false
    },
    {
      title: "Alunos Ativos", 
      value: stats.alunosAtivos,
      change: "+5%", // TODO: Calcular com dados reais
      color: "green",
      icon: FiUserCheck,
      aux: "",
      fix: false
    },
    {
      title: "Propinas Pagas",
      value: stats.propinaPagas,
      change: calcularVariacaoMonetaria(stats.propinaPagas, stats.propinaPagasAnterior),
      color: "emerald", 
      icon: FiDollarSign,
      aux: "kz",
      fix: true
    },
    {
      title: "Propinas Pendentes",
      value: stats.propinaPendentes,
      change: calcularVariacaoMonetaria(stats.propinaPendentes, stats.propinaPendentesAnterior),
      color: "orange",
      icon: FiClock,
      aux: "kz",
      fix: true
    },
    {
      title: "Frequência Média",
      value: stats.frequencias,
      change: calcularVariacaoPercentualDireta(stats.frequencias, 0), // TODO: Adicionar valor anterior
      color: "purple",
      icon: FiActivity,
      aux: "%",
      fix: false
    },
    {
      title: "Aulas Ministradas",
      value: 45, // TODO: Buscar do serviço
      change: "+8%", // TODO: Calcular com dados reais
      color: "indigo",
      icon: FiBookOpen,
      aux: "",
      fix: false,
    },
    // NOVO CARD: Visão Estratégica
    {
      title: "Visão Estratégica",
      value: `${estrategiaStats.metasConcluidas}/${totalMetasEstrategia}`,
      change: `${progressoEstrategia}%`,
      color: "red",
      icon: FiTarget,
      aux: "metas",
      fix: false,
      linkTo: "/estrategia"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500 dark:text-white">
          Última atualização: {new Date().toLocaleString('pt-AO')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <AnimatedStat key={stat.title} stat={stat} index={index} />
        ))}
      </div>

      {/* NOVA SEÇÃO: Resumo Estratégico */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FiTarget className="text-red-500" />
            Visão Estratégica & Planeamento
          </h2>
          <Link 
            to="/estrategia" 
            className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-medium text-sm flex items-center gap-1"
          >
            Ver plano completo →
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                <FiAlertTriangle className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Tarefas Pendentes</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {estrategiaStats.tarefasPendentes}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                <FiCheckCircle className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Metas Concluídas</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {estrategiaStats.metasConcluidas}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-800 rounded-lg">
                <FiClock className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Metas Atrasadas</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {estrategiaStats.metasAtrasadas}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                <FiTrendingUp className="text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Progresso Geral</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {progressoEstrategia}%
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Próximas Atividades */}
        <div>
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <FiCalendar className="text-primary-500" />
            Próximas Atividades
          </h3>
          <div className="space-y-2">
            {estrategiaStats.proximasAtividades.slice(0, 3).map((atividade, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    atividade.prioridade === 'alta' ? 'bg-red-500' :
                    atividade.prioridade === 'media' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {atividade.titulo}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {atividade.data_limite ? new Date(atividade.data_limite).toLocaleDateString('pt-AO') : 'Sem data'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gráficos e Calendário */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 dark:border-gray-700 p-6 h-[100vh] rounded-lg shadow-sm border border-gray-200">
          <AlunosTurmaChart />
        </div>
        
       
      </div>
    </div>
  );
};

export default Dashboard;
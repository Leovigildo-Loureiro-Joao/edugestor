import React, { useState, useEffect } from 'react';
import { 
  FiUsers, 
  FiDollarSign, 
  FiUserCheck,
  FiActivity,
  FiClock,
  FiBookOpen,
  FiTarget,
} from 'react-icons/fi';
import { AnimatedStat } from '../../components/dashboad/AnimateStates.tsx';
import { dashboardService } from '../../services/dashboard/dashboardService.ts';
import { AlunosTurmaChart } from '../../components/dashboad/AlunosTurmaChart.jsx';
import { estrategiaService } from '../../services/database/estrategiaService.ts';
import { DashboardStats, EstrategiaStats, StatCard } from '../../types/index.ts';
import { ErrorSection } from '../../components/ui/ErrorSection.tsx';
import { GraficoDesempenho } from '../../components/dashboad/Strategic.tsx';
import { CardsMetricas } from '../../components/dashboad/CardsMetricas.tsx';

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

  function Reload() {
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
  }
  useEffect(() => {
   Reload()
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
    return ErrorSection("Erro ao buscar as Estatisticas",Reload)
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


      {/* Gráficos e Calendário */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 dark:border-gray-700 p-6  rounded-lg shadow-sm border border-gray-200">
          <AlunosTurmaChart />
        </div>

          <GraficoDesempenho/>

      </div>
    </div>
  );
};

export default Dashboard;
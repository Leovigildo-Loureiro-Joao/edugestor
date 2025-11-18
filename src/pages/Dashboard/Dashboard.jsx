import React, { useState } from 'react';
 import  { useEffect } from 'react';

import { motion } from 'framer-motion';
import { 
  FiUsers, 
  FiDollarSign, 
  FiCheckCircle, 
  FiTrendingUp, 
  FiUserCheck,
  FiActivity,
  FiClock,
  FiBookOpen
} from 'react-icons/fi';
import { AnimatedStat } from '../../components/dashboad/AnimateStates';
import { statsService } from '../../services/dashboard/statsService';
import { dashboardService } from '../../services/dashboard/dashboardService';
import { PropinasChart } from '../../components/dashboad/PropunasChart';
import { AlunosTurmaChart } from '../../components/dashboad/AlunosTurmaChart';
import { FrequenciaChart } from '../../components/dashboad/FrequenciaChart';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
 useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const dashboardStats = await dashboardService.getDashboardStats();
        setStats(dashboardStats);
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);
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

  // ✅ Dados formatados para o AnimatedStat
  const statCards = [
    {
      title: "Total de Alunos",
      value: stats.totalAlunos,
      change: "+12%",
      color: "blue",
      icon: FiUsers,
      aux: "",
      fix: false
    },
    {
      title: "Alunos Ativos", 
      value: stats.alunosAtivos,
      change: "+5%",
      color: "green",
      icon: FiUserCheck,
      aux: "",
      fix: false
    },
    {
      title: "Propinas Pagas",
      value: stats.propinasPagas,
      change: "+8%",
      color: "emerald", 
      icon: FiDollarSign,
      aux: "",
      fix: false
    },
    {
      title: "Propinas Pendentes",
      value: stats.propinasPendentes,
      change: "-3%",
      color: "orange",
      icon: FiClock,
      aux: "",
      fix: false
    },
    {
      title: "Frequência Média",
      value: stats.frequenciaMedia,
      change: "+2.5%",
      color: "purple",
      icon: FiActivity,
      aux: "%",
      fix: false
    },
    {
    title: "Aulas Ministradas",
    value: 45, // Buscar do service de aulas
    change: "+8%", 
    color: "indigo",
    icon: FiBookOpen,
    aux: "",
    fix: false,
  },
  {
    title: "Média de Frequência",
    value: 87.5, // Calcular das frequências
    change: "+2.3%",
    color: "purple", 
    icon: FiUsers,
    aux: "%",
    fix: false,
  }
  ];

  

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-esme-500">
          Última atualização: {new Date().toLocaleString('pt-AO')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
            <AnimatedStat a key={stat.title} stat={stat} index={index} />
        ))}
      </div>

      {/* Gráficos e mais conteúdo virá aqui */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Propinas - Últimos 6 Meses
          </h3>
          <div className="h-64">
            <PropinasChart />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Alunos por Turma
          </h3>
          <div className="h-64">
            <AlunosTurmaChart />
          </div>
        </div>

        {/* Gráfico bônus de frequência */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Frequência - Últimos 30 Dias
          </h3>
          <div className="h-64">
            <FrequenciaChart />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

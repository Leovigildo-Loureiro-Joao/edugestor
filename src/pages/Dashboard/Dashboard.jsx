import React from 'react';

import { motion } from 'framer-motion';
import { 
  FiUsers, 
  FiDollarSign, 
  FiCheckCircle, 
  FiTrendingUp 
} from 'react-icons/fi';

const Dashboard = () => {
  const stats = [
    {
      title: 'Total de Alunos',
      value: '245',
      icon: FiUsers,
      color: 'primary',
      change: '+12%',
    },
    {
      title: 'Propinas do Mês',
      value: 'AKZ 1.240.000',
      icon: FiDollarSign,
      color: 'success',
      change: '+8%',
    },
    {
      title: 'Frequência Média',
      value: '94%',
      icon: FiCheckCircle,
      color: 'warning',
      change: '+2%',
    },
    {
      title: 'Desempenho Geral',
      value: '78%',
      icon: FiTrendingUp,
      color: 'danger',
      change: '+5%',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500">
          Última atualização: {new Date().toLocaleString('pt-AO')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className={`text-sm ${
                  stat.change.startsWith('+') ? 'text-success-600' : 'text-danger-600'
                }`}>
                  {stat.change} em relação ao mês passado
                </p>
              </div>
              <div className={`p-3 rounded-full bg-${stat.color}-50`}>
                <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Gráficos e mais conteúdo virá aqui */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Propinas - Últimos 6 Meses
          </h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Gráfico será implementado com Recharts
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Alunos por Turma
          </h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Gráfico será implementado com Recharts
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
